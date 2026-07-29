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
import {
  normalizeProjectName, projectOverviewUrl, resourcePrefill, runtimeLabel, validateSessionForm,
} from "../sessionFormModel";
import { RuntimeData } from "../types";

const CTX = {
  username: "hankem",
  runtimeIds: [45, 47],
  addonIds: [7, 9],
  cpuProfiles: [0.5, 1, 2, 4, 8],
};

const VALID = {
  project: "risk-model",
  runtimeId: 47,
  addonId: 9,
  cpus: "0.5",
  memoryGb: "8",
  gpus: "0",
  saveAsDefaults: false,
};

test("prefixes a bare project name with the lowercased username", () => {
  assert.strictEqual(normalizeProjectName("risk-model", "HANKEM"), "hankem/risk-model");
});

test("leaves an owner-qualified project name alone", () => {
  assert.strictEqual(normalizeProjectName("afischer/shared-etl", "hankem"), "afischer/shared-etl");
});

test("trims the typed project name before prefixing", () => {
  assert.strictEqual(normalizeProjectName("  risk-model  ", "hankem"), "hankem/risk-model");
});

test("accepts a valid submission and resolves the project name", () => {
  const result = validateSessionForm(VALID, CTX);
  assert.ok(result.ok);
  assert.deepStrictEqual(result.values, {
    project: "hankem/risk-model",
    runtimeId: 47,
    addonId: 9,
    cpus: 0.5,
    memoryGb: 8,
    gpus: 0,
    saveAsDefaults: false,
  });
});

test("accepts fractional CPUs typed with a comma", () => {
  const result = validateSessionForm({ ...VALID, cpus: "0,5" }, CTX);
  assert.ok(result.ok);
  assert.strictEqual(result.values.cpus, 0.5);
});

test("accepts a CPU size outside the deployed profiles — the warning must not block", () => {
  const result = validateSessionForm({ ...VALID, cpus: "0.75" }, CTX);
  assert.ok(result.ok);
  assert.strictEqual(result.values.cpus, 0.75);
});

test("treats addon 0, empty string and null as None", () => {
  for (const omitted of [0, "0", "", null, undefined]) {
    const result = validateSessionForm({ ...VALID, addonId: omitted }, CTX);
    assert.ok(result.ok, `expected ok for addonId ${JSON.stringify(omitted)}`);
    assert.strictEqual(result.values.addonId, null);
  }
});

test("rejects a runtime id the host did not offer", () => {
  const result = validateSessionForm({ ...VALID, runtimeId: 999 }, CTX);
  assert.ok(!result.ok);
  assert.ok(result.errors.includes("Select a runtime."));
});

test("rejects an addon id the host did not offer", () => {
  const result = validateSessionForm({ ...VALID, addonId: 999 }, CTX);
  assert.ok(!result.ok);
  assert.ok(result.errors.includes("Select a runtime addon, or None."));
});

test("rejects an empty project name", () => {
  const result = validateSessionForm({ ...VALID, project: "   " }, CTX);
  assert.ok(!result.ok);
});

test("rejects a project path with too many segments", () => {
  const result = validateSessionForm({ ...VALID, project: "a/b/c" }, CTX);
  assert.ok(!result.ok);
  assert.ok(result.errors.includes("Use either 'project' or 'owner/project'."));
});

test("rejects a project name containing control characters", () => {
  const result = validateSessionForm({ ...VALID, project: `risk${String.fromCharCode(10)}model` }, CTX);
  assert.ok(!result.ok);
});

test("allows a project name containing a space", () => {
  const result = validateSessionForm({ ...VALID, project: "risk model" }, CTX);
  assert.ok(result.ok);
  assert.strictEqual(result.values.project, "hankem/risk model");
});

test("collects every error at once rather than stopping at the first", () => {
  const result = validateSessionForm({ project: "", runtimeId: 999, cpus: "x", memoryGb: "0", gpus: "0.5" }, CTX);
  assert.ok(!result.ok);
  assert.strictEqual(result.errors.length, 5);
});

test("rejects a payload that is not an object", () => {
  for (const bad of [null, undefined, "nope", 42]) {
    const result = validateSessionForm(bad, CTX);
    assert.ok(!result.ok);
  }
});

test("only a literal true enables saveAsDefaults", () => {
  assert.strictEqual((validateSessionForm({ ...VALID, saveAsDefaults: "yes" }, CTX) as { values: { saveAsDefaults: boolean } }).values.saveAsDefaults, false);
  assert.strictEqual((validateSessionForm({ ...VALID, saveAsDefaults: true }, CTX) as { values: { saveAsDefaults: boolean } }).values.saveAsDefaults, true);
});

test("uses configured resources for a new session instead of the last session", () => {
  const lastSessionResources = { cpus: 0.5, memoryGb: 2, gpus: 0 };
  const configuredDefaults = { cpus: 0.5, memoryGb: 16, gpus: 0 };
  assert.deepStrictEqual(resourcePrefill("create", lastSessionResources, configuredDefaults), configuredDefaults);
});

test("builds the project overview URL from the configured CML URL", () => {
  assert.strictEqual(
    projectOverviewUrl("https://oenbml.apps.anucdp-cml-master-01.w.oenb.co.at/"),
    "https://oenbml.apps.anucdp-cml-master-01.w.oenb.co.at/projects",
  );
});

test("does not expose an invalid or unsafe configured CML URL as a project link", () => {
  assert.strictEqual(projectOverviewUrl("not a URL"), null);
  assert.strictEqual(projectOverviewUrl("file:///C:/"), null);
});

test("builds a readable runtime label", () => {
  const runtime = {
    id: 47,
    editor: "JupyterLab",
    kernel: "Python 3.11",
    edition: "Standard",
    shortVersion: "2025.01.3",
    fullVersion: "2025.01.3-b8",
    imageIdentifier: "ml-runtime-jupyterlab-python3.11-standard:2025.01.3-b8",
    description: "",
  } satisfies RuntimeData;
  assert.strictEqual(runtimeLabel(runtime), "JupyterLab · Python 3.11 · Standard");
});
