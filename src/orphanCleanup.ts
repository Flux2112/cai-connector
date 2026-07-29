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
import { killUntrackedEndpointProcesses } from "./endpointManager";
import {
  reconcileProcesses, reconcileWithCml, stopOrphanedCmlSessions, syncSshConfigFromHistory,
} from "./sessionReconciler";
import { isOrphanedOnCml } from "./sessionStatus";
import { SessionRecord } from "./types";

/**
 * Full cleanup pass, on demand.
 *
 * Asks the OS which tunnels are really running, asks CML which sessions are
 * really running, then reconciles the two: leftover endpoint processes are
 * killed and CML sessions with no endpoint left are stopped by id. Nothing
 * outside session_history.json is ever touched.
 */
export async function cleanUpOrphansFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  output.show(true);
  const storagePath = context.globalStorageUri.fsPath;

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  await reconcileProcesses(storagePath, output);
  const killedProcesses = await killUntrackedEndpointProcesses(storagePath, output);
  await reconcileWithCml(storagePath, cdswctlPath, output);
  const stoppedSessions = await stopOrphanedCmlSessions(storagePath, cdswctlPath, output);
  syncSshConfigFromHistory(storagePath, output);

  const parts: string[] = [];
  if (stoppedSessions > 0) { parts.push(`stopped ${stoppedSessions} orphaned CML session(s)`); }
  if (killedProcesses > 0) { parts.push(`killed ${killedProcesses} untracked endpoint process(es)`); }
  const summary = parts.length > 0 ? `Cleanup: ${parts.join(", ")}.` : "Nothing to clean up.";
  output.appendLine(summary);
  vscode.window.showInformationMessage(summary);
}

/**
 * Nudges the user when a previous run left sessions on CML.
 *
 * Startup only reads local state, so this can only fire on statuses a previous
 * CML check established. It never stops anything by itself: at activation there
 * has been no login, and prompting for an API key just to tidy up would be worse
 * than the mess.
 */
export function warnAboutOrphans(records: SessionRecord[], output: vscode.OutputChannel): void {
  const orphans = records.filter(isOrphanedOnCml);
  if (orphans.length === 0) {
    return;
  }
  output.appendLine(
    `${orphans.length} CML session(s) appear to be running with no local endpoint: ` +
    orphans.map((r) => `${r.sessionId} (${r.projectName})`).join(", "),
  );
  void vscode.window
    .showWarningMessage(
      `${orphans.length} CAI session(s) may still be running on CML without a local endpoint.`,
      "Clean up",
    )
    .then((choice) => {
      if (choice === "Clean up") {
        void vscode.commands.executeCommand("caiConnector.cleanUpOrphans");
      }
    });
}
