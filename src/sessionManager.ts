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
import { runCdswctl } from "./cdswctl";
import { resolveAndLogin } from "./auth";
import { startEndpointHost, waitForEndpointReady, stopEndpointHost } from "./endpointManager";
import { getActiveProject, setActiveProject } from "./state";
import { updateSshConfig } from "./sshConfig";
import { buildEndpointArgs, clearFile, getStoragePath, readState } from "./utils";
import {
  CDSWCTL_TIMEOUT_MS, ConnectParams,
  ENDPOINT_READY_TIMEOUT_MS,
  LOG_FILE, REMOTE_URI, STATE_FILE,
} from "./types";

export async function executeConnect(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  params: ConnectParams,
): Promise<boolean> {
  const statePath = getStoragePath(context, STATE_FILE);
  const logPath = getStoragePath(context, LOG_FILE);

  // Handle stop-sessions
  if (params.autoStopSessions === true) {
    output.appendLine(`Stopping existing SSH sessions in project ${params.project}...`);
    await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, CDSWCTL_TIMEOUT_MS);
  } else if (params.autoStopSessions === "prompt") {
    const stopSessions = await vscode.window.showQuickPick(
      [
        { label: "No", description: "Keep existing sessions running", picked: true },
        { label: "Yes", description: "Stop all existing sessions in this project" },
      ],
      {
        title: "Stop Existing Sessions?",
        placeHolder: `Stop all running sessions in ${params.project}?`,
      },
    );
    if (!stopSessions) {
      return false;
    }
    if (stopSessions.label === "Yes") {
      output.appendLine(`Stopping existing SSH sessions in project ${params.project}...`);
      await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, CDSWCTL_TIMEOUT_MS);
    } else {
      output.appendLine("Skipping session cleanup.");
    }
  }

  output.appendLine("Creating SSH endpoint...");
  const args = buildEndpointArgs(params);
  output.appendLine(`Command: ${params.cdswctlPath} ${args.join(" ")}`);

  clearFile(statePath);
  clearFile(logPath);

  const idleTimeoutMinutes = vscode.workspace
    .getConfiguration("caiConnector")
    .get<number>("idleTimeoutMinutes", 30);

  const helperPid = startEndpointHost(context, output, {
    cdswctlPath: params.cdswctlPath,
    args,
    statePath,
    logPath,
    project: params.project,
    idleTimeoutMinutes,
  });

  if (!helperPid) {
    vscode.window.showErrorMessage("Failed to start endpoint host.");
    return false;
  }

  let state = null;
  try {
    state = await waitForEndpointReady(statePath, output, ENDPOINT_READY_TIMEOUT_MS);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to establish SSH endpoint: ${String(err)}`);
    await disconnectFlow(context, output);
    return false;
  }

  if (!state || !state.port || !state.userAndHost) {
    vscode.window.showErrorMessage("Failed to parse SSH endpoint output.");
    await disconnectFlow(context, output);
    return false;
  }

  output.appendLine(`SSH: ${state.userAndHost}:${state.port}`);

  if (!updateSshConfig(state.port)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    await disconnectFlow(context, output);
    return false;
  }

  output.appendLine("SSH config updated. Opening Remote-SSH window...");

  const remoteUri = vscode.Uri.parse(REMOTE_URI);
  await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow: true });

  vscode.window.showInformationMessage("Remote-SSH window launched for host 'cml'.");
  return true;
}

export async function disconnectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  output.show(true);
  const statePath = getStoragePath(context, STATE_FILE);

  // Read session ID from state before stopping the endpoint host (which clears the file)
  const currentState = readState(statePath, output);
  const sessionId = currentState?.sessionId;

  output.appendLine("Stopping ssh-endpoint process...");
  stopEndpointHost(statePath, output);

  // Stop only the CML session created by this extension — never stop all sessions
  const activeProject = getActiveProject();
  if (activeProject) {
    if (sessionId) {
      output.appendLine(`Stopping session ${sessionId} in project ${activeProject}...`);
      const cdswctlPath = await resolveAndLogin(context, output);
      if (cdswctlPath) {
        const result = await runCdswctl(
          cdswctlPath,
          ["sessions", "stop", "/s", sessionId, "/p", activeProject],
          output,
          CDSWCTL_TIMEOUT_MS,
        );
        // Per-session stop (/s) has a known cdswctl bug: "unexpected end of JSON input" despite success
        if (result.exitCode !== 0) {
          const combined = result.stdout + result.stderr;
          if (/unexpected end of JSON/i.test(combined)) {
            output.appendLine("Session stop returned known cdswctl bug message (session likely stopped successfully).");
          }
        }
      } else {
        output.appendLine("Skipping remote session cleanup — login failed.");
      }
    } else {
      output.appendLine("No session ID available — skipping session cleanup to avoid stopping unrelated sessions.");
    }
    setActiveProject(null);
  }

  vscode.window.showInformationMessage("Disconnected.");
}
