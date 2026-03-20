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
import { HISTORY_FILE, SessionRecord } from "./types";

const MAX_SESSIONS = 5;

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
    fs.writeFileSync(file, JSON.stringify(records.slice(0, MAX_SESSIONS), null, 2), "utf8");
  } catch {
    // best-effort — don't block flows
  }
}

export function addOrUpdateSession(storagePath: string, record: SessionRecord): void {
  const records = loadHistory(storagePath);
  // Mark any previously active records as inactive
  for (const r of records) {
    if (r.status === "active") {
      r.status = "inactive";
      r.helperPid = undefined;
      r.endpointPid = undefined;
    }
  }
  const idx = records.findIndex(r => r.id === record.id);
  if (idx !== -1) {
    records.splice(idx, 1);
  }
  records.unshift(record);
  saveHistory(storagePath, records);
}

export function markSessionInactive(storagePath: string, id: string): void {
  const records = loadHistory(storagePath);
  const rec = records.find(r => r.id === id);
  if (rec) {
    rec.status = "inactive";
    rec.helperPid = undefined;
    rec.endpointPid = undefined;
    saveHistory(storagePath, records);
  }
}

export function markAllInactive(storagePath: string): void {
  const records = loadHistory(storagePath);
  let changed = false;
  for (const r of records) {
    if (r.status === "active") {
      r.status = "inactive";
      r.helperPid = undefined;
      r.endpointPid = undefined;
      changed = true;
    }
  }
  if (changed) {
    saveHistory(storagePath, records);
  }
}
