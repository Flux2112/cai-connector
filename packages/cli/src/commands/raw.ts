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

import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../baseCommand";
import { assertReadOnly } from "../lib/readonly";

export default class Raw extends BaseCommand<typeof Raw> {
  static description =
    "Call any API v2 path directly. Read-only: only GET is accepted, so no request from here can change anything.";

  static examples = [
    "<%= config.bin %> raw /api/v2/projects?page_size=1",
    "<%= config.bin %> raw /api/v2/users",
  ];

  static args = {
    path: Args.string({
      description: 'API path, e.g. "/api/v2/projects". A query string is allowed.',
      required: true,
    }),
  };

  static flags = {
    method: Flags.string({
      description: "HTTP method. Only GET is accepted; the flag exists to make that explicit.",
      default: "GET",
    }),
  };

  public async run(): Promise<unknown> {
    const method = assertReadOnly(this.flags.method);
    const result = await this.client().raw(method, this.args.path);
    return this.emit(result);
  }
}
