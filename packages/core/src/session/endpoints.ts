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

import type { LogLine } from "../types";
import type { SessionRecord } from "./types";

/**
 * Finding the tunnels. Windows-only by nature: there is no portable way to ask
 * which `cdswctl` processes are serving an SSH endpoint, and `cdswctl` itself is a
 * Windows binary here.
 */

const SCAN_COMMAND =
  "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process | " +
  "Where-Object { $_.Name -eq 'cdswctl.exe' -and $_.CommandLine -like '*ssh-endpoint*' } | " +
  "Select-Object -ExpandProperty ProcessId\"";

/**
 * The pids of every `cdswctl ssh-endpoint` process on this machine.
 *
 * **Returns null when the scan could not run at all**, and null means something
 * entirely different from `[]`: an empty array is evidence that no endpoint is
 * running, null is the absence of evidence. A caller that conflates them declares
 * healthy tunnels dead — or kills them. Cross-checking recorded pids against this
 * list is also what makes the whole scheme immune to pid reuse.
 */
export function listEndpointProcesses(log?: LogLine): Promise<number[] | null> {
  return new Promise((resolve) => {
    cp.exec(SCAN_COMMAND, { encoding: "utf8", windowsHide: true }, (err, stdout) => {
      if (err) {
        log?.(`Endpoint process scan failed: ${String(err)}`);
        resolve(null);
        return;
      }
      resolve(
        stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => /^\d+$/.test(line))
          .map(Number)
          .filter((pid) => pid > 0),
      );
    });
  });
}

/**
 * Endpoint processes no stored session claims.
 *
 * The records must be read *after* the scan: another process can create and
 * record an endpoint while the scan is waiting on PowerShell, and using the
 * stale snapshot would then treat that brand-new tunnel as untracked.
 */
export function untrackedEndpointPids(processPids: number[], records: SessionRecord[]): number[] {
  const tracked = new Set(
    records.map((record) => record.endpointPid).filter((pid): pid is number => pid != null),
  );
  return processPids.filter((pid) => !tracked.has(pid));
}
