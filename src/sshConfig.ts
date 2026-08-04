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
import { REMOTE_PATH, SSH_HOST_PREFIX } from "./types";

const HOST_LINE = /^\s*Host\s+(.+?)\s*$/i;
const ALIAS_PATTERN = new RegExp(`^${SSH_HOST_PREFIX}(-[a-z0-9]+)*$`);

export type SshHostEntry = {
  alias: string;
  port: string;
};

/**
 * True for host aliases this extension owns: the bare legacy `cml` plus every
 * `cml-<slug>` written for a parallel session. Anything else in the user's
 * config is none of our business.
 */
export function isManagedAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}

function isManagedHostLine(line: string): boolean {
  const m = line.match(HOST_LINE);
  if (!m) {
    return false;
  }
  // `Host` accepts several patterns. If any of them is ours the whole block has
  // to go, because leaving it would keep our alias resolving to a stale port.
  return m[1].split(/\s+/).some(isManagedAlias);
}

/** Turns `owner/My Project (dev)` into `my-project-dev`. */
export function slugForProject(projectName: string): string {
  const tail = projectName.split("/").pop() ?? "";
  const slug = tail
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24)
    .replace(/-+$/, "");
  return slug || "session";
}

/**
 * Picks a host alias for a new session that no other session is already using.
 *
 * The chosen alias is stored on the session record and never recomputed: it ends
 * up inside the remote window's URI, so it has to stay stable for as long as
 * that window can be reloaded.
 */
export function assignHostAlias(projectName: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = `${SSH_HOST_PREFIX}-${slugForProject(projectName)}`;
  if (!used.has(base)) {
    return base;
  }
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  throw new Error(`Unable to find a free SSH host alias for project ${projectName}.`);
}

export function remoteUriFor(alias: string): string {
  return `vscode-remote://ssh-remote+${alias}${REMOTE_PATH}`;
}

function stripManagedBlocks(content: string): string {
  const lines = content.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (HOST_LINE.test(line)) {
      skipping = isManagedHostLine(line);
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

/**
 * `ServerAliveInterval` is load-bearing, not tuning.
 *
 * The connection runs through the `cdswctl` tunnel to CML, and whatever sits in
 * between (gateway, proxy, load balancer) commonly cuts a connection that has
 * carried no bytes for 300 seconds. An idle remote window sends nothing for
 * minutes, and OpenSSH's inherited `TCPKeepAlive` only fires after the OS default
 * of roughly two hours, so without this the tunnel dies on its own — and since
 * `cdswctl` never re-dials, the remote window cannot be recovered.
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
    const m = line.match(HOST_LINE);
    return Boolean(m && m[1].split(/\s+/).includes(alias));
  }).length;
}

/**
 * Rewrites every block this extension owns in one pass, so N sessions can be
 * reachable at the same time under N aliases.
 *
 * This is a full replacement rather than an incremental edit: it is the only way
 * to guarantee a removed session leaves no stale alias pointing at a port some
 * other process may later reuse. Returns false unless every requested alias
 * ends up in the file exactly once.
 */
export function syncSshConfig(entries: SshHostEntry[]): boolean {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!isManagedAlias(entry.alias)) {
      return false;
    }
    if (!entry.port || !/^\d+$/.test(entry.port)) {
      return false;
    }
    if (seen.has(entry.alias)) {
      return false;
    }
    seen.add(entry.alias);
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

  const ordered = [...entries].sort((a, b) => a.alias.localeCompare(b.alias));
  const blocks = ordered.map(renderBlock).join("\n\n");

  let updated = stripManagedBlocks(content);
  if (updated.trim()) {
    updated = updated.replace(/\s*$/, "");
    updated += blocks ? "\n\n" + blocks + "\n" : "\n";
  } else {
    updated = blocks ? blocks + "\n" : "";
  }

  try {
    fs.writeFileSync(configFile, updated, "utf8");
  } catch (err) {
    throw new Error(`Failed to write SSH config ${configFile}: ${String(err)}`);
  }

  return ordered.every((entry) => countHostLinesFor(updated, entry.alias) === 1);
}
