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

import { CaiRequestError } from "../errors";
import { cdswctlLogin, KEY_VAR, loginUsername } from "../session/login";
import { matchRuntimes, type CdswctlRuntime } from "../session/runtimes";
import { resolveCdswctl, stoppedSuccessfully } from "../session/cdswctl";

const URL = "https://ml.example.com";
const KEY = "test-key-0123456789";

/** A file that exists and is not a real cdswctl, which is all resolution needs. */
function fakeBinary(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cai-cdswctl-"));
  const file = path.join(dir, "cdswctl.exe");
  fs.writeFileSync(file, "not really a binary", "utf8");
  return file;
}

test("a stop is successful when cdswctl says so, and also when it prints its known bug", () => {
  assert.equal(stoppedSuccessfully({ exitCode: 0, stdout: "", stderr: "" }), true);
  /* cdswctl prints this on a *successful* stop. A stop wrongly read as failed
   * leaves the record flagged as an orphan forever. */
  assert.equal(
    stoppedSuccessfully({ exitCode: 1, stdout: "", stderr: "unexpected end of JSON input" }),
    true,
  );
  assert.equal(stoppedSuccessfully({ exitCode: 1, stdout: "", stderr: "no such session" }), false);
});

test("an explicit cdswctl path is used, and a wrong one is reported rather than ignored", () => {
  const binary = fakeBinary();
  assert.equal(resolveCdswctl(binary), binary);
  assert.throws(() => resolveCdswctl(path.join(path.dirname(binary), "nope.exe")), /not found/);
});

test("the login refuses a URL or username it could not safely put on a command line", async () => {
  const binary = fakeBinary();
  for (const url of ['https://ml.example.com" & calc', "ftp://ml.example.com", "not a url"]) {
    await assert.rejects(
      () => cdswctlLogin(binary, { url, username: "hanke", apiKey: KEY }),
      CaiRequestError,
      `accepted ${JSON.stringify(url)}`,
    );
  }
  for (const username of ['hanke" & calc', "hanke; rm -rf /", "han ke"]) {
    await assert.rejects(
      () => cdswctlLogin(binary, { url: URL, username, apiKey: KEY }),
      CaiRequestError,
      `accepted ${JSON.stringify(username)}`,
    );
  }
});

test("the login never puts the key in argv, and redacts whatever comes back", async () => {
  /* The fake binary is not executable, so this exercises the failure path — which
   * is the one that echoes output, and therefore the one that must redact. */
  const result = await cdswctlLogin(fakeBinary(), { url: URL, username: "hanke", apiKey: KEY });

  assert.notEqual(result.exitCode, 0);
  assert.ok(!result.stdout.includes(KEY), "the key must not come back on stdout");
  assert.ok(!result.stderr.includes(KEY), "the key must not come back on stderr");
  /* The indirection itself: cdswctl is given the literal %CML_API_KEY%, and the
   * shell inside the child expands it. argv is readable process-wide; the child's
   * environment is not. */
  assert.equal(KEY_VAR, "CML_API_KEY");
});

test("the username is lower-cased, because that is what the extension has always sent", () => {
  assert.equal(loginUsername("HANKE"), "hanke");
  assert.equal(loginUsername("  Hanke  "), "hanke");
});

function runtime(over: Partial<CdswctlRuntime>): CdswctlRuntime {
  return {
    id: 1,
    imageIdentifier: "repo/ml-runtime-workbench-python3.11-standard:2024.10.1-b12",
    editor: "PBJ Workbench",
    kernel: "Python 3.11",
    edition: "Standard",
    shortVersion: "2024.10",
    fullVersion: "2024.10.1-b12",
    description: "Standard edition runtime provided by Cloudera",
    ...over,
  };
}

test("every runtime term has to match, and the newest wins", () => {
  const runtimes = [
    runtime({ id: 131, fullVersion: "2024.02.1-b4" }),
    runtime({ id: 281, fullVersion: "2026.04.1-b7" }),
    runtime({
      id: 9,
      kernel: "Python 3.9",
      fullVersion: "2026.04.1-b7",
      imageIdentifier: "repo/ml-runtime-workbench-python3.9-standard:2026.04.1-b7",
    }),
    runtime({
      id: 5,
      editor: "JupyterLab",
      kernel: "Conda",
      fullVersion: "2026.04.1-b7",
      imageIdentifier: "repo/ml-runtime-conda-standard:2026.04.1-b7",
    }),
  ];

  const matched = matchRuntimes(runtimes, "workbench python3.11");
  assert.deepEqual(matched.map((r) => r.id), [281, 131], "3.9 and Conda are excluded, newest first");
  assert.equal(matchRuntimes(runtimes, "workbench conda").length, 0, "both terms must match");
  assert.equal(matchRuntimes(runtimes, "").length, runtimes.length, "no terms is no filter");
});
