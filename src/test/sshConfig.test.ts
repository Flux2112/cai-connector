/*
 * Tests for src/sshConfig.ts
 *
 * Uses Node's built-in test runner (node:test) — no new dependencies.
 * Run with: npm test
 */

import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  assignHostAlias, isManagedAlias, remoteUriFor, slugForProject, syncSshConfig,
} from "../sshConfig";

let tmpHome: string;
let configFile: string;
let savedHome: string | undefined;
let savedUserProfile: string | undefined;

function readConfig(): string {
  return fs.readFileSync(configFile, "utf8");
}

function writeConfig(content: string): void {
  fs.mkdirSync(path.dirname(configFile), { recursive: true });
  fs.writeFileSync(configFile, content, "utf8");
}

function countHostLines(content: string, alias: string): number {
  return content
    .split(/\r?\n/)
    .filter((line) => {
      const m = line.match(/^\s*Host\s+(.+?)\s*$/i);
      return Boolean(m && m[1].split(/\s+/).includes(alias));
    })
    .length;
}

function expectedBlock(alias: string, port: string): string {
  return [
    `Host ${alias}`,
    "  HostName localhost",
    `  Port ${port}`,
    "  User cdsw",
    "  StrictHostKeyChecking no",
    "  UserKnownHostsFile /dev/null",
    "  LogLevel ERROR",
  ].join("\n");
}

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "cai-ssh-test-"));
  configFile = path.join(tmpHome, ".ssh", "config");
  savedHome = process.env.HOME;
  savedUserProfile = process.env.USERPROFILE;
  process.env.HOME = tmpHome;
  process.env.USERPROFILE = tmpHome;
});

