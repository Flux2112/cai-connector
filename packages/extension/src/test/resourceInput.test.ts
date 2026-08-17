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

import * as assert from "assert";
import { test } from "node:test";
import { isBlocking, parseNumeric, validateCpus, validateGpus, validateMemoryGb } from "../resourceInput";

const PROFILES = [0.5, 1, 2, 4, 8];

test("parses a fractional CPU value written with a period", () => {
  assert.strictEqual(parseNumeric("0.5"), 0.5);
});

test("parses a fractional value written with a German decimal comma", () => {
  assert.strictEqual(parseNumeric("0,5"), 0.5);
});

test("parses a leading-period value", () => {
  assert.strictEqual(parseNumeric(".5"), 0.5);
});

test("trims surrounding whitespace", () => {
  assert.strictEqual(parseNumeric("  2  "), 2);
});

test("accepts a number as-is", () => {
  assert.strictEqual(parseNumeric(4), 4);
});

test("rejects negatives, exponents, trailing separators and words", () => {
  for (const bad of ["-1", "1e3", "5.", "abc", "", "  ", "1/2", "0.5.5"]) {
    assert.ok(Number.isNaN(parseNumeric(bad)), `expected NaN for ${JSON.stringify(bad)}`);
  }
});

test("rejects non-string non-number input", () => {
  for (const bad of [null, undefined, {}, [], true]) {
    assert.ok(Number.isNaN(parseNumeric(bad)));
  }
});

test("accepts 0.5 CPUs — the profile size that issue #1 reported as blocked", () => {
  assert.strictEqual(validateCpus("0.5", PROFILES), null);
});

test("accepts 0.5 CPUs typed with a comma", () => {
  assert.strictEqual(validateCpus("0,5", PROFILES), null);
});

test("rejects zero CPUs", () => {
  assert.strictEqual(validateCpus("0", PROFILES)?.severity, "error");
});

test("rejects unparseable CPUs", () => {
  assert.strictEqual(validateCpus("two", PROFILES)?.severity, "error");
});

test("warns without blocking when the CPU size matches no deployed profile", () => {
  const issue = validateCpus("0.75", PROFILES);
  assert.strictEqual(issue?.severity, "warning");
  assert.strictEqual(isBlocking([issue]), false);
});

test("skips the profile warning when no profiles are configured", () => {
  assert.strictEqual(validateCpus("0.75", []), null);
});

test("accepts fractional memory but rejects zero and nonsense", () => {
  assert.strictEqual(validateMemoryGb("0.5"), null);
  assert.strictEqual(validateMemoryGb("8"), null);
  assert.strictEqual(validateMemoryGb("0")?.severity, "error");
  assert.strictEqual(validateMemoryGb("")?.severity, "error");
});

test("accepts whole GPUs including zero, rejects fractions", () => {
  assert.strictEqual(validateGpus("0"), null);
  assert.strictEqual(validateGpus("2"), null);
  assert.strictEqual(validateGpus("0.5")?.severity, "error");
  assert.strictEqual(validateGpus("-1")?.severity, "error");
});

test("isBlocking reports true only for errors", () => {
  assert.strictEqual(isBlocking([null, { severity: "warning", message: "w" }]), false);
  assert.strictEqual(isBlocking([null, { severity: "error", message: "e" }]), true);
  assert.strictEqual(isBlocking([]), false);
});
