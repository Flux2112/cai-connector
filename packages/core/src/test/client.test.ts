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

import { createClient } from "../client";
import { CaiApiError, CaiRequestError, CaiTransportError } from "../errors";
import { queryOf, startStub, type StubReply } from "./stub";

const KEY = "test-key-0123456789";

async function withStub(
  reply: (req: { method: string; url: string; body: string }) => StubReply,
  run: (ctx: {
    client: ReturnType<typeof createClient>;
    stub: Awaited<ReturnType<typeof startStub>>;
    lines: string[];
  }) => Promise<void>,
): Promise<void> {
  const stub = await startStub(reply);
  const lines: string[] = [];
  const client = createClient({
    baseUrl: stub.url,
    apiKey: KEY,
    log: (line) => lines.push(line),
  });
  try {
    await run({ client, stub, lines });
  } finally {
    await stub.close();
  }
}

test("a GET carries the bearer credential and the accept header", async () => {
  await withStub(
    () => ({ json: { projects: [] } }),
    async ({ client, stub }) => {
      await client.get("/api/v2/projects", {});
      assert.equal(stub.requests[0].method, "GET");
      assert.equal(stub.requests[0].headers.authorization, `Bearer ${KEY}`);
      assert.equal(stub.requests[0].headers.accept, "application/json");
    },
  );
});

test("a caller-supplied header cannot displace the credential", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await client.get("/api/v2/projects", { headers: { authorization: "Bearer wrong" } });
      assert.equal(stub.requests[0].headers.authorization, `Bearer ${KEY}`);
    },
  );
});

test("path and query parameters reach the wire", async () => {
  await withStub(
    () => ({ json: { id: "p1" } }),
    async ({ client, stub }) => {
      await client.get("/api/v2/projects/{project_id}", { path: { project_id: "p 1" } });
      assert.equal(stub.requests[0].url, "/api/v2/projects/p%201");

      await client.get("/api/v2/projects", { query: { page_size: 2, include_public_projects: true } });
      assert.deepEqual(queryOf(stub.requests[1]), { page_size: "2", include_public_projects: "true" });
    },
  );
});

test("a POST sends JSON and sets its content type", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "someone" } }),
    async ({ client, stub }) => {
      const result = await client.post("/api/v2/auth/validate_key", { body: { audience: "API" } });
      assert.equal(stub.requests[0].headers["content-type"], "application/json");
      assert.deepEqual(JSON.parse(stub.requests[0].body), { audience: "API" });
      assert.equal(result.username, "someone");
    },
  );
});

test("a non-2xx becomes a CaiApiError carrying the API's own message", async () => {
  await withStub(
    () => ({ status: 403, json: { message: "audience mismatch", code: 7 } }),
    async ({ client }) => {
      const err = await client
        .post("/api/v2/auth/validate_key", { body: { audience: "Application" } })
        .then(() => undefined, (e: unknown) => e);

      assert.ok(err instanceof CaiApiError);
      assert.equal(err.status, 403);
      assert.equal(err.code, 7);
      assert.equal(err.isAuthFailure, true);
      assert.match(err.message, /audience mismatch/);
    },
  );
});

test("an error body that is not JSON still produces a usable error", async () => {
  await withStub(
    () => ({ status: 502, text: "<html>gateway</html>" }),
    async ({ client }) => {
      const err = await client.get("/api/v2/projects", {}).then(() => undefined, (e: unknown) => e);
      assert.ok(err instanceof CaiApiError);
      assert.equal(err.status, 502);
      assert.match(err.body, /gateway/);
      assert.equal(err.isAuthFailure, false);
    },
  );
});

test("an empty 200 body resolves rather than failing to parse", async () => {
  await withStub(
    () => ({ status: 200, text: "" }),
    async ({ client }) => {
      assert.equal(await client.get("/api/v2/projects", {}), undefined);
    },
  );
});

test("the API key never appears in anything logged", async () => {
  await withStub(
    (req) => ({ status: 401, json: { message: `bad key ${req.body}` }, text: `denied key=${KEY}` }),
    async ({ client, lines }) => {
      await client.get("/api/v2/projects", {}).catch(() => undefined);
      const joined = lines.join("\n");
      assert.ok(lines.length > 0, "expected the client to log something");
      assert.ok(!joined.includes(KEY), `key leaked into: ${joined}`);
      assert.match(joined, /\*\*\*/);
    },
  );
});

test("a dead host is a transport error, not an API error", async () => {
  const stub = await startStub(() => ({ json: {} }));
  const url = stub.url;
  await stub.close();

  const client = createClient({ baseUrl: url, apiKey: KEY, timeoutMs: 2000 });
  const err = await client.get("/api/v2/projects", {}).then(() => undefined, (e: unknown) => e);
  assert.ok(err instanceof CaiTransportError, `expected CaiTransportError, got ${String(err)}`);
  assert.equal(err.method, "GET");
});

test("the default timeout aborts a hung request", async () => {
  await withStub(
    () => ({ json: {}, delayMs: 5000 }),
    async ({ stub }) => {
      const client = createClient({ baseUrl: stub.url, apiKey: KEY, timeoutMs: 60 });
      await assert.rejects(client.get("/api/v2/projects", {}), CaiTransportError);
    },
  );
});

test("createClient rejects an empty key up front", () => {
  assert.throws(() => createClient({ baseUrl: "https://x", apiKey: "" }), CaiRequestError);
});

test("a missing path parameter fails before anything is sent", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await assert.rejects(
        client.raw("get", "/api/v2/projects/{project_id}", { path: {} }),
        CaiRequestError,
      );
      assert.equal(stub.requests.length, 0);
    },
  );
});
