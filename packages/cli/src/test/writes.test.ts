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

/* A project's engine type decides which of the two engine fields is legal, so the
 * fixture has to say which kind it is. */
const RUNTIME_PROJECT = { ...PROJECT, default_engine_type: "ml_runtime" };

test("jobs create posts the job definition it was given", async () => {
  await withStub(
    (req) => (req.method === "POST" ? { json: { id: "j-9", name: "Nightly", type: "cron" } } : { json: RUNTIME_PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand([
        "jobs", "create", "p-1",
        "--name", "Nightly",
        "--script", "src/daily.py",
        "--runtime", "docker.repo/cloudera/runtime:2026.04.1-b7",
        "--schedule", "0 3 * * *",
        "--timezone", "Europe/Vienna",
        "--arguments", "--table foo",
        "--env", "RUN_MODE=full",
        "--cpu", "0,5",
        "--memory", "2",
        ...creds(url),
      ]);
      assert.equal(result.exitCode, 0);
      assert.equal(JSON.parse(result.stdout).id, "j-9");

      const created = requests[requests.length - 1];
      assert.equal(created.method, "POST");
      assert.equal(created.url, "/api/v2/projects/p-1/jobs");
      const body = JSON.parse(created.body);
      assert.equal(body.name, "Nightly");
      assert.equal(body.script, "src/daily.py");
      assert.equal(body.runtime_identifier, "docker.repo/cloudera/runtime:2026.04.1-b7");
      assert.equal(body.schedule, "0 3 * * *");
      assert.equal(body.timezone, "Europe/Vienna");
      assert.equal(body.arguments, "--table foo");
      assert.deepEqual(body.environment, { RUN_MODE: "full" });
      /* A comma decimal is accepted, as everywhere else in this CLI. */
      assert.equal(body.cpu, 0.5);
      assert.equal(body.memory, 2);
      assert.equal(body.kernel, undefined);
    },
  );
});

test("jobs create resolves runtime terms to exactly one identifier", async () => {
  await withStub(
    (req) => {
      if (req.method === "POST") return { json: { id: "j-9" } };
      if (req.url.startsWith("/api/v2/runtimes")) {
        return {
          json: {
            runtimes: [
              { image_identifier: "repo/ml-runtime-workbench-python3.12-standard:2026.04.1-b7", editor: "Workbench" },
              { image_identifier: "repo/ml-runtime-jupyterlab-python3.11-standard:2026.04.1-b7", editor: "JupyterLab" },
            ],
          },
        };
      }
      return { json: RUNTIME_PROJECT };
    },
    async ({ url, requests }) => {
      const result = await runCommand([
        "jobs", "create", "p-1", "--name", "N", "--script", "s.py",
        "--runtime", "jupyterlab python3.11", ...creds(url),
      ]);
      assert.equal(result.exitCode, 0);
      const body = JSON.parse(requests[requests.length - 1].body);
      assert.equal(body.runtime_identifier, "repo/ml-runtime-jupyterlab-python3.11-standard:2026.04.1-b7");
    },
  );
});

test("jobs create refuses ambiguous runtime terms rather than picking one", async () => {
  await withStub(
    (req) =>
      req.url.startsWith("/api/v2/runtimes")
        ? { json: { runtimes: [{ image_identifier: "repo/a-python3.12:1" }, { image_identifier: "repo/b-python3.12:1" }] } }
        : { json: RUNTIME_PROJECT },
    async ({ url, requests }) => {
      const result = await runCommand([
        "jobs", "create", "p-1", "--name", "N", "--script", "s.py", "--runtime", "python3.12", ...creds(url),
      ]);
      assert.equal(result.exitCode, EXIT.USAGE);
      assert.match(parseReport(result.stderr).error, /matches 2 runtimes/);
      assert.ok(
        requests.every((r) => r.method !== "POST"),
        "an ambiguous runtime must not create a job",
      );
    },
  );
});

test("jobs create requires the engine field the project actually uses", async () => {
  await withStub(
    () => ({ json: RUNTIME_PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand(["jobs", "create", "p-1", "--name", "N", "--script", "s.py", ...creds(url)]);
      assert.equal(result.exitCode, EXIT.USAGE);
      assert.match(parseReport(result.stderr).error, /ML Runtimes project, so --runtime is required/);
      assert.ok(requests.every((r) => r.method !== "POST"));
    },
  );
});

test("jobs create rejects contradictory or meaningless flags before any request", async () => {
  await withStub(
    () => ({ json: RUNTIME_PROJECT }),
    async ({ url, requests }) => {
      const both = await runCommand([
        "jobs", "create", "p-1", "--name", "N", "--script", "s.py",
        "--runtime", "repo/x:1", "--kernel", "python3", ...creds(url),
      ]);
      assert.equal(both.exitCode, EXIT.USAGE);
      assert.match(parseReport(both.stderr).error, /alternatives/);

      const tz = await runCommand([
        "jobs", "create", "p-1", "--name", "N", "--script", "s.py",
        "--runtime", "repo/x:1", "--timezone", "Europe/Vienna", ...creds(url),
      ]);
      assert.equal(tz.exitCode, EXIT.USAGE);
      assert.match(parseReport(tz.stderr).error, /only means anything with --schedule/);

      assert.equal(requests.length, 0, "nothing may be resolved before the flags make sense");
    },
  );
});

/* The API's timezone default is America/Los_Angeles, so a cron schedule without
 * one runs at a time nobody asked for. Warned about, not silently substituted. */
test("jobs create warns when a schedule has no timezone", async () => {
  await withStub(
    (req) => (req.method === "POST" ? { json: { id: "j-9" } } : { json: RUNTIME_PROJECT }),
    async ({ url, requests }) => {
      const result = await runCommand([
        "jobs", "create", "p-1", "--name", "N", "--script", "s.py",
        "--runtime", "repo/x:1", "--schedule", "0 3 * * *", ...creds(url),
      ]);
      assert.equal(result.exitCode, 0);
      assert.match(result.stderr, /America\/Los_Angeles/);
      assert.equal(JSON.parse(requests[requests.length - 1].body).timezone, undefined);
    },
  );
});

/* The job `jobs update` reads back when it has to settle the runtime/addon
 * pair, and the shape its own answer takes. */
const RUNTIME_JOB = {
  id: "j-1",
  name: "Nightly",
  script: "src/daily.py",
  type: "cron",
  schedule: "0 3 * * *",
  runtime_identifier: "repo/ml-runtime-workbench-python3.12-standard:2026.04.1-b7",
  runtime_addon_identifiers: ["hadoop-cli-7.1.9", "spark332"],
  environment: "",
};

function jobStub(patched: Record<string, unknown> = {}): (req: StubRequest) => StubReply {
  return (req) => {
    if (req.method === "PATCH") {
      return { json: { ...RUNTIME_JOB, ...JSON.parse(req.body || "{}"), ...patched } };
    }
    if (req.url.includes("/jobs/")) {
      return { json: RUNTIME_JOB };
    }
    return { json: RUNTIME_PROJECT };
  };
}

test("jobs update patches only the fields it was given", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const result = await runCommand([
      "jobs", "update", "p-1", "j-1",
      "--name", "Renamed",
      "--schedule", "0 4 * * *",
      "--env", "RUN_MODE=full",
      ...creds(url),
    ]);
    assert.equal(result.exitCode, 0);

    const patch = requests[requests.length - 1];
    assert.equal(patch.method, "PATCH");
    assert.equal(patch.url, "/api/v2/projects/p-1/jobs/j-1");
    assert.deepEqual(JSON.parse(patch.body), {
      name: "Renamed",
      schedule: "0 4 * * *",
      environment: '{"RUN_MODE":"full"}',
    });
  });
});

