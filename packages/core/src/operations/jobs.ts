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

export type ListJobsOptions = ListOptions & {
  /** Filter by job name, as the API's `name` search key does. */
  name?: string;
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

export type CreateJobOptions = {
  name: string;
  /** Path to the script, relative to the project root. */
  script: string;
  /**
   * Required on an ML Runtimes project, and forbidden on a legacy-engine one.
   *
   * The spec is explicit both ways: `runtime_identifier` "must be set if using
   * ML Runtimes" and `kernel` "should not be set if the project uses ML
   * Runtimes". A project's `default_engine_type` says which it is, so a caller
   * can decide without guessing.
   */
  runtimeIdentifier?: string;
  /** Legacy-engine projects only: `python3`, `python2`, `r` or `scala`. */
  kernel?: string;
  /** Runtime addons, e.g. a Spark or Hadoop CLI addon the script needs. */
  addonIdentifiers?: string[];
  cpus?: number;
  memoryGb?: number;
  gpus?: number;
  /**
   * The `arguments` string reaches a run as the `JOB_ARGUMENTS` environment
   * variable, not as argv. Splitting it into arguments is the script's own job.
   */
  arguments?: string;
  /** Default environment for every run of this job. */
  environment?: Record<string, string>;
  /** Cron, e.g. `0 3 * * *`. Absent means a manual job. */
  schedule?: string;
  /**
   * Only meaningful with a schedule — and worth passing whenever there is one,
   * because the API's default is `America/Los_Angeles` rather than anything
   * derived from the caller.
   */
  timezone?: string;
  /** Scheduled jobs are created running unless this says otherwise. */
  paused?: boolean;
  /** Seconds. `killOnTimeout` does nothing without it. */
  timeoutSeconds?: number;
  killOnTimeout?: boolean;
  /** Makes this job run after another one finishes. */
  parentJobId?: string;
};

/**
 * Create a job.
 *
 * Additive, so it sits inside the safe-writes rule — but note that nothing in
 * this package or the CLI deletes a job again, so a job created by mistake has
 * to be removed from the CML UI.
 */
export async function createJob(
  client: CaiClient,
  projectId: string,
  options: CreateJobOptions,
): Promise<Job> {
  return client.post("/api/v2/projects/{project_id}/jobs", {
    path: { project_id: projectId },
    body: {
      name: options.name,
      script: options.script,
      runtime_identifier: options.runtimeIdentifier,
      kernel: options.kernel,
      runtime_addon_identifiers: options.addonIdentifiers,
      cpu: options.cpus,
      memory: options.memoryGb,
      nvidia_gpu: options.gpus,
      arguments: options.arguments,
      environment: options.environment,
      schedule: options.schedule,
      timezone: options.timezone,
      paused: options.paused,
      timeout: options.timeoutSeconds,
      kill_on_timeout: options.killOnTimeout,
      parent_job_id: options.parentJobId,
    },
  });
}
