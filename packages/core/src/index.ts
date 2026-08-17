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

export { createClient, type CaiClient } from "./client";
export { CaiApiError, CaiError, CaiRequestError, CaiTransportError } from "./errors";
export { buildMultipart, multipartBoundary, type MultipartPart } from "./multipart";
export { collect, paginate, type Page, type PaginateOptions } from "./paginate";
export { redact } from "./redact";
export { buildPath, buildQuery, joinUrl } from "./url";

export {
  DEFAULT_TIMEOUT_MS,
  MAX_PAGES,
  type ClientOptions,
  type FetchInit,
  type FetchLike,
  type FetchResponse,
  type HttpMethod,
  type LogLine,
  type RawBody,
  type RawRequestOptions,
} from "./types";

/** The generated spec surface, for callers that want to name a type directly. */
export type { components, operations, paths } from "./generated/schema";

export {
  getApplication,
  listApplications,
  restartApplication,
  stopApplication,
  type Application,
  type ListApplicationsOptions,
} from "./operations/applications";
export { validateKey, whoami, type KeyAudience, type KeyValidation } from "./operations/auth";
export { searchFilter, type ListOptions } from "./operations/common";
export {
  assertUploadPath,
  downloadFile,
  listFiles,
  ROOT,
  uploadFile,
  type FileInfo,
} from "./operations/files";
export { getJob, listJobs, type Job, type ListJobsOptions } from "./operations/jobs";
export {
  getProject,
  listProjects,
  projectRef,
  resolveProject,
  type ListProjectsOptions,
  type Project,
} from "./operations/projects";
export {
  createJobRun,
  DEFAULT_POLL_INTERVAL_MS,
  FINISHED_RUN_STATUSES,
  getJobRun,
  isRunFinished,
  isRunSuccessful,
  listJobRuns,
  stopJobRun,
  waitForJobRun,
  type CreateJobRunOptions,
  type JobRun,
  type ListJobRunsOptions,
  type WaitOptions,
} from "./operations/runs";
export { listRuntimes, type ListRuntimesOptions, type Runtime } from "./operations/runtimes";
export {
  listWorkloadExecutions,
  type ExecutionDetails,
  type ListWorkloadsOptions,
  type WorkloadDetails,
  type WorkloadListing,
} from "./operations/workloads";
