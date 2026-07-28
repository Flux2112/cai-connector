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

export type RuntimeData = {
  id: number;
  imageIdentifier: string;
  editor: string;
  kernel: string;
  edition: string;
  shortVersion: string;
  fullVersion: string;
  description: string;
};

export type RuntimeCache = {
  timestamp: string;
  runtimes: RuntimeData[];
};

export type RuntimeAddonData = {
  id: number;
  component: string;
  displayName: string;
};

export type LastSessionConfig = {
  projectName: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
  sessionId?: string;
  timestamp: string;
  // Set when the user explicitly disconnects; absence means session was active on last save
  disconnectedAt?: string;
};

export type ConnectParams = {
  project: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memory: number;
  gpus: number;
  cdswctlPath: string;
  // string = specific CML session ID to stop (extension-owned); false = skip
  autoStopSessions: string | false;
};

export type ResourceInput = {
  cpus: number;
  memoryGb: number;
  gpus: number;
};

/** Result of validating one form field. Warnings inform; errors block submission. */
export type FieldIssue = {
  severity: "error" | "warning";
  message: string;
};

export type SessionFormMode = "create" | "edit";

/** A previous session offered for one-click recall in the form. */
export type SessionFormRecent = {
  id: string;
  projectName: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
  status: SessionRecord["status"];
  port?: string;
  startedAt: string;
  runtimeLabel: string;
  addonLabel: string | null;
};

/** Everything the webview needs to render. Never carries secrets. */
export type SessionFormInit = {
  mode: SessionFormMode;
  username: string;
  runtimes: RuntimeData[];
  addons: RuntimeAddonData[];
  recents: SessionFormRecent[];
  cpuProfiles: number[];
  memoryProfiles: number[];
  latestRuntimesOnly: boolean;
  runtimesFromCache: boolean;
  readyTimeoutMs: number;
  prefill: ResourceInput & { project: string; runtimeId: number | null; addonId: number | null };
  editTarget: { id: string; projectName: string; status: SessionRecord["status"] } | null;
};

/** A validated submission. Produced only by validateSessionForm. */
export type SessionFormValues = {
  project: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
  saveAsDefaults: boolean;
};

export type SessionFormSummary = {
  project: string;
  detail: string;
};

export type HostToWebviewMessage =
  | { type: "init"; init: SessionFormInit }
  | { type: "runtimes"; runtimes: RuntimeData[]; fromCache: boolean }
  | { type: "invalid"; errors: string[] }
  | {
      type: "progress";
      step: EndpointProgressStep;
      detail?: string;
      elapsedMs: number;
      summary: SessionFormSummary;
    }
  | { type: "failed"; message: string }
  | { type: "banner"; message: string | null };

export type WebviewToHostMessage =
  | { type: "ready" }
  | { type: "submit"; payload: unknown }
  | { type: "cancel" }
  | { type: "refreshRuntimes" }
  | { type: "showOutput" };

/** Named phases of endpoint creation, mirroring what executeConnect scrapes. */
export type EndpointProgressStep =
  | "stopping-previous"
  | "spawned"
  | "session-created"
  | "endpoint-ready"
  | "ssh-config"
  | "opening-window";

export type ProgressReporter = (step: EndpointProgressStep, detail?: string) => void;

export type EndpointState = {
  status: "starting" | "ready" | "error";
  message?: string;
  sshCommand?: string;
  userAndHost?: string;
  port?: string;
  sessionId?: string;
  endpointPid?: number;
  timestamp: string;
  // Resource info embedded for session panel reactivity
  project?: string;
  runtimeId?: number;
  addonId?: number | null;
  cpus?: number;
  memoryGb?: number;
  gpus?: number;
};

export type SessionRecord = {
  id: string;
  projectName: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
  status: "active" | "inactive" | "error";
  port?: string;
  sessionId?: string;
  endpointPid?: number;
  startedAt: string;
};

// Shared constants
export const SECRET_KEY = "CML_API_KEY";
export const STATE_FILE = "endpoint_state.json";
export const HISTORY_FILE = "session_history.json";
export const CACHE_FILE = "runtimes_cache.json";
export const SESSION_FILE = "last_session.json";
export const CDSWCTL_TIMEOUT_MS = 30000;
// Fallbacks when caiConnector.cpuProfiles / memoryProfiles are unset. These are
// suggestions shown as one-click chips, not a whitelist — see validateCpus.
export const DEFAULT_CPU_PROFILES = [0.5, 1, 2, 4, 8];
export const DEFAULT_MEMORY_PROFILES = [2, 4, 8, 16, 32];
export const ENDPOINT_READY_TIMEOUT_MS = 60000;
export const ENDPOINT_POLL_INTERVAL_MS = 500;
export const REMOTE_URI = "vscode-remote://ssh-remote+cml/home/cdsw";
