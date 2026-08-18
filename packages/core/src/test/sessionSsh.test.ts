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
  assignHostAlias,
  isManagedAlias,
  remoteUriFor,
  slugForProject,
  sshEntriesFromRecords,
  syncSshConfig,
  type SessionRecord,
} from "../session";

/**
 * `syncSshConfig` rewrites the user's real `~/.ssh/config`, so every test here
 * hands it a temporary home instead. That parameter exists for this reason.
 */
function withHome(run: (ctx: { home: string; read: () => string }) => void): void {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "cai-ssh-"));
  const configFile = path.join(home, ".ssh", "config");
  try {
    run({
      home,
      read: () => (fs.existsSync(configFile) ? fs.readFileSync(configFile, "utf8") : ""),
    });
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function record(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s-1",
    projectName: "HANKE/dse",
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

test("a project name becomes a short, safe slug", () => {
  assert.equal(slugForProject("HANKE/My Project (dev)"), "my-project-dev");
  assert.equal(slugForProject("owner/dse"), "dse");
  assert.equal(slugForProject("owner/!!!"), "session", "never an empty alias");
  assert.ok(slugForProject(`owner/${"x".repeat(60)}`).length <= 24);
});

test("only our own aliases are recognised as ours", () => {
  assert.equal(isManagedAlias("cml"), true, "the legacy bare host");
  assert.equal(isManagedAlias("cml-dse"), true);
  assert.equal(isManagedAlias("cml-dse-2"), true);
  /* Somebody else's hosts that merely contain the letters. */
  assert.equal(isManagedAlias("cmlserver"), false);
  assert.equal(isManagedAlias("my-cml-thing"), false);
});

test("a second session in one project gets its own alias", () => {
  assert.equal(assignHostAlias("HANKE/dse", []), "cml-dse");
  assert.equal(assignHostAlias("HANKE/dse", ["cml-dse"]), "cml-dse-2");
  assert.equal(assignHostAlias("HANKE/dse", ["cml-dse", "cml-dse-2"]), "cml-dse-3");
});

test("the remote URI carries the alias, which is why it must stay stable", () => {
  assert.equal(remoteUriFor("cml-dse"), "vscode-remote://ssh-remote+cml-dse/home/cdsw");
});

test("syncSshConfig writes one block per alias, with the keepalives", () => {
  withHome(({ home, read }) => {
    assert.equal(syncSshConfig([{ alias: "cml-dse", port: "2222" }], home), true);

    const written = read();
    assert.match(written, /^Host cml-dse$/m);
    assert.match(written, /^ {2}Port 2222$/m);
    assert.match(written, /^ {2}User cdsw$/m);
    /* Load-bearing: without these an idle tunnel is cut by the gateway and
     * cdswctl never re-dials, so the remote window cannot be recovered. */
    assert.match(written, /^ {2}ServerAliveInterval 30$/m);
    assert.match(written, /^ {2}ServerAliveCountMax 6$/m);
  });
});

test("several sessions are reachable at once, and a removed one leaves nothing behind", () => {
  withHome(({ home, read }) => {
    syncSshConfig(
      [
        { alias: "cml-dse", port: "2222" },
        { alias: "cml-ingestion", port: "3333" },
      ],
      home,
    );
    assert.equal((read().match(/^Host /gm) ?? []).length, 2);

    syncSshConfig([{ alias: "cml-dse", port: "2222" }], home);
    const after = read();
    assert.match(after, /^Host cml-dse$/m);
    assert.doesNotMatch(after, /cml-ingestion/, "a stale alias must not survive");
    assert.doesNotMatch(after, /3333/);
  });
});

test("a foreign host block is left completely alone", () => {
  withHome(({ home, read }) => {
    const sshDir = path.join(home, ".ssh");
    fs.mkdirSync(sshDir, { recursive: true });
    fs.writeFileSync(
      path.join(sshDir, "config"),
      "Host build-server\n  HostName build.example\n  User someone\n",
      "utf8",
    );

    syncSshConfig([{ alias: "cml-dse", port: "2222" }], home);
    const after = read();
    assert.match(after, /Host build-server/);
    assert.match(after, /HostName build\.example/);
    assert.match(after, /Host cml-dse/);
  });
});

test("a Host line listing several patterns is ours if any one of them is", () => {
  withHome(({ home, read }) => {
    const sshDir = path.join(home, ".ssh");
    fs.mkdirSync(sshDir, { recursive: true });
    fs.writeFileSync(
      path.join(sshDir, "config"),
      "Host cml-dse other-name\n  Port 9999\n  User stale\n",
      "utf8",
    );

    assert.equal(syncSshConfig([{ alias: "cml-dse", port: "2222" }], home), true);
    const after = read();
    /* The whole block goes: leaving it would keep our alias on a stale port. */
    assert.doesNotMatch(after, /9999/);
    assert.doesNotMatch(after, /other-name/);
    assert.equal((after.match(/^Host cml-dse$/gm) ?? []).length, 1);
  });
});

test("pre-existing duplicate blocks collapse to one", () => {
  withHome(({ home, read }) => {
    const sshDir = path.join(home, ".ssh");
    fs.mkdirSync(sshDir, { recursive: true });
    fs.writeFileSync(
      path.join(sshDir, "config"),
      "Host cml-dse\n  Port 1111\n\nHost cml-dse\n  Port 2222\n",
      "utf8",
    );

    assert.equal(syncSshConfig([{ alias: "cml-dse", port: "4444" }], home), true);
    assert.equal((read().match(/^Host cml-dse$/gm) ?? []).length, 1);
  });
});

test("syncSshConfig refuses to write anything it cannot vouch for", () => {
  withHome(({ home, read }) => {
    assert.equal(syncSshConfig([{ alias: "not-ours", port: "2222" }], home), false);
    assert.equal(syncSshConfig([{ alias: "cml-dse", port: "" }], home), false);
    assert.equal(syncSshConfig([{ alias: "cml-dse", port: "22 22" }], home), false);
    assert.equal(
      syncSshConfig([{ alias: "cml-dse", port: "1" }, { alias: "cml-dse", port: "2" }], home),
      false,
      "one alias cannot resolve to two ports",
    );
    assert.equal(read(), "", "a refusal writes nothing at all");
  });
});

test("clearing every alias leaves a usable config rather than a broken one", () => {
  withHome(({ home, read }) => {
    syncSshConfig([{ alias: "cml-dse", port: "2222" }], home);
    assert.equal(syncSshConfig([], home), true);
    assert.doesNotMatch(read(), /cml-dse/);
  });
});

test("only records with a live endpoint and a port become host entries", () => {
  const entries = sshEntriesFromRecords([
    record({ id: "a", hostAlias: "cml-dse", port: "2222" }),
    record({ id: "b", hostAlias: "cml-other", endpointStatus: "stopped", port: "3333" }),
    record({ id: "c", hostAlias: "cml-third" }),
  ]);
  assert.deepEqual(entries, [{ alias: "cml-dse", port: "2222" }]);
});

test("the newest record wins a duplicate alias, and a legacy record keeps bare cml", () => {
  const entries = sshEntriesFromRecords([
    record({ id: "new", hostAlias: "cml-dse", port: "2222" }),
    record({ id: "old", hostAlias: "cml-dse", port: "9999" }),
    record({ id: "legacy", port: "4444" }),
  ]);
  assert.deepEqual(entries, [
    { alias: "cml-dse", port: "2222" },
    { alias: "cml", port: "4444" },
  ]);
});
