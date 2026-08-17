/*
 * Copyright (C) 2026 Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import * as vscode from "vscode";
import { runCdswctl } from "./cdswctl";
import { listEndpointProcesses } from "./endpointManager";
import { loadHistory, saveHistory } from "./sessionHistory";
import {
  cmlStatusOf, endpointStatusOf, isOrphanedOnCml, isStuckStarting, parseSessionIds, rollUpStatus,
} from "./sessionStatus";
import { SshHostEntry, syncSshConfig } from "./sshConfig";
import { isProcessAlive } from "./utils";
import { CDSWCTL_TIMEOUT_MS, EndpointStatus, SessionRecord, SSH_HOST_PREFIX } from "./types";

export type ReconcileResult = {
  changed: boolean;
  records: SessionRecord[];
};

/**
 * Recomputes the roll-up status from the two halves.
 *
 * `starting` survives while the endpoint is coming up, but not past the grace
 * period: a creation the extension host did not live to finish leaves a detached
 * process that would otherwise read as "starting…" indefinitely, so it is
 * surfaced as an error the user can kill.
 */
function applyStatus(record: SessionRecord, endpoint: EndpointStatus): boolean {
  const before = `${record.status}/${record.endpointStatus}`;
  record.endpointStatus = endpoint;
  if (record.status === "starting" && endpoint === "running") {
    record.status = isStuckStarting(record) ? "error" : "starting";
  } else {
    record.status = rollUpStatus(endpoint, record.cmlStatus ?? "unknown");
  }
  if (endpoint !== "running") {
    record.endpointPid = undefined;
  }
  return before !== `${record.status}/${record.endpointStatus}`;
}

/**
 * Records the moment a tunnel stops existing.
 *
 * This is the one observation that makes a lost remote window diagnosable
 * afterwards: it dates the loss and says which half of the session went first.
 * When the endpoint dies before CML, the session may then be stopped by the
 * orphan pass; when CML goes first, that pass cannot have been involved at all.
 * Without this line the two are indistinguishable after the fact.
 */
function reportEndpointLoss(
  record: SessionRecord,
  pid: number | undefined,
  log?: (msg: string) => void,
): void {
  log?.(
    `Endpoint for ${record.hostAlias ?? record.projectName} is gone ` +
    `(pid ${pid ?? "unrecorded"}); CML session ${record.sessionId ?? "unrecorded"} ` +
    `last seen ${cmlStatusOf(record)}.`,
  );
}

/**
 * Cheap, synchronous pass: asks the operating system whether each recorded
 * endpoint pid is still alive and rewrites the statuses accordingly.
 *
 * Deliberately does no I/O beyond the history file, so the sidebar can run it on
 * a short timer. It cannot tell a recycled pid from a live endpoint — that needs
 * `reconcileProcesses`.
 */
export function reconcileLocal(storagePath: string, log?: (msg: string) => void): ReconcileResult {
  const records = loadHistory(storagePath);
  let changed = false;
  for (const record of records) {
    const wasRunning = endpointStatusOf(record) === "running";
    // `applyStatus` clears the pid once the endpoint is gone, so keep it for the log.
    const pid = record.endpointPid;
    const alive = pid != null && isProcessAlive(pid);
    if (applyStatus(record, alive ? "running" : "stopped")) {
      record.lastCheckedAt = new Date().toISOString();
      changed = true;
      if (wasRunning && !alive) {
        reportEndpointLoss(record, pid, log);
      }
    }
  }
  if (changed) {
    saveHistory(storagePath, records);
  }
  return { changed, records };
}

/**
 * Authoritative local pass: cross-checks recorded pids against the real list of
 * `cdswctl ssh-endpoint` processes, so a pid the OS has since handed to an
 * unrelated program is not mistaken for a live tunnel.
 *
 * Returns the pids that are genuinely ours, which is exactly the set the orphan
 * sweep must spare. When the scan fails it falls back to `reconcileLocal` and
 * reports every recorded pid as tracked, so nothing gets killed on no evidence.
 */
export async function reconcileProcesses(
  storagePath: string,
  output: vscode.OutputChannel,
): Promise<{ changed: boolean; trackedPids: number[] }> {
  const log = (msg: string): void => output.appendLine(msg);
  const live = await listEndpointProcesses(output);
  if (live === null) {
    const { changed, records } = reconcileLocal(storagePath, log);
    const pids = records.map((r) => r.endpointPid).filter((p): p is number => p != null);
    return { changed, trackedPids: pids };
  }

  const liveSet = new Set(live);
  const records = loadHistory(storagePath);
  const trackedPids: number[] = [];
  let changed = false;

  for (const record of records) {
    const wasRunning = endpointStatusOf(record) === "running";
    const pid = record.endpointPid;
    const isOurs = pid != null && liveSet.has(pid);
    if (isOurs) {
      trackedPids.push(pid!);
    }
    if (applyStatus(record, isOurs ? "running" : "stopped")) {
      record.lastCheckedAt = new Date().toISOString();
      changed = true;
      if (wasRunning && !isOurs) {
        reportEndpointLoss(record, pid, log);
      }
    }
  }
  if (changed) {
    saveHistory(storagePath, records);
  }
  return { changed, trackedPids };
}

