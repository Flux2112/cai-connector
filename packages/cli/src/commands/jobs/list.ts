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
import { listJobs, resolveProject, type Job } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags, projectArg } from "../../lib/flags";

export default class JobsList extends BaseCommand<typeof JobsList> {
  static description = "List the jobs defined in a project.";

  static examples = ["<%= config.bin %> jobs list hanke/analysis --table"];

  static args = { project: projectArg };

  static flags = {
    ...listFlags,
    name: Flags.string({ description: "Only jobs with this name." }),
  };

  public async run(): Promise<Job[]> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const jobs = await listJobs(client, project.id as string, {
      name: this.flags.name,
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    return this.emit(jobs, [
      { header: "id", get: (j) => j.id },
      { header: "name", get: (j) => j.name },
      { header: "script", get: (j) => j.script },
      { header: "schedule", get: (j) => j.english_schedule ?? j.schedule },
      { header: "paused", get: (j) => j.paused },
    ]);
  }
}
