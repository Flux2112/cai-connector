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

export type JobRun = Schemas["JobRun"];

export type ListJobRunsOptions = ListOptions & {
  /** Filter by run status, e.g. `running`, `succeeded`, `failed`. */
  status?: string;
};

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

export type CreateJobRunOptions = {
  /** Environment variables for this run only. */
  environment?: Record<string, string>;
  /** Arguments passed to the job's script, as one string. */
  arguments?: string;
};

/** Start one run of an existing job. Creates nothing else. */
export async function createJobRun(
  client: CaiClient,
  projectId: string,
  jobId: string,
  options: CreateJobRunOptions = {},
): Promise<JobRun> {
  return client.post("/api/v2/projects/{project_id}/jobs/{job_id}/runs", {
    path: { project_id: projectId, job_id: jobId },
    body: { environment: options.environment, arguments: options.arguments },
  });
}

/** Stop one run. The API encodes this as a custom method (`:stop`) rather than a
 *  DELETE, so nothing about it reaches a destructive verb. */
export async function stopJobRun(
  client: CaiClient,
  projectId: string,
  jobId: string,
  runId: string,
): Promise<JobRun> {
  return client.post("/api/v2/projects/{project_id}/jobs/{job_id}/runs/{run_id}:stop", {
    path: { project_id: projectId, job_id: jobId, run_id: runId },
  });
}

/**
 * The `EngineStatus` values a run does not leave.
 *
 * `ENGINE_STOPPING` is deliberately absent — it becomes `ENGINE_STOPPED` — and
 * so is `ENGINE_UNKNOWN`: treating "we do not know" as finished is the same
 * mistake as reading a failed listing as "the thing is gone".
 */
export const FINISHED_RUN_STATUSES: readonly string[] = [
  "ENGINE_SUCCEEDED",
  "ENGINE_FAILED",
  "ENGINE_TIMEDOUT",
  "ENGINE_STOPPED",
  "ENGINE_SKIPPED",
];

export function isRunFinished(status: string | undefined): boolean {
  return status !== undefined && FINISHED_RUN_STATUSES.includes(status);
}

export function isRunSuccessful(status: string | undefined): boolean {
  return status === "ENGINE_SUCCEEDED";
}

export const DEFAULT_POLL_INTERVAL_MS = 5_000;

export type WaitOptions = {
  /** Between polls. */
  intervalMs?: number;
  /** Give up after this long. 0 waits indefinitely. */
  timeoutMs?: number;
  /** Called once per poll, for progress reporting. */
  onPoll?: (run: JobRun) => void;
  /** Injected so a test does not have to spend real time. */
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

/**
 * Poll one run until it finishes.
 *
 * Returns the last run it saw, finished or not — a timeout is not an error
 * here, because the run is still perfectly real and the caller needs its id and
 * status to say anything useful about it. `isRunFinished(run.status)` tells the
 * two outcomes apart.
 *
 * The clock and the sleep are injected for the same reason the transport is: so
 * the package stays testable without spending wall-clock time.
 */
export async function waitForJobRun(
  client: CaiClient,
  projectId: string,
  jobId: string,
  runId: string,
  options: WaitOptions = {},
): Promise<JobRun> {
  const interval = options.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeout = options.timeoutMs ?? 0;
  const now = options.now ?? (() => Date.now());
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const deadline = timeout > 0 ? now() + timeout : Infinity;

  let run = await getJobRun(client, projectId, jobId, runId);
  options.onPoll?.(run);

  while (!isRunFinished(run.status)) {
    /* Checked before sleeping rather than after: a poll that could only land
     * past the deadline is one the caller has already decided not to wait for. */
    if (now() + interval > deadline) {
      return run;
    }
    await sleep(interval);
    run = await getJobRun(client, projectId, jobId, runId);
    options.onPoll?.(run);
  }

  return run;
}
