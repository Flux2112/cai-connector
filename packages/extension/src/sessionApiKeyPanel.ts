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
import { renderSessionFormHtml } from "./sessionFormHtml";
import { HostToWebviewMessage, WebviewToHostMessage } from "./types";

const VIEW_TYPE = "caiConnector.apiKeyPrompt";

/** Collects a missing API key in the extension webview without persisting it there. */
export function requestApiKeyFromWebview(context: vscode.ExtensionContext): Promise<string | null> {
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
  const panel = vscode.window.createWebviewPanel(
    VIEW_TYPE,
    "CML API Key",
    vscode.ViewColumn.Active,
    {
      enableScripts: true,
      localResourceRoots: [mediaRoot],
    },
  );
  panel.webview.html = renderSessionFormHtml(panel.webview, mediaRoot);

  return new Promise((resolve) => {
    const disposables: vscode.Disposable[] = [];
    let settled = false;
    const cleanup = () => {
      while (disposables.length > 0) {
        disposables.pop()?.dispose();
      }
    };
    const finish = (apiKey: string | null, disposePanel: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(apiKey);
      if (disposePanel) {
        panel.dispose();
      }
    };
    const post = (message: HostToWebviewMessage) => {
      void panel.webview.postMessage(message).then(undefined, () => { /* panel gone */ });
    };

    disposables.push(panel.webview.onDidReceiveMessage((message: WebviewToHostMessage) => {
      switch (message.type) {
        case "ready":
          post({ type: "requestApiKey" });
          return;
        case "submitApiKey": {
          const apiKey = message.apiKey.trim();
          if (!apiKey) {
            post({ type: "apiKeyError", message: "Enter your CML API key." });
            return;
          }
          finish(apiKey, true);
          return;
        }
        case "cancel":
          finish(null, true);
          return;
        default:
          return;
      }
    }));
    disposables.push(panel.onDidDispose(() => finish(null, false)));
  });
}