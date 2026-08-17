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

import * as path from "path";
import * as cp from "child_process";
import * as vscode from "vscode";
import { runCdswctl } from "./cdswctl";
import {
  killEndpoint, registerEndpoint, setSessionId, surrenderEndpoint,
} from "./endpointRegistry";
import {
  addOrUpdateSession, loadHistory, patchSession, replaceSessionRecord, takenHostAliases,
} from "./sessionHistory";
import { syncSshConfigFromHistory } from "./sessionReconciler";
import { assignHostAlias, remoteUriFor } from "./sshConfig";
import { buildEndpointArgs, findAvailablePort } from "./utils";
import {
  CDSWCTL_TIMEOUT_MS, ConnectParams, EndpointProgressStep,
  ENDPOINT_READY_TIMEOUT_MS, ProgressReporter, SessionRecord,
} from "./types";

type ReadyInfo = {
  port: string;
  userAndHost: string;
  sessionId?: string;
};

/**
 * Creates one SSH endpoint and hands it to Remote-SSH. Every session-creating
 * flow funnels through here.
 *
 * Sessions run in parallel: this touches only the record it creates, and never
 * kills or stops anything belonging to another session. The single exception is
 * `params.autoStopSessions`, a specific session id the caller wants replaced.
 *
 * Returns the CML session id on success (possibly an empty string if cdswctl
 * never printed one), or false if the endpoint never came up.
 */
export async function executeConnect(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  params: ConnectParams,
  onProgress?: ProgressReporter,
): Promise<string | false> {
  const storagePath = context.globalStorageUri.fsPath;
  const startedAt = new Date().toISOString();
  const id = params.replaceRecord?.id ?? startedAt;
  const hostAlias = params.replaceRecord?.hostAlias
    ?? assignHostAlias(params.project, takenHostAliases(storagePath));

  // A reporting failure must never interrupt endpoint creation, and reporting
  // must stay synchronous so it cannot reorder the handoff sequence below.
  const report = (step: EndpointProgressStep, detail?: string): void => {
    try {
      onProgress?.(step, detail);
    } catch (err) {
      output.appendLine(`Progress reporting failed: ${String(err)}`);
    }
  };

  if (params.autoStopSessions !== false) {
    const prevSessionId = params.autoStopSessions;
    output.appendLine(`Stopping previous extension session ${prevSessionId} in project ${params.project}...`);
    await runCdswctl(
      params.cdswctlPath,
      ["sessions", "stop", "/s", prevSessionId, "/p", params.project],
      output,
      CDSWCTL_TIMEOUT_MS,
    );
    report("stopping-previous", `session ${prevSessionId}`);
  }

  output.appendLine(`Creating SSH endpoint (host alias ${hostAlias})...`);
  let localPort: number;
  try {
    localPort = await findAvailablePort();
  } catch (err) {
    output.appendLine(`Could not reserve a local SSH port: ${String(err)}`);
    vscode.window.showErrorMessage("Could not reserve a local port for the SSH endpoint.");
    return false;
  }
  const args = buildEndpointArgs(params, localPort);
  output.appendLine(`Command: ${params.cdswctlPath} ${args.join(" ")}`);

  const child = cp.spawn(params.cdswctlPath, args, {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    cwd: path.dirname(params.cdswctlPath),
    detached: true,
  });

  child.unref();
  report("spawned", child.pid != null ? `pid ${child.pid}` : undefined);

  registerEndpoint({
    id,
    process: child,
    cdswctlPath: params.cdswctlPath,
    project: params.project,
    hostAlias,
    surrendered: false,
  });

  // Record the session the moment the process exists, not when it is ready.
  // Until this write lands the pid belongs to no session, and any window that
  // activates during the (up to 60s) startup window would sweep it up as an
  // untracked orphan and kill the tunnel mid-creation.
  const record: SessionRecord = {
    id,
    projectName: params.project,
    runtimeId: params.runtimeId,
    addonId: params.addonId,
    cpus: params.cpus,
    memoryGb: params.memory,
    gpus: params.gpus,
    status: "starting",
    endpointStatus: "running",
    cmlStatus: "unknown",
    hostAlias,
    endpointPid: child.pid,
    startedAt,
  };
  if (params.replaceRecord) {
    replaceSessionRecord(storagePath, record);
  } else {
    addOrUpdateSession(storagePath, record);
  }

  const ready = await Promise.race([
    scrapeEndpoint(child, output, id, storagePath, report),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ENDPOINT_READY_TIMEOUT_MS)),
  ]);

  if (!ready) {
    vscode.window.showErrorMessage("Failed to establish SSH endpoint.");
    await abortSession(storagePath, id, params, output);
    return false;
  }

  output.appendLine(`SSH: ${ready.userAndHost}:${ready.port}`);

  // Written before the window opens so the next extension host sees a live,
  // tracked endpoint and leaves it alone.
  addOrUpdateSession(storagePath, {
    ...record,
    status: "active",
    endpointStatus: "running",
    cmlStatus: "running",
    port: ready.port,
    sessionId: ready.sessionId,
    lastCheckedAt: new Date().toISOString(),
  });

  if (!syncSshConfigFromHistory(storagePath, output)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    await abortSession(storagePath, id, params, output, ready.sessionId);
    return false;
  }
  report("ssh-config", `host ${hostAlias}`);

  output.appendLine(`SSH config updated. Opening Remote-SSH window for ${hostAlias}...`);
  // Synchronous and non-awaited, so nothing is inserted into the
  // history-write / surrender / openFolder sequence below.
  report("opening-window");
  const openInSameWindow = vscode.workspace.getConfiguration("caiConnector").get<boolean>("openInSameWindow", true);
  // Force a new window when already inside a remote session — the current window is being disconnected/replaced
  const forceNewWindow = !openInSameWindow || Boolean(vscode.env.remoteName);
  // Always surrender the endpoint before opening the remote window.
  // In same-window mode the current host is reloaded; in new-window mode it is deactivated.
  // Either way deactivate() must not kill the cdswctl tunnel that the new window needs.
  surrenderEndpoint(id);
  try {
    await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.parse(remoteUriFor(hostAlias)), {
      forceNewWindow,
    });
    vscode.window.showInformationMessage(`Remote-SSH window launched for host '${hostAlias}'.`);
  } catch (err) {
    output.appendLine(`Remote-SSH handoff failed: ${String(err)}`);
    vscode.window.showErrorMessage(`Failed to launch Remote-SSH window: ${String(err)}`);
    return false;
  }
  return ready.sessionId ?? "";
}

