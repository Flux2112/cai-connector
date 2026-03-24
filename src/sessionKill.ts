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
import { markSessionInactive } from "./sessionHistory";
import { clearActiveEndpoint, getActiveEndpoint } from "./sessionManager";
import { setActiveProject } from "./state";
import { clearFile, getStoragePath, readState } from "./utils";
import { CDSWCTL_TIMEOUT_MS, SessionRecord, STATE_FILE } from "./types";

export async function killSessionRecord(
  record: SessionRecord,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  output.appendLine(`Killing session ${record.id} in project ${record.projectName}...`);

  if (record.endpointPid) {
    output.appendLine(`Killing cdswctl process (PID ${record.endpointPid})...`);
    try { process.kill(record.endpointPid); } catch { /* already dead */ }
  }

  // If this matches our in-process endpoint, clear it
  const activeEp = getActiveEndpoint();
  if (activeEp?.process.pid === record.endpointPid) {
    clearActiveEndpoint();
    setActiveProject(null);
  }

  if (record.sessionId) {
    const cdswctlPath = await resolveAndLogin(context, output);
    if (cdswctlPath) {
      output.appendLine(`Stopping remote session ${record.sessionId}...`);
      const result = await runCdswctl(
        cdswctlPath,
        ["sessions", "stop", "/s", record.sessionId, "/p", record.projectName],
        output,
        CDSWCTL_TIMEOUT_MS,
      );
      if (result.exitCode !== 0) {
        const combined = result.stdout + result.stderr;
        if (/unexpected end of JSON/i.test(combined)) {
          output.appendLine("Session stop returned known cdswctl bug (session likely stopped successfully).");
        }
      }
    } else {
      output.appendLine("Skipping remote session cleanup — login failed.");
    }
  } else {
    output.appendLine("No session ID — skipping remote session cleanup.");
  }

  // Clear the state file if it belongs to this session
  const statePath = getStoragePath(context, STATE_FILE);
  const currentState = readState(statePath, output);
  if (currentState?.endpointPid === record.endpointPid) {
    clearFile(statePath);
  }

  markSessionInactive(context.globalStorageUri.fsPath, record.id);
  output.appendLine("Session killed.");
}
