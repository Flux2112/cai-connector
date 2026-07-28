/*
 * Tests for src/sessionHistory.ts — the multi-session record store.
 *
 * Run with: npm test
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  addOrUpdateSession, loadHistory, markSessionStopped, patchSession, saveHistory,
  takenHostAliases, updateSessionConfig,
} from "../sessionHistory";
import { HISTORY_FILE, SessionRecord } from "../types";

let storagePath: string;

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "id-1",
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

beforeEach(() => {
  storagePath = fs.mkdtempSync(path.join(os.tmpdir(), "cai-history-test-"));
});

afterEach(() => {
  fs.rmSync(storagePath, { recursive: true, force: true });
});

describe("loadHistory", () => {
  it("returns an empty list when the file does not exist", () => {
    assert.deepEqual(loadHistory(storagePath), []);
  });

  it("returns an empty list rather than throwing on corrupt JSON", () => {
    fs.writeFileSync(path.join(storagePath, HISTORY_FILE), "{not json", "utf8");
    assert.deepEqual(loadHistory(storagePath), []);
  });
});

describe("addOrUpdateSession", () => {
  it("keeps several sessions in the same project", () => {
    addOrUpdateSession(storagePath, record({ id: "a" }));
    addOrUpdateSession(storagePath, record({ id: "b" }));

    const stored = loadHistory(storagePath);
    assert.equal(stored.length, 2);
    assert.deepEqual(stored.map((r) => r.id), ["b", "a"]);
  });

  it("leaves other sessions active", () => {
    addOrUpdateSession(storagePath, record({ id: "a", projectName: "owner/one" }));
    addOrUpdateSession(storagePath, record({ id: "b", projectName: "owner/two" }));

    assert.deepEqual(
      loadHistory(storagePath).map((r) => r.status),
      ["active", "active"],
    );
  });

  it("merges into an existing record with the same id", () => {
    addOrUpdateSession(storagePath, record({ id: "a", sessionId: "sess-1" }));
    addOrUpdateSession(storagePath, record({ id: "a", status: "inactive" }));

    const stored = loadHistory(storagePath);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].status, "inactive");
    assert.equal(stored[0].sessionId, "sess-1");
  });
});

describe("saveHistory capping", () => {
  it("never discards a live session to make room", () => {
    const many: SessionRecord[] = [];
    for (let i = 0; i < 12; i += 1) {
      many.push(record({ id: `live-${i}`, status: "active" }));
    }
    saveHistory(storagePath, many);
    assert.equal(loadHistory(storagePath).length, 12);
  });

  it("discards the oldest inactive sessions", () => {
    const records: SessionRecord[] = [];
    for (let i = 0; i < 12; i += 1) {
      records.push(record({ id: `old-${i}`, status: "inactive" }));
    }
    saveHistory(storagePath, records);
    const stored = loadHistory(storagePath);
    assert.equal(stored.length, 8);
    assert.equal(stored[0].id, "old-0");
  });
});

describe("patchSession", () => {
  it("touches only the addressed record", () => {
    addOrUpdateSession(storagePath, record({ id: "a", port: "1111" }));
    addOrUpdateSession(storagePath, record({ id: "b", port: "2222" }));

    assert.equal(patchSession(storagePath, "a", { port: "9999" }), true);

    const stored = loadHistory(storagePath);
    assert.equal(stored.find((r) => r.id === "a")?.port, "9999");
    assert.equal(stored.find((r) => r.id === "b")?.port, "2222");
  });

  it("reports a missing record", () => {
    assert.equal(patchSession(storagePath, "nope", { port: "1" }), false);
  });
});

describe("updateSessionConfig", () => {
  it("renaming a project no longer displaces another session", () => {
    addOrUpdateSession(storagePath, record({ id: "a", projectName: "owner/one" }));
    addOrUpdateSession(storagePath, record({ id: "b", projectName: "owner/two" }));

    updateSessionConfig(storagePath, "a", {
      projectName: "owner/two",
      runtimeId: 7,
      addonId: null,
      cpus: 1,
      memoryGb: 2,
      gpus: 0,
    });

    const stored = loadHistory(storagePath);
    assert.equal(stored.length, 2);
    assert.equal(stored.find((r) => r.id === "a")?.runtimeId, 7);
    assert.equal(stored.find((r) => r.id === "b")?.runtimeId, 42);
  });

  it("leaves the runtime state of the record alone", () => {
    addOrUpdateSession(storagePath, record({ id: "a", port: "1111", hostAlias: "cml-x", endpointPid: 99 }));
    updateSessionConfig(storagePath, "a", {
      projectName: "owner/project",
      runtimeId: 7,
      addonId: 3,
      cpus: 1,
      memoryGb: 2,
      gpus: 1,
    });

    const stored = loadHistory(storagePath)[0];
    assert.equal(stored.port, "1111");
    assert.equal(stored.hostAlias, "cml-x");
    assert.equal(stored.endpointPid, 99);
  });
});

describe("markSessionStopped", () => {
  it("records both halves as stopped and drops the runtime handles", () => {
    addOrUpdateSession(
      storagePath,
      record({ id: "a", port: "1111", endpointPid: 99, cmlStatus: "running", endpointStatus: "running" }),
    );
    markSessionStopped(storagePath, "a");

    const stored = loadHistory(storagePath)[0];
    assert.equal(stored.status, "inactive");
    assert.equal(stored.endpointStatus, "stopped");
    assert.equal(stored.cmlStatus, "stopped");
    assert.equal(stored.endpointPid, undefined);
    assert.equal(stored.port, undefined);
  });
});

describe("takenHostAliases", () => {
  it("lists the aliases already claimed", () => {
    addOrUpdateSession(storagePath, record({ id: "a", hostAlias: "cml-one" }));
    addOrUpdateSession(storagePath, record({ id: "b", hostAlias: "cml-two" }));
    addOrUpdateSession(storagePath, record({ id: "c" }));

    assert.deepEqual(takenHostAliases(storagePath).sort(), ["cml-one", "cml-two"]);
  });
});
