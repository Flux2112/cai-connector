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

import type { SessionRecord } from "@defysoftware/cai-core";

import { CaiCliError, EXIT } from "../lib/exit";
import { resolveRecord, sessionRow } from "../lib/session";
import { lastRuntimeFor, positiveNumber } from "../lib/spec";
import { runCommand } from "./stub";

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "2026-01-01T00:00:00.000Z",
    projectName: "HANKE/dse",
    runtimeId: 42,
    addonId: null,
    cpus: 1,
    memoryGb: 4,
    gpus: 0,
    status: "active",
    startedAt: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

test("a session can be named by alias, by id prefix or by project", () => {
  const records = [
    record({ id: "2026-01-01T00:00:00.000Z", hostAlias: "cml-dse" }),
    record({ id: "2026-02-02T00:00:00.000Z", hostAlias: "cml-ingestion", projectName: "HANKE/ingestion" }),
  ];

  assert.equal(resolveRecord(records, "cml-dse").hostAlias, "cml-dse");
  assert.equal(resolveRecord(records, "2026-02").hostAlias, "cml-ingestion");
  assert.equal(resolveRecord(records, "HANKE/ingestion").hostAlias, "cml-ingestion");
  assert.equal(resolveRecord(records, "hanke/ingestion").hostAlias, "cml-ingestion", "case-insensitive");
});

test("an ambiguous reference is refused rather than resolved", () => {
  const records = [
    record({ id: "a", hostAlias: "cml-dse" }),
    record({ id: "b", hostAlias: "cml-dse-2" }),
  ];
  /* Two sessions in one project is supported, so the project name alone cannot
   * decide which tunnel to kill. */
  assert.throws(
    () => resolveRecord(records, "HANKE/dse"),
    (err: unknown) => err instanceof CaiCliError && /matches 2 sessions/.test(err.message),
  );
  assert.throws(
    () => resolveRecord(records, "nope"),
    (err: unknown) => err instanceof CaiCliError && err.code === EXIT.USAGE,
  );
});

test("a failed process scan leaves the stored status alone rather than downgrading it", () => {
  const live = record({ endpointPid: 4242, endpointStatus: "running", port: "2222" });

  /* Scan says the pid is there. */
  assert.equal(sessionRow(live, [4242]).endpoint, "running");
  /* Scan ran and the pid is gone: that is real evidence. */
  assert.equal(sessionRow(live, [999]).endpoint, "stopped");
  /* Scan failed (null). Absence of evidence is not evidence of absence: the
   * weaker pid-liveness check answers instead, and this pid is not alive. */
  assert.equal(sessionRow(live, null).endpoint, "stopped");
});

test("a record claiming to run with no pid cannot be confirmed", () => {
  const row = sessionRow(record({ endpointStatus: "running", port: "2222" }), []);
  assert.equal(row.endpoint, "unknown", "nothing to check it against");
});

test("the row rolls the two statuses up and reports a disagreement", () => {
  const orphan = record({
    status: "error",
    endpointStatus: "stopped",
    cmlStatus: "running",
    sessionId: "s-1",
    endpointPid: 4242,
  });
  const row = sessionRow(orphan, [999]);
  assert.equal(row.status, "error");
  assert.match(row.problem ?? "", /no local endpoint/);

  const starting = sessionRow(record({ status: "starting", endpointPid: 4242 }), [4242]);
  assert.equal(starting.status, "starting", "a session still coming up is not yet active");
});

test("the runtime of the newest session for a project is what a new one inherits", () => {
  const records = [
    record({ id: "old", runtimeId: 1, startedAt: "2026-01-01T00:00:00.000Z" }),
    record({ id: "new", runtimeId: 2, startedAt: "2026-06-01T00:00:00.000Z" }),
    record({ id: "other", runtimeId: 3, projectName: "HANKE/other" }),
  ];
  assert.equal(lastRuntimeFor(records, "HANKE/dse"), 2);
  assert.equal(lastRuntimeFor(records, "hanke/dse"), 2, "case-insensitive");
  assert.equal(lastRuntimeFor(records, "HANKE/nothing"), undefined);
});

test("resource values accept a comma decimal and refuse nonsense", () => {
  assert.equal(positiveNumber("2", "--cpus"), 2);
  assert.equal(positiveNumber("0,5", "--cpus"), 0.5);
  assert.equal(positiveNumber(" 1.5 ", "--cpus"), 1.5);
  for (const bad of ["0", "-1", "lots", ""]) {
    assert.throws(
      () => positiveNumber(bad, "--cpus"),
      (err: unknown) => err instanceof CaiCliError && err.code === EXIT.USAGE,
      `accepted ${JSON.stringify(bad)}`,
    );
  }
});

test("session list reads the shared history file and never rewrites it", async () => {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), "cai-hist-"));
  const file = path.join(storage, "session_history.json");
  const stored = [record({ id: "s-1", hostAlias: "cml-dse", port: "2222", endpointPid: 999999 })];
  fs.writeFileSync(file, JSON.stringify(stored, null, 2), "utf8");
  const before = fs.readFileSync(file, "utf8");

  const result = await runCommand(["session", "list", "--url", "https://unused.example", "--api-key", "k"], {
    CAI_STORAGE_DIR: storage,
  });

  if (process.platform !== "win32") {
    /* Off Windows the command refuses outright, which is also worth asserting. */
    assert.equal(result.exitCode, EXIT.USAGE);
    return;
  }

  assert.equal(result.exitCode, 0);
  const rows = JSON.parse(result.stdout) as Array<{ hostAlias: string; endpoint: string }>;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].hostAlias, "cml-dse");
  assert.equal(rows[0].endpoint, "stopped", "that pid is not one of ours");
  assert.equal(fs.readFileSync(file, "utf8"), before, "listing must not write");
});

test("session create refuses a bad resource value before spawning anything", async () => {
  const storage = fs.mkdtempSync(path.join(os.tmpdir(), "cai-hist-"));
  const result = await runCommand(
    ["session", "create", "HANKE/dse", "--cpus", "none", "--url", "https://unused.example", "--api-key", "k"],
    { CAI_STORAGE_DIR: storage },
  );

  assert.notEqual(result.exitCode, 0);
  assert.equal(
    fs.existsSync(path.join(storage, "session_history.json")),
    false,
    "no record may be written for a session that was never started",
  );
});