afterEach(() => {
  if (savedHome === undefined) {
    delete process.env.HOME;
  } else {
    process.env.HOME = savedHome;
  }
  if (savedUserProfile === undefined) {
    delete process.env.USERPROFILE;
  } else {
    process.env.USERPROFILE = savedUserProfile;
  }
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

describe("slugForProject", () => {
  it("uses the project part of owner/project", () => {
    assert.equal(slugForProject("mhanke/my-project"), "my-project");
  });

  it("normalises spaces, case and punctuation", () => {
    assert.equal(slugForProject("owner/My Project (dev)"), "my-project-dev");
  });

  it("falls back when nothing usable is left", () => {
    assert.equal(slugForProject("owner/___"), "session");
    assert.equal(slugForProject(""), "session");
  });

  it("truncates without leaving a trailing dash", () => {
    const slug = slugForProject("owner/" + "a".repeat(30));
    assert.equal(slug, "a".repeat(24));
    const dashed = slugForProject("owner/aaaaaaaaaaaaaaaaaaaaaaa bbb");
    assert.ok(!dashed.endsWith("-"), `unexpected trailing dash in ${dashed}`);
  });
});

describe("isManagedAlias", () => {
  it("accepts the legacy bare alias and generated ones", () => {
    assert.equal(isManagedAlias("cml"), true);
    assert.equal(isManagedAlias("cml-my-project"), true);
    assert.equal(isManagedAlias("cml-my-project-2"), true);
  });

  it("rejects hosts that merely start with the same letters", () => {
    assert.equal(isManagedAlias("cmlserver"), false);
    assert.equal(isManagedAlias("my-cml-thing"), false);
    assert.equal(isManagedAlias("cml_x"), false);
    assert.equal(isManagedAlias("CML"), false);
  });
});

describe("assignHostAlias", () => {
  it("prefers the plain project alias", () => {
    assert.equal(assignHostAlias("owner/analytics", []), "cml-analytics");
  });

  it("suffixes when the project already has a session", () => {
    assert.equal(assignHostAlias("owner/analytics", ["cml-analytics"]), "cml-analytics-2");
    assert.equal(
      assignHostAlias("owner/analytics", ["cml-analytics", "cml-analytics-2"]),
      "cml-analytics-3",
    );
  });

  it("ignores aliases belonging to other projects", () => {
    assert.equal(assignHostAlias("owner/analytics", ["cml-other", "cml-other-2"]), "cml-analytics");
  });

  it("always produces a managed alias", () => {
    assert.equal(isManagedAlias(assignHostAlias("owner/Weird Name!!", [])), true);
  });
});

describe("remoteUriFor", () => {
  it("builds a Remote-SSH URI for the alias", () => {
    assert.equal(remoteUriFor("cml-abc"), "vscode-remote://ssh-remote+cml-abc/home/cdsw");
  });
});

describe("syncSshConfig", () => {
  it("rejects a non-numeric port", () => {
    assert.equal(syncSshConfig([{ alias: "cml-a", port: "" }]), false);
    assert.equal(syncSshConfig([{ alias: "cml-a", port: "abc" }]), false);
    assert.equal(syncSshConfig([{ alias: "cml-a", port: "12a" }]), false);
  });

  it("rejects an alias the extension does not own", () => {
    assert.equal(syncSshConfig([{ alias: "myserver", port: "2222" }]), false);
    assert.equal(syncSshConfig([{ alias: "cml_bad", port: "2222" }]), false);
  });

  it("rejects a duplicated alias", () => {
    assert.equal(
      syncSshConfig([{ alias: "cml-a", port: "1111" }, { alias: "cml-a", port: "2222" }]),
      false,
    );
  });

  it("creates the config file when missing", () => {
    assert.equal(fs.existsSync(configFile), false);
    assert.equal(syncSshConfig([{ alias: "cml-a", port: "6806" }]), true);
    assert.equal(readConfig(), expectedBlock("cml-a", "6806") + "\n");
  });

  it("writes several sessions at once, sorted by alias", () => {
    const ok = syncSshConfig([
      { alias: "cml-zeta", port: "3333" },
      { alias: "cml-alpha", port: "1111" },
    ]);
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml-alpha"), 1);
    assert.equal(countHostLines(content, "cml-zeta"), 1);
    assert.ok(content.indexOf("Host cml-alpha") < content.indexOf("Host cml-zeta"));
    assert.ok(content.includes(expectedBlock("cml-alpha", "1111")));
    assert.ok(content.includes(expectedBlock("cml-zeta", "3333")));
  });

  it("removes the block of a session that is no longer live", () => {
    syncSshConfig([{ alias: "cml-a", port: "1111" }, { alias: "cml-b", port: "2222" }]);
    const ok = syncSshConfig([{ alias: "cml-b", port: "2222" }]);
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml-a"), 0);
    assert.equal(countHostLines(content, "cml-b"), 1);
    assert.doesNotMatch(content, /Port 1111/);
  });

  it("empties the managed region when no session is live", () => {
    syncSshConfig([{ alias: "cml-a", port: "1111" }]);
    assert.equal(syncSshConfig([]), true);
    assert.equal(readConfig().trim(), "");
  });

  it("preserves unrelated Host blocks", () => {
    writeConfig(
      [
        "Host github.com",
        "  User git",
        "  IdentityFile ~/.ssh/id_ed25519",
        "",
        "Host example",
        "  HostName example.com",
        "  User alice",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "6806" }]), true);

    const content = readConfig();
    assert.match(content, /^Host github\.com$/m);
    assert.match(content, /IdentityFile ~\/\.ssh\/id_ed25519/);
    assert.match(content, /^Host example$/m);
    assert.match(content, /HostName example\.com/);
    assert.equal(countHostLines(content, "cml-a"), 1);
  });

  it("replaces a legacy Host cml block written by an older version", () => {
    writeConfig(
      [
        "Host cml",
        "  HostName localhost",
        "  Port 1111",
        "  User cdsw",
        "",
        "Host other",
        "  User bob",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-proj", port: "2222" }]), true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml"), 0);
    assert.equal(countHostLines(content, "cml-proj"), 1);
    assert.match(content, /Port 2222/);
    assert.doesNotMatch(content, /Port 1111/);
    assert.match(content, /^Host other$/m);
  });

  it("cleans up a malformed managed block with duplicate keys", () => {
    writeConfig(
      [
        "Host cml-a",
        "  HostName localhost",
        "  Port 6806",
        "  User cdsw",
        "  Port 8372",
        "  User cdsw",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "9000" }]), true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml-a"), 1);
    assert.equal((content.match(/^\s*Port\s+/gm) || []).length, 1);
    assert.equal((content.match(/^\s*User\s+/gm) || []).length, 1);
    assert.match(content, /Port 9000/);
    assert.doesNotMatch(content, /Port 6806/);
    assert.doesNotMatch(content, /Port 8372/);
  });

  it("collapses pre-existing duplicate blocks for the same alias", () => {
    writeConfig(
      [
        "Host cml-a",
        "  HostName localhost",
        "  Port 1111",
        "  User cdsw",
        "",
        "Host keep",
        "  User keep",
        "",
        "Host cml-a",
        "  HostName localhost",
        "  Port 2222",
        "  User cdsw",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "3333" }]), true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml-a"), 1);
    assert.match(content, /^Host keep$/m);
    assert.match(content, /Port 3333/);
    assert.doesNotMatch(content, /Port 1111/);
    assert.doesNotMatch(content, /Port 2222/);
  });

  it("strips a managed alias listed alongside other patterns", () => {
    // `Host` accepts multiple patterns. If one of them is ours the block has to
    // go, or our alias keeps resolving to a stale port.
    writeConfig(
      [
        "Host cml-a foo",
        "  HostName localhost",
        "  Port 1111",
        "",
        "Host bar",
        "  User bar",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "4444" }]), true);

    const content = readConfig();
    assert.doesNotMatch(content, /^Host cml-a foo$/m);
    assert.match(content, /^Host bar$/m);
    assert.match(content, /Port 4444/);
    assert.equal(countHostLines(content, "cml-a"), 1);
  });

  it("does not touch blocks that merely mention 'cml' as a substring", () => {
    writeConfig(
      [
        "Host cmlserver",
        "  HostName cml.example.com",
        "  User alice",
        "",
        "Host my-cml-thing",
        "  User bob",
        "",
      ].join("\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "5555" }]), true);

    const content = readConfig();
    assert.match(content, /^Host cmlserver$/m);
    assert.match(content, /^Host my-cml-thing$/m);
    assert.match(content, /Port 5555/);
  });

  it("appends to a file with no trailing newline cleanly", () => {
    writeConfig("Host other\n  User bob");

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "7777" }]), true);

    const content = readConfig();
    assert.match(content, /^Host other$/m);
    assert.match(content, /User bob\n\nHost cml-a\n/);
  });

  it("handles CRLF line endings in the existing file", () => {
    writeConfig(
      ["Host cml-a", "  Port 1111", "  User cdsw", "", "Host other", "  User x", ""].join("\r\n"),
    );

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "8888" }]), true);

    const content = readConfig();
    assert.equal(countHostLines(content, "cml-a"), 1);
    assert.match(content, /^Host other$/m);
    assert.match(content, /Port 8888/);
    assert.doesNotMatch(content, /Port 1111/);
  });

  it("creates ~/.ssh if missing", () => {
    const sshDir = path.join(tmpHome, ".ssh");
    assert.equal(fs.existsSync(sshDir), false);

    assert.equal(syncSshConfig([{ alias: "cml-a", port: "6806" }]), true);
    assert.equal(fs.existsSync(sshDir), true);
    assert.equal(fs.existsSync(configFile), true);
  });
});
