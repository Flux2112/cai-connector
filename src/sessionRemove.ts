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
import { removeInactiveSession } from "./sessionHistory";
import { SessionItem } from "./sessionPanel";
import { syncSshConfigFromHistory } from "./sessionReconciler";

export async function removeSessionFlow(
  item: SessionItem,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: { reconcileAndRefresh(): void },
): Promise<void> {
  const choice = await vscode.window.showWarningMessage(
    `Remove the stopped session entry for '${item.record.projectName}'? Its saved configuration will be lost.`,
    { modal: true },
    "Remove",
  );
  if (choice !== "Remove") {
    return;
  }

  const storagePath = context.globalStorageUri.fsPath;
  if (!removeInactiveSession(storagePath, item.record.id)) {
    vscode.window.showErrorMessage("Only stopped session entries can be removed.");
    return;
  }

  syncSshConfigFromHistory(storagePath, output);
  panel.reconcileAndRefresh();
  output.appendLine(`Removed saved session entry ${item.record.id}.`);
}