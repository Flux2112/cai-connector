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
import { CaiRequestError } from "../errors";
import {
  getApplication,
  listApplications,
  restartApplication,
  stopApplication,
} from "../operations/applications";
import { assertUploadPath, uploadFile } from "../operations/files";
import { updateJob } from "../operations/jobs";
import {
  createJobRun,
  isRunFinished,
  isRunSuccessful,
  stopJobRun,
  waitForJobRun,
} from "../operations/runs";
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

/* ---------------------------------------------------------------- uploads */

test("assertUploadPath refuses what would land outside the project", () => {
  for (const bad of ["", "/etc/passwd", "../secrets", "a/../../b", "C:/Windows/System32/x", "\\\\host\\share"]) {
    assert.throws(() => assertUploadPath(bad), CaiRequestError, `accepted ${JSON.stringify(bad)}`);
  }
});

test("assertUploadPath keeps a relative path and drops a leading ./", () => {
  assert.equal(assertUploadPath("src/train.py"), "src/train.py");
  assert.equal(assertUploadPath("./src/train.py"), "src/train.py");
  assert.equal(assertUploadPath("notes.txt"), "notes.txt");
});

test("uploadFile posts multipart with the destination as the field name", async () => {
  const payload = new Uint8Array([0x00, 0xff, 0xfe, 0x50, 0x4b]);
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await uploadFile(client, "p-1", "data/model.pkl", payload);

      const request = stub.requests[0];
      assert.equal(request.method, "POST");
      /* The project is the only path parameter: the destination travels in the
       * body, which is why assertUploadPath has to exist. */
      assert.equal(request.url, "/api/v2/projects/p-1/files");
      assert.match(String(request.headers["content-type"]), /^multipart\/form-data; boundary=----caiFormBoundary/);
      assert.ok(request.body.includes('name="data/model.pkl"'), "the field name is the destination path");
      assert.ok(request.body.includes('filename="model.pkl"'), "the filename is the basename");
      assert.ok(request.raw.includes(Buffer.from(payload)), "the bytes arrived intact");
    },
  );
});

test("uploadFile refuses a traversing destination before anything reaches the wire", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await assert.rejects(() => uploadFile(client, "p-1", "../escape.txt", new Uint8Array()), CaiRequestError);
      assert.equal(stub.requests.length, 0, "nothing reached the wire");
    },
  );
});

/* ------------------------------------------------------------- job runs */

test("createJobRun posts the environment and arguments it was given", async () => {
  await withStub(
    () => ({ json: { id: "r-1", status: "ENGINE_SCHEDULING" } }),
    async ({ client, stub }) => {
      const run = await createJobRun(client, "p-1", "j-1", {
        environment: { SPLIT: "test" },
        arguments: "--epochs 3",
      });

      assert.equal(run.id, "r-1");
      assert.equal(stub.requests[0].method, "POST");
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/jobs/j-1/runs");
      assert.deepEqual(JSON.parse(stub.requests[0].body), {
        environment: { SPLIT: "test" },
        arguments: "--epochs 3",
      });
    },
  );
});

test("stopJobRun uses the custom method rather than a delete", async () => {
  await withStub(
    () => ({ json: { id: "r-1", status: "ENGINE_STOPPING" } }),
    async ({ client, stub }) => {
      const run = await stopJobRun(client, "p-1", "j-1", "r-1");
      assert.equal(run.status, "ENGINE_STOPPING");
      assert.equal(stub.requests[0].method, "POST");
      assert.equal(stub.requests[0].url, "/api/v2/projects/p-1/jobs/j-1/runs/r-1:stop");
    },
  );
});

test("neither ENGINE_UNKNOWN nor ENGINE_STOPPING counts as finished", () => {
  assert.equal(isRunFinished("ENGINE_UNKNOWN"), false);
  assert.equal(isRunFinished("ENGINE_STOPPING"), false);
  assert.equal(isRunFinished(undefined), false);
  assert.equal(isRunFinished("ENGINE_STOPPED"), true);
  assert.equal(isRunFinished("ENGINE_FAILED"), true);
  assert.equal(isRunSuccessful("ENGINE_SUCCEEDED"), true);
  assert.equal(isRunSuccessful("ENGINE_FAILED"), false);
});

test("waitForJobRun polls until the run reaches a finished status", async () => {
  const statuses = ["ENGINE_SCHEDULING", "ENGINE_RUNNING", "ENGINE_SUCCEEDED"];
  let call = 0;
  let slept = 0;

  await withStub(
    () => ({ json: { id: "r-1", status: statuses[Math.min(call++, statuses.length - 1)] } }),
    async ({ client, stub }) => {
      const seen: (string | undefined)[] = [];
      const run = await waitForJobRun(client, "p-1", "j-1", "r-1", {
        intervalMs: 1000,
        sleep: async (ms) => {
          slept += ms;
        },
        onPoll: (polled) => seen.push(polled.status),
      });

      assert.equal(run.status, "ENGINE_SUCCEEDED");
      assert.deepEqual(seen, statuses);
      assert.equal(stub.requests.length, 3);
      assert.equal(slept, 2000, "slept once between each pair of polls, and not after the last");
    },
  );
});

