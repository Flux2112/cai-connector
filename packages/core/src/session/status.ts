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
  ENDPOINT_READY_TIMEOUT_MS,
  MAX_SESSION_RECORDS,
  type CmlStatus,
  type EndpointStatus,
  type SessionRecord,
  type SessionStatus,
} from "./types";

/**
 * A port of the extension's `sessionStatus.ts`. Every rule in it is load-bearing
 * and several are counter-intuitive, so the port keeps the reasoning with the
 * code rather than restating it.
 */

/**
 * How long a session may sit in `starting` before it is treated as failed.
 * Twice the ready timeout, so a merely slow endpoint is never mislabelled.
 */
export const STARTING_GRACE_MS = 2 * ENDPOINT_READY_TIMEOUT_MS;

export function isStuckStarting(record: SessionRecord, now = Date.now()): boolean {
  if (record.status !== "starting") {
    return false;
  }
  const started = Date.parse(record.startedAt);
  return Number.isFinite(started) && now - started > STARTING_GRACE_MS;
}

/**
 * A CML status of `unknown` never produces `error`: not having reached CML is not
 * evidence of disagreement.
 */
export function rollUpStatus(endpoint: EndpointStatus, cml: CmlStatus): SessionStatus {
  if (endpoint === "running") {
    return cml === "stopped" ? "error" : "active";
  }
  if (cml === "running") {
    return "error";
  }
  return "inactive";
}

export function endpointStatusOf(record: SessionRecord): EndpointStatus {
  return record.endpointStatus ?? (record.status === "active" ? "running" : "stopped");
}

export function cmlStatusOf(record: SessionRecord): CmlStatus {
  return record.cmlStatus ?? "unknown";
}

/**
 * Still running on CML with no local endpoint to reach it through.
 *
 * The only condition that authorises stopping a session nobody pointed at, and
 * it deliberately requires a *confirmed* `running`: a `cmlStatus` of `unknown`
 * must never trigger a stop. Every widening of this is a bug.
 */
export function isOrphanedOnCml(record: SessionRecord): boolean {
  return (
    endpointStatusOf(record) !== "running" &&
    cmlStatusOf(record) === "running" &&
    Boolean(record.sessionId)
  );
}

/** A live tunnel pointing at a session CML has already ended. */
export function isStaleEndpoint(record: SessionRecord): boolean {
  return endpointStatusOf(record) === "running" && cmlStatusOf(record) === "stopped";
}

export function isLive(record: SessionRecord): boolean {
  return endpointStatusOf(record) === "running" || cmlStatusOf(record) === "running";
}

function endpointWord(status: EndpointStatus): string {
  return status === "running" ? "endpoint up" : status === "stopped" ? "endpoint gone" : "endpoint ?";
}

function cmlWord(status: CmlStatus): string {
  return status === "running" ? "CML up" : status === "stopped" ? "CML gone" : "CML unchecked";
}

/** Both halves are always spelled out; conflating them into one word is the
 *  specific mistake this project has a rule against. */
export function statusSummary(record: SessionRecord): string {
  if (record.status === "starting") {
    return "starting…";
  }
  const parts = [endpointWord(endpointStatusOf(record)), cmlWord(cmlStatusOf(record))];
  if (record.port && endpointStatusOf(record) === "running") {
    parts.unshift(`:${record.port}`);
  }
  return parts.join(" · ");
}

export function statusProblem(record: SessionRecord): string | null {
  if (isOrphanedOnCml(record)) {
    return "Still running on CML with no local endpoint — clean it up to free cluster capacity.";
  }
  if (isStaleEndpoint(record)) {
    return "The tunnel is still running but CML has already ended the session.";
  }
  return null;
}

/**
 * Session ids out of `cdswctl sessions list`.
 *
 * The layout is not contractual, so this tokenises generously rather than
 * assuming columns. Over-matching is harmless: the result is only ever tested for
 * membership of an id we recorded ourselves.
 */
export function parseSessionIds(stdout: string): Set<string> {
  const ids = new Set<string>();
  for (const raw of stdout.split(/[\s,;|]+/)) {
    const token = raw.trim().replace(/^["'(<[]+/, "").replace(/["')>\].]+$/, "");
    if (/^[A-Za-z0-9][A-Za-z0-9._-]{3,}$/.test(token)) {
      ids.add(token);
    }
  }
  return ids;
}

/**
 * Enforce the history cap by discarding the oldest `inactive` records first.
 * Records in any other state are always kept, however many there are.
 */
export function capRecords(records: SessionRecord[], max = MAX_SESSION_RECORDS): SessionRecord[] {
  const kept = [...records];
  for (let i = kept.length - 1; i >= 0 && kept.length > max; i -= 1) {
    if (kept[i].status === "inactive") {
      kept.splice(i, 1);
    }
  }
  return kept;
}
