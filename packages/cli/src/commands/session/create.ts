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

import * as path from "node:path";

import { Flags } from "@oclif/core";
import {
  activateRecord,
  addOrUpdateSession,
  assignHostAlias,
  buildEndpointArgs,
  ENDPOINT_READY_TIMEOUT_MS,
  extensionStoragePath,
  findAvailablePort,
  loadHistory,
  newSessionRecord,
  patchSession,
  projectRef,
  remoteUriFor,
  resolveProject,
  sshEntriesFromRecords,
  stopCmlSession,
  syncSshConfig,
  takenHostAliases,
  whoami,
  type SessionRecord,
} from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { cdswctlFlag, loginToCdswctl } from "../../lib/cdswctl";
import { EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";
import { assertWindows } from "../../lib/session";
import { buildSpec } from "../../lib/spec";
import { spawnTunnel } from "../../lib/tunnel";

export default class SessionCreate extends BaseCommand<typeof SessionCreate> {
  static description = [
    "Create an SSH endpoint session and leave the tunnel running after this command exits.",
    "The record goes into the same session_history.json the VS Code extension reads, so the sidebar shows it and no window will sweep the tunnel away.",
    "Connect with `ssh <alias>`, or open the printed remote URI in VS Code.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> session create HANKE/dse",
    '<%= config.bin %> session create HANKE/dse --runtime "workbench python3.11"',
    "<%= config.bin %> session create HANKE/dse --runtime 42 --cpus 2 --memory 8",
  ];

  static args = {
    project: projectArg,
  };

  static flags = {
    cdswctl: cdswctlFlag,
    runtime: Flags.string({
      description:
        "Runtime id, or terms to match one (see `cai session runtimes`). Defaults to the runtime of the newest stored session for this project.",
    }),
    addon: Flags.integer({ description: "Runtime addon id." }),
    cpus: Flags.string({ description: "vCPU cores. Fractions are allowed.", default: "1" }),
    memory: Flags.string({ description: "Memory in GB.", default: "4" }),
    gpus: Flags.integer({ description: "Nvidia GPUs.", default: 0, min: 0 }),
    timeout: Flags.integer({
      description: "Seconds to wait for the endpoint.",
      default: ENDPOINT_READY_TIMEOUT_MS / 1000,
      min: 10,
    }),
  };

  public async run(): Promise<SessionRecord> {
    assertWindows();

    const log = this.flags.verbose ? (line: string) => process.stderr.write(`${line}\n`) : undefined;
    const storagePath = extensionStoragePath();

    const client = this.client();
    const resolved = this.resolution();
    const username = await whoami(client);
    const project = await resolveProject(client, this.args.project);

    const cdswctlPath = await loginToCdswctl({
      url: resolved.baseUrl.value as string,
      apiKey: resolved.apiKey.value as string,
      username,
      cdswctlPath: this.flags.cdswctl,
      log,
    });

    /* cdswctl wants `owner/project`, and the API is the authority on both halves:
     * a reference typed `hanke/dse` names the project CML calls HANKE/DSE. */
    const reference = projectRef(project);
    const spec = await buildSpec({
      project: reference,
      flags: this.flags,
      cdswctlPath,
      records: loadHistory(storagePath),
      log,
    });

    const startedAt = new Date().toISOString();
    const id = startedAt;
    /* Assigned once, here, and never recomputed: it ends up inside the remote
     * window's URI and has to survive every reload of that window. */
    const hostAlias = assignHostAlias(reference, takenHostAliases(storagePath));
    const localPort = await findAvailablePort();

    const tunnel = spawnTunnel({
      cdswctlPath,
      args: buildEndpointArgs(spec, localPort),
      logFile: path.join(storagePath, "logs", `${hostAlias}-${startedAt.replace(/[:.]/g, "-")}.log`),
      onLine: log,
      onSessionId: (sessionId) => {
        /* Written the moment cdswctl names it, well before the endpoint is ready:
         * if creation fails from here on, this id is the only handle on a session
         * CML has already started, and without it that session is stranded. */
        patchSession(storagePath, id, { sessionId, cmlStatus: "running" });
      },
    });

    /* Recorded immediately after spawn, not when it is ready. Until this write
     * lands the pid belongs to no session, and a VS Code window activating during
     * the startup gap would sweep it up as untracked and kill the tunnel. */
    const record = newSessionRecord({ id, spec, hostAlias, endpointPid: tunnel.pid, startedAt });
    addOrUpdateSession(storagePath, record);

    const ready = await tunnel.waitForReady(this.flags.timeout * 1000);
    tunnel.release();

    if (!ready) {
      await abort(storagePath, id, spec.project, cdswctlPath, tunnel.pid, log);
      process.exitCode = EXIT.WORKLOAD;
      process.stderr.write(
        `${JSON.stringify(
          {
            error: `the endpoint never came up; cdswctl's own output is in ${tunnel.logFile}`,
            code: EXIT.WORKLOAD,
          },
          null,
          2,
        )}\n`,
      );
      return loadHistory(storagePath).find((entry) => entry.id === id) ?? record;
    }

    /* Re-read before activating: the session id was patched in by the scraper. */
    const stored = loadHistory(storagePath).find((entry) => entry.id === id) ?? record;
    const active = activateRecord(stored, ready, stored.sessionId);
    addOrUpdateSession(storagePath, active);

    /* Every managed block in one pass, so N sessions stay reachable at once. */
    if (!syncSshConfig(sshEntriesFromRecords(loadHistory(storagePath)))) {
      this.warn(`the SSH config could not be updated: the tunnel is up but \`ssh ${hostAlias}\` will not resolve`);
    }

    this.emit(active, [
      { header: "alias", get: (r) => r.hostAlias },
      { header: "project", get: (r) => r.projectName },
      { header: "port", get: (r) => r.port },
      { header: "session", get: (r) => r.sessionId },
      { header: "pid", get: (r) => r.endpointPid },
    ]);

    /* stderr, so stdout stays exactly the record. */
    process.stderr.write(`ssh ${hostAlias}\n${remoteUriFor(hostAlias)}\n`);
    return active;
  }
}

/**
 * Tear down a session that failed partway through.
 *
 * The CML session may exist even though the endpoint never became usable, so it is
 * stopped by its own id rather than merely forgotten — a session left running with
 * no way to reach it is exactly the orphan this project refuses to create. The
 * record is left flagged `error` when the stop could not be confirmed, so a later
 * sweep looks at it again instead of treating it as cleaned up.
 */
async function abort(
  storagePath: string,
  id: string,
  project: string,
  cdswctlPath: string,
  pid: number | undefined,
  log?: (line: string) => void,
): Promise<void> {
  if (pid !== undefined) {
    try {
      process.kill(pid);
    } catch {
      /* Already gone. */
    }
  }

  /* Re-read: the id may have been scraped after the record was last seen. */
  const sessionId = loadHistory(storagePath).find((entry) => entry.id === id)?.sessionId;
  let cmlStatus: "stopped" | "unknown" = "unknown";
  if (sessionId) {
    cmlStatus = (await stopCmlSession(cdswctlPath, project, sessionId, log)) ? "stopped" : "unknown";
  }

  patchSession(storagePath, id, {
    status: cmlStatus === "stopped" ? "inactive" : "error",
    endpointStatus: "stopped",
    cmlStatus,
    endpointPid: undefined,
    port: undefined,
    lastCheckedAt: new Date().toISOString(),
  });
  syncSshConfig(sshEntriesFromRecords(loadHistory(storagePath)));
}