test("jobs update refuses an empty update rather than bumping the job's timestamp", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const result = await runCommand(["jobs", "update", "p-1", "j-1", ...creds(url)]);
    assert.equal(result.exitCode, EXIT.USAGE);
    assert.match(parseReport(result.stderr).error, /nothing to update/);
    assert.equal(requests.length, 0, "an empty update must not reach the wire");
  });
});

/* Both fields come back unchanged on a 200, so a flag that forwarded them would
 * report a change that did not happen. */
test("jobs update refuses the two fields the API silently ignores", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const tz = await runCommand(["jobs", "update", "p-1", "j-1", "--timezone", "Europe/Vienna", ...creds(url)]);
    assert.equal(tz.exitCode, EXIT.USAGE);
    assert.match(parseReport(tz.stderr).error, /ignores a timezone on update/);

    const paused = await runCommand(["jobs", "update", "p-1", "j-1", "--no-paused", ...creds(url)]);
    assert.equal(paused.exitCode, EXIT.USAGE);
    assert.match(parseReport(paused.stderr).error, /no pause operation/);

    assert.equal(requests.length, 0);
  });
});

test("jobs update sends addons with the job's current runtime, which the API demands", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const result = await runCommand(["jobs", "update", "p-1", "j-1", "--addon", "spark332", ...creds(url)]);
    assert.equal(result.exitCode, 0);

    const body = JSON.parse(requests[requests.length - 1].body);
    /* Addons alone are a 500, so the job is read first to supply the other half. */
    assert.equal(body.runtime_identifier, RUNTIME_JOB.runtime_identifier);
    assert.deepEqual(body.runtime_addon_identifiers, ["spark332"]);
  });
});

test("jobs update carries the current addons over a runtime change, and says so", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const result = await runCommand([
      "jobs", "update", "p-1", "j-1", "--runtime", "repo/other-runtime:1", ...creds(url),
    ]);
    assert.equal(result.exitCode, 0);
    /* A runtime sent on its own resets the addons to the API's defaults, which
     * is silent data loss unless they are re-sent. */
    assert.deepEqual(
      JSON.parse(requests[requests.length - 1].body).runtime_addon_identifiers,
      RUNTIME_JOB.runtime_addon_identifiers,
    );
    assert.match(result.stderr, /carrying the job's current addons over/);
  });
});

test("jobs update --manual clears the schedule", async () => {
  await withStub(jobStub(), async ({ url, requests }) => {
    const result = await runCommand(["jobs", "update", "p-1", "j-1", "--manual", ...creds(url)]);
    assert.equal(result.exitCode, 0);
    assert.equal(JSON.parse(requests[requests.length - 1].body).schedule, "");
  });
});

/* The instance answers 200 for fields it then ignores, so the command checks the
 * job it got back instead of trusting the status code. */
test("jobs update warns when the instance did not apply what was asked", async () => {
  await withStub(jobStub({ name: "Nightly" }), async ({ url }) => {
    const result = await runCommand(["jobs", "update", "p-1", "j-1", "--name", "Renamed", ...creds(url)]);
    assert.equal(result.exitCode, 0);
    assert.match(result.stderr, /did not apply: --name/);
  });
});

test("there is no command that deletes a job", async () => {
  const result = await runCommand(["jobs", "delete", "p-1", "j-1"]);
  assert.notEqual(result.exitCode, 0);
  assert.doesNotMatch(result.stdout, /deleted/i);
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
