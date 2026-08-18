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
import * as path from "path";

import { EXTENSION_ID } from "./types";

/**
 * Where the extension keeps `session_history.json`, and therefore where the CLI
 * has to keep it too.
 *
 * **Sharing this file is a correctness requirement, not a convenience.** The
 * extension kills every `cdswctl ssh-endpoint` process that no stored record
 * claims when a window starts up. A CLI that kept its own registry would have
 * its tunnels killed by the next VS Code window that opened.
 *
 * The path is `context.globalStorageUri.fsPath` as VS Code computes it:
 * `%APPDATA%/Code/User/globalStorage/<publisher>.<name>` on Windows. `CAI_STORAGE_DIR`
 * overrides it, which is how the tests avoid touching the developer's own
 * sessions and how a VS Code variant (Insiders, VSCodium) can be pointed at.
 */
export function extensionStoragePath(env: NodeJS.ProcessEnv = process.env): string {
  const override = (env.CAI_STORAGE_DIR ?? "").trim();
  if (override) {
    return override;
  }

  if (process.platform === "win32") {
    const appData = env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(appData, "Code", "User", "globalStorage", EXTENSION_ID);
  }
  if (process.platform === "darwin") {
    return path.join(
      os.homedir(), "Library", "Application Support", "Code", "User", "globalStorage", EXTENSION_ID,
    );
  }
  return path.join(os.homedir(), ".config", "Code", "User", "globalStorage", EXTENSION_ID);
}

/**
 * Is this pid still alive?
 *
 * Signal 0 asks without killing. A pid alone is not proof the process is *ours*
 * — pids are reused — which is why the endpoint scan exists as well.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
