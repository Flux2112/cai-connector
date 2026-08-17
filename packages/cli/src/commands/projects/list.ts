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
import { listProjects, type Project } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags } from "../../lib/flags";

export default class ProjectsList extends BaseCommand<typeof ProjectsList> {
  static description = "List projects visible to the API key.";

  static examples = [
    "<%= config.bin %> projects list --table",
    "<%= config.bin %> projects list --owner hanke --limit 10",
  ];

  static flags = {
    ...listFlags,
    owner: Flags.string({ description: "Only projects owned by this username." }),
    name: Flags.string({ description: "Only projects with this name." }),
    "include-public": Flags.boolean({
      description: "Include projects the key can see but does not own.",
    }),
  };

  public async run(): Promise<Project[]> {
    const projects = await listProjects(this.client(), {
      owner: this.flags.owner,
      name: this.flags.name,
      includePublic: this.flags["include-public"],
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    return this.emit(projects, [
      { header: "id", get: (p) => p.id },
      { header: "owner", get: (p) => p.owner?.username },
      { header: "name", get: (p) => p.name },
      { header: "visibility", get: (p) => p.visibility },
      { header: "updated", get: (p) => p.updated_at },
    ]);
  }
}
