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

import { configDir, CREDENTIALS_FILE, resolveConfig, saveCredentials } from "../lib/config";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "cai-cli-test-"));
}

test("a flag beats the environment, which beats the stored file", () => {
  const dir = tempDir();
  saveCredentials(dir, { baseUrl: "https://file.example", apiKey: "from-file" });

  const all = resolveConfig({
    flags: { baseUrl: "https://flag.example", apiKey: "from-flag" },
    env: { CAI_URL: "https://env.example", CML_API_KEY: "from-env" },
    configDir: dir,
  });
  assert.equal(all.baseUrl.value, "https://flag.example");
  assert.equal(all.baseUrl.source, "flag");
  assert.equal(all.apiKey.source, "flag");

  const noFlags = resolveConfig({
    env: { CAI_URL: "https://env.example", CML_API_KEY: "from-env" },
    configDir: dir,
  });
  assert.equal(noFlags.baseUrl.value, "https://env.example");
  assert.equal(noFlags.apiKey.source, "env");

  const fileOnly = resolveConfig({ env: {}, configDir: dir });
  assert.equal(fileOnly.baseUrl.value, "https://file.example");
  assert.equal(fileOnly.apiKey.value, "from-file");
  assert.equal(fileOnly.apiKey.source, "file");
});

test("nothing anywhere reports unset rather than throwing", () => {
  const resolved = resolveConfig({ env: {}, configDir: tempDir() });
  assert.equal(resolved.baseUrl.value, undefined);
  assert.equal(resolved.baseUrl.source, "unset");
  assert.equal(resolved.apiKey.source, "unset");
});

test("an unreadable or malformed credentials file reads as unset", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, CREDENTIALS_FILE), "{ not json");
  const resolved = resolveConfig({ env: {}, configDir: dir });
  assert.equal(resolved.apiKey.source, "unset", "a parse error must not become a crash");
});

test("a credentials file with wrong value types is ignored field by field", () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, CREDENTIALS_FILE), JSON.stringify({ baseUrl: 42, apiKey: "ok" }));
  const resolved = resolveConfig({ env: {}, configDir: dir });
  assert.equal(resolved.baseUrl.value, undefined);
  assert.equal(resolved.apiKey.value, "ok");
});

test("CML_URL is accepted as a fallback for CAI_URL", () => {
  const resolved = resolveConfig({ env: { CML_URL: "https://legacy.example" }, configDir: tempDir() });
  assert.equal(resolved.baseUrl.value, "https://legacy.example");
});

test("saveCredentials writes owner-only and round-trips", () => {
  const dir = path.join(tempDir(), "nested");
  const file = saveCredentials(dir, { baseUrl: "https://x.example", apiKey: "secret-key-value" });

  assert.equal(file, path.join(dir, CREDENTIALS_FILE));
  const resolved = resolveConfig({ env: {}, configDir: dir });
  assert.equal(resolved.apiKey.value, "secret-key-value");

  if (process.platform !== "win32") {
    /* Windows mode bits are largely advisory and %APPDATA% is already per-user,
     * so only assert this where it means something. */
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  }
});

test("configDir follows the platform convention", () => {
  if (process.platform === "win32") {
    assert.equal(configDir({ APPDATA: "C:\\Users\\x\\AppData\\Roaming" }), path.join("C:\\Users\\x\\AppData\\Roaming", "cai"));
  } else {
    assert.equal(configDir({ XDG_CONFIG_HOME: "/tmp/xdg" }), path.join("/tmp/xdg", "cai"));
    assert.equal(configDir({}), path.join(os.homedir(), ".config", "cai"));
  }
});
