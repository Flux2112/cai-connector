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

import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import {
  matchReadyEndpoint,
  matchSessionId,
  type ReadyEndpoint,
} from "@defysoftware/cai-core";

/**
 * Spawning the tunnel from a process that is about to exit.
 *
 * **This is where the CLI differs from the extension, and it has to.** The
 * extension pipes `cdswctl`'s stdio and stays alive to read it; the CLI exits
 * while the tunnel must keep running, and a piped stdio whose reader has gone is
 * a broken pipe waiting to kill the child. So the child's output goes to a log
 * file it owns, and this tails that file to scrape the same two lines. The log is
 * also the only record of what a failed endpoint said, which the extension gets
 * from its output channel.
 */

/** How often the log is re-read while waiting. The endpoint takes tens of
 *  seconds, so this is about responsiveness, not throughput. */
const POLL_INTERVAL_MS = 250;

export type SpawnedTunnel = {
  pid?: number;
  logFile: string;
  /** Resolves with the ready endpoint, or null if it never came up. */
  waitForReady(timeoutMs: number): Promise<ReadyEndpoint | null>;
  /** Stop watching. The child is deliberately left running. */
  release(): void;
};

export type SpawnOptions = {
  cdswctlPath: string;
  args: string[];
  logFile: string;
  /** Called once, as soon as cdswctl names the CML session. */
  onSessionId?: (sessionId: string) => void;
  onLine?: (line: string) => void;
};

export function spawnTunnel(options: SpawnOptions): SpawnedTunnel {
  fs.mkdirSync(path.dirname(options.logFile), { recursive: true });
  const fd = fs.openSync(options.logFile, "a");

  const child = cp.spawn(options.cdswctlPath, options.args, {
    windowsHide: true,
    cwd: path.dirname(options.cdswctlPath),
    detached: true,
    /* No pipe anywhere: nothing the child writes depends on this process still
     * being alive to read it. stdin is /dev/null because cdswctl never asks. */
    stdio: ["ignore", fd, fd],
  });
  /* Our handle on the log is not the child's; closing it changes nothing for it. */
  fs.closeSync(fd);
  child.unref();

  let exited = false;
  child.on("exit", () => {
    exited = true;
  });
  /* A spawn failure surfaces as an exit for our purposes: either way no endpoint
   * is coming, and the log holds whatever was said about it. */
  child.on("error", () => {
    exited = true;
  });

  let offset = 0;
  let carry = "";
  let sessionIdSeen = false;
  let ready: ReadyEndpoint | null = null;

  const drain = (): void => {
    let chunk: string;
    try {
      const stat = fs.statSync(options.logFile);
      if (stat.size <= offset) {
        return;
      }
      const handle = fs.openSync(options.logFile, "r");
      const buffer = Buffer.alloc(stat.size - offset);
      fs.readSync(handle, buffer, 0, buffer.length, offset);
      fs.closeSync(handle);
      offset = stat.size;
      chunk = buffer.toString("utf8");
    } catch {
      /* The file may not exist yet, or be momentarily locked. Try again later. */
      return;
    }

    const lines = (carry + chunk).split(/\r?\n/);
    carry = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trimEnd();
      if (!line) {
        continue;
      }
      options.onLine?.(line);

      if (!sessionIdSeen) {
        const sessionId = matchSessionId(line);
        if (sessionId) {
          sessionIdSeen = true;
          options.onSessionId?.(sessionId);
        }
      }
      if (!ready) {
        ready = matchReadyEndpoint(line) ?? null;
      }
    }
  };

  let timer: NodeJS.Timeout | undefined;

  return {
    pid: child.pid,
    logFile: options.logFile,

    waitForReady(timeoutMs: number): Promise<ReadyEndpoint | null> {
      const deadline = Date.now() + timeoutMs;
      return new Promise<ReadyEndpoint | null>((resolve) => {
        const tick = (): void => {
          drain();
          if (ready) {
            resolve(ready);
            return;
          }
          if (exited) {
            /* One last read: the reason it exited is in the file. */
            drain();
            resolve(ready);
            return;
          }
          if (Date.now() >= deadline) {
            resolve(null);
            return;
          }
          timer = setTimeout(tick, POLL_INTERVAL_MS);
        };
        tick();
      });
    },

    release(): void {
      if (timer) {
        clearTimeout(timer);
      }
      child.removeAllListeners();
    },
  };
}
