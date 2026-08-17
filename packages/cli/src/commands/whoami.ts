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

import { validateKey } from "@defysoftware/cai-core";

import { BaseCommand } from "../baseCommand";

export default class Whoami extends BaseCommand<typeof Whoami> {
  static description = "Validate the stored API key and report who it belongs to.";

  static examples = ["<%= config.bin %> whoami", "<%= config.bin %> whoami --table"];

  public async run(): Promise<{ username?: string; valid?: boolean; message?: string }> {
    const result = await validateKey(this.client(), "API");
    return this.emit(result, [
      { header: "username", get: (r) => r.username },
      { header: "valid", get: (r) => r.valid === true },
      { header: "message", get: (r) => r.message },
    ]);
  }
}
