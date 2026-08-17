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
import { recreateSessionFlow } from "./sessionActions";
import { SessionFormPanel } from "./sessionForm";
import { buildSessionFormInit, refreshRuntimes } from "./sessionFormData";
import { loadHistory, updateSessionConfig } from "./sessionHistory";
import { isLive } from "./sessionStatus";
import { SessionItem } from "./sessionPanel";

/**
 * Edits a stored session configuration from the sidebar.
 *
 * Resource changes cannot be applied to a running container, so an active
 * session is offered a recreate; an inactive one just saves for next time.
 */
export async function editSessionFlow(
  item: SessionItem,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  panel: { refresh(): void },
): Promise<void> {
  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
    return;
  }

  const init = await buildSessionFormInit(context, output, cdswctlPath, "edit", item.record);
  if (!init) {
    return;
  }

  SessionFormPanel.show(context, output, init, {
    onRefreshRuntimes: () => refreshRuntimes(context, output, cdswctlPath),
    onSubmit: async (values, formPanel) => {
      const saved = updateSessionConfig(context.globalStorageUri.fsPath, item.record.id, {
        projectName: values.project,
        runtimeId: values.runtimeId,
        addonId: values.addonId,
        cpus: values.cpus,
        memoryGb: values.memoryGb,
        gpus: values.gpus,
      });
      formPanel.dispose();

      if (!saved) {
        vscode.window.showErrorMessage("That session is no longer in the history — nothing was saved.");
        return;
      }
      output.appendLine(
        `Updated saved session ${item.record.id}: ${values.project}, runtime ${values.runtimeId}, ` +
        `${values.cpus} CPU, ${values.memoryGb} GB, ${values.gpus} GPU.`,
      );
      panel.refresh();

      const updated = loadHistory(context.globalStorageUri.fsPath).find(r => r.id === item.record.id);
      if (!updated) {
        return;
      }
      // A session with a live tunnel or a live CML session behind it has to be
      // recreated for new resources to take effect; anything else just saves.
      if (!isLive(updated)) {
        vscode.window.showInformationMessage("Saved. The new settings apply the next time you create this session.");
        return;
      }

      const choice = await vscode.window.showInformationMessage(
        "Saved. Resources only change when the session is recreated — recreate it now?",
        { modal: true },
        "Recreate now",
      );
      if (choice === "Recreate now") {
        await recreateSessionFlow({ record: updated }, context, output, panel);
      }
    },
  });
}
