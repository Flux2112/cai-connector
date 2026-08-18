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

import {
  cmlStatusOf,
  endpointStatusOf,
  isProcessAlive,
  rollUpStatus,
  statusProblem,
  type EndpointStatus,
  type SessionRecord,
} from "@defysoftware/cai-core";

import { CaiCliError, EXIT } from "./exit";

/**
 * `cai session *` is Windows-only, and not by accident.
 *
 * It drives `cdswctl.exe` and finds tunnels with a PowerShell `Win32_Process`
 * scan, because API v2 has no session endpoints at all. The API commands in this
 * CLI are cross-platform; these cannot be.
 */
export function assertWindows(): void {
  if (process.platform !== "win32") {
    throw new CaiCliError(
      `cai session needs Windows: it drives cdswctl.exe and scans processes with PowerShell (this is ${process.platform})`,
      EXIT.USAGE,
    );
  }
}

/**
 * Find the one session a reference names.
 *
 * Record ids are ISO timestamps, which nobody wants to type, so a host alias, an
 * id prefix or a project name all work — as long as exactly one record matches.
 * Ambiguity is refused rather than resolved: killing the wrong session because
 * two of them share a project is not a mistake worth risking.
 */
export function resolveRecord(records: SessionRecord[], ref: string): SessionRecord {
  const needle = ref.trim();
  if (!needle) {
    throw new CaiCliError("a session id, host alias or project name is required", EXIT.USAGE);
  }

  const exact = records.filter((record) => record.id === needle || record.hostAlias === needle);
  if (exact.length === 1) {
    return exact[0];
  }

  const lower = needle.toLowerCase();
  const loose = records.filter(
    (record) =>
      record.id.toLowerCase().startsWith(lower) ||
      record.hostAlias?.toLowerCase() === lower ||
      record.projectName.toLowerCase() === lower,
  );

  if (loose.length === 1) {
    return loose[0];
  }
  if (loose.length === 0) {
    throw new CaiCliError(`no stored session matches ${JSON.stringify(ref)}`, EXIT.USAGE);
  }
  throw new CaiCliError(
    `${JSON.stringify(ref)} matches ${loose.length} sessions: ` +
      loose.map((record) => record.hostAlias ?? record.id).join(", "),
    EXIT.USAGE,
  );
}

export type SessionRow = {
  id: string;
  project: string;
  status: string;
  endpoint: EndpointStatus;
  cml: string;
  hostAlias?: string;
  port?: string;
  pid?: number;
  startedAt: string;
  problem: string | null;
};

/**
 * One record as a row, with the endpoint status corrected by what is actually
 * running.
 *
 * `livePids` is the process scan, and **null means the scan failed**, which is
 * not the same as an empty list: with no evidence the stored status stands rather
 * than being downgraded to `stopped`. A pid alone would not be proof either way —
 * pids get reused — which is why the scan looks for `cdswctl ssh-endpoint`
 * specifically and this only trusts a pid that appears in it.
 */
export function sessionRow(record: SessionRecord, livePids: number[] | null): SessionRow {
  const stored = endpointStatusOf(record);
  let endpoint = stored;

  if (livePids !== null && record.endpointPid !== undefined) {
    endpoint = livePids.includes(record.endpointPid) ? "running" : "stopped";
  } else if (livePids !== null && stored === "running") {
    /* Claims to be running but names no pid: nothing to confirm it with. */
    endpoint = "unknown";
  } else if (livePids === null && record.endpointPid !== undefined && stored === "running") {
    /* No scan, so fall back to the weaker question a pid can answer on its own. */
    endpoint = isProcessAlive(record.endpointPid) ? "running" : "stopped";
  }

  const cml = cmlStatusOf(record);
  const corrected: SessionRecord = { ...record, endpointStatus: endpoint };

  return {
    id: record.id,
    project: record.projectName,
    status: record.status === "starting" ? "starting" : rollUpStatus(endpoint, cml),
    endpoint,
    cml,
    hostAlias: record.hostAlias,
    port: record.port,
    pid: record.endpointPid,
    startedAt: record.startedAt,
    problem: statusProblem(corrected),
  };
}
