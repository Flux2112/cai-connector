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
import { listJobRuns, resolveProject, type JobRun } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags, projectArg } from "../../lib/flags";

export default class RunsList extends BaseCommand<typeof RunsList> {
  static description = "List the runs of one job.";

  static examples = [
    "<%= config.bin %> runs list hanke/analysis 42 --table",
    "<%= config.bin %> runs list hanke/analysis 42 --status running",
  ];

  static args = {
    project: projectArg,
    job: Args.string({ description: "Job id.", required: true }),
  };

  static flags = {
    ...listFlags,
    status: Flags.string({ description: 'Filter by status, e.g. "running" or "failed".' }),
  };

  public async run(): Promise<JobRun[]> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const runs = await listJobRuns(client, project.id as string, this.args.job, {
      status: this.flags.status,
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    return this.emit(runs, [
      { header: "id", get: (r) => r.id },
      { header: "status", get: (r) => r.status },
      { header: "created", get: (r) => r.created_at },
      { header: "started", get: (r) => r.running_at },
      { header: "finished", get: (r) => r.finished_at },
    ]);
  }
}
