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

import type { WorkloadListing } from "@defysoftware/cai-core";

/** One execution with the workload it belongs to folded in. */
export type WorkloadRow = {
  type?: string;
  name?: string;
  project?: string;
  status?: string;
  user?: string;
  startTime?: string;
  endTime?: string;
  cpu?: number;
  memoryGb?: number;
  gpu?: number;
  podName?: string;
  runtime?: string;
  workloadCrn?: string;
  executionCrn?: string;
};

/**
 * Join the response's two parallel arrays on `workload_crn`.
 *
 * `/workloads/executions` answers with `workloads` (what the thing is) and
 * `executions` (what it is doing right now) side by side, related only by that
 * key. Neither half alone answers "what is running", so the rows are built from
 * executions and the workload is looked up — an execution whose workload is
 * missing from the page is still reported, because a partial row beats dropping
 * a running workload from the listing.
 */
export function joinWorkloads(listing: WorkloadListing): WorkloadRow[] {
  const byCrn = new Map(
    listing.workloads.filter((w) => w.workload_crn).map((w) => [w.workload_crn as string, w]),
  );

  return listing.executions.map((execution) => {
    const workload = execution.workload_crn ? byCrn.get(execution.workload_crn) : undefined;
    return {
      type: workload?.workload_type,
      name: workload?.workload_name,
      project: workload?.project?.name,
      status: execution.status,
      user: execution.run_as_user_name ?? workload?.creator_user_name,
      startTime: execution.start_time,
      endTime: execution.end_time,
      cpu: execution.allocated_cpu_cores,
      memoryGb: execution.allocated_memory_gb,
      gpu: execution.allocated_gpu_cores,
      podName: execution.pod_name,
      runtime: execution.runtime?.full_version,
      workloadCrn: execution.workload_crn,
      executionCrn: execution.workload_execution_crn,
    };
  });
}
