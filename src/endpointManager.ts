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

export async function killOrphanedEndpointProcesses(output: vscode.OutputChannel): Promise<number> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      cp.exec(
        "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'cdswctl.exe' -and $_.CommandLine -like '*ssh-endpoint*' } | Select-Object -ExpandProperty ProcessId\"",
        { encoding: "utf8", windowsHide: true },
        (err, stdout) => (err ? reject(err) : resolve(stdout)),
      );
    });

    const pids = result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number)
      .filter((pid) => pid > 0);

    for (const pid of pids) {
      output.appendLine(`Killing orphaned ssh-endpoint process (PID ${pid})...`);
      try {
        process.kill(pid);
      } catch {
        // Already dead
      }
    }
    return pids.length;
  } catch {
    // PowerShell may fail on some systems; best-effort cleanup
    return 0;
  }
}
