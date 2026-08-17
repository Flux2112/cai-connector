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

function loadSessionFormPreparation(
  mocks: Record<string, unknown>,
): { openNewSessionForm: (context: unknown, output: unknown, launch: unknown) => Promise<void> } {
  const originalLoad = moduleLoader._load;
  const modulePath = require.resolve("../sessionFormPreparation");
  moduleLoader._load = (request, parent, isMain) => mocks[request] ?? originalLoad(request, parent, isMain);
  delete require.cache[modulePath];
  try {
    return require("../sessionFormPreparation");
  } finally {
    moduleLoader._load = originalLoad;
    delete require.cache[modulePath];
  }
}

test("opens the new-session form on the first click without waiting for a process scan", async () => {
  const progressMessages: string[] = [];
  const progressTitles: string[] = [];
  let formOpens = 0;
  const { openNewSessionForm } = loadSessionFormPreparation({
    vscode: {
      ProgressLocation: { Notification: 15 },
      window: {
        withProgress: async (options: { title: string }, task: (progress: { report: (value: { message: string }) => void }) => Promise<void>) => {
          progressTitles.push(options.title);
          return task({ report: ({ message }) => progressMessages.push(message) });
        },
        showErrorMessage: () => undefined,
      },
    },
    "./auth": { getStoredApiKey: async () => "stored-api-key", resolveAndLogin: async () => "C:/tools/cdswctl.exe" },
    "./sessionApiKeyPanel": {},
    "./runtimeManager": { RuntimeManager: class {} },
    "./runtimePicker": {},
    "./sessionForm": { SessionFormPanel: { show: () => { formOpens += 1; } } },
    "./sessionFormData": { buildSessionFormInit: async () => ({}) },
    "./sessionReconciler": {
      reconcileLocal: () => ({ changed: false, records: [] }),
      reconcileProcesses: async () => { throw new Error("process scan must not block form preparation"); },
    },
    "./sessionManager": {},
    "./state": {},
    "./utils": {},
  });

  const output = { show: () => undefined, appendLine: () => undefined };
  await openNewSessionForm({ globalStorageUri: { fsPath: "storage" } }, output, async () => undefined);

  assert.strictEqual(formOpens, 1);
  assert.deepStrictEqual(progressTitles, ["Preparing new CAI session"]);
  assert.deepStrictEqual(progressMessages, [
    "Checking local sessions...",
    "Signing in to CML...",
    "Loading session form...",
  ]);
});

test("shares a single preparation when the new-session command is clicked twice", async () => {
  let finishLogin: (path: string) => void;
  const login = new Promise<string>((resolve) => { finishLogin = resolve; });
  let markLoginStarted: () => void;
  const loginStarted = new Promise<void>((resolve) => { markLoginStarted = resolve; });
  let loginCalls = 0;
  let formOpens = 0;
  const { openNewSessionForm } = loadSessionFormPreparation({
    vscode: {
      ProgressLocation: { Notification: 15 },
      window: {
        withProgress: async (_options: unknown, task: (progress: { report: () => void }) => Promise<void>) => task({ report: () => undefined }),
        showErrorMessage: () => undefined,
      },
    },
    "./auth": {
      getStoredApiKey: async () => "stored-api-key",
      resolveAndLogin: async () => {
        loginCalls += 1;
        markLoginStarted!();
        return login;
      },
    },
    "./sessionApiKeyPanel": {},
    "./runtimeManager": { RuntimeManager: class {} },
    "./runtimePicker": {},
    "./sessionForm": { SessionFormPanel: { show: () => { formOpens += 1; } } },
    "./sessionFormData": { buildSessionFormInit: async () => ({}) },
    "./sessionReconciler": { reconcileLocal: () => ({ changed: false, records: [] }) },
    "./sessionManager": {},
    "./state": {},
    "./utils": {},
  });

  const output = { show: () => undefined, appendLine: () => undefined };
  const first = openNewSessionForm({ globalStorageUri: { fsPath: "storage" } }, output, async () => undefined);
  const second = openNewSessionForm({ globalStorageUri: { fsPath: "storage" } }, output, async () => undefined);
  assert.strictEqual(second, first);
  await loginStarted;
  assert.strictEqual(loginCalls, 1);

  finishLogin!("C:/tools/cdswctl.exe");
  await first;
  assert.strictEqual(formOpens, 1);
});

test("requests a missing API key from the webview before preparing the session form", async () => {
  let requestedKey = false;
  let loginKey: string | undefined;
  let formOpens = 0;
  const { openNewSessionForm } = loadSessionFormPreparation({
    vscode: {
      ProgressLocation: { Notification: 15 },
      window: {
        withProgress: async (_options: unknown, task: (progress: { report: () => void }) => Promise<void>) => task({ report: () => undefined }),
        showErrorMessage: () => undefined,
      },
    },
    "./auth": {
      getStoredApiKey: async () => null,
      resolveAndLogin: async (_context: unknown, _output: unknown, apiKey?: string) => {
        loginKey = apiKey;
        return "C:/tools/cdswctl.exe";
      },
    },
    "./sessionApiKeyPanel": {
      requestApiKeyFromWebview: async () => {
        requestedKey = true;
        return "webview-api-key";
      },
    },
    "./runtimeManager": { RuntimeManager: class {} },
    "./runtimePicker": {},
    "./sessionForm": { SessionFormPanel: { show: () => { formOpens += 1; } } },
    "./sessionFormData": { buildSessionFormInit: async () => ({}) },
    "./sessionReconciler": { reconcileLocal: () => ({ changed: false, records: [] }) },
    "./sessionManager": {},
    "./state": {},
    "./utils": {},
  });

  const output = { show: () => undefined, appendLine: () => undefined };
  await openNewSessionForm({ globalStorageUri: { fsPath: "storage" } }, output, async () => undefined);

  assert.strictEqual(requestedKey, true);
  assert.strictEqual(loginKey, "webview-api-key");
  assert.strictEqual(formOpens, 1);
});