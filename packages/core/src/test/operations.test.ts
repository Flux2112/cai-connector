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

import { createClient, type CaiClient } from "../client";
import { CaiError, CaiRequestError } from "../errors";
import { whoami } from "../operations/auth";
import { searchFilter } from "../operations/common";
import { listProjects, projectRef, resolveProject } from "../operations/projects";
import { listRuntimes } from "../operations/runtimes";
import { listWorkloadExecutions } from "../operations/workloads";
import { queryOf, startStub, type RecordedRequest, type StubReply } from "./stub";

async function withStub(
  reply: (req: RecordedRequest) => StubReply,
  run: (ctx: { client: CaiClient; stub: Awaited<ReturnType<typeof startStub>> }) => Promise<void>,
): Promise<void> {
  const stub = await startStub(reply);
  const client = createClient({ baseUrl: stub.url, apiKey: "test-key-0123456789" });
  try {
    await run({ client, stub });
  } finally {
    await stub.close();
  }
}

const OWNED = {
  id: "p-1",
  name: "analysis",
  slug: "analysis",
  owner: { username: "hanke" },
};

test("searchFilter emits JSON and omits empty fields entirely", () => {
  assert.equal(searchFilter({ status: "running" }), '{"status":"running"}');
  assert.equal(searchFilter({ status: undefined, name: "" }), undefined);
});

test("listProjects follows page tokens and passes the filter through", async () => {
  await withStub(
    (req) => {
      const page = queryOf(req).page_token;
      return page === undefined
        ? { json: { projects: [OWNED], next_page_token: "2" } }
        : { json: { projects: [{ ...OWNED, id: "p-2" }] } };
    },
    async ({ client, stub }) => {
      const projects = await listProjects(client, { owner: "hanke", name: "analysis" });
      assert.deepEqual(
        projects.map((p) => p.id),
        ["p-1", "p-2"],
      );
      assert.equal(queryOf(stub.requests[0]).search_filter, '{"name":"analysis","owner.username":"hanke"}');
      assert.equal(queryOf(stub.requests[1]).page_token, "2");
    },
  );
});

test("resolveProject treats a reference without a slash as a project id", async () => {
  await withStub(
    () => ({ json: OWNED }),
    async ({ client, stub }) => {
      const project = await resolveProject(client, "p-1");
      assert.equal(project.id, "p-1");
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1");
    },
  );
});

test("resolveProject matches owner/name exactly, ignoring a loose server match", async () => {
  await withStub(
    () => ({
      json: {
        projects: [
          { ...OWNED, id: "other", name: "analysis-2", slug: "analysis-2" },
          OWNED,
          { ...OWNED, id: "someone-else", owner: { username: "other" } },
        ],
      },
    }),
    async ({ client }) => {
      const project = await resolveProject(client, "hanke/analysis");
      assert.equal(project.id, "p-1");
    },
  );
});

test("resolveProject also accepts the slug, which host aliases are built from", async () => {
  await withStub(
    () => ({ json: { projects: [{ ...OWNED, name: "Analysis Project", slug: "analysis-project" }] } }),
    async ({ client }) => {
      assert.equal((await resolveProject(client, "hanke/analysis-project")).id, "p-1");
    },
  );
});

test("resolveProject matches owner and name whatever their case", async () => {
  /* Verified against a live instance: the project displayed as DSE is owned by
   * HANKE, and both are typed lower-case by a human and by the extension, which
   * builds its references from a lower-cased %USERNAME%. */
  await withStub(
    () => ({ json: { projects: [{ ...OWNED, name: "DSE", slug: "dse", owner: { username: "HANKE" } }] } }),
    async ({ client }) => {
      assert.equal((await resolveProject(client, "hanke/dse")).id, "p-1");
      assert.equal((await resolveProject(client, "HANKE/DSE")).id, "p-1");
    },
  );
});

test("resolveProject looks again without the server's case-sensitive filter", async () => {
  const dse = { ...OWNED, name: "DSE", slug: "dse", owner: { username: "HANKE" } };
  await withStub(
    (req) => (queryOf(req).search_filter ? { json: { projects: [] } } : { json: { projects: [dse] } }),
    async ({ client, stub }) => {
      /* The hint drops the project, so the second, unfiltered listing is the only
       * thing that can answer. Verified live: search_filter is case-sensitive. */
      assert.equal((await resolveProject(client, "hanke/dse")).id, "p-1");
      assert.equal(stub.requests.length, 2);
    },
  );
});

