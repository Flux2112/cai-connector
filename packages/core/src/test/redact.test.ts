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
import { test } from "node:test";

import { redact, truncate } from "../redact";

const KEY = "abcd1234efgh5678";

test("redact blanks every occurrence of the key", () => {
  assert.equal(redact(`key=${KEY} again ${KEY}`, KEY), "key=*** again ***");
});

test("redact treats the secret literally, not as a pattern", () => {
  assert.equal(redact("a.b.c.d.e.f.g.h", "a.b.c.d.e.f.g.h"), "***");
  assert.equal(redact("aXbXcXdXeXfXgXh", "a.b.c.d.e.f.g.h"), "aXbXcXdXeXfXgXh");
});

test("redact catches a Bearer header even when the key was not passed in", () => {
  assert.equal(redact("authorization: Bearer someOtherToken"), "authorization: Bearer ***");
  assert.equal(redact("AUTHORIZATION: BEARER tok"), "AUTHORIZATION: BEARER ***");
});

test("redact ignores short secrets rather than shredding ordinary text", () => {
  assert.equal(redact("the API is up", "API"), "the API is up");
});

test("redact tolerates undefined secrets", () => {
  assert.equal(redact("plain text", undefined), "plain text");
});

test("truncate marks what it cut and leaves short text alone", () => {
  assert.equal(truncate("short", 10), "short");
  assert.equal(truncate("0123456789", 4), "0123… (10 bytes)");
});
