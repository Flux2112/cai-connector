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
import { listWorkloadExecutions, type WorkloadListing } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { listFlags } from "../../lib/flags";
import { joinWorkloads, type WorkloadRow } from "../../lib/workloads";

export default class WorkloadsList extends BaseCommand<typeof WorkloadsList> {
  static description =
    "List workload executions across every project the key can see — sessions, jobs, applications and models in one call.";

  static examples = [
    "<%= config.bin %> workloads list --status running --table",
    "<%= config.bin %> workloads list --sort -start_time",
    "<%= config.bin %> workloads list --split",
  ];

  static flags = {
    ...listFlags,
    status: Flags.string({ description: 'Filter by status, e.g. "running".' }),
    sort: Flags.string({ description: 'Sort key, e.g. "-start_time".' }),
    split: Flags.boolean({
      description: "Return the API's two raw arrays instead of joining them into one row per execution.",
    }),
  };

  public async run(): Promise<WorkloadListing | WorkloadRow[]> {
    const listing = await listWorkloadExecutions(this.client(), {
      status: this.flags.status,
      sort: this.flags.sort,
      limit: this.flags.limit,
      pageSize: this.flags["page-size"],
    });

    if (this.flags.split) {
      return this.emit(listing);
    }

    return this.emit(joinWorkloads(listing), [
      { header: "type", get: (r) => r.type },
      { header: "name", get: (r) => r.name },
      { header: "project", get: (r) => r.project },
      { header: "status", get: (r) => r.status },
      { header: "user", get: (r) => r.user },
      { header: "cpu", get: (r) => r.cpu },
      { header: "mem-gb", get: (r) => r.memoryGb },
      { header: "started", get: (r) => r.startTime },
    ]);
  }
}
