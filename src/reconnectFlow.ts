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

import * as os from "os";
import * as vscode from "vscode";
import { resolveAndLogin } from "./auth";
import { cleanupExistingEndpoint } from "./endpointManager";
import { RuntimeManager } from "./runtimeManager";
import { pickRuntime, fetchRuntimeAddons, pickRuntimeAddon } from "./runtimePicker";
import { executeConnect } from "./sessionManager";
import { loadLastSession, saveLastSession, setActiveProject } from "./state";
import { CACHE_FILE, STATE_FILE } from "./types";
import { getStoragePath } from "./utils";

export async function reconnectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  output.show(true);

  const lastSession = loadLastSession(context);
  if (!lastSession) {
    vscode.window.showInformationMessage("No previous session found.");
    return;
  }

  const config = vscode.workspace.getConfiguration("caiConnector");
  const cacheHours = config.get<number>("cacheHours", 24);
  const cachePath = getStoragePath(context, CACHE_FILE);
  const statePath = getStoragePath(context, STATE_FILE);

  await cleanupExistingEndpoint(statePath, output);

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

  // Build confirmation message
  const runtimeLabel = savedRuntime
    ? `${savedRuntime.editor} - ${savedRuntime.kernel} (${savedRuntime.edition})`
    : `Runtime ${runtimeId}`;
  const addonLabel = addonId !== null ? `, Addon ${addonId}` : "";
  const confirm = await vscode.window.showQuickPick(
    [
      { label: "Yes", description: "Recreate this session" },
      { label: "No", description: "Cancel" },
    ],
    {
      title: "Recreate Last Session?",
      placeHolder: `${lastSession.projectName} — ${runtimeLabel}, ${lastSession.cpus} CPU, ${lastSession.memoryGb} GB, ${lastSession.gpus ?? 0} GPU${addonLabel}`,
    },
  );
  if (!confirm || confirm.label !== "Yes") {
    return;
  }

  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
  setActiveProject(lastSession.projectName);

  output.appendLine(`Reconnecting to project ${lastSession.projectName}...`);

  // Determine stop-sessions behavior based on project ownership
  const projectOwner = lastSession.projectName.split("/")[0].toLowerCase();
  const autoStopSessions: boolean | "prompt" = projectOwner === username ? true : "prompt";

  const connected = await executeConnect(context, output, {
    project: lastSession.projectName,
    runtimeId,
    addonId,
    cpus: lastSession.cpus,
    memory: lastSession.memoryGb,
    gpus: lastSession.gpus ?? 0,
    cdswctlPath,
    autoStopSessions,
  });

  if (connected) {
    saveLastSession(context, {
      projectName: lastSession.projectName,
      runtimeId,
      addonId,
      cpus: lastSession.cpus,
      memoryGb: lastSession.memoryGb,
      gpus: lastSession.gpus ?? 0,
      timestamp: new Date().toISOString(),
    });
  }
}
