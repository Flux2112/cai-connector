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

import { EXIT } from "../lib/exit";
import { parseReport, runCommand, startStub, type StubReply, type StubRequest } from "./stub";

const KEY = "test-key-0123456789";

const PROJECT = {
  id: "p-1",
  name: "analysis",
  slug: "analysis",
  owner: { username: "hanke" },
  visibility: "private",
};

async function withStub(
  reply: (req: StubRequest) => StubReply,
  run: (ctx: { url: string; requests: StubRequest[] }) => Promise<void>,
): Promise<void> {
  const stub = await startStub(reply);
  try {
    await run({ url: stub.url, requests: stub.requests });
  } finally {
    await stub.close();
  }
}

function creds(url: string): string[] {
  return ["--url", url, "--api-key", KEY];
}

/** A local file to upload, in a directory of its own. */
function scratchFile(name: string, contents: string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cai-put-")), name);
  fs.writeFileSync(file, contents);
  return file;
}

/**
 * Answer the three shapes `files put` asks for: the project lookup, the listing
 * of the destination directory, and the upload itself.
 *
 * The listing changes after the upload, the way the instance's does: an occupied
 * destination is not replaced, it gains a numbered neighbour.
 */
function filesStub(existing: string[]): (req: StubRequest) => StubReply {
  const files = [...existing];
  return (req) => {
    if (req.url.endsWith("/files") && req.method === "POST") {
      const requested = /name="([^"]+)"/.exec(req.body)?.[1] ?? "";
      const base = requested.slice(requested.lastIndexOf("/") + 1);
      files.push(files.includes(base) ? numbered(base) : base);
      return { json: {} };
    }
    if (req.url.includes("/files/")) {
      return { json: { files: files.map((name) => ({ path: name, is_dir: false, file_size: "1" })) } };
    }
    return { json: PROJECT };
  };
}

/** `notes.txt` -> `notes(1).txt`, as the instance names a duplicate. */
function numbered(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? `${name}(1)` : `${name.slice(0, dot)}(1)${name.slice(dot)}`;
}

test("files put uploads a file that is not there yet", async () => {
  const local = scratchFile("train.py", "print(1)\n");
  await withStub(filesStub(["README.md"]), async ({ url, requests }) => {
    const result = await runCommand(["files", "put", "p-1", local, "src/train.py", ...creds(url)]);

    assert.equal(result.exitCode, 0);
    const emitted = JSON.parse(result.stdout);
    assert.equal(emitted.path, "src/train.py");
    assert.equal(emitted.stored, "src/train.py");

    const upload = requests[requests.length - 1];
    assert.equal(upload.method, "POST");
    assert.equal(upload.url, "/api/v2/projects/p-1/files");
    /* The API takes the destination as the multipart field name, which is the
     * one part of this that no type can check. */
    assert.match(upload.body, /name="src\/train\.py"/);
  });
});

test("files put refuses an occupied destination without --force", async () => {
  const local = scratchFile("train.py", "print(1)\n");
  await withStub(filesStub(["train.py"]), async ({ url, requests }) => {
    const result = await runCommand(["files", "put", "p-1", local, ...creds(url)]);

    assert.equal(result.exitCode, EXIT.USAGE);
    assert.match(parseReport(result.stderr).error, /cannot replace it/);
    assert.ok(
      !requests.some((r) => r.method === "POST" && r.url.endsWith("/files")),
      "no upload may be attempted",
    );
  });
});

test("files put --force reports the numbered name the instance actually created", async () => {
  const local = scratchFile("train.py", "print(1)\n");
  await withStub(filesStub(["train.py"]), async ({ url }) => {
    const result = await runCommand(["files", "put", "p-1", local, "--force", ...creds(url)]);
    assert.equal(result.exitCode, 0);
    const emitted = JSON.parse(result.stdout);
    /* Verified live: the upload does not replace, so saying it did would be a
     * lie an agent would then act on. */
    assert.equal(emitted.path, "train.py");
    assert.equal(emitted.stored, "train(1).py");
  });
});

test("files put refuses a destination outside the project before anything leaves", async () => {
  const local = scratchFile("train.py", "print(1)\n");
  await withStub(filesStub([]), async ({ url, requests }) => {
    const result = await runCommand(["files", "put", "p-1", local, "../escape.py", ...creds(url)]);
    assert.equal(result.exitCode, EXIT.REQUEST);
    assert.match(parseReport(result.stderr).error, /may not contain/);
    assert.equal(requests.length, 0, "nothing may reach the wire");
  });
});

test("files put reports a missing local file as a usage error", async () => {
  await withStub(filesStub([]), async ({ url, requests }) => {
    const result = await runCommand(["files", "put", "p-1", "no-such-file.txt", ...creds(url)]);
    assert.equal(result.exitCode, EXIT.USAGE);
    assert.match(parseReport(result.stderr).error, /not a readable file/);
    assert.equal(requests.length, 0);
  });
});

