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

import type { CaiClient } from "../client";
import { collect } from "../paginate";
import { searchFilter, type ListOptions, type Schemas } from "./common";

export type WorkloadDetails = Schemas["WorkloadDetails"];
export type ExecutionDetails = Schemas["ExecutionDetails"];

export type ListWorkloadsOptions = ListOptions & {
  /** e.g. "running". The API's only supported filter key here. */
  status?: string;
  /** e.g. "-start_time". */
  sort?: string;
};

export type WorkloadListing = {
  workloads: WorkloadDetails[];
  executions: ExecutionDetails[];
};

/**
 * Every running workload in the workspace, in one paginated call.
 *
 * This is the endpoint that could one day replace the per-project
 * `cdswctl sessions list` in the extension's `reconcileWithCml`. Note the
 * response carries two parallel arrays, so pages are collected whole and
 * flattened afterwards rather than paginated over a single item list —
 * `limit` therefore bounds pages of each, not a combined count.
 */
export async function listWorkloadExecutions(
  client: CaiClient,
  options: ListWorkloadsOptions = {},
): Promise<WorkloadListing> {
  const pages = await collect<WorkloadListing>(
    async (pageToken) => {
      const page = await client.get("/api/v2/workloads/executions", {
        query: {
          search_filter: searchFilter({ status: options.status }),
          sort: options.sort,
          page_size: options.pageSize,
          page_token: pageToken,
        },
      });
      return {
        items: [{ workloads: page.workloads ?? [], executions: page.executions ?? [] }],
        nextPageToken: page.next_page_token,
      };
    },
    { limit: options.limit },
  );

  return {
    workloads: pages.flatMap((p) => p.workloads),
    executions: pages.flatMap((p) => p.executions),
  };
}
