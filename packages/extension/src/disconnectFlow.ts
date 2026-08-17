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
import { loadHistory } from "./sessionHistory";
import { killSessionRecord } from "./sessionKill";
import { reconcileProcesses, syncSshConfigFromHistory } from "./sessionReconciler";
import { isLive, statusSummary } from "./sessionStatus";
import { loadLastSession, saveLastSession } from "./state";
import { SessionRecord } from "./types";

type SessionPick = vscode.QuickPickItem & { record: SessionRecord };

/**
 * Tears down sessions the user picks.
 *
 * With parallel sessions there is no single "current" endpoint to disconnect, so
 * anything still live is offered. One live session is disconnected without a
 * prompt; several are chosen from a multi-select, because silently stopping
 * every session when the user meant one would be the worst possible default.
 */
export async function disconnectFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  output.show(true);
  const storagePath = context.globalStorageUri.fsPath;

  await reconcileProcesses(storagePath, output);
  const live = loadHistory(storagePath).filter(isLive);

  if (live.length === 0) {
    syncSshConfigFromHistory(storagePath, output);
    output.appendLine("No live session to disconnect — SSH config cleaned up.");
    vscode.window.showInformationMessage("No live CAI session to disconnect.");
    return;
  }

  const chosen = live.length === 1 ? live : await pickSessions(live);
  if (chosen.length === 0) {
    return;
  }

  for (const record of chosen) {
    await killSessionRecord(record, context, output);
  }

  // Mark an explicit disconnect so Recreate Last Session knows it was deliberate.
  const lastSession = loadLastSession(context);
  if (lastSession && chosen.some((r) => r.sessionId && r.sessionId === lastSession.sessionId)) {
    saveLastSession(context, { ...lastSession, disconnectedAt: new Date().toISOString() });
  }

  syncSshConfigFromHistory(storagePath, output);
  vscode.window.showInformationMessage(
    chosen.length === 1 ? "Disconnected." : `Disconnected ${chosen.length} sessions.`,
  );
}

async function pickSessions(live: SessionRecord[]): Promise<SessionRecord[]> {
  const items: SessionPick[] = live.map((record) => ({
    label: record.projectName,
    description: statusSummary(record),
    detail: record.hostAlias ? `Host ${record.hostAlias}` : undefined,
    record,
  }));

  const picked = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    title: "Disconnect CAI sessions",
    placeHolder: "Select the sessions to tear down",
  });
  return (picked ?? []).map((item) => item.record);
}