/**
 * Screen-scrapes cdswctl's output for the CML session id and the ready line.
 *
 * The session id is written to the history record as soon as it appears, before
 * the endpoint is ready: if creation then fails or the window dies, that id is
 * the only handle anyone has on the session CML has already started, and without
 * it the session would be stranded on the platform.
 */
function scrapeEndpoint(
  child: cp.ChildProcess,
  output: vscode.OutputChannel,
  id: string,
  storagePath: string,
  report: (step: EndpointProgressStep, detail?: string) => void,
): Promise<ReadyInfo | null> {
  return new Promise<ReadyInfo | null>((resolve) => {
    let sessionId: string | undefined;
    let settled = false;

    const done = (val: ReadyInfo | null): void => {
      if (!settled) { settled = true; resolve(val); }
    };

    const onLine = (line: string, isErr: boolean): void => {
      output.appendLine(isErr ? `cdswctl err: ${line}` : `cdswctl: ${line}`);

      if (!sessionId) {
        const m = line.match(/on session\s+(\S+)\s+in project/i);
        if (m) {
          sessionId = m[1];
          setSessionId(id, sessionId);
          patchSession(storagePath, id, { sessionId, cmlStatus: "running" });
          report("session-created", `session ${sessionId}`);
        }
      }

      if (!settled) {
        const portMatch = line.match(/ssh\s+-p\s+(\d+)\s+(\S+)/);
        if (portMatch) {
          report("endpoint-ready", `port ${portMatch[1]}`);
          done({ port: portMatch[1], userAndHost: portMatch[2], sessionId });
        }
      }
    };

    const pump = (stream: NodeJS.ReadableStream | null, isErr: boolean): void => {
      let buf = "";
      stream?.on("data", (data: Buffer) => {
        buf += data.toString();
        const lines = buf.split(/\r?\n/);
        buf = lines.pop() ?? "";
        lines.filter((l) => l.trim()).forEach((l) => onLine(l.trimEnd(), isErr));
      });
    };
    pump(child.stdout, false);
    pump(child.stderr, true);

    child.on("exit", (code) => {
      output.appendLine(`cdswctl exited with code ${code ?? "unknown"}.`);
      done(null);
    });

    child.on("error", (err) => {
      output.appendLine(`cdswctl spawn error: ${String(err)}`);
      done(null);
    });
  });
}

/**
 * Tears down a session that failed partway through creation.
 *
 * The CML session may already exist even though the endpoint never became
 * usable, so it is stopped by id rather than merely forgotten — that is exactly
 * the orphan case issue #2 rules out.
 */
async function abortSession(
  storagePath: string,
  id: string,
  params: ConnectParams,
  output: vscode.OutputChannel,
  sessionId?: string,
): Promise<void> {
  killEndpoint(id);
  // Re-read: the id may have been scraped after the caller last saw the record.
  const remoteId = sessionId ?? loadHistory(storagePath).find((r) => r.id === id)?.sessionId;
  let cmlStatus: "stopped" | "unknown" = "unknown";

  if (remoteId) {
    output.appendLine(`Cleaning up half-created CML session ${remoteId}...`);
    const result = await runCdswctl(
      params.cdswctlPath,
      ["sessions", "stop", "/s", remoteId, "/p", params.project],
      output,
      CDSWCTL_TIMEOUT_MS,
    );
    const combined = result.stdout + result.stderr;
    if (result.exitCode === 0 || /unexpected end of JSON/i.test(combined)) {
      cmlStatus = "stopped";
    } else {
      output.appendLine(`Could not stop ${remoteId} — it may still be running on CML.`);
    }
  }

  patchSession(storagePath, id, {
    status: cmlStatus === "stopped" ? "inactive" : "error",
    endpointStatus: "stopped",
    cmlStatus,
    endpointPid: undefined,
    port: undefined,
    lastCheckedAt: new Date().toISOString(),
  });
  syncSshConfigFromHistory(storagePath, output);
}
