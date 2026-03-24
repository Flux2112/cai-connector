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
import { loadHistory } from "./sessionHistory";
import { killSessionRecord } from "./sessionKill";
import { clearActiveEndpoint, executeConnect } from "./sessionManager";
import { SessionItem } from "./sessionPanel";
import { updateSshConfig } from "./sshConfig";
import { saveLastSession, setActiveProject } from "./state";
import { ConnectParams, REMOTE_URI } from "./types";
import { isProcessAlive } from "./utils";

export async function joinSessionFlow(
  item: SessionItem,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  output.show(true);
  const { record } = item;

  if (record.status !== "active" || !record.port) {
    vscode.window.showErrorMessage("This session is not active.");
    return;
  }

  if (!record.endpointPid || !isProcessAlive(record.endpointPid)) {
    vscode.window.showErrorMessage("Endpoint process is no longer running. Kill and recreate the session.");
    return;
  }

  output.appendLine(`Joining session on port ${record.port}...`);

  if (!updateSshConfig(record.port)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    return;
  }

  const openInSameWindow = vscode.workspace.getConfiguration("caiConnector").get<boolean>("openInSameWindow", true);
  // Force a new window when already inside a remote session, same logic as executeConnect
  const forceNewWindow = !openInSameWindow || Boolean(vscode.env.remoteName);
  const remoteUri = vscode.Uri.parse(REMOTE_URI);
  await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow });
  vscode.window.showInformationMessage("Remote-SSH window launched for host 'cml'.");
}

export async function recreateSessionFlow(
  item: SessionItem,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: { refresh(): void },
): Promise<void> {
  output.show(true);

  const storagePath = context.globalStorageUri.fsPath;

  // Silently kill the currently active known session (extension-owned) before recreating.
  // Only sessions in session_history.json (opened by this extension) are ever killed.
  const history = loadHistory(storagePath);
  const activeRecord = history.find((r) => r.status === "active");
  if (activeRecord) {
    output.appendLine(`Auto-killing active session ${activeRecord.id} before recreating...`);
    await killSessionRecord(activeRecord, context, output);
  }

  // Clean up any in-process endpoint and orphan processes
  clearActiveEndpoint();
  const _killedOrphans = await killOrphanedEndpointProcesses(output);
  if (_killedOrphans > 0) {
    output.appendLine(`Orphan cleanup: ${_killedOrphans} ssh-endpoint process(es).`);
  }

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  const { record } = item;
  // Also stop the stale CML session referenced by the record being recreated (if any)
  const autoStopSessions: string | false = record.sessionId ?? false;

  const params: ConnectParams = {
    project: record.projectName,
    runtimeId: record.runtimeId,
    addonId: record.addonId,
    cpus: record.cpus,
    memory: record.memoryGb,
    gpus: record.gpus,
    cdswctlPath,
    autoStopSessions,
  };

  setActiveProject(record.projectName);
  output.appendLine(`Recreating session for project ${record.projectName}...`);

  const sessionId = await executeConnect(context, output, params);
  if (sessionId !== false) {
    saveLastSession(context, {
      projectName: record.projectName,
      runtimeId: record.runtimeId,
      addonId: record.addonId,
      cpus: record.cpus,
      memoryGb: record.memoryGb,
      gpus: record.gpus,
      sessionId: sessionId || undefined,
      timestamp: new Date().toISOString(),
    });
  }

  panel.refresh();
}
