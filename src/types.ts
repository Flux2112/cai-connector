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
  autoStopSessions: boolean | "prompt";
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
};

export type EndpointState = {
  status: "starting" | "ready" | "error";
  message?: string;
  sshCommand?: string;
  userAndHost?: string;
  port?: string;
  endpointPid?: number;
  helperPid?: number;
  timestamp: string;
};
