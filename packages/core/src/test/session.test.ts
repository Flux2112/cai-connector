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

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  activateRecord,
  addOrUpdateSession,
  buildEndpointArgs,
  capRecords,
  cmlStatusOf,
  endpointStatusOf,
  extensionStoragePath,
  isOrphanedOnCml,
  isStaleEndpoint,
  isStuckStarting,
  loadHistory,
  markSessionStopped,
  matchReadyEndpoint,
  matchSessionId,
  newSessionRecord,
  parseSessionIds,
  patchSession,
  rollUpStatus,
  saveHistory,
  statusSummary,
  takenHostAliases,
  untrackedEndpointPids,
  type CmlStatus,
  type EndpointStatus,
  type SessionRecord,
  type SessionStatus,
} from "../session";

/*
 * The extension holds the same rules in its own copy of this logic, and the two
 * write one file. These assertions are the conformance guard: if either side
 * drifts, its own suite fails. See AGENTS.md on why there are two copies at all.
 */

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "2026-01-01T00:00:00.000Z",
    projectName: "owner/project",
    runtimeId: 42,
    addonId: null,
    cpus: 2,
    memoryGb: 4,
    gpus: 0,
    status: "active",
    startedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

function withStorage(run: (storagePath: string) => void): void {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cai-session-"));
  try {
    run(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("rollUpStatus combines the two statuses the way the sidebar expects", () => {
  const cases: Array<[EndpointStatus, CmlStatus, SessionStatus]> = [
    ["running", "running", "active"],
    ["running", "unknown", "active"],
    ["running", "stopped", "error"],
    ["stopped", "running", "error"],
    ["stopped", "stopped", "inactive"],
    ["stopped", "unknown", "inactive"],
    ["unknown", "running", "error"],
    ["unknown", "unknown", "inactive"],
  ];
  for (const [endpoint, cml, expected] of cases) {
    assert.equal(rollUpStatus(endpoint, cml), expected, `${endpoint} + ${cml}`);
  }
});

test("an unknown CML status is never enough to call a session orphaned", () => {
  const base = { endpointStatus: "stopped" as const, sessionId: "s-1" };
  assert.equal(isOrphanedOnCml(record({ ...base, cmlStatus: "running" })), true);
  assert.equal(isOrphanedOnCml(record({ ...base, cmlStatus: "unknown" })), false);
  assert.equal(isOrphanedOnCml(record({ ...base, cmlStatus: "stopped" })), false);
  /* No session id means nothing to stop, so nothing to call an orphan. */
  assert.equal(isOrphanedOnCml(record({ endpointStatus: "stopped", cmlStatus: "running" })), false);
  /* A live endpoint is not an orphan however the remote side looks. */
  assert.equal(
    isOrphanedOnCml(record({ endpointStatus: "running", cmlStatus: "running", sessionId: "s-1" })),
    false,
  );
});

test("a live tunnel to a dead session is stale, and the two statuses default sanely", () => {
  assert.equal(isStaleEndpoint(record({ endpointStatus: "running", cmlStatus: "stopped" })), true);
  /* Records written before the dual status existed carry neither field. */
  assert.equal(endpointStatusOf(record({ status: "active" })), "running");
  assert.equal(endpointStatusOf(record({ status: "inactive" })), "stopped");
  assert.equal(cmlStatusOf(record()), "unknown");
});

test("capRecords drops the oldest inactive records and never a live one", () => {
  const live = Array.from({ length: 6 }, (_, i) => record({ id: `live-${i}`, status: "active" }));
  const dead = Array.from({ length: 6 }, (_, i) => record({ id: `dead-${i}`, status: "inactive" }));
  const capped = capRecords([...live, ...dead], 8);

  assert.equal(capped.length, 8);
  assert.deepEqual(capped.slice(0, 6).map((r) => r.id), live.map((r) => r.id));
  /* Oldest inactive first: the survivors are the two nearest the front. */
  assert.deepEqual(capped.slice(6).map((r) => r.id), ["dead-0", "dead-1"]);

  /* Eight live records stay eight, cap or no cap: discarding one would make its
   * endpoint look untracked to the next orphan sweep. */
  const allLive = Array.from({ length: 10 }, (_, i) => record({ id: `a-${i}`, status: "active" }));
  assert.equal(capRecords(allLive, 8).length, 10);
});

test("a session stuck in starting is eventually recognised as failed", () => {
  const startedAt = new Date(1_000_000).toISOString();
  const starting = record({ status: "starting", startedAt });
  assert.equal(isStuckStarting(starting, 1_000_000 + 1_000), false);
  assert.equal(isStuckStarting(starting, 1_000_000 + 130_000), true);
  assert.equal(isStuckStarting(record({ status: "active", startedAt }), Number.MAX_SAFE_INTEGER), false);
});

test("statusSummary always spells out both halves", () => {
  const summary = statusSummary(record({ endpointStatus: "running", cmlStatus: "unknown", port: "2222" }));
  assert.equal(summary, ":2222 \u00b7 endpoint up \u00b7 CML unchecked");
  assert.equal(statusSummary(record({ status: "starting" })), "starting\u2026");
});

test("parseSessionIds tokenises cdswctl output rather than assuming columns", () => {
  const ids = parseSessionIds("ID        PROJECT\nabc1-def2  HANKE/dse\n(xyz9-8765)  HANKE/other\n");
  assert.equal(ids.has("abc1-def2"), true);
  assert.equal(ids.has("xyz9-8765"), true);
  /* Short tokens are not ids; over-matching the rest is harmless. */
  assert.equal(ids.has("ID"), false);
});

test("history round-trips the exact record shape the extension reads", () => {
  withStorage((storagePath) => {
    const written = record({ id: "s-1", hostAlias: "cml-dse", port: "2222", endpointPid: 4242 });
    saveHistory(storagePath, [written]);

    const raw = JSON.parse(
      fs.readFileSync(path.join(storagePath, "session_history.json"), "utf8"),
    ) as unknown[];
    assert.deepEqual(raw, [written], "field names and nesting are the extension's");
    assert.deepEqual(loadHistory(storagePath), [written]);
  });
});

test("addOrUpdateSession merges by id and leaves every other record alone", () => {
  withStorage((storagePath) => {
    addOrUpdateSession(storagePath, record({ id: "a", projectName: "owner/one", hostAlias: "cml-one" }));
    addOrUpdateSession(storagePath, record({ id: "b", projectName: "owner/two" }));
    addOrUpdateSession(storagePath, record({ id: "a", projectName: "owner/one", port: "3333" }));

    const records = loadHistory(storagePath);
    assert.equal(records.length, 2, "two projects, two records, no displacement");
    const merged = records.find((r) => r.id === "a");
    assert.equal(merged?.port, "3333");
    /* The new record is spread over the old, so a field it does not carry at all
     * survives — which is what keeps a scraped session id and the assigned alias
     * from being lost by a later update that has neither. */
    assert.equal(merged?.hostAlias, "cml-one");
  });
});

test("patchSession reports a record that is not there instead of creating one", () => {
  withStorage((storagePath) => {
    assert.equal(patchSession(storagePath, "nope", { port: "1" }), false);
    assert.deepEqual(loadHistory(storagePath), []);
  });
});

test("markSessionStopped clears the handles as well as the statuses", () => {
  withStorage((storagePath) => {
    addOrUpdateSession(storagePath, record({ id: "a", port: "2222", endpointPid: 99 }));
    markSessionStopped(storagePath, "a");

    const [stopped] = loadHistory(storagePath);
    assert.equal(stopped.status, "inactive");
    assert.equal(stopped.endpointStatus, "stopped");
    assert.equal(stopped.cmlStatus, "stopped");
    assert.equal(stopped.port, undefined);
    assert.equal(stopped.endpointPid, undefined);
  });
});

test("an unreadable or malformed history file reads as empty", () => {
  withStorage((storagePath) => {
    assert.deepEqual(loadHistory(storagePath), [], "absent");
    fs.writeFileSync(path.join(storagePath, "session_history.json"), "{not json", "utf8");
    assert.deepEqual(loadHistory(storagePath), [], "malformed");
    fs.writeFileSync(path.join(storagePath, "session_history.json"), '{"a":1}', "utf8");
    assert.deepEqual(loadHistory(storagePath), [], "not an array");
  });
});

test("takenHostAliases reports only the aliases actually claimed", () => {
  withStorage((storagePath) => {
    addOrUpdateSession(storagePath, record({ id: "a", hostAlias: "cml-dse" }));
    addOrUpdateSession(storagePath, record({ id: "b" }));
    assert.deepEqual(takenHostAliases(storagePath), ["cml-dse"]);
  });
});

test("buildEndpointArgs adds the addon and the port only when it has them", () => {
  const spec = { project: "HANKE/dse", runtimeId: 7, addonId: null, cpus: 1, memoryGb: 4, gpus: 0 };
  assert.deepEqual(buildEndpointArgs(spec), [
    "ssh-endpoint", "-p", "HANKE/dse", "-r", "7", "-c", "1", "-m", "4", "-g", "0",
  ]);
  const full = buildEndpointArgs({ ...spec, addonId: 12 }, 51234);
  assert.ok(full.includes("--addons=12"));
  assert.deepEqual(full.slice(-2), ["--port", "51234"]);
  /* Never the blanket /a stop flag, and nothing that could reach one. */
  assert.equal(full.includes("/a"), false);
});

test("the two scraped lines are recognised in the form cdswctl prints them", () => {
  assert.equal(
    matchSessionId("Starting ssh endpoint on session abc1-def2-ghi3 in project HANKE/dse"),
    "abc1-def2-ghi3",
  );
  assert.equal(matchSessionId("nothing to see here"), undefined);
  assert.deepEqual(matchReadyEndpoint("You can now connect with: ssh -p 51234 cdsw@localhost"), {
    port: "51234",
    userAndHost: "cdsw@localhost",
  });
  assert.equal(matchReadyEndpoint("ssh is not ready"), undefined);
});

test("a new record is starting with a live endpoint and an unchecked CML session", () => {
  const spec = { project: "HANKE/dse", runtimeId: 7, addonId: null, cpus: 1, memoryGb: 4, gpus: 0 };
  const fresh = newSessionRecord({
    id: "s-1",
    spec,
    hostAlias: "cml-dse",
    endpointPid: 123,
    startedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(fresh.status, "starting");
  assert.equal(fresh.endpointStatus, "running");
  assert.equal(fresh.cmlStatus, "unknown", "nothing has asked CML yet");
  assert.equal(fresh.endpointPid, 123);
  assert.equal(fresh.port, undefined);

  const active = activateRecord(fresh, { port: "51234", userAndHost: "cdsw@localhost" }, undefined);
  assert.equal(active.status, "active");
  assert.equal(active.port, "51234");
  assert.equal(active.cmlStatus, "running");
  assert.equal(active.hostAlias, "cml-dse", "the alias is never recomputed");

  /* A session id scraped earlier survives a later activation that has none. */
  const withId = activateRecord({ ...fresh, sessionId: "abc1" }, { port: "1", userAndHost: "x" }, undefined);
  assert.equal(withId.sessionId, "abc1");
});

test("untrackedEndpointPids spares every pid a record claims", () => {
  const records = [record({ id: "a", endpointPid: 100 }), record({ id: "b" })];
  assert.deepEqual(untrackedEndpointPids([100, 200], records), [200]);
  assert.deepEqual(untrackedEndpointPids([], records), [], "no processes, nothing to kill");
});

test("the storage path is the extension's globalStorage directory, and overridable", () => {
  assert.equal(extensionStoragePath({ CAI_STORAGE_DIR: "D:/somewhere" }), "D:/somewhere");
  const resolved = extensionStoragePath({ APPDATA: "C:/Users/x/AppData/Roaming" });
  if (process.platform === "win32") {
    assert.equal(
      resolved,
      path.join(
        "C:/Users/x/AppData/Roaming",
        "Code",
        "User",
        "globalStorage",
        "defysoftwaresolutions.cai-connector",
      ),
    );
  } else {
    assert.match(resolved, /defysoftwaresolutions\.cai-connector$/);
  }
});
