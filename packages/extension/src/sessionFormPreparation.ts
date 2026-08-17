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
import { getStoredApiKey, resolveAndLogin } from "./auth";
import { requestApiKeyFromWebview } from "./sessionApiKeyPanel";
import { SessionFormPanel } from "./sessionForm";
import { buildSessionFormInit, refreshRuntimes } from "./sessionFormData";
import { reconcileLocal } from "./sessionReconciler";
import { SessionFormValues } from "./types";

type LaunchSession = (
  cdswctlPath: string,
  values: SessionFormValues,
  panel: SessionFormPanel,
) => Promise<void>;

let preparationInFlight: Promise<void> | undefined;

/** Opens the new-session form while keeping the first-click setup visible and responsive. */
export function openNewSessionForm(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  launchSession: LaunchSession,
): Promise<void> {
  if (preparationInFlight) {
    output.appendLine("New session preparation is already in progress.");
    return preparationInFlight;
  }

  const preparation = Promise.resolve(vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Preparing new CAI session",
      cancellable: false,
    },
    async (progress) => {
      output.show(true);
      progress.report({ message: "Checking local sessions..." });
      // A full PowerShell process scan is useful at startup, but can be slow on
      // a cold Windows session. Form preparation only needs this local refresh.
      reconcileLocal(context.globalStorageUri.fsPath, (msg) => output.appendLine(msg));

      const storedApiKey = await getStoredApiKey(context);
      let suppliedApiKey: string | undefined;
      if (!storedApiKey) {
        progress.report({ message: "CML API key required..." });
        suppliedApiKey = await requestApiKeyFromWebview(context) ?? undefined;
        if (!suppliedApiKey) {
          return;
        }
      }

      progress.report({ message: "Signing in to CML..." });
      const cdswctlPath = await resolveAndLogin(context, output, suppliedApiKey);
      if (!cdswctlPath) {
        return;
      }

      progress.report({ message: "Loading session form..." });
      const init = await buildSessionFormInit(context, output, cdswctlPath, "create");
      if (!init) {
        return;
      }

      SessionFormPanel.show(context, output, init, {
        onRefreshRuntimes: () => refreshRuntimes(context, output, cdswctlPath),
        onSubmit: async (values, panel) => launchSession(cdswctlPath, values, panel),
      });
    },
  ));

  preparationInFlight = preparation.then(
    () => undefined,
    (err: unknown) => {
      output.appendLine(`New session preparation failed: ${String(err)}`);
      vscode.window.showErrorMessage(`Unable to prepare a new CAI session: ${String(err)}`);
    },
  );
  void preparationInFlight.then(() => {
    preparationInFlight = undefined;
  });
  return preparationInFlight;
}