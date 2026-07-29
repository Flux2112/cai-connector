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

import * as fs from "fs";
import * as path from "path";
import * as cp from "child_process";
import * as vscode from "vscode";
import { ConnectParams } from "./types";

export function getStoragePath(context: vscode.ExtensionContext, fileName: string): string {
  return path.join(context.globalStorageUri.fsPath, fileName);
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 = check if alive, don't actually kill
    return true;
  } catch {
    return false;
  }
}

export function clearFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore
  }
}

export function buildEndpointArgs(params: ConnectParams): string[] {
  const args = [
    "ssh-endpoint",
    "-p",
    params.project,
    "-r",
    String(params.runtimeId),
    "-c",
    String(params.cpus),
    "-m",
    String(params.memory),
    "-g",
    String(params.gpus),
  ];
  if (params.addonId !== null) {
    args.push(`--addons=${String(params.addonId)}`);
  }
  return args;
}

export function multiTermFilter(items: vscode.QuickPickItem[], value: string): vscode.QuickPickItem[] {
  const terms = value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length <= 1) {
    return items;
  }

  return items.filter((item) => {
    const haystack = `${item.label} ${item.description ?? ""} ${item.detail ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function stopCmlSessions(
  cdswctlPath: string,
  project: string,
  log: (msg: string) => void,
  sessionId?: string,
): void {
  if (!project || !sessionId) {
    log("No session ID or project — skipping session cleanup.");
    return;
  }
  try {
    const args = ["sessions", "stop", "/s", sessionId, "/p", project];
    log(`Stopping session ${sessionId} in project ${project} (sync).`);
    const out = cp.execFileSync(cdswctlPath, args, {
      windowsHide: true,
      timeout: 30_000,
      cwd: path.dirname(cdswctlPath),
      encoding: "utf8",
      stdio: "pipe",
    });
    if (typeof out === "string" && out.trim().length > 0) {
      log(`sessions stop output: ${out.trim()}`);
    }
    log("CML session stop completed.");
  } catch (err) {
    const errStr = String(err);
    const maybeErr = err as { stdout?: string | Buffer; stderr?: string | Buffer };
    const stdout = maybeErr.stdout ? String(maybeErr.stdout).trim() : "";
    const stderr = maybeErr.stderr ? String(maybeErr.stderr).trim() : "";
    if (/unexpected end of JSON/i.test(errStr + stdout + stderr)) {
      log("Session stop returned known cdswctl bug (session likely stopped successfully).");
    } else {
      log(`Failed to stop CML session: ${errStr}`);
    }
  }
}
