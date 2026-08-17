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

import { CaiRequestError } from "../errors";
import { buildPath, buildQuery, joinUrl } from "../url";

test("buildPath fills placeholders", () => {
  assert.equal(
    buildPath("/api/v2/projects/{project_id}/jobs/{job_id}", { project_id: "abc", job_id: 7 }),
    "/api/v2/projects/abc/jobs/7",
  );
});

test("buildPath leaves a literal colon suffix alone", () => {
  assert.equal(
    buildPath("/api/v2/projects/{project_id}/jobs/{job_id}/runs/{run_id}:stop", {
      project_id: "p",
      job_id: "j",
      run_id: "r",
    }),
    "/api/v2/projects/p/jobs/j/runs/r:stop",
  );
});

test("buildPath percent-encodes, so a value cannot invent a path segment", () => {
  assert.equal(buildPath("/x/{id}", { id: "a/../b" }), "/x/a%2F..%2Fb");
});

test("buildPath rejects a missing or empty parameter", () => {
  assert.throws(() => buildPath("/x/{id}", {}), CaiRequestError);
  assert.throws(() => buildPath("/x/{id}", { id: "" }), CaiRequestError);
});

test("buildPath rejects a parameter the template does not declare", () => {
  assert.throws(() => buildPath("/x/{id}", { id: "1", nope: "2" }), CaiRequestError);
});

test("buildQuery drops undefined and null but keeps false and zero", () => {
  assert.equal(
    buildQuery({ a: undefined, b: null, c: false, d: 0, e: "v" }),
    "?c=false&d=0&e=v",
  );
});

test("buildQuery repeats the key for arrays and encodes both sides", () => {
  assert.equal(buildQuery({ "a b": ["x y", "z"] }), "?a%20b=x%20y&a%20b=z");
});

test("buildQuery returns an empty string when nothing survives", () => {
  assert.equal(buildQuery({ a: undefined }), "");
  assert.equal(buildQuery(), "");
});

test("joinUrl normalizes slashes on both sides", () => {
  assert.equal(joinUrl("https://ml.example.com///", "/api/v2/projects"), "https://ml.example.com/api/v2/projects");
});

test("joinUrl rejects a base URL that is not http(s)", () => {
  assert.throws(() => joinUrl("ml.example.com", "/x"), CaiRequestError);
  assert.throws(() => joinUrl("ftp://ml.example.com", "/x"), CaiRequestError);
});
