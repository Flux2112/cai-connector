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
import * as vscode from "vscode";
import { LastSessionConfig, SESSION_FILE } from "./types";
import { getStoragePath } from "./utils";

let activeProject: string | null = null;

export function getActiveProject(): string | null {
  return activeProject;
}

export function setActiveProject(project: string | null): void {
  activeProject = project;
}

export function saveLastSession(context: vscode.ExtensionContext, session: LastSessionConfig): void {
  const sessionPath = getStoragePath(context, SESSION_FILE);
  try {
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
  } catch {
    // Best-effort — don't block the flow
  }
}

export function loadLastSession(context: vscode.ExtensionContext): LastSessionConfig | null {
  const sessionPath = getStoragePath(context, SESSION_FILE);
  try {
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    const raw = fs.readFileSync(sessionPath, "utf8");
    return JSON.parse(raw) as LastSessionConfig;
  } catch {
    return null;
  }
}
