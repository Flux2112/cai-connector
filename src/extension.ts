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
import { disconnectFlow } from "./disconnectFlow";
import { killUntrackedEndpointProcesses } from "./endpointManager";
import { listEndpoints } from "./endpointRegistry";
import { reconnectFlow } from "./reconnectFlow";
import { loadHistory } from "./sessionHistory";
import { cleanUpOrphansFlow, warnAboutOrphans } from "./orphanCleanup";
import {
  reconcileProcesses, reconcileWithCml, stopOrphanedCmlSessions, syncSshConfigFromHistory,
} from "./sessionReconciler";
import { SessionPanel, SessionItem } from "./sessionPanel";
import { joinSessionFlow, recreateSessionFlow } from "./sessionActions";
import { editSessionFlow } from "./sessionEdit";
import { killSessionRecord } from "./sessionKill";
import { removeSessionFlow } from "./sessionRemove";
import { commonWorkspaceAuthority, isRecordInRemoteWorkspace } from "./remoteSession";
import { RuntimeManager } from "./runtimeManager";
import { clearFile, stopCmlSessions } from "./utils";
import { CACHE_FILE, SECRET_KEY, STATE_FILE } from "./types";

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CAI Connector");
  const storagePath = context.globalStorageUri.fsPath;

  // Sidebar sessions panel
  const panel = new SessionPanel(storagePath);
  const treeView = vscode.window.createTreeView("caiConnector.sessionsView", {
    treeDataProvider: panel,
    showCollapseAll: true,
  });
  panel.start();
  context.subscriptions.push(treeView, { dispose: () => panel.dispose() });

  const commands: Record<string, (...args: never[]) => unknown> = {
    "caiConnector.connect": () => connectFlow(context, output),
    "caiConnector.disconnect": async () => {
      await disconnectFlow(context, output);
      panel.reconcileAndRefresh();
    },
    "caiConnector.browseRuntimes": () => browseRuntimesFlow(context, output),
    "caiConnector.resetApiKey": () => resetApiKeyFlow(context, output),
    "caiConnector.clearCache": () => clearCacheFlow(context, output),
    "caiConnector.reconnect": () => reconnectFlow(context, output),
    "caiConnector.refreshSessions": () => panel.reconcileAndRefresh(),
    "caiConnector.cleanUpOrphans": async () => {
      await cleanUpOrphansFlow(context, output);
      panel.reconcileAndRefresh();
    },
  };
  for (const [id, handler] of Object.entries(commands)) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }

  const itemCommands: Record<string, (item: SessionItem) => Promise<void>> = {
    "caiConnector.joinSession": (item) => joinSessionFlow(item, context, output),
    "caiConnector.recreateSession": (item) => recreateSessionFlow(item, context, output, panel),
    "caiConnector.editSession": (item) => editSessionFlow(item, context, output, panel),
    "caiConnector.removeSession": (item) => removeSessionFlow(item, context, output, panel),
  };
  for (const [id, handler] of Object.entries(itemCommands)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(id, async (item: SessionItem) => {
        await handler(item);
        panel.reconcileAndRefresh();
      }),
    );
  }
  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.killSession", async (item: SessionItem) => {
      output.show(true);
      const authorities = (vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri.authority);
      const authority = commonWorkspaceAuthority(authorities, vscode.workspace.workspaceFile?.authority);
      const closeCurrentWindow = isRecordInRemoteWorkspace(item.record, authority);

      await killSessionRecord(item.record, context, output);
      panel.reconcileAndRefresh();

      if (closeCurrentWindow) {
        void vscode.commands.executeCommand("workbench.action.closeWindow").then(
          undefined,
          (err) => output.appendLine(`Failed to close stopped Remote-SSH window: ${String(err)}`),
        );
      }
    }),
  );

  // Poll endpoint pids only while the view is on screen, and ask CML for the
  // remote half of each status when it becomes visible.
  context.subscriptions.push(
    treeView.onDidChangeVisibility(async (e) => {
      if (!e.visible) {
        panel.stopPolling();
        return;
      }
      panel.startPolling();
      panel.reconcileAndRefresh();
      await refreshFromCml(context, output, panel);
    }),
  );
  if (treeView.visible) {
    panel.startPolling();
  }

  void startupCleanup(context, output, panel);
}

/**
 * Reconciles the two halves of every session's status against CML and, unless
 * the user opted out, stops any session left running there without a local
 * endpoint.
 */
async function refreshFromCml(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: SessionPanel,
): Promise<void> {
  const storagePath = context.globalStorageUri.fsPath;
  try {
    const cdswctlPath = await ensureCdswctl(output);
    let changed = await reconcileWithCml(storagePath, cdswctlPath, output);
    const autoStop = vscode.workspace
      .getConfiguration("caiConnector")
      .get<boolean>("autoStopOrphanedSessions", true);
    if (autoStop) {
      const stopped = await stopOrphanedCmlSessions(storagePath, cdswctlPath, output);
      if (stopped > 0) {
        changed = true;
        vscode.window.showInformationMessage(
          `Stopped ${stopped} CML session(s) that had no local endpoint left.`,
        );
      }
    }
    if (changed) { panel.refresh(); }
  } catch { /* silent — cached history is still shown */ }
}

/**
 * Startup sweep.
 *
 * Kills only endpoint processes no stored session claims, which is what makes
 * several windows able to hold live tunnels at once: a session another window
 * created is tracked in the shared history file, so this host spares it. The old
 * "kill every ssh-endpoint unless one looks alive" rule could not tell the
 * difference.
 */
async function startupCleanup(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: SessionPanel,
): Promise<void> {
  const storagePath = context.globalStorageUri.fsPath;
  // Left over from the single-session era; the history file replaced it.
  clearFile(path.join(storagePath, STATE_FILE));

  try {
    const { trackedPids } = await reconcileProcesses(storagePath, output);
    output.appendLine(`[startup] tracked endpoint pids: ${JSON.stringify(trackedPids)}`);
    const killed = await killUntrackedEndpointProcesses(trackedPids, output);
    if (killed > 0) {
      output.appendLine(`Startup cleanup: killed ${killed} untracked ssh-endpoint process(es).`);
    }
    syncSshConfigFromHistory(storagePath, output);
    panel.refresh();
    warnAboutOrphans(loadHistory(storagePath), output);
  } catch (err) {
    output.appendLine(`Startup cleanup failed: ${String(err)}`);
  }
}

export function deactivate(): void {
  // Every endpoint successfully handed to Remote-SSH is surrendered before the
  // window opens, so this only ever catches one that was still being created.
  // Killing a surrendered tunnel would disconnect a window that is mid-reload.
  for (const endpoint of listEndpoints()) {
    if (endpoint.surrendered) { continue; }
    if (endpoint.process.pid) {
      try { process.kill(endpoint.process.pid); } catch { /* already dead */ }
    }
    stopCmlSessions(
      endpoint.cdswctlPath,
      endpoint.project,
      (_msg) => { /* no logging in synchronous deactivate */ },
      endpoint.sessionId,
    );
  }
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
