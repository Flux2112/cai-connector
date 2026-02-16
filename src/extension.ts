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
import * as vscode from "vscode";
import { connectFlow, browseRuntimesFlow } from "./connectFlow";
import { reconnectFlow } from "./reconnectFlow";
import { disconnectFlow } from "./sessionManager";
import { CACHE_FILE, SECRET_KEY, STATE_FILE } from "./types";
import { clearFile, getStoragePath, isProcessAlive, readState } from "./utils";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CAI Connector");

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.connect", async () => {
      await connectFlow(context, output);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.disconnect", async () => {
      await disconnectFlow(context, output);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.browseRuntimes", async () => {
      await browseRuntimesFlow(context, output);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.clearCache", async () => {
      await clearCacheFlow(context, output);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.reconnect", async () => {
      await reconnectFlow(context, output);
    }),
  );

  // Check if an endpoint is already running from a previous session
  checkActiveEndpoint(context, output);
}

export function deactivate(): void {
  // Intentionally empty — the helper process is detached and should
  // survive window closes. Use "CAI Connector: Disconnect" to stop it.
}

async function clearCacheFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  const items: vscode.QuickPickItem[] = [
    { label: "Runtime cache", description: "Deletes cached runtime list; forces re-fetch on next connect", picked: false },
    { label: "CML URL", description: "Clears the stored Cloudera AI base URL; will prompt again on next login", picked: false },
    { label: "API key", description: "Removes the stored API key from secret storage", picked: false },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    title: "Clear Cache",
    placeHolder: "Select items to clear",
    canPickMany: true,
    ignoreFocusOut: true,
  });

  if (!selected || selected.length === 0) {
    return;
  }

  const labels = selected.map((s) => s.label);
  const cleared: string[] = [];

  if (labels.includes("Runtime cache")) {
    clearFile(getStoragePath(context, CACHE_FILE));
    cleared.push("runtime cache");
  }

  if (labels.includes("CML URL")) {
    const config = vscode.workspace.getConfiguration("caiConnector");
    await config.update("cmlUrl", "", vscode.ConfigurationTarget.Global);
    cleared.push("CML URL");
  }

  if (labels.includes("API key")) {
    await context.secrets.delete(SECRET_KEY);
    cleared.push("API key");
  }

  const summary = cleared.join(", ");
  output.appendLine(`Cleared: ${summary}.`);
  vscode.window.showInformationMessage(`Cleared: ${summary}.`);
}

function checkActiveEndpoint(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
  const statePath = getStoragePath(context, STATE_FILE);
  if (!fs.existsSync(statePath)) {
    return;
  }

  const state = readState(statePath);
  if (!state || state.status !== "ready") {
    return;
  }

  // Verify the helper is actually still running
  if (!state.helperPid || !isProcessAlive(state.helperPid)) {
    // Stale state file — clean it up
    clearFile(statePath);
    return;
  }

  output.appendLine(`Active endpoint detected (helper PID ${state.helperPid}, port ${state.port}).`);
  vscode.window.showInformationMessage(
    `An SSH endpoint is running on port ${state.port}. It will be stopped automatically when you connect again.`,
  );
}