test("resolveProject prefers the exact case when two projects differ only in it", async () => {
  await withStub(
    () => ({
      json: {
        projects: [
          { ...OWNED, id: "upper", name: "DSE", slug: "DSE" },
          { ...OWNED, id: "lower", name: "dse", slug: "dse" },
        ],
      },
    }),
    async ({ client }) => {
      assert.equal((await resolveProject(client, "hanke/dse")).id, "lower");
      assert.equal((await resolveProject(client, "hanke/DSE")).id, "upper");
    },
  );
});

test("resolveProject refuses to guess when nothing or several things match", async () => {
  await withStub(
    () => ({ json: { projects: [] } }),
    async ({ client }) => {
      await assert.rejects(resolveProject(client, "hanke/nope"), /no project matched/);
    },
  );

  await withStub(
    () => ({ json: { projects: [OWNED, { ...OWNED, id: "p-dup" }] } }),
    async ({ client }) => {
      await assert.rejects(resolveProject(client, "hanke/analysis"), /matched 2 projects/);
    },
  );
});

test("resolveProject rejects a malformed reference before calling out", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await assert.rejects(resolveProject(client, "/analysis"), CaiRequestError);
      await assert.rejects(resolveProject(client, ""), CaiRequestError);
      assert.equal(stub.requests.length, 0);
    },
  );
});

test("projectRef renders owner/slug and does not crash on a partial record", () => {
  assert.equal(projectRef(OWNED), "hanke/analysis");
  assert.equal(projectRef({}), "?/?");
});

/* The display name is not interchangeable with the slug, and getting it wrong
 * does not produce an error: `cdswctl ssh-endpoint -p HANKE/DSE` hangs without
 * output where `-p HANKE/dse` works. */
test("projectRef prefers the slug over the display name", () => {
  assert.equal(projectRef({ ...OWNED, name: "DSE", slug: "dse" }), "hanke/dse");
  assert.equal(projectRef({ ...OWNED, name: "Real_DWH_Import", slug: "real_dwh_import" }), "hanke/real_dwh_import");
  /* A record with no slug at all still has to render something usable. */
  assert.equal(projectRef({ name: "DSE", owner: { username: "hanke" } }), "hanke/DSE");
});

test("whoami returns the username the key belongs to", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE", message: "API key is valid for the given audience" } }),
    async ({ client, stub }) => {
      assert.equal(await whoami(client), "HANKE");
      assert.deepEqual(JSON.parse(stub.requests[0].body), { audience: "API" });
    },
  );
});

test("whoami treats an absent `valid` as a rejection, not a pass", async () => {
  await withStub(
    () => ({ json: { username: "HANKE" } }),
    async ({ client }) => {
      await assert.rejects(whoami(client), CaiError);
    },
  );
});

test("listRuntimes filters and paginates", async () => {
  await withStub(
    (req) =>
      queryOf(req).page_token === undefined
        ? { json: { runtimes: [{ id: 1 }], next_page_token: "n" } }
        : { json: { runtimes: [{ id: 2 }] } },
    async ({ client, stub }) => {
      const runtimes = await listRuntimes(client, { editor: "JupyterLab", kernel: "Python 3.10" });
      assert.equal(runtimes.length, 2);
      assert.equal(
        queryOf(stub.requests[0]).search_filter,
        '{"editor":"JupyterLab","kernel":"Python 3.10"}',
      );
    },
  );
});

test("listWorkloadExecutions flattens both arrays across pages", async () => {
  await withStub(
    (req) =>
      queryOf(req).page_token === undefined
        ? { json: { workloads: [{ id: 1 }], executions: [{ id: 10 }], next_page_token: "n" } }
        : { json: { workloads: [{ id: 2 }], executions: [] } },
    async ({ client, stub }) => {
      const listing = await listWorkloadExecutions(client, { status: "running" });
      assert.equal(listing.workloads.length, 2);
      assert.equal(listing.executions.length, 1);
      assert.equal(queryOf(stub.requests[0]).search_filter, '{"status":"running"}');
    },
  );
});