test("jobs run starts a run and prints it", async () => {
  await withStub(
    (req) => (req.url.endsWith("/runs") ? { json: { id: "r-1", status: "ENGINE_SCHEDULING" } } : { json: PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand(["jobs", "run", "p-1", "j-1", ...creds(url), "--arguments", "--epochs 3"]);
      assert.equal(result.exitCode, 0);
      assert.equal(JSON.parse(result.stdout).id, "r-1");

      const created = requests[requests.length - 1];
      assert.equal(created.url, "/api/v2/projects/p-1/jobs/j-1/runs");
      assert.equal(JSON.parse(created.body).arguments, "--epochs 3");
    },
  );
});

test("jobs run rejects a malformed --env without starting anything", async () => {
  await withStub(
    () => ({ json: PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand(["jobs", "run", "p-1", "j-1", "--env", "OOPS", ...creds(url)]);
      assert.equal(result.exitCode, EXIT.USAGE);
      assert.match(parseReport(result.stderr).error, /NAME=value/);
      assert.equal(requests.length, 0, "a job must not be started before its arguments parse");
    },
  );
});

test("jobs run --wait exits 0 when the run succeeds", async () => {
  await withStub(
    (req) => {
      if (req.url.endsWith("/runs") && req.method === "POST") {
        return { json: { id: "r-1", status: "ENGINE_SCHEDULING" } };
      }
      if (req.url.includes("/runs/r-1")) {
        return { json: { id: "r-1", status: "ENGINE_SUCCEEDED" } };
      }
      return { json: PROJECT };
    },
    async ({ url }) => {
      const result = await runCommand(["jobs", "run", "p-1", "j-1", "--wait", "--interval", "1", ...creds(url)]);
      assert.equal(result.exitCode, 0);
      assert.equal(JSON.parse(result.stdout).status, "ENGINE_SUCCEEDED");
    },
  );
});

test("jobs run --wait exits WORKLOAD on a failed run, still printing it", async () => {
  await withStub(
    (req) => {
      if (req.url.endsWith("/runs") && req.method === "POST") {
        return { json: { id: "r-1", status: "ENGINE_SCHEDULING" } };
      }
      if (req.url.includes("/runs/r-1")) {
        return { json: { id: "r-1", status: "ENGINE_FAILED" } };
      }
      return { json: PROJECT };
    },
    async ({ url }) => {
      const result = await runCommand(["jobs", "run", "p-1", "j-1", "--wait", "--interval", "1", ...creds(url)]);
      /* The call worked; the workload failed. A caller that read this as a
       * request failure and retried would start the job a second time. */
      assert.equal(result.exitCode, EXIT.WORKLOAD);
      assert.equal(JSON.parse(result.stdout).status, "ENGINE_FAILED");
      assert.equal(parseReport(result.stderr).code, EXIT.WORKLOAD);
    },
  );
});

test("runs stop names one run and uses the custom method", async () => {
  await withStub(
    (req) => (req.url.includes(":stop") ? { json: { id: "r-1", status: "ENGINE_STOPPING" } } : { json: PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand(["runs", "stop", "p-1", "j-1", "r-1", ...creds(url)]);
      assert.equal(result.exitCode, 0);
      assert.equal(JSON.parse(result.stdout).status, "ENGINE_STOPPING");
      assert.equal(requests[1].method, "POST");
      assert.equal(requests[1].url, "/api/v2/projects/p-1/jobs/j-1/runs/r-1:stop");
    },
  );
});

test("apps list renders the columns a human needs", async () => {
  await withStub(
    (req) =>
      req.url.includes("/applications")
        ? { json: { applications: [{ id: "a-1", name: "dash", status: "APPLICATION_RUNNING", subdomain: "dash" }] } }
        : { json: PROJECT },
    async ({ url }) => {
      const result = await runCommand(["apps", "list", "p-1", ...creds(url), "--table"]);
      assert.match(result.stdout, /^ID/m);
      assert.match(result.stdout, /a-1 +dash +APPLICATION_RUNNING/);
    },
  );
});

test("apps restart and apps stop address the two custom methods", async () => {
  for (const [verb, suffix] of [
    ["restart", ":restart"],
    ["stop", ":stop"],
  ]) {
    await withStub(
      (req) => (req.url.includes(suffix) ? { json: { id: "a-1", status: "APPLICATION_STARTING" } } : { json: PROJECT }),
      async ({ url, requests }) => {
        const result = await runCommand(["apps", verb, "p-1", "a-1", ...creds(url)]);
        assert.equal(result.exitCode, 0);
        assert.equal(requests[1].method, "POST");
        assert.equal(requests[1].url, `/api/v2/projects/p-1/applications/a-1${suffix}`);
      },
    );
  }
});

test("there is no command that deletes an application", async () => {
  /* The safe-writes rule is enforced by the command surface, so its test is that
   * the surface has no such verb — not that some check refuses one. */
  const result = await runCommand(["apps", "delete", "p-1", "a-1"]);
  assert.notEqual(result.exitCode, 0);
  assert.match(result.stderr, /not found/i);
});
