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
import { killOrphanedEndpointProcesses } from "./endpointManager";
import { RuntimeManager } from "./runtimeManager";
import { pickRuntime, fetchRuntimeAddons, pickRuntimeAddon, filterLatestRuntimes } from "./runtimePicker";
import { clearActiveEndpoint, executeConnect } from "./sessionManager";
import { loadLastSession, saveLastSession, setActiveProject } from "./state";
import { CACHE_FILE } from "./types";
import { getStoragePath, promptResources } from "./utils";

export async function connectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  output.show(true);

  const config = vscode.workspace.getConfiguration("caiConnector");
  const defaultCpus = config.get<number>("defaultCpus", 2);
  const defaultMemoryGb = config.get<number>("defaultMemoryGb", 4);
  const defaultGpus = config.get<number>("defaultGpus", 0);
  const cacheHours = config.get<number>("cacheHours", 24);
  const latestRuntimesOnly = config.get<boolean>("latestRuntimesOnly", true);

  const cachePath = getStoragePath(context, CACHE_FILE);

  clearActiveEndpoint();
  const _killedOrphans = await killOrphanedEndpointProcesses(output);
  output.appendLine(`Orphan cleanup: ${_killedOrphans} orphaned ssh-endpoint process(es).`);

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  const projectName = await vscode.window.showInputBox({
    title: "Project Name",
    prompt: "Enter your CML project name (or owner/project for another user's project)",
    ignoreFocusOut: true,
  });
  if (!projectName) {
    return;
  }

  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const success = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!success) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  const runtimeList = latestRuntimesOnly ? filterLatestRuntimes(runtimeManager.getAll()) : runtimeManager.getAll();
  const runtime = await pickRuntime(runtimeList);
  if (!runtime) {
    return;
  }

  const addons = await fetchRuntimeAddons(cdswctlPath, output);
  if (!addons) {
    return;
  }
  const addon = await pickRuntimeAddon(addons);
  if (addon === undefined) {
    return;
  }

  const resources = await promptResources(defaultCpus, defaultMemoryGb, defaultGpus);
  if (!resources) {
    return;
  }

  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
  const project = projectName.includes("/") ? projectName : `${username}/${projectName}`;
  setActiveProject(project);

  output.appendLine(`Connecting to project ${project}...`);

  // Auto-stop only the known extension-owned session for this project, if any
  const lastSession = loadLastSession(context);
  const autoStopSessions =
    lastSession?.projectName === project && lastSession.sessionId ? lastSession.sessionId : false;

  const sessionId = await executeConnect(context, output, {
    project,
    runtimeId: runtime.id,
    addonId: addon?.id ?? null,
    cpus: resources.cpus,
    memory: resources.memoryGb,
    gpus: resources.gpus,
    cdswctlPath,
    autoStopSessions,
  });

  if (sessionId !== false) {
    saveLastSession(context, {
      projectName: project,
      runtimeId: runtime.id,
      addonId: addon?.id ?? null,
      cpus: resources.cpus,
      memoryGb: resources.memoryGb,
      gpus: resources.gpus,
      sessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function browseRuntimesFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cacheHours = config.get<number>("cacheHours", 24);
  const latestRuntimesOnly = config.get<boolean>("latestRuntimesOnly", true);
  const cachePath = getStoragePath(context, CACHE_FILE);

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const success = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!success) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  const runtimeList = latestRuntimesOnly ? filterLatestRuntimes(runtimeManager.getAll()) : runtimeManager.getAll();
  await pickRuntime(runtimeList);
}
