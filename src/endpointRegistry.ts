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

import * as cp from "child_process";

/**
 * One running `cdswctl ssh-endpoint` child. The process *is* the SSH tunnel, so
 * it has to outlive the extension host that spawned it — see `surrendered`.
 */
export type ActiveEndpoint = {
  /** Matches the id of the session_history.json record. */
  id: string;
  process: cp.ChildProcess;
  cdswctlPath: string;
  sessionId?: string;
  project: string;
  hostAlias: string;
  /**
   * Set immediately before handing the tunnel to Remote-SSH. A surrendered
   * endpoint is never killed on deactivate(), because the window that is about
   * to open (or reload) needs it alive.
   */
  surrendered: boolean;
};

/**
 * Endpoints this extension host spawned, keyed by session record id.
 *
 * Module state rather than a class instance because `deactivate()` has no access
 * to anything the flows built. It holds only endpoints from *this* host —
 * sessions created by other windows live in session_history.json.
 */
const endpoints = new Map<string, ActiveEndpoint>();

export function registerEndpoint(endpoint: ActiveEndpoint): void {
  endpoints.set(endpoint.id, endpoint);
}

export function getEndpoint(id: string): ActiveEndpoint | undefined {
  return endpoints.get(id);
}

export function listEndpoints(): ActiveEndpoint[] {
  return [...endpoints.values()];
}

export function findEndpointByPid(pid: number | undefined): ActiveEndpoint | undefined {
  if (pid == null) {
    return undefined;
  }
  return listEndpoints().find((ep) => ep.process.pid === pid);
}

export function setSessionId(id: string, sessionId: string): void {
  const ep = endpoints.get(id);
  if (ep) {
    ep.sessionId = sessionId;
  }
}

export function surrenderEndpoint(id: string): void {
  const ep = endpoints.get(id);
  if (ep) {
    ep.surrendered = true;
  }
}

/** Drops an endpoint from the registry without touching the process. */
export function forgetEndpoint(id: string): void {
  endpoints.delete(id);
}

/** Kills the child process and drops it. Safe to call on an already-dead pid. */
export function killEndpoint(id: string): boolean {
  const ep = endpoints.get(id);
  endpoints.delete(id);
  if (!ep?.process.pid) {
    return false;
  }
  try {
    process.kill(ep.process.pid);
    return true;
  } catch {
    return false; // already dead
  }
}

/** Pids of every endpoint this host still tracks, for the orphan sweep. */
export function trackedPids(): number[] {
  return listEndpoints()
    .map((ep) => ep.process.pid)
    .filter((pid): pid is number => pid != null);
}
