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

import { updateSshConfig } from "../sshConfig";

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

function countCmlHostLines(content: string): number {
  return content
    .split(/\r?\n/)
    .filter((line) => /^\s*Host\s+(?:\S+\s+)*cml(?:\s+\S+)*\s*$/i.test(line))
    .length;
}

function expectedBlock(port: string): string {
  return [
    "Host cml",
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

describe("updateSshConfig", () => {
  it("rejects non-numeric port", () => {
    assert.equal(updateSshConfig(""), false);
    assert.equal(updateSshConfig("abc"), false);
    assert.equal(updateSshConfig("12a"), false);
  });

  it("creates config file when missing", () => {
    assert.equal(fs.existsSync(configFile), false);
    const ok = updateSshConfig("6806");
    assert.equal(ok, true);
    assert.equal(readConfig(), expectedBlock("6806") + "\n");
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

    const ok = updateSshConfig("6806");
    assert.equal(ok, true);

    const content = readConfig();
    assert.match(content, /^Host github\.com$/m);
    assert.match(content, /IdentityFile ~\/\.ssh\/id_ed25519/);
    assert.match(content, /^Host example$/m);
    assert.match(content, /HostName example\.com/);
    assert.equal(countCmlHostLines(content), 1);
    assert.ok(content.includes(expectedBlock("6806")));
  });

  it("replaces an existing single Host cml block (port change)", () => {
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

    const ok = updateSshConfig("2222");
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countCmlHostLines(content), 1);
    assert.match(content, /Port 2222/);
    assert.doesNotMatch(content, /Port 1111/);
    assert.match(content, /^Host other$/m);
  });

  it("cleans up a malformed Host cml block with duplicate keys", () => {
    // The exact bug the user reported.
    writeConfig(
      [
        "Host cml",
        "  HostName localhost",
        "  Port 6806",
        "  User cdsw",
        "  Port 8372",
        "  User cdsw",
        "",
      ].join("\n"),
    );

    const ok = updateSshConfig("9000");
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countCmlHostLines(content), 1);

    // No duplicate Port/User lines anywhere.
    const portCount = (content.match(/^\s*Port\s+/gm) || []).length;
    const userCount = (content.match(/^\s*User\s+/gm) || []).length;
    assert.equal(portCount, 1);
    assert.equal(userCount, 1);
    assert.match(content, /Port 9000/);
    assert.doesNotMatch(content, /Port 6806/);
    assert.doesNotMatch(content, /Port 8372/);
  });

  it("collapses multiple existing Host cml blocks into one", () => {
    writeConfig(
      [
        "Host cml",
        "  HostName localhost",
        "  Port 1111",
        "  User cdsw",
        "",
        "Host keep",
        "  User keep",
        "",
        "Host cml",
        "  HostName localhost",
        "  Port 2222",
        "  User cdsw",
        "",
      ].join("\n"),
    );

    const ok = updateSshConfig("3333");
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countCmlHostLines(content), 1);
    assert.match(content, /^Host keep$/m);
    assert.match(content, /Port 3333/);
    assert.doesNotMatch(content, /Port 1111/);
    assert.doesNotMatch(content, /Port 2222/);
  });

  it("strips Host cml when listed alongside other patterns", () => {
    // `Host` accepts multiple patterns. If "cml" is one of them, remove the block.
    writeConfig(
      [
        "Host cml foo",
        "  HostName localhost",
        "  Port 1111",
        "",
        "Host bar",
        "  User bar",
        "",
      ].join("\n"),
    );

    const ok = updateSshConfig("4444");
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countCmlHostLines(content), 1);
    // The combined "Host cml foo" block is gone (foo is collateral, but the
    // block was shared and "cml" must not resolve to it anymore).
    assert.doesNotMatch(content, /^Host cml foo$/m);
    assert.match(content, /^Host bar$/m);
    assert.match(content, /Port 4444/);
  });

  it("does not strip blocks that merely mention 'cml' as a substring", () => {
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

    const ok = updateSshConfig("5555");
    assert.equal(ok, true);

    const content = readConfig();
    assert.match(content, /^Host cmlserver$/m);
    assert.match(content, /^Host my-cml-thing$/m);
    assert.equal(countCmlHostLines(content), 1); // only the freshly added one
    assert.match(content, /Port 5555/);
  });

  it("appends to a file with no trailing newline cleanly", () => {
    writeConfig("Host other\n  User bob");

    const ok = updateSshConfig("7777");
    assert.equal(ok, true);

    const content = readConfig();
    assert.match(content, /^Host other$/m);
    assert.equal(countCmlHostLines(content), 1);
    // Exactly one blank line between the kept block and the new one.
    assert.match(content, /User bob\n\nHost cml\n/);
  });

  it("handles CRLF line endings in the existing file", () => {
    const crlf = ["Host cml", "  Port 1111", "  User cdsw", "", "Host other", "  User x", ""].join(
      "\r\n",
    );
    writeConfig(crlf);

    const ok = updateSshConfig("8888");
    assert.equal(ok, true);

    const content = readConfig();
    assert.equal(countCmlHostLines(content), 1);
    assert.match(content, /^Host other$/m);
    assert.match(content, /Port 8888/);
    assert.doesNotMatch(content, /Port 1111/);
  });

  it("creates ~/.ssh directory if missing", () => {
    const sshDir = path.join(tmpHome, ".ssh");
    assert.equal(fs.existsSync(sshDir), false);

    const ok = updateSshConfig("6806");
    assert.equal(ok, true);
    assert.equal(fs.existsSync(sshDir), true);
    assert.equal(fs.existsSync(configFile), true);
  });
});
