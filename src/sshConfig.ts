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

const HOST_CML_PATTERN = /^Host\s+cml\s*\n(?:^[ \t]+\S.*\n?)*/gm;

export function updateSshConfig(port: string): boolean {
  if (!port || !/^\d+$/.test(port)) {
    return false;
  }

  const sshDir = path.join(os.homedir(), ".ssh");
  const configFile = path.join(sshDir, "config");

  try {
    fs.mkdirSync(sshDir, { recursive: true });
  } catch (err) {
    throw new Error(`Failed to create SSH directory ${sshDir}: ${String(err)}`);
  }

  let content: string;
  try {
    content = fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : "";
  } catch (err) {
    throw new Error(`Failed to read SSH config ${configFile}: ${String(err)}`);
  }

  const newBlock = `Host cml\n  HostName localhost\n  Port ${port}\n  User cdsw`;

  const matches = content.match(HOST_CML_PATTERN);
  let updated = content;

  if (matches && matches.length > 1) {
    updated = updated.replace(HOST_CML_PATTERN, "");
    updated = updated.replace(/\n{3,}/g, "\n\n");
  }

  if (updated.match(HOST_CML_PATTERN)) {
    updated = updated.replace(HOST_CML_PATTERN, newBlock);
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

  try {
    fs.writeFileSync(configFile, updated, "utf8");
  } catch (err) {
    throw new Error(`Failed to write SSH config ${configFile}: ${String(err)}`);
  }

  const finalMatches = updated.match(HOST_CML_PATTERN);
  return !!finalMatches && finalMatches.length === 1;
}
