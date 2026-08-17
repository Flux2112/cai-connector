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
import { capRecords } from "./sessionStatus";
import { HISTORY_FILE, MAX_FORM_RECENTS, SessionRecord } from "./types";

export function loadHistory(storagePath: string): SessionRecord[] {
  const file = path.join(storagePath, HISTORY_FILE);
  try {
    if (!fs.existsSync(file)) {
      return [];
    }
    return JSON.parse(fs.readFileSync(file, "utf8")) as SessionRecord[];
  } catch {
    return [];
  }
}

export function saveHistory(storagePath: string, records: SessionRecord[]): void {
  const file = path.join(storagePath, HISTORY_FILE);
  try {
    fs.mkdirSync(storagePath, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(capRecords(records), null, 2), "utf8");
  } catch {
    // best-effort — don't block flows
  }
}

/**
 * Returns the newest saved configurations for the session form without
 * changing the persisted history order. An empty history is valid on first use.
 */
export function recentSessionRecords(records: SessionRecord[]): SessionRecord[] {
  return [...records]
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
    .slice(0, MAX_FORM_RECENTS);
}

/**
 * Inserts a new session or merges into the existing record with the same id.
 *
 * Sessions run in parallel, so this deliberately touches nothing else: no
 * one-record-per-project rule, and no marking other records inactive. A record's
 * status is owned by the reconciler, which asks the endpoint pid and CML rather
 * than assuming a newer session replaced an older one.
 *
 * The read-modify-write is not atomic across windows. Merging by id keeps the
 * damage from a simultaneous write to a lost update on one field rather than a
 * lost session, and the reconciler repairs statuses on the next pass.
 */
export function addOrUpdateSession(storagePath: string, record: SessionRecord): void {
  const records = loadHistory(storagePath);
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = { ...records[index], ...record };
  } else {
    records.unshift(record);
  }
  saveHistory(storagePath, records);
}

/**
 * Replaces one record without retaining any stale endpoint or CML handles.
 * Used when an explicit recreation reuses the same sidebar entry.
 */
export function replaceSessionRecord(storagePath: string, record: SessionRecord): void {
  const records = loadHistory(storagePath);
  const index = records.findIndex((entry) => entry.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }
  saveHistory(storagePath, records);
}

/** Applies a patch to one record by id, leaving the rest of the file alone. */
export function patchSession(
  storagePath: string,
  id: string,
  patch: Partial<SessionRecord>,
): boolean {
  const records = loadHistory(storagePath);
  const target = records.find((r) => r.id === id);
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
    .map((r) => r.hostAlias)
    .filter((alias): alias is string => Boolean(alias));
}

export type SessionConfigPatch = {
  projectName: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memoryGb: number;
  gpus: number;
};

/**
 * Rewrites the configuration of one stored session, leaving its status, port,
 * host alias and endpoint PID alone. Returns false when the record is gone.
 *
 * Several sessions may share a project now, so renaming one never displaces
 * another.
 */
export function updateSessionConfig(storagePath: string, id: string, patch: SessionConfigPatch): boolean {
  return patchSession(storagePath, id, patch);
}

/**
 * Records that a session is fully torn down — local tunnel gone *and* the CML
 * session stopped. Callers that only killed the local process must not use this,
 * or a session still running on CML would be recorded as cleaned up.
 */
export function markSessionStopped(storagePath: string, id: string): void {
  patchSession(storagePath, id, {
    status: "inactive",
    endpointStatus: "stopped",
    cmlStatus: "stopped",
    endpointPid: undefined,
    port: undefined,
    lastCheckedAt: new Date().toISOString(),
  });
}

/** Removes a stopped session's saved configuration. Live entries are never removable. */
export function removeInactiveSession(storagePath: string, id: string): boolean {
  const records = loadHistory(storagePath);
  const target = records.find((record) => record.id === id);
  if (!target || target.status !== "inactive") {
    return false;
  }
  saveHistory(storagePath, records.filter((record) => record.id !== id));
  return true;
}
