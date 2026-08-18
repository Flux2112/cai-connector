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

import { capRecords } from "./status";
import { HISTORY_FILE, type SessionRecord } from "./types";

/**
 * `session_history.json`, the single source of truth for both writers.
 *
 * Synchronous `fs` throughout, matching the extension: the file is small, the
 * writes are whole-file, and an interleaved partial write is the one failure this
 * must not have. A read-modify-write is still not atomic across processes —
 * merging by id keeps the damage from a simultaneous write down to a lost update
 * on one field rather than a lost session.
 */

export function historyFile(storagePath: string): string {
  return path.join(storagePath, HISTORY_FILE);
}

/** An unreadable or malformed file reads as empty rather than throwing: a
 *  session listing that fails must not stop a caller from creating one. */
export function loadHistory(storagePath: string): SessionRecord[] {
  try {
    const file = historyFile(storagePath);
    if (!fs.existsSync(file)) {
      return [];
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(parsed) ? (parsed as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(storagePath: string, records: SessionRecord[]): void {
  const file = historyFile(storagePath);
  fs.mkdirSync(storagePath, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(capRecords(records), null, 2), "utf8");
}

/**
 * Insert a new session or merge into the record with the same id.
 *
 * Touches nothing else: no one-record-per-project rule, and no marking other
 * records inactive. Sessions run in parallel, and a second session in a project
 * you already have open is a supported thing to want.
 */
export function addOrUpdateSession(storagePath: string, record: SessionRecord): void {
  const records = loadHistory(storagePath);
  const index = records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    records[index] = { ...records[index], ...record };
  } else {
    records.unshift(record);
  }
  saveHistory(storagePath, records);
}

/** Apply a patch to one record by id, leaving the rest of the file alone. */
export function patchSession(
  storagePath: string,
  id: string,
  patch: Partial<SessionRecord>,
): boolean {
  const records = loadHistory(storagePath);
  const target = records.find((entry) => entry.id === id);
  if (!target) {
    return false;
  }
  Object.assign(target, patch);
  saveHistory(storagePath, records);
  return true;
}

/** Host aliases already claimed by stored sessions, so a new one can avoid them. */
export function takenHostAliases(storagePath: string): string[] {
  return loadHistory(storagePath)
    .map((record) => record.hostAlias)
    .filter((alias): alias is string => Boolean(alias));
}

/**
 * Record that a session is fully torn down — local tunnel gone *and* the CML
 * session stopped. A caller that only killed the local process must not use
 * this, or a session still running on CML would be recorded as cleaned up.
 */
export function markSessionStopped(storagePath: string, id: string, now = new Date()): void {
  patchSession(storagePath, id, {
    status: "inactive",
    endpointStatus: "stopped",
    cmlStatus: "stopped",
    endpointPid: undefined,
    port: undefined,
    lastCheckedAt: now.toISOString(),
  });
}
