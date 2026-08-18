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

/**
 * The session layer: everything needed to be a second, safe writer to the
 * extension's `session_history.json` and to drive `cdswctl` the way it does.
 *
 * Separate from the API-client half of this package because API v2 has no session
 * endpoints at all — this is process spawning and file writing, it is Windows-only,
 * and nothing in it makes an HTTP request.
 */

export {
  activateRecord,
  buildEndpointArgs,
  findAvailablePort,
  matchReadyEndpoint,
  matchSessionId,
  newSessionRecord,
  type EndpointSpec,
  type ReadyEndpoint,
} from "./endpoint";
export {
  listEndpointProcesses,
  untrackedEndpointPids,
} from "./endpoints";
export {
  addOrUpdateSession,
  historyFile,
  loadHistory,
  markSessionStopped,
  patchSession,
  saveHistory,
  takenHostAliases,
} from "./history";
export {
  resolveCdswctl,
  runCdswctl,
  stopCmlSession,
  stoppedSuccessfully,
  type CdswctlResult,
} from "./cdswctl";
export {
  cdswctlLogin,
  KEY_VAR,
  loginUsername,
  type LoginOptions,
} from "./login";
export {
  listCdswctlRuntimes,
  matchRuntimes,
  type CdswctlRuntime,
} from "./runtimes";
export {
  extensionStoragePath,
  isProcessAlive,
} from "./storage";
export {
  assignHostAlias,
  isManagedAlias,
  remoteUriFor,
  slugForProject,
} from "./sshAlias";
export {
  sshEntriesFromRecords,
  syncSshConfig,
  type SshHostEntry,
} from "./sshConfig";
export {
  capRecords,
  cmlStatusOf,
  endpointStatusOf,
  isLive,
  isOrphanedOnCml,
  isStaleEndpoint,
  isStuckStarting,
  parseSessionIds,
  rollUpStatus,
  STARTING_GRACE_MS,
  statusProblem,
  statusSummary,
} from "./status";
export {
  CDSWCTL_TIMEOUT_MS,
  ENDPOINT_READY_TIMEOUT_MS,
  EXTENSION_ID,
  HISTORY_FILE,
  MAX_SESSION_RECORDS,
  REMOTE_PATH,
  SESSION_FILE,
  SSH_HOST_PREFIX,
  type CmlStatus,
  type EndpointStatus,
  type SessionRecord,
  type SessionStatus,
} from "./types";
