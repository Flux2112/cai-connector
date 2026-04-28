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

const HOST_LINE = /^\s*Host\s+(.+?)\s*$/i;

function isCmlHostLine(line: string): boolean {
  const m = line.match(HOST_LINE);
  if (!m) {
    return false;
  }
  // Match only if "cml" is one of the listed host patterns (Host accepts multiple).
  return m[1].split(/\s+/).some((token) => token === "cml");
}

function stripCmlBlocks(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;

  for (const line of lines) {
    const isHost = HOST_LINE.test(line);
    if (isHost) {
      skipping = isCmlHostLine(line);
      if (!skipping) {
        out.push(line);
      }
      continue;
    }
    if (skipping) {
      // Skip everything (indented options, blank lines, comments) until next Host.
      continue;
    }
    out.push(line);
  }

  // Collapse 3+ consecutive blank lines down to a single blank line.
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

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

  const newBlock =
    `Host cml\n` +
    `  HostName localhost\n` +
    `  Port ${port}\n` +
    `  User cdsw\n` +
    `  StrictHostKeyChecking no\n` +
    `  UserKnownHostsFile /dev/null\n` +
    `  LogLevel ERROR`;

  let updated = stripCmlBlocks(content);

  if (updated.trim()) {
    updated = updated.replace(/\s*$/, "");
    updated += "\n\n" + newBlock + "\n";
  } else {
    updated = newBlock + "\n";
  }

  try {
    fs.writeFileSync(configFile, updated, "utf8");
  } catch (err) {
    throw new Error(`Failed to write SSH config ${configFile}: ${String(err)}`);
  }

  // Verify exactly one Host cml block was written.
  const cmlHostCount = updated
    .split(/\r?\n/)
    .filter((line) => isCmlHostLine(line)).length;
  return cmlHostCount === 1;
}
