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

import { isProcessAlive } from "@defysoftware/cai-core";

import { spawnTunnel } from "../lib/tunnel";

/**
 * `spawnTunnel` is exercised against a stand-in that prints the two lines
 * `cdswctl` prints and then stays alive, which is the whole of what the real one
 * looks like from here. Node itself is the stand-in: the point of these tests is
 * the plumbing — detached spawn, output to a file, tailing that file, and the
 * child outliving the watcher — not cdswctl's behaviour.
 */
function scratch(name: string): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cai-tunnel-")), name);
}

/** Prints the session line, then the ready line, then lingers like a tunnel. */
function fakeEndpoint(port: number, lingerMs = 30_000): string[] {
  return [
    "-e",
    [
      "console.log('Starting ssh endpoint on session abc1-def2 in project HANKE/dse');",
      `setTimeout(() => console.log('ssh -p ${port} cdsw@localhost'), 150);`,
      `setTimeout(() => {}, ${lingerMs});`,
    ].join(""),
  ];
}

test("the two lines are scraped out of the child's own log file", async () => {
  const logFile = scratch("endpoint.log");
  const tunnel = spawnTunnel({
    cdswctlPath: process.execPath,
    args: fakeEndpoint(51234),
    logFile,
  });

  const ready = await tunnel.waitForReady(10_000);
  tunnel.release();

  assert.deepEqual(ready, { port: "51234", userAndHost: "cdsw@localhost" });
  /* The log is the child's, so it is also the only record of what a failed
   * endpoint said. */
  assert.match(fs.readFileSync(logFile, "utf8"), /on session abc1-def2 in project/);

  if (tunnel.pid !== undefined) {
    process.kill(tunnel.pid);
  }
});

test("the session id is reported as soon as it appears, before the endpoint is ready", async () => {
  const logFile = scratch("endpoint.log");
  const order: string[] = [];

  const tunnel = spawnTunnel({
    cdswctlPath: process.execPath,
    args: fakeEndpoint(51235),
    logFile,
    onSessionId: (sessionId) => order.push(`session:${sessionId}`),
    onLine: (line) => {
      if (/ssh -p/.test(line)) {
        order.push("ready");
      }
    },
  });

  await tunnel.waitForReady(10_000);
  tunnel.release();

  /* This ordering is the whole reason the id is scraped separately: if creation
   * fails after CML has started a session, that id is the only handle on it. */
  assert.deepEqual(order, ["session:abc1-def2", "ready"]);

  if (tunnel.pid !== undefined) {
    process.kill(tunnel.pid);
  }
});

test("the tunnel outlives the watcher, which is the entire point", async () => {
  const logFile = scratch("endpoint.log");
  const tunnel = spawnTunnel({
    cdswctlPath: process.execPath,
    args: fakeEndpoint(51236),
    logFile,
  });

  await tunnel.waitForReady(10_000);
  tunnel.release();

  /* Nothing the child writes goes through a pipe this process holds, and its
   * handle is unref'd, so releasing the watch cannot take the tunnel with it. */
  assert.notEqual(tunnel.pid, undefined);
  assert.equal(isProcessAlive(tunnel.pid as number), true);

  process.kill(tunnel.pid as number);
});

test("a child that exits without printing is reported rather than waited out", async () => {
  const logFile = scratch("endpoint.log");
  const started = Date.now();
  const tunnel = spawnTunnel({
    cdswctlPath: process.execPath,
    args: ["-e", "console.error('login failed'); process.exit(1);"],
    logFile,
  });

  const ready = await tunnel.waitForReady(30_000);
  tunnel.release();

  assert.equal(ready, null);
  assert.ok(Date.now() - started < 20_000, "it must not sit out the full timeout");
  /* Whatever it said is in the log, including on stderr. */
  assert.match(fs.readFileSync(logFile, "utf8"), /login failed/);
});

test("an endpoint that never becomes ready times out", async () => {
  const logFile = scratch("endpoint.log");
  const tunnel = spawnTunnel({
    cdswctlPath: process.execPath,
    args: ["-e", "setTimeout(() => {}, 30000);"],
    logFile,
  });

  const ready = await tunnel.waitForReady(1_500);
  tunnel.release();

  assert.equal(ready, null, "silence is not readiness");
  if (tunnel.pid !== undefined) {
    process.kill(tunnel.pid);
  }
});
