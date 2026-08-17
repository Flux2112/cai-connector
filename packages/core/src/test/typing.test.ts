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

/*
 * Compile-time coverage for the generic machinery in types.ts.
 *
 * `npm test` type-checks before it runs, so every `@ts-expect-error` below is a
 * real assertion: if the client ever degrades to `any`, the expected error
 * stops happening and the build fails. Nothing here is called at runtime — the
 * one actual test exists so the file is a legitimate member of the suite.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import type { CaiClient } from "../client";
import type { Project } from "../operations/projects";

declare const client: CaiClient;

async function accepted(): Promise<void> {
  /* Options may be omitted entirely when nothing in them is required. */
  const projects = await client.get("/api/v2/projects");
  const list: Project[] | undefined = projects.projects;
  void list;

  /* A required path parameter, typed. */
  const project = await client.get("/api/v2/projects/{project_id}", { path: { project_id: "p1" } });
  const name: string | undefined = project.name;
  void name;

  /* A typed request body. */
  const validation = await client.post("/api/v2/auth/validate_key", { body: { audience: "API" } });
  const valid: boolean | undefined = validation.valid;
  void valid;

  /* A path whose only verb is POST is reachable through post. */
  await client.post("/api/v2/amps", { body: {} });
}

async function rejected(): Promise<void> {
  // @ts-expect-error - not a path in the spec
  await client.get("/api/v2/not-a-real-path");

  // @ts-expect-error - /api/v2/amps declares POST only
  await client.get("/api/v2/amps");

  // @ts-expect-error - project_id is required for this path
  await client.get("/api/v2/projects/{project_id}");

  // @ts-expect-error - this path takes no path parameters
  await client.get("/api/v2/projects", { path: { project_id: "p1" } });

  // @ts-expect-error - page_size is a number
  await client.get("/api/v2/projects", { query: { page_size: "10" } });

  // @ts-expect-error - the spec declares no such query parameter
  await client.get("/api/v2/projects", { query: { nonsense: true } });

  // @ts-expect-error - audience is a string
  await client.post("/api/v2/auth/validate_key", { body: { audience: 1 } });

  const projects = await client.get("/api/v2/projects");
  // @ts-expect-error - the response is typed, not `any`
  const wrong: string = projects.projects;
  void wrong;
}

test("the typed façade is exercised at compile time only", () => {
  assert.equal(typeof accepted, "function");
  assert.equal(typeof rejected, "function");
});
