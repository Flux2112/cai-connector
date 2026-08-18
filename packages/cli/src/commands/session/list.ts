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

import { Flags } from "@oclif/core";
import { extensionStoragePath, listEndpointProcesses, loadHistory } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { assertWindows, sessionRow, type SessionRow } from "../../lib/session";

export default class SessionList extends BaseCommand<typeof SessionList> {
  static description = [
    "List the SSH endpoint sessions stored on this machine.",
    "The same session_history.json the VS Code extension writes, so sessions created either way appear here.",
    "Read-only: it never rewrites the file.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> session list --table",
    "<%= config.bin %> session list --live",
  ];

  static flags = {
    live: Flags.boolean({
      description: "Only sessions with a running tunnel or a running CML session.",
    }),
  };

  public async run(): Promise<SessionRow[]> {
    assertWindows();

    const storagePath = extensionStoragePath();
    /* The scan first, the records second: another process can create and record a
     * session while PowerShell is still working, and a stale record set would
     * then show a brand-new tunnel as untracked. */
    const livePids = await listEndpointProcesses(
      this.flags.verbose ? (line) => process.stderr.write(`${line}\n`) : undefined,
    );
    const rows = loadHistory(storagePath).map((record) => sessionRow(record, livePids));

    const shown = this.flags.live
      ? rows.filter((row) => row.endpoint === "running" || row.cml === "running")
      : rows;

    return this.emit(shown, [
      { header: "alias", get: (r) => r.hostAlias ?? "(none)" },
      { header: "project", get: (r) => r.project },
      { header: "status", get: (r) => r.status },
      { header: "endpoint", get: (r) => r.endpoint },
      { header: "cml", get: (r) => r.cml },
      { header: "port", get: (r) => r.port },
      { header: "pid", get: (r) => r.pid },
      { header: "started", get: (r) => r.startedAt },
    ]);
  }
}
