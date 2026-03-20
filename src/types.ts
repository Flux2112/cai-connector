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

export type EndpointHostConfig = {
  cdswctlPath: string;
  args: string[];
  statePath: string;
  logPath: string;
  project: string;
  idleTimeoutMinutes: number;
};

export type EndpointState = {
  status: "starting" | "ready" | "error";
  message?: string;
  sshCommand?: string;
  userAndHost?: string;
  port?: string;
  sessionId?: string;
  endpointPid?: number;
  helperPid?: number;
  timestamp: string;
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
  helperPid?: number;
  endpointPid?: number;
  startedAt: string;
};

// Shared constants
export const SECRET_KEY = "CML_API_KEY";
export const STATE_FILE = "endpoint_state.json";
export const HISTORY_FILE = "session_history.json";
export const HOST_CONFIG_FILE = "endpoint_host_config.json";
export const LOG_FILE = "endpoint_host.log";
export const CACHE_FILE = "runtimes_cache.json";
export const SESSION_FILE = "last_session.json";
export const CDSWCTL_TIMEOUT_MS = 30000;
export const ENDPOINT_READY_TIMEOUT_MS = 60000;
export const ENDPOINT_POLL_INTERVAL_MS = 500;
export const REMOTE_URI = "vscode-remote://ssh-remote+cml/home/cdsw";
