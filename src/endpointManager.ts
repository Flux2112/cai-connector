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
import * as vscode from "vscode";

const SCAN_COMMAND =
  "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process | " +
  "Where-Object { $_.Name -eq 'cdswctl.exe' -and $_.CommandLine -like '*ssh-endpoint*' } | " +
  "Select-Object -ExpandProperty ProcessId\"";

/**
 * Lists the pids of every `cdswctl ssh-endpoint` process on this machine.
 *
 * Returns null when the scan could not run at all (no PowerShell, blocked by
 * policy). Null and an empty array mean very different things: an empty array is
 * evidence that no endpoint is running, null is the absence of evidence, and
 * callers must never treat the latter as the former — doing so would kill or
 * declare dead tunnels that are perfectly healthy. Windows-only by nature.
 */
export async function listEndpointProcesses(output: vscode.OutputChannel): Promise<number[] | null> {
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      cp.exec(SCAN_COMMAND, { encoding: "utf8", windowsHide: true }, (err, out) =>
        err ? reject(err) : resolve(out),
      );
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number)
      .filter((pid) => pid > 0);
  } catch (err) {
    output.appendLine(`Endpoint process scan failed: ${String(err)}`);
    return null;
  }
}

/**
 * Kills every endpoint process that no stored session claims.
 *
 * `keep` must contain the pid of every session the extension still tracks,
 * including ones another window created and ones still starting up. Anything
 * outside it is a leftover from a crashed host and safe to kill. When the scan
 * itself fails nothing is killed.
 */
export async function killUntrackedEndpointProcesses(
  keep: Iterable<number>,
  output: vscode.OutputChannel,
): Promise<number> {
  const pids = await listEndpointProcesses(output);
  if (pids === null) {
    return 0;
  }
  const tracked = new Set(keep);
  const untracked = pids.filter((pid) => !tracked.has(pid));
  for (const pid of untracked) {
    output.appendLine(`Killing untracked ssh-endpoint process (PID ${pid})...`);
    try {
      process.kill(pid);
    } catch {
      // Already dead
    }
  }
  return untracked.length;
}
