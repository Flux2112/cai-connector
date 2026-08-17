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

export type Job = Schemas["Job"];
export type JobRun = Schemas["JobRun"];

export type ListJobsOptions = ListOptions & {
  /** Filter by job name, as the API's `name` search key does. */
  name?: string;
};

export type ListJobRunsOptions = ListOptions & {
  /** Filter by run status, e.g. `running`, `succeeded`, `failed`. */
  status?: string;
};

export async function listJobs(
  client: CaiClient,
  projectId: string,
  options: ListJobsOptions = {},
): Promise<Job[]> {
  return collect<Job>(
    async (pageToken) => {
      const page = await client.get("/api/v2/projects/{project_id}/jobs", {
        path: { project_id: projectId },
        query: {
          search_filter: searchFilter({ name: options.name }),
          page_size: options.pageSize,
          page_token: pageToken,
        },
      });
      return { items: page.jobs, nextPageToken: page.next_page_token };
    },
    { limit: options.limit },
  );
}

export async function getJob(client: CaiClient, projectId: string, jobId: string): Promise<Job> {
  return client.get("/api/v2/projects/{project_id}/jobs/{job_id}", {
    path: { project_id: projectId, job_id: jobId },
  });
}

export async function listJobRuns(
  client: CaiClient,
  projectId: string,
  jobId: string,
  options: ListJobRunsOptions = {},
): Promise<JobRun[]> {
  return collect<JobRun>(
    async (pageToken) => {
      const page = await client.get("/api/v2/projects/{project_id}/jobs/{job_id}/runs", {
        path: { project_id: projectId, job_id: jobId },
        query: {
          search_filter: searchFilter({ status: options.status }),
          page_size: options.pageSize,
          page_token: pageToken,
        },
      });
      return { items: page.job_runs, nextPageToken: page.next_page_token };
    },
    { limit: options.limit },
  );
}

export async function getJobRun(
  client: CaiClient,
  projectId: string,
  jobId: string,
  runId: string,
): Promise<JobRun> {
  return client.get("/api/v2/projects/{project_id}/jobs/{job_id}/runs/{run_id}", {
    path: { project_id: projectId, job_id: jobId, run_id: runId },
  });
}
