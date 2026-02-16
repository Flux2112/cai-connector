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

import * as os from "os";
import * as vscode from "vscode";
import { ensureCdswctl, runCdswctl } from "./cdswctl";
import { SECRET_KEY, CDSWCTL_TIMEOUT_MS } from "./types";

export async function getApiKey(context: vscode.ExtensionContext): Promise<string | null> {
  const stored = await context.secrets.get(SECRET_KEY);
  if (stored) {
    return stored;
  }

  const apiKey = await vscode.window.showInputBox({
    title: "CML API Key",
    prompt: "Enter your CML API key",
    ignoreFocusOut: true,
    password: true,
  });

  if (!apiKey) {
    return null;
  }

  await context.secrets.store(SECRET_KEY, apiKey);
  return apiKey;
}

async function promptCmlUrl(): Promise<string | null> {
  const url = await vscode.window.showInputBox({
    title: "Cloudera AI Base URL",
    prompt: "Enter the base URL of your Cloudera AI (CML) instance",
    placeHolder: "https://your-cml-instance.example.com/",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "URL cannot be empty.";
      }
      if (!trimmed.startsWith("https://")) {
        return "URL must start with https://";
      }
      return null;
    },
  });

  if (!url) {
    return null;
  }

  return url.trim();
}

export async function ensureLoggedIn(
  context: vscode.ExtensionContext,
  cdswctlPath: string,
  output: vscode.OutputChannel,
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  let cmlUrl = config.get<string>("cmlUrl", "");
  if (!cmlUrl) {
    const prompted = await promptCmlUrl();
    if (!prompted) {
      return false;
    }
    await config.update("cmlUrl", prompted, vscode.ConfigurationTarget.Global);
    output.appendLine(`CML URL stored: ${prompted}`);
    cmlUrl = prompted;
  }
  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();

  const apiKey = await getApiKey(context);
  if (!apiKey) {
    return false;
  }

  const loginResult = await runCdswctl(
    cdswctlPath,
    ["login", "-n", username, "-u", cmlUrl, "-y", `%${SECRET_KEY}%`],
    output,
    CDSWCTL_TIMEOUT_MS,
    { [SECRET_KEY]: apiKey },
  );

  if (loginResult.exitCode !== 0) {
    vscode.window.showErrorMessage("Login failed. See output for details.");
    const sanitized = (loginResult.stderr || loginResult.stdout).split(apiKey).join("***");
    output.appendLine(sanitized);
    return false;
  }

  return true;
}

export async function resolveAndLogin(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");

  let cdswctlPath: string;
  try {
    cdswctlPath = await ensureCdswctl(output, cdswctlPathSetting);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to locate cdswctl: ${String(err)}`);
    return null;
  }

  const loggedIn = await ensureLoggedIn(context, cdswctlPath, output);
  if (!loggedIn) {
    return null;
  }

  return cdswctlPath;
}
