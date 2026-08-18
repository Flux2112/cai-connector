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

import * as net from "net";

import type { SessionRecord } from "./types";

/**
 * The pure half of endpoint creation: the argument list, the two lines worth
 * scraping out of `cdswctl`, and the record shapes.
 *
 * Spawning is deliberately *not* here. The extension pipes `cdswctl`'s stdio and
 * stays alive to read it; the CLI cannot, because it exits while the tunnel must
 * keep running, so it redirects the child's output to a file and tails that
 * instead. Two mechanisms, one set of rules — and the rules are what go wrong.
 */

export type EndpointSpec = {
  /** `owner/project`, as cdswctl wants it. */
  project: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
};

export function buildEndpointArgs(spec: EndpointSpec, localPort?: number): string[] {
  const args = [
    "ssh-endpoint",
    "-p", spec.project,
    "-r", String(spec.runtimeId),
    "-c", String(spec.cpus),
    "-m", String(spec.memoryGb),
    "-g", String(spec.gpus),
  ];
  if (spec.addonId !== null) {
    args.push(`--addons=${String(spec.addonId)}`);
  }
  if (localPort !== undefined) {
    args.push("--port", String(localPort));
  }
  return args;
}

/**
 * The CML session id, as soon as `cdswctl` mentions it.
 *
 * Scraped and stored *before* the endpoint is ready, because if creation then
 * fails this id is the only handle anyone has on a session CML has already
 * started. Without it the session is stranded, burning cluster capacity.
 */
export function matchSessionId(line: string): string | undefined {
  return line.match(/on session\s+(\S+)\s+in project/i)?.[1];
}

export type ReadyEndpoint = {
  port: string;
  userAndHost: string;
};

/** The `ssh -p <port> <user@host>` line that means the tunnel is up. */
export function matchReadyEndpoint(line: string): ReadyEndpoint | undefined {
  const match = line.match(/ssh\s+-p\s+(\d+)\s+(\S+)/);
  return match ? { port: match[1], userAndHost: match[2] } : undefined;
}

/**
 * The record to write **immediately after spawn**, before the endpoint is ready.
 *
 * Until this write lands the pid belongs to no session, and any VS Code window
 * that activates during the startup gap — up to 60 seconds — would sweep it up as
 * untracked and kill the tunnel mid-creation.
 */
export function newSessionRecord(args: {
  id: string;
  spec: EndpointSpec;
  hostAlias: string;
  endpointPid?: number;
  startedAt: string;
}): SessionRecord {
  return {
    id: args.id,
    projectName: args.spec.project,
    runtimeId: args.spec.runtimeId,
    addonId: args.spec.addonId,
    cpus: args.spec.cpus,
    memoryGb: args.spec.memoryGb,
    gpus: args.spec.gpus,
    status: "starting",
    endpointStatus: "running",
    cmlStatus: "unknown",
    hostAlias: args.hostAlias,
    endpointPid: args.endpointPid,
    startedAt: args.startedAt,
  };
}

/** The same record once the tunnel is up: active, with its port. */
export function activateRecord(
  record: SessionRecord,
  ready: ReadyEndpoint,
  sessionId: string | undefined,
  now = new Date(),
): SessionRecord {
  return {
    ...record,
    status: "active",
    endpointStatus: "running",
    cmlStatus: "running",
    port: ready.port,
    sessionId: sessionId ?? record.sessionId,
    lastCheckedAt: now.toISOString(),
  };
}

/**
 * Reserve a local port by binding zero and letting the OS choose.
 *
 * Inherently a hint rather than a guarantee — the socket is closed before
 * `cdswctl` binds it — but it is what keeps two endpoints started at the same
 * time from picking the same port.
 */
export function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    const onError = (err: Error): void => reject(err);
    server.once("error", onError);
    server.listen(0, () => {
      const address = server.address();
      server.removeListener("error", onError);
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Could not determine an available local port.")));
        return;
      }
      server.close((err) => (err ? reject(err) : resolve(address.port)));
    });
  });
}
