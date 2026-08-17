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
  CmlStatus, EndpointStatus, ENDPOINT_READY_TIMEOUT_MS, MAX_SESSION_RECORDS,
  SessionRecord, SessionStatus,
} from "./types";

/**
 * How long a session may sit in `starting` before it is treated as failed.
 *
 * cdswctl is spawned detached, so a window that dies mid-creation leaves a live
 * process behind a record that would otherwise say "starting…" forever, with no
 * port and no way to reach it. Twice the ready timeout is generous enough that a
 * merely slow endpoint is never mislabelled.
 */
export const STARTING_GRACE_MS = 2 * ENDPOINT_READY_TIMEOUT_MS;

/** True for a session that never finished coming up and never will. */
export function isStuckStarting(record: SessionRecord, now = Date.now()): boolean {
  if (record.status !== "starting") {
    return false;
  }
  const started = Date.parse(record.startedAt);
  return Number.isFinite(started) && now - started > STARTING_GRACE_MS;
}

/**
 * Combines the local and remote statuses into the single value the sidebar,
 * menus and flows key off.
 *
 * A CML status of `unknown` never produces `error`: not having reached CML is
 * not evidence of disagreement, and treating it as such would make the sidebar
 * flap red whenever the network is slow.
 */
export function rollUpStatus(endpoint: EndpointStatus, cml: CmlStatus): SessionStatus {
  if (endpoint === "running") {
    // A live tunnel into a session CML has already ended is dead weight.
    return cml === "stopped" ? "error" : "active";
  }
  // Endpoint gone but the session is still burning cluster capacity: an orphan.
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
 * True when the session is still running on CML with no local endpoint to reach
 * it through. This is the only condition that authorises stopping a session
 * during cleanup, and it deliberately requires a confirmed `running` — a
 * `unknown` CML status must never trigger a stop.
 */
export function isOrphanedOnCml(record: SessionRecord): boolean {
  return (
    endpointStatusOf(record) !== "running" &&
    cmlStatusOf(record) === "running" &&
    Boolean(record.sessionId)
  );
}

/** True when a live tunnel points at a session CML has already ended. */
export function isStaleEndpoint(record: SessionRecord): boolean {
  return endpointStatusOf(record) === "running" && cmlStatusOf(record) === "stopped";
}

/** Records worth showing as "in use" — anything with a live tunnel or a live CML session. */
export function isLive(record: SessionRecord): boolean {
  return endpointStatusOf(record) === "running" || cmlStatusOf(record) === "running";
}

function endpointWord(status: EndpointStatus): string {
  return status === "running" ? "endpoint up" : status === "stopped" ? "endpoint gone" : "endpoint ?";
}

function cmlWord(status: CmlStatus): string {
  return status === "running" ? "CML up" : status === "stopped" ? "CML gone" : "CML unchecked";
}

/**
 * The one-line summary shown next to a session in the sidebar. Both halves are
 * always spelled out, because issue #2 is specifically about the two being
 * conflated into a single misleading word.
 */
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

/** A short reason line for records whose two statuses disagree. */
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
 * Extracts session identifiers from `cdswctl sessions list` output.
 *
 * The exact layout is not contractual, so this tokenises generously rather than
 * assuming columns. Over-matching is harmless: the result is only ever tested
 * for membership of an identifier the extension itself recorded.
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
 * Enforces the history cap by discarding the oldest `inactive` records first.
 * Records in any other state are always kept, however many there are: dropping
 * a running session would make its endpoint look untracked to the next window's
 * orphan sweep, which would then kill a tunnel somebody is using.
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
