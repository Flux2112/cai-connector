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
import { EndpointState } from "./types";

export function writeStateFile(statePath: string, state: EndpointState): void {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8");
}

export function appendLog(logPath: string, message: string): void {
  const stamped = `[${new Date().toISOString()}] ${message}`;
  fs.appendFileSync(logPath, stamped + "\n", "utf8");
}

export function readJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

export function safeKill(pid?: number): void {
  if (!pid) {
    return;
  }
  try {
    process.kill(pid);
  } catch {
    // Ignore
  }
}

export function stopCmlSessions(cdswctlPath: string, project: string, log: (msg: string) => void): void {
  if (!project) {
    return;
  }
  try {
    const args = ["sessions", "stop", "/p", project, "/a"];
    log(`Stopping CML sessions in project ${project} with args: ${args.join(" ")}`);
    const output = cp.execFileSync(
      cdswctlPath,
      args,
      {
        windowsHide: true,
        timeout: 30_000,
        cwd: path.dirname(cdswctlPath),
        encoding: "utf8",
        stdio: "pipe",
      },
    );
    if (typeof output === "string" && output.trim().length > 0) {
      log(`sessions stop output: ${output.trim()}`);
    }
    log("CML sessions stopped command completed.");
  } catch (err) {
    log(`Failed to stop CML sessions: ${String(err)}`);
    const maybeErr = err as { stdout?: string | Buffer; stderr?: string | Buffer };
    const stdout = maybeErr.stdout ? String(maybeErr.stdout).trim() : "";
    const stderr = maybeErr.stderr ? String(maybeErr.stderr).trim() : "";
    if (stdout) {
      log(`sessions stop stdout: ${stdout}`);
    }
    if (stderr) {
      log(`sessions stop stderr: ${stderr}`);
    }
  }
}
