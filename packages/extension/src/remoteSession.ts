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

import { isManagedAlias } from "./sshConfig";
import { SessionRecord, SSH_HOST_PREFIX } from "./types";

const SSH_REMOTE_AUTHORITY_PREFIX = "ssh-remote+";

/** Returns an authority only when every workspace folder belongs to the same host. */
export function commonWorkspaceAuthority(authorities: readonly string[], workspaceAuthority?: string): string | undefined {
  if (authorities.length === 0) {
    return workspaceAuthority || undefined;
  }
  const [authority] = authorities;
  return authority && authorities.every((value) => value === authority) ? authority : undefined;
}

/** Extracts one of this extension's SSH aliases from a Remote-SSH URI authority. */
export function aliasForRemoteAuthority(authority: string | undefined): string | undefined {
  if (!authority?.startsWith(SSH_REMOTE_AUTHORITY_PREFIX)) {
    return undefined;
  }
  const alias = authority.slice(SSH_REMOTE_AUTHORITY_PREFIX.length);
  return isManagedAlias(alias) ? alias : undefined;
}

/** True when a stored session is the one backing the current Remote-SSH workspace. */
export function isRecordInRemoteWorkspace(record: SessionRecord, authority: string | undefined): boolean {
  const alias = aliasForRemoteAuthority(authority);
  return alias !== undefined && alias === (record.hostAlias ?? SSH_HOST_PREFIX);
}