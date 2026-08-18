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

import { isManagedAlias } from "./sshAlias";
import { endpointStatusOf } from "./status";
import { SSH_HOST_PREFIX, type SessionRecord } from "./types";

const HOST_LINE = /^\s*Host\s+(.+?)\s*$/i;

export type SshHostEntry = {
  alias: string;
  port: string;
};

function isManagedHostLine(line: string): boolean {
  const match = line.match(HOST_LINE);
  if (!match) {
    return false;
  }
  /* `Host` accepts several patterns. If any of them is ours the whole block has
   * to go, because leaving it would keep our alias resolving to a stale port. */
  return match[1].split(/\s+/).some(isManagedAlias);
}

function stripManagedBlocks(content: string): string {
  const out: string[] = [];
  let skipping = false;

  for (const line of content.split(/\r?\n/)) {
    if (HOST_LINE.test(line)) {
      skipping = isManagedHostLine(line);
      if (!skipping) {
        out.push(line);
      }
      continue;
    }
    if (skipping) {
      continue;
    }
    out.push(line);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

/**
 * `ServerAliveInterval` is load-bearing, not tuning.
 *
 * The connection runs through the `cdswctl` tunnel to CML, and whatever sits in
 * between commonly cuts a connection idle for ~300 seconds. OpenSSH's inherited
 * `TCPKeepAlive` only fires after the OS default of roughly two hours, so without
 * these the tunnel dies on its own — and `cdswctl` never re-dials, so the remote
 * window cannot be recovered.
 */
function renderBlock(entry: SshHostEntry): string {
  return (
    `Host ${entry.alias}\n` +
    `  HostName localhost\n` +
    `  Port ${entry.port}\n` +
    `  User cdsw\n` +
    `  StrictHostKeyChecking no\n` +
    `  UserKnownHostsFile /dev/null\n` +
    `  ServerAliveInterval 30\n` +
    `  ServerAliveCountMax 6\n` +
    `  LogLevel ERROR`
  );
}

function countHostLinesFor(content: string, alias: string): number {
  return content.split(/\r?\n/).filter((line) => {
    const match = line.match(HOST_LINE);
    return Boolean(match && match[1].split(/\s+/).includes(alias));
  }).length;
}

/**
 * Rewrite every block we own in one pass, so N sessions are reachable at once.
 *
 * A full replacement rather than an incremental edit: it is the only way to
 * guarantee a removed session leaves no stale alias pointing at a port some other
 * process may later reuse. Returns false unless every requested alias ends up in
 * the file exactly once.
 */
export function syncSshConfig(entries: SshHostEntry[], home: string = os.homedir()): boolean {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!isManagedAlias(entry.alias) || !/^\d+$/.test(entry.port) || seen.has(entry.alias)) {
      return false;
    }
    seen.add(entry.alias);
  }

  const sshDir = path.join(home, ".ssh");
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

  const ordered = [...entries].sort((a, b) => a.alias.localeCompare(b.alias));
  const blocks = ordered.map(renderBlock).join("\n\n");

  let updated = stripManagedBlocks(content);
  if (updated.trim()) {
    updated = updated.replace(/\s*$/, "");
    updated += blocks ? `\n\n${blocks}\n` : "\n";
  } else {
    updated = blocks ? `${blocks}\n` : "";
  }

  try {
    fs.writeFileSync(configFile, updated, "utf8");
  } catch (err) {
    throw new Error(`Failed to write SSH config ${configFile}: ${String(err)}`);
  }

  return ordered.every((entry) => countHostLinesFor(updated, entry.alias) === 1);
}

/**
 * The entries every live record needs, newest first so a duplicate alias resolves
 * in favour of the newer session.
 *
 * A record from before parallel support has no alias of its own and gets the
 * legacy bare `cml` host, so a window already connected through it still resolves.
 */
export function sshEntriesFromRecords(records: SessionRecord[]): SshHostEntry[] {
  const entries: SshHostEntry[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    if (endpointStatusOf(record) !== "running" || !record.port) {
      continue;
    }
    const alias = record.hostAlias ?? SSH_HOST_PREFIX;
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    entries.push({ alias, port: record.port });
  }

  return entries;
}
