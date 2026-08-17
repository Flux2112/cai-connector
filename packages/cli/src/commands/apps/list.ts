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
import { listApplications, resolveProject, type Application } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags, projectArg } from "../../lib/flags";

export default class AppsList extends BaseCommand<typeof AppsList> {
  static description = "List the applications of one project.";

  static examples = [
    "<%= config.bin %> apps list hanke/analysis --table",
    "<%= config.bin %> apps list hanke/analysis --status running",
  ];

  static args = {
    project: projectArg,
  };

  static flags = {
    ...listFlags,
    status: Flags.string({
      description: "Filter by status.",
      options: ["running", "starting", "stopping", "stopped", "failed"],
    }),
    sort: Flags.string({ description: "The API's sort syntax, e.g. -updated_at,name." }),
  };

  public async run(): Promise<Application[]> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const apps = await listApplications(client, project.id as string, {
      status: this.flags.status,
      sort: this.flags.sort,
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    return this.emit(apps, [
      { header: "id", get: (a) => a.id },
      { header: "name", get: (a) => a.name },
      { header: "status", get: (a) => a.status },
      { header: "subdomain", get: (a) => a.subdomain },
      { header: "script", get: (a) => a.script },
    ]);
  }
}
