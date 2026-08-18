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
  listCdswctlRuntimes,
  matchRuntimes,
  whoami,
  type CdswctlRuntime,
} from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { cdswctlFlag, loginToCdswctl } from "../../lib/cdswctl";
import { assertWindows } from "../../lib/session";

export default class SessionRuntimes extends BaseCommand<typeof SessionRuntimes> {
  static description = [
    "List the runtimes cdswctl offers, with the numeric ids `session create --runtime` takes.",
    "Separate from `cai runtimes list` because the API's listing has no numeric id at all,",
    "and that number is what cdswctl wants.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> session runtimes --table",
    '<%= config.bin %> session runtimes "workbench python3.11" --table',
  ];

  static args = {
    filter: Args.string({
      description: "Only runtimes matching every term given, newest first.",
    }),
  };

  static flags = {
    cdswctl: cdswctlFlag,
  };

  public async run(): Promise<CdswctlRuntime[]> {
    assertWindows();

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

    const runtimes = await listCdswctlRuntimes(cdswctlPath, log);
    const shown = this.args.filter ? matchRuntimes(runtimes, this.args.filter) : runtimes;

    return this.emit(shown, [
      { header: "id", get: (r) => r.id },
      { header: "editor", get: (r) => r.editor },
      { header: "kernel", get: (r) => r.kernel },
      { header: "edition", get: (r) => r.edition },
      { header: "version", get: (r) => r.fullVersion },
    ]);
  }
}
