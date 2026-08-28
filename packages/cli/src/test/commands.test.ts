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

/** The flags every command needs to reach the stub instead of a real instance. */
function creds(url: string): string[] {
  return ["--url", url, "--api-key", KEY];
}

test("whoami prints JSON on stdout by default", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE", message: "ok" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url)]);
      assert.equal(result.exitCode, 0);
      assert.deepEqual(JSON.parse(result.stdout), { valid: true, username: "HANKE", message: "ok" });
    },
  );
});

test("--table renders a table instead of JSON", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE", message: "ok" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url), "--table"]);
      assert.match(result.stdout, /^USERNAME/m);
      assert.match(result.stdout, /HANKE/);
      assert.doesNotMatch(result.stdout, /^\{/, "table mode must not also print JSON");
    },
  );
});

test("the key never reaches stdout or stderr", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE" } }),
    async ({ url }) => {
      /* The property that matters for an agent piping either stream into a log:
       * core redacts it, and nothing here re-prints it. */
      const result = await runCommand(["whoami", ...creds(url)]);
      assert.doesNotMatch(result.stdout, new RegExp(KEY));
      assert.doesNotMatch(result.stderr, new RegExp(KEY));
    },
  );
});

test("the key does reach the wire, as a bearer header", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE" } }),
    async ({ url, requests }) => {
      await runCommand(["whoami", ...creds(url)]);
      assert.equal(requests[0].authorization, `Bearer ${KEY}`);
    },
  );
});

test("the key is resolved from the environment when no flag is given", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami"], { CML_API_KEY: KEY, CAI_URL: url });
      assert.equal(JSON.parse(result.stdout).username, "HANKE");
      assert.doesNotMatch(result.stderr, /argv/, "no warning when the key came from the environment");
    },
  );
});

test("--verbose logs to stderr so stdout stays parseable, with the key redacted", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url), "--verbose"]);
      assert.doesNotThrow(() => JSON.parse(result.stdout), "stdout must still be pure JSON");
      assert.match(result.stderr, /POST .*validate_key -> 200/);
      assert.doesNotMatch(result.stderr, new RegExp(KEY));
    },
  );
});

test("--api-key warns that argv is readable by other processes", async () => {
  await withStub(
    () => ({ json: { valid: true, username: "HANKE" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url)]);
      assert.match(result.stderr, /argv/);
    },
  );
});

test("projects get accepts owner/name and resolves it to one project", async () => {
  await withStub(
    () => ({ json: { projects: [PROJECT] } }),
    async ({ url, requests }) => {
      const result = await runCommand(["projects", "get", "hanke/analysis", ...creds(url)]);
      assert.equal(JSON.parse(result.stdout).id, "p-1");
      assert.match(requests[0].url, /search_filter/);
    },
  );
});

test("projects get treats a reference without a slash as an id", async () => {
  await withStub(
    () => ({ json: PROJECT }),
    async ({ url, requests }) => {
      await runCommand(["projects", "get", "p-1", ...creds(url)]);
      assert.equal(requests[0].url, "/api/v2/projects/p-1");
    },
  );
});

test("an ambiguous project reference fails loudly rather than picking one", async () => {
  await withStub(
    () => ({
      json: {
        projects: [PROJECT, { ...PROJECT, id: "p-2", slug: "analysis" }],
      },
    }),
    async ({ url }) => {
      const result = await runCommand(["projects", "get", "hanke/analysis", ...creds(url)]);
      /* Also the regression guard for a crash worth remembering: a client-side
       * failure *after* a successful request used to abort the process with a
       * libuv assertion and exit 127, losing the exit code entirely. See the
       * note in BaseCommand.catch. */
      assert.equal(result.exitCode, EXIT.REQUEST);
      assert.match(parseReport(result.stderr).error, /matched 2 projects/);
    },
  );
});

test("files ls asks for the project root when given no path", async () => {
  await withStub(
    (req) =>
      req.url.includes("/files/")
        ? { json: { files: [{ path: "README.md", is_dir: false, file_size: "12" }] } }
        : { json: PROJECT },
    async ({ url, requests }) => {
      const result = await runCommand(["files", "ls", "p-1", ...creds(url), "--table"]);
      assert.equal(requests[1].url, "/api/v2/projects/p-1/files/");
      assert.match(result.stdout, /README\.md +file +12B/);
    },
  );
});

test("files get writes bytes verbatim to a file and reports what it wrote", async () => {
  const os = await import("node:os");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const target = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cai-get-")), "out.bin");
  const payload = new Uint8Array([0x00, 0xff, 0xfe, 0x41]);

  await withStub(
    (req) => (req.url.includes(":download") ? { bytes: payload } : { json: PROJECT }),
    async ({ url }) => {
      const result = await runCommand(["files", "get", "p-1", "a.bin", "-o", target, ...creds(url)]);
      assert.deepEqual(Array.from(fs.readFileSync(target)), Array.from(payload));
      assert.equal(JSON.parse(result.stdout).bytes, 4);
    },
  );
});

test("raw refuses a write verb before any request leaves", async () => {
  await withStub(
    () => ({ json: {} }),
    async ({ url, requests }) => {
      const result = await runCommand(["raw", "/api/v2/projects", "--method", "DELETE", ...creds(url)]);
      assert.equal(result.exitCode, EXIT.USAGE);
      assert.match(parseReport(result.stderr).error, /read-only/);
      assert.equal(requests.length, 0, "nothing may reach the wire");
    },
  );
});

