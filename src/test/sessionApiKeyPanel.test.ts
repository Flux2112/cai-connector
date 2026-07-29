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

import * as assert from "assert";
import { test } from "node:test";

type ModuleLoader = {
  _load(request: string, parent: unknown, isMain: boolean): unknown;
};

const moduleLoader = require("module") as ModuleLoader;

test("requests, validates and returns an API key from the webview", async () => {
  const posted: unknown[] = [];
  let receiveMessage: ((message: { type: string; apiKey?: string }) => void) | undefined;
  let disposePanel: (() => void) | undefined;
  let disposed = false;
  const originalLoad = moduleLoader._load;
  const modulePath = require.resolve("../sessionApiKeyPanel");

  moduleLoader._load = (request, parent, isMain) => {
    if (request === "vscode") {
      return {
        Uri: { joinPath: (uri: unknown) => uri },
        ViewColumn: { Active: 1 },
        window: {
          createWebviewPanel: () => ({
            webview: {
              html: "",
              postMessage: async (message: unknown) => { posted.push(message); },
              onDidReceiveMessage: (listener: (message: { type: string; apiKey?: string }) => void) => {
                receiveMessage = listener;
                return { dispose: () => undefined };
              },
            },
            onDidDispose: (listener: () => void) => {
              disposePanel = listener;
              return { dispose: () => undefined };
            },
            dispose: () => {
              disposed = true;
              disposePanel?.();
            },
          }),
        },
      };
    }
    if (request === "./sessionFormHtml") {
      return { renderSessionFormHtml: () => "" };
    }
    return originalLoad(request, parent, isMain);
  };
  delete require.cache[modulePath];

  try {
    const { requestApiKeyFromWebview } = require("../sessionApiKeyPanel");
    const requested = requestApiKeyFromWebview({ extensionUri: { toString: () => "extension" } });

    receiveMessage!({ type: "ready" });
    assert.deepStrictEqual(posted, [{ type: "requestApiKey" }]);

    receiveMessage!({ type: "submitApiKey", apiKey: "  " });
    assert.deepStrictEqual(posted, [
      { type: "requestApiKey" },
      { type: "apiKeyError", message: "Enter your CML API key." },
    ]);

    receiveMessage!({ type: "submitApiKey", apiKey: "  api-key  " });
    assert.strictEqual(await requested, "api-key");
    assert.strictEqual(disposed, true);
  } finally {
    moduleLoader._load = originalLoad;
    delete require.cache[modulePath];
  }
});