/**
 * Asks CML which of the recorded sessions are still running, one `sessions list`
 * per distinct project.
 *
 * A project whose listing fails leaves its records' CML status untouched rather
 * than marking them unknown: a transient CLI failure should not make the sidebar
 * forget what it knew, and it must never be able to look like a stopped session.
 */
export async function reconcileWithCml(
  storagePath: string,
  cdswctlPath: string,
  output: vscode.OutputChannel,
): Promise<boolean> {
  // The local half has to be current first: `isOrphanedOnCml` compares the two,
  // and a stale "endpoint running" would hide an orphan from the cleanup pass.
  reconcileLocal(storagePath, (msg) => output.appendLine(msg));
  const records = loadHistory(storagePath);
  const withSession = records.filter((r) => r.sessionId);
  if (withSession.length === 0) {
    return false;
  }

  let changed = false;
  for (const project of new Set(withSession.map((r) => r.projectName))) {
    const result = await runCdswctl(cdswctlPath, ["sessions", "list", "/p", project], output, 15000);
    if (result.exitCode !== 0) {
      output.appendLine(`Reconcile: leaving ${project} unchanged (sessions list exit ${result.exitCode}).`);
      continue;
    }
    const running = parseSessionIds(result.stdout);
    for (const record of withSession.filter((r) => r.projectName === project)) {
      const next = running.has(record.sessionId!) ? "running" : "stopped";
      const status = rollUpStatus(record.endpointStatus ?? "unknown", next);
      if (record.cmlStatus !== next || record.status !== status) {
        record.cmlStatus = next;
        record.status = record.status === "starting" && next === "running" ? "starting" : status;
        record.lastCheckedAt = new Date().toISOString();
        changed = true;
      }
    }
  }

  if (changed) {
    saveHistory(storagePath, records);
  }
  return changed;
}

/**
 * Stops CML sessions that outlived their local endpoint — the "sessions are not
 * allowed to be orphaned on CML" half of issue #2.
 *
 * Only records this extension wrote are ever considered, and only ones CML has
 * *confirmed* still running, always by explicit session id. An unknown CML status
 * is never enough. This is the safety rule from AGENTS.md: no bulk stop, no `/a`.
 */
export async function stopOrphanedCmlSessions(
  storagePath: string,
  cdswctlPath: string,
  output: vscode.OutputChannel,
): Promise<number> {
  const records = loadHistory(storagePath);
  const orphans = records.filter(isOrphanedOnCml);
  if (orphans.length === 0) {
    return 0;
  }

  let stopped = 0;
  for (const record of orphans) {
    output.appendLine(
      `Stopping orphaned CML session ${record.sessionId} in ${record.projectName} ` +
      `(its local endpoint is gone)...`,
    );
    const result = await runCdswctl(
      cdswctlPath,
      ["sessions", "stop", "/s", record.sessionId!, "/p", record.projectName],
      output,
      CDSWCTL_TIMEOUT_MS,
    );
    const combined = result.stdout + result.stderr;
    // cdswctl prints this on a *successful* stop — see AGENTS.md.
    const ok = result.exitCode === 0 || /unexpected end of JSON/i.test(combined);
    if (ok) {
      record.cmlStatus = "stopped";
      record.status = "inactive";
      record.lastCheckedAt = new Date().toISOString();
      stopped += 1;
    } else {
      output.appendLine(`Failed to stop orphaned session ${record.sessionId}: exit ${result.exitCode}.`);
    }
  }

  saveHistory(storagePath, records);
  return stopped;
}

/**
 * Rewrites ~/.ssh/config so it contains a host block for every session with a
 * live tunnel, and none for any session without one.
 */
export function syncSshConfigFromHistory(
  storagePath: string,
  output: vscode.OutputChannel,
): boolean {
  const entries: SshHostEntry[] = [];
  const seen = new Set<string>();
  // Newest first, so a duplicate alias resolves in favour of the newer session.
  for (const record of loadHistory(storagePath)) {
    if (endpointStatusOf(record) !== "running" || !record.port) {
      continue;
    }
    // Sessions created before parallel support have no alias of their own. Give
    // them the legacy bare `cml` host so a window already connected through it
    // still resolves after the upgrade.
    const alias = record.hostAlias ?? SSH_HOST_PREFIX;
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    entries.push({ alias, port: record.port });
  }

  try {
    const ok = syncSshConfig(entries);
    if (!ok) {
      output.appendLine(`Failed to write SSH config for ${entries.length} host alias(es).`);
    }
    return ok;
  } catch (err) {
    output.appendLine(`Failed to update SSH config: ${String(err)}`);
    return false;
  }
}
