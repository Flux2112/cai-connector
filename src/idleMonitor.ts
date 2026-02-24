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
import { EndpointHostConfig } from "./types";

const IDLE_POLL_INTERVAL_MS = 30_000;

type IdleShutdownCallback = (reason: string) => void;

function hasActiveConnections(port: string, log: (msg: string) => void): Promise<boolean> {
  const command = "netstat -an";
  const portNeedle = `:${port}`;
  return new Promise((resolve) => {
    cp.exec(
      command,
      { windowsHide: true },
      (err, stdout, stderr) => {
        const lines = typeof stdout === "string" ? stdout.split(/\r?\n/) : [];
        const active = lines.some((line) => {
          const upper = line.toUpperCase();
          return upper.includes(portNeedle.toUpperCase()) && upper.includes("ESTABLISHED");
        });
        const errMsg = err ? `, err=${String(err)}` : "";
        const stderrMsg = typeof stderr === "string" && stderr.trim().length > 0
          ? `, stderr=${stderr.trim()}`
          : "";
        log(`Idle probe: command='${command}', active=${String(active)}${errMsg}${stderrMsg}`);
        resolve(active);
      },
    );
  });
}

export function startIdleMonitor(
  port: string,
  config: EndpointHostConfig,
  log: (msg: string) => void,
  onShutdown: IdleShutdownCallback,
): { markConnectionSeen: () => void } {
  const timeoutMin = config.idleTimeoutMinutes;
  if (!timeoutMin || timeoutMin <= 0) {
    log("Idle monitor disabled (idleTimeoutMinutes = 0).");
    return {
      markConnectionSeen: () => {
        // no-op when disabled
      },
    };
  }

  const threshold = Math.max(1, Math.round((timeoutMin * 60_000) / IDLE_POLL_INTERVAL_MS));
  log(`Idle monitor started (timeout: ${timeoutMin}m, threshold: ${threshold} polls).`);

  let firstConnectionSeen = false;
  let consecutiveIdle = 0;
  let probesWithoutConnection = 0;

  const markConnectionSeen = (): void => {
    if (!firstConnectionSeen) {
      firstConnectionSeen = true;
      consecutiveIdle = 0;
      log("Connection activity observed from endpoint output; idle counting is now enabled.");
    }
  };

  const timer = setInterval(async () => {
    const active = await hasActiveConnections(port, log);

    if (active) {
      markConnectionSeen();
      consecutiveIdle = 0;
      return;
    }

    if (!firstConnectionSeen) {
      probesWithoutConnection++;
      if (probesWithoutConnection === 1 || probesWithoutConnection % 5 === 0) {
        log(`No connection detected yet (${probesWithoutConnection} probe(s)); idle timer not counting yet.`);
      }
      return; // Don't count idle before any connection has been made
    }

    consecutiveIdle++;
    log(`No active connections (idle ${consecutiveIdle}/${threshold}).`);

    if (consecutiveIdle >= threshold) {
      clearInterval(timer);
      log(`Shutting down after ${timeoutMin} minutes of inactivity.`);
      onShutdown(`Shut down after ${timeoutMin} minutes of inactivity.`);
    }
  }, IDLE_POLL_INTERVAL_MS);
  timer.unref();

  return { markConnectionSeen };
}
