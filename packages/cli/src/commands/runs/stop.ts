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
import { resolveProject, stopJobRun, type JobRun } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { projectArg } from "../../lib/flags";

export default class RunsStop extends BaseCommand<typeof RunsStop> {
  static description =
    "Stop one job run. Named explicitly by id — there is no flag that stops every run of a job.";

  static examples = ["<%= config.bin %> runs stop hanke/analysis 42 t7k2m9pq1x"];

  static args = {
    project: projectArg,
    job: Args.string({ description: "Job id.", required: true }),
    run: Args.string({ description: "Job run id.", required: true }),
  };

  public async run(): Promise<JobRun> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const run = await stopJobRun(client, project.id as string, this.args.job, this.args.run);

    return this.emit(run, [
      { header: "id", get: (r) => r.id },
      { header: "status", get: (r) => r.status },
      { header: "finished", get: (r) => r.finished_at },
    ]);
  }
}
