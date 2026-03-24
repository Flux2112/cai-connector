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

import * as vscode from "vscode";
import { resolveAndLogin } from "./auth";
import { killOrphanedEndpointProcesses } from "./endpointManager";
import { RuntimeManager } from "./runtimeManager";
import { pickRuntime, fetchRuntimeAddons, pickRuntimeAddon } from "./runtimePicker";
import { clearActiveEndpoint, executeConnect } from "./sessionManager";
import { loadLastSession, saveLastSession, setActiveProject } from "./state";
import { CACHE_FILE } from "./types";
import { getStoragePath } from "./utils";

export async function reconnectFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  silent = false,
): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  if (!silent) {
    output.show(true);
  }

  const lastSession = loadLastSession(context);
  if (!lastSession) {
    vscode.window.showInformationMessage("No previous session found.");
    return;
  }

  const config = vscode.workspace.getConfiguration("caiConnector");
  const cacheHours = config.get<number>("cacheHours", 24);
  const cachePath = getStoragePath(context, CACHE_FILE);

  clearActiveEndpoint();
  const _killedOrphans = await killOrphanedEndpointProcesses(output);
  if (_killedOrphans > 0) {
    output.appendLine(`Orphan cleanup: ${_killedOrphans} ssh-endpoint process(es).`);
  }

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  // Validate saved runtime against cache
  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const fetchSuccess = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!fetchSuccess) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  let runtimeId = lastSession.runtimeId;
  const allRuntimes = runtimeManager.getAll();
  const savedRuntime = allRuntimes.find((r) => r.id === runtimeId);

  if (!savedRuntime) {
    output.appendLine(`Saved runtime ID ${runtimeId} no longer exists. Showing runtime picker...`);
    vscode.window.showWarningMessage("Previously used runtime is no longer available. Please select a new one.");
    const picked = await pickRuntime(allRuntimes);
    if (!picked) {
      return;
    }
    runtimeId = picked.id;
  }

  // Validate saved addon if one was used
  let addonId: number | null = lastSession.addonId ?? null;
  if (addonId !== null) {
    const allAddons = await fetchRuntimeAddons(cdswctlPath, output);
    if (!allAddons) {
      return;
    }
    const savedAddon = allAddons.find((a) => a.id === addonId);
    if (!savedAddon) {
      output.appendLine(`Saved addon ID ${addonId} no longer exists. Showing addon picker...`);
      vscode.window.showWarningMessage("Previously used runtime addon is no longer available. Please select a new one.");
      const pickedAddon = await pickRuntimeAddon(allAddons);
      if (pickedAddon === undefined) {
        return;
      }
      addonId = pickedAddon?.id ?? null;
    }
  }

  setActiveProject(lastSession.projectName);

  output.appendLine(`Reconnecting to project ${lastSession.projectName}...`);

  // Only stop the specific previous session opened by this extension, never all sessions
  const autoStopSessions = lastSession.sessionId ?? false;

  const sessionId = await executeConnect(context, output, {
    project: lastSession.projectName,
    runtimeId,
    addonId,
    cpus: lastSession.cpus,
    memory: lastSession.memoryGb,
    gpus: lastSession.gpus ?? 0,
    cdswctlPath,
    autoStopSessions,
  });

  if (sessionId !== false) {
    saveLastSession(context, {
      projectName: lastSession.projectName,
      runtimeId,
      addonId,
      cpus: lastSession.cpus,
      memoryGb: lastSession.memoryGb,
      gpus: lastSession.gpus ?? 0,
      sessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
    });
  }
}
