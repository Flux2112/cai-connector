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
import { getJob, resolveProject, type Job } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { projectArg } from "../../lib/flags";

export default class JobsGet extends BaseCommand<typeof JobsGet> {
  static description = "Show one job.";

  static examples = ["<%= config.bin %> jobs get hanke/analysis 42"];

  static args = {
    project: projectArg,
    job: Args.string({ description: "Job id.", required: true }),
  };

  public async run(): Promise<Job> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const job = await getJob(client, project.id as string, this.args.job);

    return this.emit(job, [
      { header: "id", get: (j) => j.id },
      { header: "name", get: (j) => j.name },
      { header: "script", get: (j) => j.script },
      { header: "kernel", get: (j) => j.kernel },
      { header: "paused", get: (j) => j.paused },
    ]);
  }
}
