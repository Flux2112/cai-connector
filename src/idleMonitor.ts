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

import * as path from "path";
import * as cp from "child_process";
import { EndpointHostConfig, EndpointState } from "./types";

const IDLE_POLL_INTERVAL_MS = 30_000;

type IdleShutdownCallback = (state: EndpointState) => void;

function hasActiveConnections(port: string): Promise<boolean> {
  return new Promise((resolve) => {
    cp.exec(
      `netstat -an | findstr :${port} | findstr ESTABLISHED`,
      { windowsHide: true },
      (_err, stdout) => {
        resolve(typeof stdout === "string" && stdout.trim().length > 0);
      },
    );
  });
}

export function startIdleMonitor(
  port: string,
  config: EndpointHostConfig,
  endpointPid: number | undefined,
  helperPid: number,
  log: (msg: string) => void,
  onShutdown: IdleShutdownCallback,
): void {
  const timeoutMin = config.idleTimeoutMinutes;
  if (!timeoutMin || timeoutMin <= 0) {
    log("Idle monitor disabled (idleTimeoutMinutes = 0).");
    return;
  }

  const threshold = Math.max(1, Math.round((timeoutMin * 60_000) / IDLE_POLL_INTERVAL_MS));
  log(`Idle monitor started (timeout: ${timeoutMin}m, threshold: ${threshold} polls).`);

  let firstConnectionSeen = false;
  let consecutiveIdle = 0;

  const timer = setInterval(async () => {
    const active = await hasActiveConnections(port);

    if (active) {
      if (!firstConnectionSeen) {
        firstConnectionSeen = true;
        log("First SSH connection detected.");
      }
      consecutiveIdle = 0;
      return;
    }

    if (!firstConnectionSeen) {
      return; // Don't count idle before any connection has been made
    }

    consecutiveIdle++;
    log(`No active connections (idle ${consecutiveIdle}/${threshold}).`);

    if (consecutiveIdle >= threshold) {
      clearInterval(timer);
      log(`Shutting down after ${timeoutMin} minutes of inactivity.`);

      const state: EndpointState = {
        status: "error",
        message: `Shut down after ${timeoutMin} minutes of inactivity.`,
        endpointPid,
        helperPid,
        timestamp: new Date().toISOString(),
      };
      onShutdown(state);

      stopCmlSessions(config, log);
    }
  }, IDLE_POLL_INTERVAL_MS);
  timer.unref();
}

function stopCmlSessions(config: EndpointHostConfig, log: (msg: string) => void): void {
  const project = config.project;
  if (!project) {
    return;
  }
  try {
    log(`Stopping CML sessions in project ${project}...`);
    cp.execFileSync(
      config.cdswctlPath,
      ["sessions", "stop", "/p", project, "/a"],
      { windowsHide: true, timeout: 30_000, cwd: path.dirname(config.cdswctlPath) },
    );
    log("CML sessions stopped.");
  } catch (err) {
    log(`Failed to stop CML sessions: ${String(err)}`);
  }
}
