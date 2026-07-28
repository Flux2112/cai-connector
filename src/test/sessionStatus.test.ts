/*
 * Tests for src/sessionStatus.ts — the dual endpoint/CML status model.
 *
 * Run with: npm test
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  capRecords, cmlStatusOf, endpointStatusOf, isLive, isOrphanedOnCml, isStaleEndpoint,
  isStuckStarting, parseSessionIds, rollUpStatus, STARTING_GRACE_MS, statusProblem,
  statusSummary,
} from "../sessionStatus";
import { CmlStatus, EndpointStatus, SessionRecord, SessionStatus } from "../types";

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

describe("rollUpStatus", () => {
  const cases: Array<[EndpointStatus, CmlStatus, SessionStatus]> = [
    ["running", "running", "active"],
    ["running", "unknown", "active"],
    ["running", "stopped", "error"],
    ["stopped", "running", "error"],
    ["stopped", "stopped", "inactive"],
    ["stopped", "unknown", "inactive"],
    ["unknown", "running", "error"],
    ["unknown", "stopped", "inactive"],
    ["unknown", "unknown", "inactive"],
  ];

  for (const [endpoint, cml, expected] of cases) {
    it(`endpoint ${endpoint} + CML ${cml} => ${expected}`, () => {
      assert.equal(rollUpStatus(endpoint, cml), expected);
    });
  }

  it("never reports an error just because CML was not reached", () => {
    assert.notEqual(rollUpStatus("running", "unknown"), "error");
    assert.notEqual(rollUpStatus("stopped", "unknown"), "error");
  });
});

describe("status accessors", () => {
  it("infers the endpoint status of a record written before the split", () => {
    assert.equal(endpointStatusOf(record({ status: "active", endpointStatus: undefined })), "running");
    assert.equal(endpointStatusOf(record({ status: "inactive", endpointStatus: undefined })), "stopped");
  });

  it("prefers the explicit field when present", () => {
    assert.equal(endpointStatusOf(record({ status: "active", endpointStatus: "stopped" })), "stopped");
  });

  it("treats an unrecorded CML status as unknown, never stopped", () => {
    assert.equal(cmlStatusOf(record()), "unknown");
  });
});

describe("isOrphanedOnCml", () => {
  it("is true when CML is confirmed running with no endpoint", () => {
    const r = record({ endpointStatus: "stopped", cmlStatus: "running", sessionId: "abc123" });
    assert.equal(isOrphanedOnCml(r), true);
    assert.equal(statusProblem(r), "Still running on CML with no local endpoint — clean it up to free cluster capacity.");
  });

  it("is false while the endpoint is still running", () => {
    assert.equal(
      isOrphanedOnCml(record({ endpointStatus: "running", cmlStatus: "running", sessionId: "abc123" })),
      false,
    );
  });

  it("is false on an unknown CML status — an unchecked session is not evidence", () => {
    assert.equal(
      isOrphanedOnCml(record({ endpointStatus: "stopped", cmlStatus: "unknown", sessionId: "abc123" })),
      false,
    );
  });

  it("is false without a session id, since there would be nothing to stop", () => {
    assert.equal(
      isOrphanedOnCml(record({ endpointStatus: "stopped", cmlStatus: "running" })),
      false,
    );
  });
});

describe("isStaleEndpoint / isLive", () => {
  it("flags a tunnel whose CML session has ended", () => {
    assert.equal(isStaleEndpoint(record({ endpointStatus: "running", cmlStatus: "stopped" })), true);
  });

  it("counts either half running as live", () => {
    assert.equal(isLive(record({ endpointStatus: "running", cmlStatus: "stopped" })), true);
    assert.equal(isLive(record({ endpointStatus: "stopped", cmlStatus: "running" })), true);
    assert.equal(isLive(record({ endpointStatus: "stopped", cmlStatus: "stopped" })), false);
  });
});

describe("statusSummary", () => {
  it("spells out both halves", () => {
    assert.equal(
      statusSummary(record({ endpointStatus: "running", cmlStatus: "running", port: "2222" })),
      ":2222 · endpoint up · CML up",
    );
  });

  it("says so when CML has not been checked", () => {
    assert.match(statusSummary(record({ endpointStatus: "running", cmlStatus: "unknown" })), /CML unchecked/);
  });

  it("describes an orphan without a port", () => {
    assert.equal(
      statusSummary(record({ status: "error", endpointStatus: "stopped", cmlStatus: "running", port: "2222" })),
      "endpoint gone · CML up",
    );
  });

  it("collapses to a single word while starting", () => {
    assert.equal(statusSummary(record({ status: "starting" })), "starting…");
  });
});

describe("isStuckStarting", () => {
  const started = "2026-01-01T00:00:00.000Z";
  const t0 = Date.parse(started);

  it("is false for a session that only just started", () => {
    assert.equal(isStuckStarting(record({ status: "starting", startedAt: started }), t0 + 1000), false);
  });

  it("is false right up to the grace period", () => {
    const r = record({ status: "starting", startedAt: started });
    assert.equal(isStuckStarting(r, t0 + STARTING_GRACE_MS), false);
  });

  it("is true once the grace period has passed", () => {
    const r = record({ status: "starting", startedAt: started });
    assert.equal(isStuckStarting(r, t0 + STARTING_GRACE_MS + 1), true);
  });

  it("only applies to starting sessions", () => {
    const r = record({ status: "active", startedAt: started });
    assert.equal(isStuckStarting(r, t0 + STARTING_GRACE_MS * 10), false);
  });

  it("is false when the timestamp cannot be parsed", () => {
    const r = record({ status: "starting", startedAt: "not a date" });
    assert.equal(isStuckStarting(r, t0), false);
  });
});

describe("parseSessionIds", () => {
  it("reads one id per line", () => {
    const ids = parseSessionIds("abc123\ndef456\n");
    assert.deepEqual([...ids].sort(), ["abc123", "def456"]);
  });

  it("reads ids from a whitespace-separated table", () => {
    const ids = parseSessionIds("ID       STATUS\nabc123   running\ndef456   running\n");
    assert.equal(ids.has("abc123"), true);
    assert.equal(ids.has("def456"), true);
  });

  it("strips surrounding punctuation and quotes", () => {
    const ids = parseSessionIds('["abc123", "def456"]');
    assert.equal(ids.has("abc123"), true);
    assert.equal(ids.has("def456"), true);
  });

  it("returns nothing for empty output", () => {
    assert.equal(parseSessionIds("").size, 0);
    assert.equal(parseSessionIds("   \n \n").size, 0);
  });

  it("ignores tokens too short to be a session id", () => {
    assert.equal(parseSessionIds("ab\nx\n").size, 0);
  });
});

describe("capRecords", () => {
  it("keeps everything below the cap", () => {
    const records = [record({ id: "a" }), record({ id: "b" })];
    assert.equal(capRecords(records, 5).length, 2);
  });

  it("drops the oldest inactive records first", () => {
    const records = [
      record({ id: "new", status: "active" }),
      record({ id: "mid", status: "inactive" }),
      record({ id: "old", status: "inactive" }),
    ];
    const kept = capRecords(records, 2).map((r) => r.id);
    assert.deepEqual(kept, ["new", "mid"]);
  });

  it("never drops a live session, even past the cap", () => {
    const records = [
      record({ id: "a", status: "active" }),
      record({ id: "b", status: "active" }),
      record({ id: "c", status: "starting" }),
      record({ id: "d", status: "error" }),
    ];
    const kept = capRecords(records, 2).map((r) => r.id);
    assert.deepEqual(kept, ["a", "b", "c", "d"]);
  });

  it("does not mutate its input", () => {
    const records = [record({ id: "a", status: "inactive" }), record({ id: "b", status: "inactive" })];
    capRecords(records, 1);
    assert.equal(records.length, 2);
  });
});
