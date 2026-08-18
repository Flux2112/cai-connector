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

import { Args } from "@oclif/core";
import {
  extensionStoragePath,
  loadHistory,
  markSessionStopped,
  patchSession,
  sshEntriesFromRecords,
  stopCmlSession,
  syncSshConfig,
  whoami,
} from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { cdswctlFlag, loginToCdswctl } from "../../lib/cdswctl";
import { EXIT } from "../../lib/exit";
import { assertWindows, resolveRecord } from "../../lib/session";

type Killed = {
  id: string;
  project: string;
  hostAlias?: string;
  /** The CML session, if the record named one. */
  sessionId?: string;
  cmlStopped: boolean;
  endpointKilled: boolean;
};

export default class SessionKill extends BaseCommand<typeof SessionKill> {
  static description = [
    "Stop one session: its local tunnel and the CML session behind it.",
    "Named explicitly, by host alias, session id or project — there is no flag that stops everything.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> session kill cml-dse",
    "<%= config.bin %> session kill HANKE/dse",
  ];

  static args = {
    session: Args.string({
      description: "Host alias, record id (or a prefix of it), or project name.",
      required: true,
    }),
  };

  static flags = {
    cdswctl: cdswctlFlag,
  };

  public async run(): Promise<Killed> {
    assertWindows();

    const storagePath = extensionStoragePath();
    const record = resolveRecord(loadHistory(storagePath), this.args.session);

    const log = this.flags.verbose ? (line: string) => process.stderr.write(`${line}\n`) : undefined;
    const client = this.client();
    const resolved = this.resolution();
    const username = await whoami(client);

    const cdswctlPath = await loginToCdswctl({
      url: resolved.baseUrl.value as string,
      apiKey: resolved.apiKey.value as string,
      username,
      cdswctlPath: this.flags.cdswctl,
      log,
    });

    /* CML first, the tunnel second. A Remote-SSH window stays connected until the
     * remote session is actually gone, and a stop that needed the tunnel would
     * otherwise be attempted through one that no longer exists. */
    let cmlStopped = true;
    if (record.sessionId) {
      cmlStopped = await stopCmlSession(cdswctlPath, record.projectName, record.sessionId, log);
    } else {
      log?.("No session id on this record, so there is no CML session to stop.");
    }

    let endpointKilled = false;
    if (record.endpointPid !== undefined) {
      try {
        process.kill(record.endpointPid);
        endpointKilled = true;
      } catch {
        /* Already gone, which is the outcome we wanted anyway. */
      }
    }

    if (cmlStopped) {
      markSessionStopped(storagePath, record.id);
    } else {
      /* Endpoint gone, CML session unaccounted for: leave it flagged so an orphan
       * sweep picks it up rather than quietly recording it as cleaned up. */
      patchSession(storagePath, record.id, {
        status: "error",
        endpointStatus: "stopped",
        endpointPid: undefined,
        port: undefined,
        lastCheckedAt: new Date().toISOString(),
      });
    }

    /* Rewrite every managed block in one pass, so this session's alias cannot be
     * left pointing at a port something else may reuse. */
    syncSshConfig(sshEntriesFromRecords(loadHistory(storagePath)));

    if (!cmlStopped) {
      process.exitCode = EXIT.WORKLOAD;
      process.stderr.write(
        `${JSON.stringify(
          {
            error: `the tunnel is gone but CML session ${record.sessionId} may still be running`,
            code: EXIT.WORKLOAD,
          },
          null,
          2,
        )}\n`,
      );
    }

    return this.emit<Killed>(
      {
        id: record.id,
        project: record.projectName,
        hostAlias: record.hostAlias,
        sessionId: record.sessionId,
        cmlStopped,
        endpointKilled,
      },
      [
        { header: "alias", get: (k) => k.hostAlias ?? "(none)" },
        { header: "project", get: (k) => k.project },
        { header: "cml stopped", get: (k) => k.cmlStopped },
        { header: "tunnel killed", get: (k) => k.endpointKilled },
      ],
    );
  }
}
