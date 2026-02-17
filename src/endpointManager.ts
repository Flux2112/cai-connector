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

import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";
import * as vscode from "vscode";
import { EndpointHostConfig, EndpointState, ENDPOINT_POLL_INTERVAL_MS } from "./types";
import { clearFile, isProcessAlive, readState, sleep } from "./utils";

export function startEndpointHost(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  config: EndpointHostConfig,
): number | null {
  output.appendLine(`Idle timeout: ${config.idleTimeoutMinutes} min (0 = disabled)`);
  try {
    fs.mkdirSync(path.dirname(config.statePath), { recursive: true });
    fs.writeFileSync(config.statePath, "", "utf8");

    const configPath = path.join(context.globalStorageUri.fsPath, "endpoint_host_config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    const helperScript = context.asAbsolutePath("out/endpointHost.js");
    if (!fs.existsSync(helperScript)) {
      output.appendLine(`Endpoint host script not found: ${helperScript}`);
      return null;
    }

    const child = cp.spawn(process.execPath, [helperScript, configPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return child.pid ?? null;
  } catch (err) {
    output.appendLine(`Failed to start endpoint host: ${String(err)}`);
    return null;
  }
}

export async function waitForEndpointReady(
  statePath: string,
  output: vscode.OutputChannel,
  timeoutMs: number,
): Promise<EndpointState> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(statePath)) {
      const state = readState(statePath, output);
      if (state?.status === "ready") {
        return state;
      }
      if (state?.status === "error") {
        throw new Error(state.message || "Endpoint host reported an error.");
      }
    }
    await sleep(ENDPOINT_POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for SSH endpoint.");
}

export function stopEndpointHost(statePath: string, output?: vscode.OutputChannel): void {
  if (!fs.existsSync(statePath)) {
    output?.appendLine("No endpoint state file found. Nothing to stop.");
    return;
  }

  const state = readState(statePath, output);
  if (!state) {
    return;
  }

  if (state.helperPid) {
    output?.appendLine(`Killing helper process (PID ${state.helperPid})...`);
    try {
      process.kill(state.helperPid);
    } catch {
      // Already dead
    }
  }

  if (state.endpointPid) {
    output?.appendLine(`Killing endpoint process (PID ${state.endpointPid})...`);
    try {
      process.kill(state.endpointPid);
    } catch {
      // Already dead
    }
  }

  // Clear state file so we don't show stale status
  clearFile(statePath);
}

export async function killOrphanedHelperProcesses(output: vscode.OutputChannel): Promise<void> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      cp.exec(
        "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*endpointHost.js*' -and $_.Name -eq 'node.exe' } | Select-Object -ExpandProperty ProcessId\"",
        { encoding: "utf8", windowsHide: true },
        (err, stdout) => (err ? reject(err) : resolve(stdout)),
      );
    });
    const pids = result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number)
      .filter((pid) => pid && pid !== process.pid);

    for (const pid of pids) {
      output.appendLine(`Killing orphaned helper process (PID ${pid})...`);
      try {
        process.kill(pid);
      } catch {
        // Already dead
      }
    }
  } catch {
    // PowerShell may fail on some systems; best-effort cleanup
  }
}

export async function cleanupExistingEndpoint(statePath: string, output: vscode.OutputChannel): Promise<void> {
  if (fs.existsSync(statePath)) {
    const existing = readState(statePath);
    if (existing?.helperPid && isProcessAlive(existing.helperPid)) {
      output.appendLine("Cleaning up existing endpoint before reconnecting...");
      stopEndpointHost(statePath, output);
    } else {
      clearFile(statePath);
    }
  }
  await killOrphanedHelperProcesses(output);
}