test("waitForJobRun returns the unfinished run when the wait expires", async () => {
  let clock = 0;
  await withStub(
    () => ({ json: { id: "r-1", status: "ENGINE_RUNNING" } }),
    async ({ client, stub }) => {
      const run = await waitForJobRun(client, "p-1", "j-1", "r-1", {
        intervalMs: 1000,
        timeoutMs: 2500,
        now: () => clock,
        sleep: async (ms) => {
          clock += ms;
        },
      });

      /* A timeout is not an error: the caller needs the id and the status to say
       * anything useful, and isRunFinished is what tells the outcomes apart. */
      assert.equal(run.status, "ENGINE_RUNNING");
      assert.equal(isRunFinished(run.status), false);
      /* Polls at t=0, 1000, 2000; the next would land past 2500, so it stops. */
      assert.equal(stub.requests.length, 3);
      assert.ok(clock <= 2500, `waited ${clock}ms, past the 2500ms budget`);
    },
  );
});

/* --------------------------------------------------------- applications */

test("listApplications filters by status and follows page tokens", async () => {
  await withStub(
    (req) => {
      const q = queryOf(req);
      assert.equal(q.search_filter, '{"status":"running"}');
      return q.page_token === undefined
        ? { json: { applications: [{ id: "a-1" }], next_page_token: "2" } }
        : { json: { applications: [{ id: "a-2" }] } };
    },
    async ({ client }) => {
      const apps = await listApplications(client, "p-1", { status: "running" });
      assert.deepEqual(
        apps.map((a) => a.id),
        ["a-1", "a-2"],
      );
    },
  );
});

test("restart, stop and get address the application paths the spec declares", async () => {
  await withStub(
    () => ({ json: { id: "a-1", status: "APPLICATION_STARTING" } }),
    async ({ client, stub }) => {
      await getApplication(client, "p-1", "a-1");
      await restartApplication(client, "p-1", "a-1");
      await stopApplication(client, "p-1", "a-1");

      assert.deepEqual(
        stub.requests.map((r) => `${r.method} ${r.url}`),
        [
          "GET /api/v2/projects/p-1/applications/a-1",
          "POST /api/v2/projects/p-1/applications/a-1:restart",
          "POST /api/v2/projects/p-1/applications/a-1:stop",
        ],
      );
    },
  );
});

/* ---------------------------------------------------------------- jobs */

test("updateJob patches only the fields it was given, at the path the spec declares", async () => {
  await withStub(
    () => ({ json: { id: "j-1", name: "Nightly" } }),
    async ({ client, stub }) => {
      await updateJob(client, "p-1", "j-1", { name: "Nightly", schedule: "0 4 * * *", timeoutSeconds: 600 });

      const request = stub.requests[0];
      assert.equal(request.method, "PATCH");
      /* The spec names this parameter `job.id`, not `job_id` — the other job
       * paths use the latter, so the two are easy to mix up. */
      assert.equal(request.url, "/api/v2/projects/p-1/jobs/j-1");
      assert.deepEqual(JSON.parse(request.body), {
        name: "Nightly",
        schedule: "0 4 * * *",
        /* A string, as the `Job` schema has it — the create request takes a
         * number for the same idea. */
        timeout: "600",
      });
    },
  );
});

test("updateJob sends the environment as a JSON string", async () => {
  await withStub(
    () => ({ json: { id: "j-1" } }),
    async ({ client, stub }) => {
      await updateJob(client, "p-1", "j-1", { environment: { SPLIT: "test" } });

      /* An object here is a 400: `cannot unmarshal object into Go value of type
       * string`, unlike CreateJob which takes one. */
      assert.deepEqual(JSON.parse(stub.requests[0].body), { environment: '{"SPLIT":"test"}' });
    },
  );
});

test("updateJob refuses addons without a runtime before anything reaches the wire", async () => {
  await withStub(
    () => ({ json: { id: "j-1" } }),
    async ({ client, stub }) => {
      /* Alone they are a 500 — `failed to fetch existing runtime for job` — so
       * the pairing is refused here rather than turned into a server error. */
      await assert.rejects(
        () => updateJob(client, "p-1", "j-1", { addonIdentifiers: ["spark332"] }),
        (err: unknown) => err instanceof CaiRequestError && /together with the runtime identifier/.test(err.message),
      );
      assert.equal(stub.requests.length, 0);
    },
  );
});

test("a request may not carry both a JSON body and a raw one", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ client, stub }) => {
      await assert.rejects(
        () =>
          client.raw("post", "/api/v2/projects/{project_id}/files", {
            path: { project_id: "p-1" },
            body: { a: 1 },
            rawBody: { contentType: "text/plain", bytes: new Uint8Array([1]) },
          }),
        (err: unknown) => err instanceof CaiRequestError && /either body or rawBody/.test(err.message),
      );
      assert.equal(stub.requests.length, 0);
    },
  );
});
