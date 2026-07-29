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
import { killSessionRecord } from "./sessionKill";
import { patchSession, takenHostAliases } from "./sessionHistory";
import { syncSshConfigFromHistory } from "./sessionReconciler";
import { executeConnect } from "./sessionManager";
import { SessionItem } from "./sessionPanel";
import { assignHostAlias, remoteUriFor } from "./sshConfig";
import { saveLastSession } from "./state";
import { ConnectParams, SessionRecord } from "./types";
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

  const storagePath = context.globalStorageUri.fsPath;
  // Records written before parallel sessions have no alias of their own.
  let alias = record.hostAlias;
  if (!alias) {
    alias = assignHostAlias(record.projectName, takenHostAliases(storagePath));
    patchSession(storagePath, record.id, { hostAlias: alias });
    output.appendLine(`Assigned SSH host alias ${alias} to session ${record.id}.`);
  }

  output.appendLine(`Joining session ${alias} on port ${record.port}...`);

  // Rewrites every managed block, so joining one session cannot break the alias
  // another window is connected through.
  if (!syncSshConfigFromHistory(storagePath, output)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    return;
  }

  const openInSameWindow = vscode.workspace.getConfiguration("caiConnector").get<boolean>("openInSameWindow", true);
  // Force a new window when already inside a remote session, same logic as executeConnect
  const forceNewWindow = !openInSameWindow || Boolean(vscode.env.remoteName);
  const remoteUri = vscode.Uri.parse(remoteUriFor(alias));
  await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow });
  vscode.window.showInformationMessage(`Remote-SSH window launched for host '${alias}'.`);
}

export async function recreateSessionFlow(
  item: { record: SessionRecord },
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: { refresh(): void },
): Promise<void> {
  output.show(true);

  const { record } = item;

  // Recreate means "replace this one session". Other sessions running in
  // parallel are left strictly alone — the old behaviour of killing whichever
  // session happened to be active is exactly what issue #2 rules out.
  if (record.endpointPid || record.sessionId) {
    output.appendLine(`Tearing down session ${record.id} before recreating it...`);
    await killSessionRecord(record, context, output);
  }

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  // killSessionRecord already stopped it; passing the id again would only
  // produce a redundant stop call for a session that is already gone.
  const autoStopSessions: string | false = false;

  const params: ConnectParams = {
    project: record.projectName,
    runtimeId: record.runtimeId,
    addonId: record.addonId,
    cpus: record.cpus,
    memory: record.memoryGb,
    gpus: record.gpus,
    cdswctlPath,
    autoStopSessions,
    replaceRecord: { id: record.id, hostAlias: record.hostAlias },
  };

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
