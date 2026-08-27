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
import { CaiRequestError } from "../errors";
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

/**
 * The fields `UpdateJob` actually honours.
 *
 * Deliberately narrower than {@link CreateJobOptions}, because three fields the
 * `Job` schema carries are accepted with a 200 and then ignored — verified
 * against a live instance on 2026-08-27: `paused`, `timezone` and `recipients`
 * (along with the `*_recipients` strings) come back unchanged on the very
 * response that reported success. There is no pause operation anywhere in API
 * v2 either, so pausing, unpausing or fixing a job's timezone means recreating
 * it. An option that silently does nothing is worse than an absent one, so they
 * are absent.
 *
 * `kernel` is left out for the opposite reason: `UpdateJob` accepts it on an ML
 * Runtimes project, where `CreateJob` refuses it, leaving a job carrying both a
 * kernel and a runtime identifier. The caller that needs it on a legacy-engine
 * project can reach it through `client.patch`.
 */
export type UpdateJobOptions = {
  name?: string;
  /** Validated against the project's files, exactly as on create. */
  script?: string;
  /**
   * Required whenever `addonIdentifiers` is set, and worth thinking about on
   * its own: a runtime sent without addons resets them to the API's defaults.
   */
  runtimeIdentifier?: string;
  /**
   * Only legal together with `runtimeIdentifier` — alone it is a 500,
   * `failed to fetch existing runtime for job`. Sending `[]` does not empty the
   * list; the API refills it with its own defaults, the same way it does on
   * create.
   */
  addonIdentifiers?: string[];
  cpus?: number;
  memoryGb?: number;
  gpus?: number;
  /** `""` genuinely clears it, unlike `environment`. */
  arguments?: string;
  /**
   * Sent as a JSON *string*, which is the asymmetry that makes this wrapper
   * worth having: `CreateJob` takes an object here and `UpdateJob` answers one
   * with `cannot unmarshal object into Go value of type string`. `{}` clears
   * it; `""` is read as unset and leaves it alone.
   */
  environment?: Record<string, string>;
  /**
   * A cron expression, or `""` to turn a scheduled job back into a manual one —
   * the read-only `type` follows either way.
   */
  schedule?: string;
  timeoutSeconds?: number;
  killOnTimeout?: boolean;
};

/**
 * Update a job in place.
 *
 * A genuine partial update despite the spec declaring no field mask: fields the
 * body omits are left alone, and the response is the updated job, identical to
 * what a follow-up `GetJob` returns.
 *
 * Modifying rather than deleting, so it sits inside the safe-writes rule — but
 * it is the one operation here that can quietly change something a scheduled job
 * depends on, so callers should check the returned job rather than assume the
 * 200 means what they asked for happened.
 */
export async function updateJob(
  client: CaiClient,
  projectId: string,
  jobId: string,
  options: UpdateJobOptions,
): Promise<Job> {
  if (options.addonIdentifiers !== undefined && options.runtimeIdentifier === undefined) {
    throw new CaiRequestError(
      "runtime addons can only be updated together with the runtime identifier; " +
        "send the job's current runtime_identifier alongside them",
    );
  }

  return client.patch("/api/v2/projects/{project_id}/jobs/{job.id}", {
    path: { project_id: projectId, "job.id": jobId },
    body: {
      name: options.name,
      script: options.script,
      runtime_identifier: options.runtimeIdentifier,
      runtime_addon_identifiers: options.addonIdentifiers,
      cpu: options.cpus,
      memory: options.memoryGb,
      nvidia_gpu: options.gpus,
      arguments: options.arguments,
      environment: options.environment === undefined ? undefined : JSON.stringify(options.environment),
      schedule: options.schedule,
      timeout: options.timeoutSeconds === undefined ? undefined : String(options.timeoutSeconds),
      kill_on_timeout: options.killOnTimeout,
    },
  });
}
