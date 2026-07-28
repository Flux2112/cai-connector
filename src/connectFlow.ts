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
import { RuntimeManager } from "./runtimeManager";
import { pickRuntime, filterLatestRuntimes } from "./runtimePicker";
import { SessionFormPanel } from "./sessionForm";
import { buildSessionFormInit, refreshRuntimes } from "./sessionFormData";
import { reconcileProcesses } from "./sessionReconciler";
import { executeConnect } from "./sessionManager";
import { saveLastSession } from "./state";
import { CACHE_FILE, SessionFormValues } from "./types";
import { getStoragePath } from "./utils";

export async function connectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  output.show(true);

  // Sessions run in parallel now, so connecting must not disturb anything that
  // is already running. This only refreshes what we know about existing
  // endpoints; it never kills one and never stops a CML session.
  await reconcileProcesses(context.globalStorageUri.fsPath, output);

  // The API key prompt stays a native input box — no secret ever reaches the webview.
  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  const init = await buildSessionFormInit(context, output, cdswctlPath, "create");
  if (!init) {
    return;
  }

  SessionFormPanel.show(context, output, init, {
    onRefreshRuntimes: () => refreshRuntimes(context, output, cdswctlPath),
    onSubmit: async (values, panel) => {
      await launchSession(context, output, cdswctlPath, values, panel);
    },
  });
}

/**
 * Runs a submitted form. The panel stays open to show progress and is disposed
 * only after executeConnect returns, so the endpoint handoff is never delayed
 * by UI teardown.
 */
async function launchSession(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  cdswctlPath: string,
  values: SessionFormValues,
  panel: SessionFormPanel,
): Promise<void> {
  if (values.saveAsDefaults) {
    const config = vscode.workspace.getConfiguration("caiConnector");
    await config.update("defaultCpus", values.cpus, vscode.ConfigurationTarget.Global);
    await config.update("defaultMemoryGb", values.memoryGb, vscode.ConfigurationTarget.Global);
    await config.update("defaultGpus", values.gpus, vscode.ConfigurationTarget.Global);
    output.appendLine(`Saved default resources: ${values.cpus} CPU, ${values.memoryGb} GB, ${values.gpus} GPU.`);
  }

  output.appendLine(`Connecting to project ${values.project}...`);

  // Never stop anything on a plain connect. A second session in a project the
  // user already has open is now a supported thing to want, and the previous
  // behaviour of stopping the last session made that impossible. Recreate and
  // Kill remain the explicit ways to end a session.
  const sessionId = await executeConnect(
    context,
    output,
    {
      project: values.project,
      runtimeId: values.runtimeId,
      addonId: values.addonId,
      cpus: values.cpus,
      memory: values.memoryGb,
      gpus: values.gpus,
      cdswctlPath,
      autoStopSessions: false,
    },
    (step, detail) => panel.reportProgress(step, detail),
  );

  if (sessionId === false) {
    panel.reportFailure("The endpoint did not come up. Check the output for what cdswctl reported.");
    return;
  }

  saveLastSession(context, {
    projectName: values.project,
    runtimeId: values.runtimeId,
    addonId: values.addonId,
    cpus: values.cpus,
    memoryGb: values.memoryGb,
    gpus: values.gpus,
    sessionId: sessionId || undefined,
    timestamp: new Date().toISOString(),
  });
  panel.dispose();
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