test("raw passes a query string through untouched", async () => {
  await withStub(
    () => ({ json: { projects: [] } }),
    async ({ url, requests }) => {
      await runCommand(["raw", "/api/v2/projects?page_size=1", ...creds(url)]);
      assert.equal(requests[0].url, "/api/v2/projects?page_size=1");
      assert.equal(requests[0].method, "GET");
    },
  );
});

test("an API failure is reported as JSON on stderr with a stable exit code", async () => {
  await withStub(
    () => ({ status: 403, json: { message: "forbidden", code: 7 } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url)]);
      assert.equal(result.exitCode, EXIT.AUTH);
      const report = parseReport(result.stderr);
      assert.equal(report.status, 403);
      assert.equal(report.code, EXIT.AUTH);
      assert.equal(result.stdout, "", "nothing on stdout when the command failed");
    },
  );
});

test("missing credentials are a config error, distinct from an auth failure", async () => {
  const result = await runCommand(["whoami", "--url", "https://unused.example"]);
  assert.equal(result.exitCode, EXIT.CONFIG);
  assert.match(parseReport(result.stderr).error, /API key/);
});

test("--limit stops paging even when the server offers another page", async () => {
  await withStub(
    () => ({ json: { projects: [PROJECT, { ...PROJECT, id: "p-2" }], next_page_token: "more" } }),
    async ({ url, requests }) => {
      const result = await runCommand(["projects", "list", ...creds(url), "--limit", "2"]);
      assert.equal(JSON.parse(result.stdout).length, 2);
      assert.equal(requests.length, 1);
    },
  );
});

test("a command brings the bundled skill up to date on its way out", async () => {
  /* The mechanism, not the postinstall: npm 12 blocks lifecycle scripts unless
   * the package is allow-listed, so an upgrade that relied on one would leave
   * the skill describing a CLI that no longer behaves that way. */
  const skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), "cai-cli-skills-"));
  await withStub(
    () => ({ json: { valid: true, username: "HANKE", message: "ok" } }),
    async ({ url }) => {
      const result = await runCommand(["whoami", ...creds(url)], {
        CAI_SKIP_SKILLS: "",
        CAI_SKILLS_DIR: skillsDir,
      });

      assert.equal(result.exitCode, 0);
      assert.ok(fs.existsSync(path.join(skillsDir, "cai", "SKILL.md")), "the skill must install itself");
      /* Everything it has to say goes to stderr: stdout is still only the answer. */
      assert.deepEqual(JSON.parse(result.stdout), { valid: true, username: "HANKE", message: "ok" });
      assert.match(result.stderr, /installed the cai skill/);
    },
  );
});

/* The blob CML injects into every project, credentials and all. `PYTHONPATH` is
 * in it because a real investigation turned on reading that value. */
const SECRET = "s3cret-service-account";
const JOB = {
  id: "j-1",
  name: "etl",
  script: "etl.py",
  environment: JSON.stringify({ CML_USER: "hanke", CML_USER_PW: SECRET, PYTHONPATH: "/opt/py4j" }),
};

/** Every command that can surface an environment, driven off the same stub. */
async function withJob(argv: string[], run: (result: { stdout: string; stderr: string }) => void): Promise<void> {
  await withStub(
    (req) => ({ json: req.url.includes("/jobs") ? JOB : PROJECT }),
    async ({ url }) => run(await runCommand([...argv, ...creds(url)])),
  );
}

test("jobs get hides the environment and names the flag that shows it", async () => {
  await withJob(["jobs", "get", "p-1", "j-1"], (result) => {
    const job = JSON.parse(result.stdout);
    assert.equal(job.environment, "3 vars hidden — pass --show-env");
    assert.equal(job.script, "etl.py", "the rest of the job is untouched");
    assert.doesNotMatch(result.stdout + result.stderr, new RegExp(SECRET));
  });
});

test("--json is not the way around the redaction", async () => {
  /* The agent path is the one with the widest blast radius, so it must not be
   * the raw one. */
  await withJob(["jobs", "get", "p-1", "j-1", "--json"], (result) => {
    assert.equal(JSON.parse(result.stdout).environment, "3 vars hidden — pass --show-env");
    assert.doesNotMatch(result.stdout, new RegExp(SECRET));
  });
});

test("--show-env keeps the ordinary values readable and masks the credential", async () => {
  await withJob(["jobs", "get", "p-1", "j-1", "--show-env"], (result) => {
    assert.deepEqual(JSON.parse(JSON.parse(result.stdout).environment), {
      CML_USER: "hanke",
      CML_USER_PW: "***",
      PYTHONPATH: "/opt/py4j",
    });
    assert.doesNotMatch(result.stdout, new RegExp(SECRET));
  });
});

test("--reveal prints the values and says out loud that it did", async () => {
  await withJob(["jobs", "get", "p-1", "j-1", "--reveal"], (result) => {
    assert.match(JSON.parse(result.stdout).environment, new RegExp(SECRET));
    assert.match(result.stderr, /--reveal/, "revealing a secret must never be quiet");
  });
});

test("the redaction reaches a listing and the raw escape hatch too", async () => {
  await withStub(
    (req) => ({ json: req.url.includes("/jobs") ? { jobs: [JOB] } : PROJECT }),
    async ({ url }) => {
      const listed = await runCommand(["jobs", "list", "p-1", ...creds(url)]);
      assert.doesNotMatch(listed.stdout, new RegExp(SECRET));

      const raw = await runCommand(["raw", "/api/v2/projects/p-1/jobs", ...creds(url)]);
      assert.doesNotMatch(raw.stdout, new RegExp(SECRET), "raw must not be the bypass either");
    },
  );
});
