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

import { REMOTE_PATH, SSH_HOST_PREFIX } from "./types";

/**
 * Naming for the SSH host aliases this project owns. Kept apart from the file
 * rewriting in `sshConfig.ts`: deciding what a session is called and editing the
 * user's `~/.ssh/config` are different responsibilities with different risks.
 */

const ALIAS_PATTERN = new RegExp(`^${SSH_HOST_PREFIX}(-[a-z0-9]+)*$`);

/**
 * True for aliases we own: the bare legacy `cml` plus every `cml-<slug>` written
 * for a parallel session. `cmlserver` and `my-cml-thing` are somebody else's.
 */
export function isManagedAlias(alias: string): boolean {
  return ALIAS_PATTERN.test(alias);
}

/** `owner/My Project (dev)` becomes `my-project-dev`. */
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
 * Pick an alias no other session is already using.
 *
 * **Assigned once, at creation, and never recomputed.** It ends up inside the
 * remote window's URI, so it has to stay stable for as long as that window can
 * be reloaded.
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

/** The URI Remote-SSH opens for one alias. */
export function remoteUriFor(alias: string): string {
  return `vscode-remote://ssh-remote+${alias}${REMOTE_PATH}`;
}
