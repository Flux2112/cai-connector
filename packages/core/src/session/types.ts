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
 * The session layer's own vocabulary.
 *
 * A faithful port of the extension's `src/types.ts`, restricted to what a
 * second writer to `session_history.json` needs. The names and the JSON shape
 * are the extension's, and must stay that way: the two processes read each
 * other's records, so a field renamed here is a session the sidebar cannot see.
 */

/** Is the local cdswctl tunnel process for this session still running? */
export type EndpointStatus = "running" | "stopped" | "unknown";

/** Is the session still running on the CML platform? */
export type CmlStatus = "running" | "stopped" | "unknown";

/**
 * Roll-up of the two statuses above. `error` means they disagree: either a
 * tunnel into a session CML has already ended, or — the case that matters — a
 * CML session still burning capacity with no local endpoint to reach it.
 */
export type SessionStatus = "starting" | "active" | "inactive" | "error";

export type SessionRecord = {
  id: string;
  projectName: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
  status: SessionStatus;
  /** Local tunnel process. Absent on records written before parallel sessions. */
  endpointStatus?: EndpointStatus;
  /** Remote CML session. Absent until something has asked CML. */
  cmlStatus?: CmlStatus;
  /** `Host` alias in ~/.ssh/config owned by this session, e.g. `cml-my-project`. */
  hostAlias?: string;
  port?: string;
  sessionId?: string;
  endpointPid?: number;
  startedAt: string;
  /** ISO timestamp of the last check that touched the two statuses. */
  lastCheckedAt?: string;
};

/** The extension's identifier, which is also its globalStorage directory name. */
export const EXTENSION_ID = "defysoftwaresolutions.cai-connector";

export const HISTORY_FILE = "session_history.json";
export const SESSION_FILE = "last_session.json";

export const CDSWCTL_TIMEOUT_MS = 30_000;
export const ENDPOINT_READY_TIMEOUT_MS = 60_000;

/** Every SSH host alias this project owns starts with this. */
export const SSH_HOST_PREFIX = "cml";
export const REMOTE_PATH = "/home/cdsw";

/**
 * Records kept in `session_history.json`. Only `inactive` records are ever
 * discarded by the cap — dropping a running session would make its endpoint look
 * untracked to the next orphan sweep, which would then kill a tunnel somebody is
 * using.
 */
export const MAX_SESSION_RECORDS = 8;
