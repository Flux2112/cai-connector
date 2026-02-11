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
import * as os from "os";
import * as path from "path";

export function updateSshConfig(port: string): boolean {
  if (!port || !/^\d+$/.test(port)) {
    return false;
  }

  const sshDir = path.join(os.homedir(), ".ssh");
  const configFile = path.join(sshDir, "config");
  fs.mkdirSync(sshDir, { recursive: true });

  const content = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "";

  const newBlock = `Host cml\n  HostName localhost\n  Port ${port}\n  User cdsw`;
  const pattern = new RegExp("^Host\\s+cml\\s*\\n(?:^[ \\t]+\\S.*\\n?)*", "gm");

  const matches = content.match(pattern);
  let updated = content;

  if (matches && matches.length > 1) {
    updated = updated.replace(pattern, "");
    updated = updated.replace(/\n{3,}/g, "\n\n");
  }

  if (updated.match(pattern)) {
    updated = updated.replace(pattern, newBlock);
  } else {
    if (updated.trim()) {
      if (!updated.endsWith("\n\n")) {
        updated = updated.endsWith("\n") ? updated + "\n" : updated + "\n\n";
      }
      updated += newBlock + "\n";
    } else {
      updated = newBlock + "\n";
    }
  }

  fs.writeFileSync(configFile, updated, "utf8");

  const finalMatches = updated.match(pattern);
  return !!finalMatches && finalMatches.length === 1;
}
