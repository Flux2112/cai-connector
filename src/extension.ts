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
import * as path from "path";
import { ensureCdswctl } from "./cdswctl";
import { connectFlow, browseRuntimesFlow } from "./connectFlow";
import { killOrphanedEndpointProcesses } from "./endpointManager";
import { reconnectFlow } from "./reconnectFlow";
import { loadHistory, refreshSessionStatusesFromCml } from "./sessionHistory";
import { disconnectFlow, getActiveEndpoint, isSurrenderedToSsh } from "./sessionManager";
import { SessionPanel, SessionItem } from "./sessionPanel";
import { joinSessionFlow, recreateSessionFlow } from "./sessionActions";
import { killSessionRecord } from "./sessionKill";
import { RuntimeManager } from "./runtimeManager";
import { clearFile, isProcessAlive, stopCmlSessions } from "./utils";
import { CACHE_FILE, SECRET_KEY } from "./types";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CAI Connector");

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.connect", async () => {
      await connectFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.disconnect", async () => {
      await disconnectFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.browseRuntimes", async () => {
      await browseRuntimesFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.resetApiKey", async () => {
      await resetApiKeyFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.clearCache", async () => {
      await clearCacheFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.reconnect", async () => {
      await reconnectFlow(context, output);
    })
  );

  // Sidebar sessions panel
  const panel = new SessionPanel(context.globalStorageUri.fsPath);
  const treeView = vscode.window.createTreeView("caiConnector.sessionsView", {
    treeDataProvider: panel,
    showCollapseAll: true,
  });
  panel.start();
  context.subscriptions.push(treeView, { dispose: () => panel.dispose() });

  context.subscriptions.push(
    treeView.onDidChangeVisibility(async (e) => {
      if (!e.visible) { return; }
      try {
        const cdswctlPath = await ensureCdswctl(output);
        const changed = await refreshSessionStatusesFromCml(
          context.globalStorageUri.fsPath, cdswctlPath, output
        );
        if (changed) { panel.refresh(); }
      } catch { /* silent — cached history still shown */ }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.refreshSessions", () => {
      panel.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.killSession", async (item: SessionItem) => {
      output.show(true);
      await killSessionRecord(item.record, context, output);
      panel.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.joinSession", async (item: SessionItem) => {
      await joinSessionFlow(item, context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.recreateSession", async (item: SessionItem) => {
      await recreateSessionFlow(item, context, output, panel);
    })
  );

  // Startup orphan cleanup + auto-reconnect.
  // Skip entirely if a session from another window is already live (its endpoint PID is still running).
  output.appendLine(`[startup] vscode.env.remoteName = ${JSON.stringify(vscode.env.remoteName)}`);
  output.appendLine(`[startup] vscode.env.appHost = ${JSON.stringify(vscode.env.appHost)}`);

  const startupHistory = loadHistory(context.globalStorageUri.fsPath);
  output.appendLine(`[startup] session history count = ${startupHistory.length}`);
  const activeSessions = startupHistory.filter((r) => r.status === "active");
  output.appendLine(`[startup] active sessions: ${JSON.stringify(activeSessions.map((r) => ({ id: r.id, pid: r.endpointPid, pidAlive: r.endpointPid != null ? isProcessAlive(r.endpointPid) : false })))}`);

  const liveSession = startupHistory.find(
    (r) => r.status === "active" && r.endpointPid != null && isProcessAlive(r.endpointPid),
  );
  if (liveSession) {
    output.appendLine(`Skipping startup cleanup and auto-reconnect: live endpoint detected (PID ${liveSession.endpointPid}).`);
  } else {
    killOrphanedEndpointProcesses(output)
      .then((count) => {
        if (count > 0) {
          output.appendLine(`Startup cleanup: killed ${count} orphaned ssh-endpoint process(es).`);
        }
      })
      .catch(() => { /* best-effort */ })
      .finally(() => {
        output.appendLine("[auto-reconnect] SKIPPED — automatic session recreation is disabled");
      });
  }
}

export function deactivate(): void {
  // Same-window remote open: Remote-SSH still needs the endpoint process — leave it running.
  // The live-PID check in activate() will protect it from orphan cleanup on the next window load.
  if (isSurrenderedToSsh()) { return; }
  const endpoint = getActiveEndpoint();
  if (!endpoint) { return; }
  if (endpoint.process.pid) {
    try { process.kill(endpoint.process.pid); } catch { /* already dead */ }
  }
  stopCmlSessions(
    endpoint.cdswctlPath,
    endpoint.project,
    (_msg) => { /* no logging in synchronous deactivate */ },
    endpoint.sessionId,
  );
  clearFile(endpoint.statePath);
}

async function resetApiKeyFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  await context.secrets.delete(SECRET_KEY);
  output.appendLine("API key removed from secret storage.");
  vscode.window.showInformationMessage("CML API key has been reset. You will be prompted on next connect.");
}

async function clearCacheFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  const cacheHours = vscode.workspace.getConfiguration("caiConnector").get<number>("cacheHours", 24);
  const cachePath = path.join(context.globalStorageUri.fsPath, CACHE_FILE);
  const manager = new RuntimeManager(cachePath, cacheHours);
  const removed = manager.clear();
  if (removed) {
    output.appendLine(`Runtime cache cleared: ${cachePath}`);
    vscode.window.showInformationMessage("CAI Connector runtime cache cleared.");
  } else {
    output.appendLine(`No runtime cache to clear at: ${cachePath}`);
    vscode.window.showInformationMessage("No runtime cache was present.");
  }
}

