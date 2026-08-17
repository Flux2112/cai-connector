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
import { CaiApiError } from "../errors";
import { downloadFile, listFiles, ROOT } from "../operations/files";
import { getJob, getJobRun, listJobRuns, listJobs } from "../operations/jobs";
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

test("listFiles asks for the root when given no path", async () => {
  await withStub(
    () => ({ json: { files: [{ path: ".gitignore", is_dir: false, file_size: "61" }] } }),
    async ({ client, stub }) => {
      const files = await listFiles(client, "p-1", ROOT);
      assert.equal(files.length, 1);
      assert.equal(files[0].path, ".gitignore");
      /* ROOT is "." in the template; the URL layer resolves the dot segment
       * away, leaving the trailing-slash form the instance answers with the
       * root listing. */
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/files/");
    },
  );
});

test("a path parameter of .. is refused rather than resolved away", async () => {
  await withStub(
    () => ({ json: { files: [] } }),
    async ({ client, stub }) => {
      await assert.rejects(() => listFiles(client, "p-1", ".."), /may not be/);
      assert.equal(stub.requests.length, 0, "nothing reached the wire");
    },
  );
});

test("listFiles percent-encodes a nested path", async () => {
  await withStub(
    () => ({ json: { files: [] } }),
    async ({ client, stub }) => {
      await listFiles(client, "p-1", "data/raw");
      /* The gateway decodes %2F, verified against a live instance, so encoding
       * every segment is safe and keeps buildPath free of special cases. */
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/files/data%2Fraw");
    },
  );
});

test("listFiles reports an absent files array as empty rather than throwing", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client }) => {
      assert.deepEqual(await listFiles(client, "p-1", ROOT), []);
    },
  );
});

test("downloadFile returns bytes verbatim, without UTF-8 decoding", async () => {
  /* 0xff 0xfe is not valid UTF-8; text() would replace both with U+FFFD. */
  const payload = new Uint8Array([0x00, 0xff, 0xfe, 0x50, 0x4b]);
  await withStub(
    () => ({ bytes: payload }),
    async ({ client, stub }) => {
      const bytes = await downloadFile(client, "p-1", "out/model.pkl");
      assert.deepEqual(Array.from(bytes), Array.from(payload));
      assert.equal(stub.requests[0].method, "POST");
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/files/out%2Fmodel.pkl:download");
    },
  );
});

test("a failed download still raises a CaiApiError with its body", async () => {
  await withStub(
    () => ({ status: 404, json: { message: "no such file" } }),
    async ({ client }) => {
      await assert.rejects(
        () => downloadFile(client, "p-1", "missing.txt"),
        (err: unknown) => err instanceof CaiApiError && err.status === 404 && err.body.includes("no such file"),
      );
    },
  );
});

test("listJobs follows page tokens and filters by name", async () => {
  await withStub(
    (req) => {
      const q = queryOf(req);
      assert.equal(q.search_filter, '{"name":"nightly"}');
      return q.page_token === undefined
        ? { json: { jobs: [{ id: "j-1" }], next_page_token: "2" } }
        : { json: { jobs: [{ id: "j-2" }] } };
    },
    async ({ client }) => {
      const jobs = await listJobs(client, "p-1", { name: "nightly" });
      assert.deepEqual(
        jobs.map((j) => j.id),
        ["j-1", "j-2"],
      );
    },
  );
});

test("getJob and getJobRun address the right paths", async () => {
  await withStub(
    () => ({ json: { id: "x" } }),
    async ({ client, stub }) => {
      await getJob(client, "p-1", "j-1");
      await getJobRun(client, "p-1", "j-1", "r-9");
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/jobs/j-1");
      assert.equal(stub.requests[1].url, "/api/v2/projects/p-1/jobs/j-1/runs/r-9");
    },
  );
});

test("listJobRuns honours limit and stops before the last page", async () => {
  await withStub(
    () => ({ json: { job_runs: [{ id: "r-1" }, { id: "r-2" }], next_page_token: "next" } }),
    async ({ client, stub }) => {
      const runs = await listJobRuns(client, "p-1", "j-1", { status: "running", limit: 2 });
      assert.equal(runs.length, 2);
      assert.equal(stub.requests.length, 1, "the limit was reached, so no second page was fetched");
      assert.equal(queryOf(stub.requests[0]).search_filter, '{"status":"running"}');
    },
  );
});
