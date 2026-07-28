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
import { forgetEndpoint, getEndpoint } from "./endpointRegistry";
import { markSessionStopped, patchSession } from "./sessionHistory";
import { syncSshConfigFromHistory } from "./sessionReconciler";
import { CDSWCTL_TIMEOUT_MS, SessionRecord } from "./types";

/**
 * Stops one session: its local tunnel process and the CML session behind it.
 *
 * Scoped strictly to the record passed in — other sessions running in parallel
 * are untouched, and the CML session is always addressed by its own id.
 */
export async function killSessionRecord(
  record: SessionRecord,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  const storagePath = context.globalStorageUri.fsPath;
  output.appendLine(`Killing session ${record.id} in project ${record.projectName}...`);

  if (record.endpointPid) {
    output.appendLine(`Killing cdswctl process (PID ${record.endpointPid})...`);
    try { process.kill(record.endpointPid); } catch { /* already dead */ }
  }
  // Drop it from this host's registry without a second kill.
  if (getEndpoint(record.id)) {
    forgetEndpoint(record.id);
  }

  let cmlStopped = false;
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
      const combined = result.stdout + result.stderr;
      if (result.exitCode === 0) {
        cmlStopped = true;
      } else if (/unexpected end of JSON/i.test(combined)) {
        // cdswctl prints this on a successful stop — see AGENTS.md.
        output.appendLine("Session stop returned known cdswctl bug (session likely stopped successfully).");
        cmlStopped = true;
      } else {
        output.appendLine(`Session stop failed with exit ${result.exitCode} — it may still run on CML.`);
      }
    } else {
      output.appendLine("Skipping remote session cleanup — login failed.");
    }
  } else {
    output.appendLine("No session ID — skipping remote session cleanup.");
    cmlStopped = true;
  }

  if (cmlStopped) {
    markSessionStopped(storagePath, record.id);
  } else {
    // Endpoint gone, CML session unaccounted for: leave it flagged so the
    // orphan sweep picks it up instead of quietly recording it as cleaned up.
    patchSession(storagePath, record.id, {
      status: "error",
      endpointStatus: "stopped",
      endpointPid: undefined,
      port: undefined,
      lastCheckedAt: new Date().toISOString(),
    });
  }

  syncSshConfigFromHistory(storagePath, output);
  output.appendLine("Session killed.");
}
