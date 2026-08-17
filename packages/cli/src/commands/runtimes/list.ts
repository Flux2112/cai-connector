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

import { listRuntimes, type Runtime } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags } from "../../lib/flags";

export default class RuntimesList extends BaseCommand<typeof RuntimesList> {
  static description = "List runtimes available on the instance.";

  static examples = ["<%= config.bin %> runtimes list --table --limit 20"];

  static flags = { ...listFlags };

  public async run(): Promise<Runtime[]> {
    const runtimes = await listRuntimes(this.client(), {
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    return this.emit(runtimes, [
      { header: "identifier", get: (r) => r.image_identifier },
      { header: "editor", get: (r) => r.editor },
      { header: "kernel", get: (r) => r.kernel },
      { header: "edition", get: (r) => r.edition },
      { header: "version", get: (r) => r.full_version },
    ]);
  }
}
