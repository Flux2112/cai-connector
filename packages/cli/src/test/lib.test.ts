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

import { CaiApiError, CaiRequestError, CaiTransportError } from "@defysoftware/cai-core";

import { parseEnvironment } from "../lib/env";
import { CaiCliError, EXIT, reportError } from "../lib/exit";
import { humanSize, table } from "../lib/output";
import { assertReadOnly } from "../lib/readonly";
import { joinWorkloads } from "../lib/workloads";

test("raw accepts GET in any case and refuses every other verb", () => {
  assert.equal(assertReadOnly("GET"), "get");
  assert.equal(assertReadOnly("get"), "get");
  assert.equal(assertReadOnly(" Get "), "get");

  for (const verb of ["POST", "PUT", "PATCH", "DELETE", "delete", "HEAD", ""]) {
    assert.throws(() => assertReadOnly(verb), /read-only/, `${verb} must be refused`);
  }
});

test("refusing a write verb reports a usage error, not an internal one", () => {
  try {
    assertReadOnly("DELETE");
    assert.fail("should have thrown");
  } catch (err) {
    assert.equal(reportError(err).code, EXIT.USAGE);
  }
});

test("an auth failure is distinguished from any other API failure", () => {
  const args = { method: "GET", url: "https://x/api", body: "{}" };
  for (const status of [401, 403]) {
    assert.equal(reportError(new CaiApiError({ ...args, status })).code, EXIT.AUTH);
  }
  for (const status of [400, 404, 409, 500]) {
    assert.equal(reportError(new CaiApiError({ ...args, status })).code, EXIT.API);
  }
});

test("no answer at all is a different exit code from a negative answer", () => {
  /* The whole point of core's two error types: a transport failure must never
   * be read as "the thing is not there". */
  assert.equal(reportError(new CaiTransportError("GET", "https://x", new Error("ECONNREFUSED"))).code, EXIT.TRANSPORT);
  assert.equal(
    reportError(new CaiApiError({ method: "GET", url: "https://x", body: "", status: 404 })).code,
    EXIT.API,
  );
});

test("a transport report names the system cause and how to fix the known ones", () => {
  /* "fetch failed" is the same sentence for a bad host name and an untrusted
   * certificate, and the fix for the second one is never obvious from it. */
  const untrusted = reportError(
    new CaiTransportError(
      "GET",
      "https://cml.example.com/api/v2/projects",
      Object.assign(new TypeError("fetch failed"), {
        cause: Object.assign(new Error("unable to verify"), { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" }),
      }),
    ),
  );
  assert.equal(untrusted.code, EXIT.TRANSPORT);
  assert.equal(untrusted.cause, "UNABLE_TO_VERIFY_LEAF_SIGNATURE");
  assert.match(String(untrusted.hint), /NODE_EXTRA_CA_CERTS/);
  assert.match(String(untrusted.hint), /intermediate/);

  /* An unrecognised cause is still reported; it just gets no advice. */
  const odd = reportError(
    new CaiTransportError("GET", "https://x", Object.assign(new Error("nope"), { code: "EWEIRD" })),
  );
  assert.equal(odd.cause, "EWEIRD");
  assert.equal(odd.hint, undefined);
});

test("an API error report carries the status, the API code and the body", () => {
  const report = reportError(
    new CaiApiError({ method: "GET", url: "https://x/api", status: 403, body: '{"code":7}', code: 7 }),
  );
  assert.equal(report.status, 403);
  assert.equal(report.apiCode, 7);
  assert.equal(report.body, '{"code":7}');
});

test("a pre-flight validation failure is its own exit code", () => {
  assert.equal(reportError(new CaiRequestError("missing path parameter")).code, EXIT.REQUEST);
});

test("a CLI error keeps the code it was raised with, anything else is internal", () => {
  assert.equal(reportError(new CaiCliError("no key", EXIT.CONFIG)).code, EXIT.CONFIG);
  assert.equal(reportError(new Error("boom")).code, EXIT.INTERNAL);
  assert.equal(reportError("a bare string").code, EXIT.INTERNAL);
  assert.equal(reportError("a bare string").error, "a bare string");
});

test("table pads columns to their content and never truncates", () => {
  const rows = [
    { id: "short", name: "a" },
    { id: "a-much-longer-identifier", name: "b" },
  ];
  const rendered = table(rows, [
    { header: "id", get: (r) => r.id },
    { header: "name", get: (r) => r.name },
  ]);
  const lines = rendered.split("\n");

  assert.equal(lines[0], "ID                        NAME");
  assert.match(lines[1], /^-+ +-+$/);
  /* An id an agent may pass back must survive intact. */
  assert.ok(lines[3].startsWith("a-much-longer-identifier"));
});

test("table renders absent and object values without crashing", () => {
  const rendered = table([{ a: undefined, b: { x: 1 } }], [
    { header: "a", get: (r) => r.a },
    { header: "b", get: (r) => r.b },
  ]);
  assert.match(rendered, /\{"x":1\}/);
});

test("an empty listing says so instead of printing a bare header", () => {
  assert.equal(table([], [{ header: "id", get: () => "" }]), "(none)");
});

test("humanSize copes with the API sending sizes as strings", () => {
  assert.equal(humanSize("61"), "61B");
  assert.equal(humanSize(2048), "2.0K");
  assert.equal(humanSize("1572864"), "1.5M");
  assert.equal(humanSize(undefined), "");
  assert.equal(humanSize("not a number"), "");
});

test("joinWorkloads folds the workload into each execution", () => {
  const rows = joinWorkloads({
    workloads: [
      { workload_crn: "crn:w1", workload_name: "nightly", workload_type: "job", project: { name: "analysis" } },
    ],
    executions: [
      { workload_crn: "crn:w1", status: "running", start_time: "2026-08-17T09:00:00Z", allocated_cpu_cores: 2 },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "nightly");
  assert.equal(rows[0].type, "job");
  assert.equal(rows[0].project, "analysis");
  assert.equal(rows[0].status, "running");
  assert.equal(rows[0].cpu, 2);
});

test("joinWorkloads keeps an execution whose workload is absent from the page", () => {
  /* Dropping it would hide a running workload, which is worse than a row with
   * blank columns. */
  const rows = joinWorkloads({
    workloads: [],
    executions: [{ workload_crn: "crn:orphan", status: "running" }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "running");
  assert.equal(rows[0].name, undefined);
  assert.equal(rows[0].workloadCrn, "crn:orphan");
});

test("joinWorkloads prefers the execution's run-as user over the workload creator", () => {
  const rows = joinWorkloads({
    workloads: [{ workload_crn: "c", creator_user_name: "author" }],
    executions: [{ workload_crn: "c", run_as_user_name: "runner" }],
  });
  assert.equal(rows[0].user, "runner");
});

test("parseEnvironment splits at the first = only", () => {
  assert.deepEqual(parseEnvironment(["A=1", "B=x=y", "C="]), { A: "1", B: "x=y", C: "" });
});

test("parseEnvironment leaves the field absent when nothing was passed", () => {
  assert.equal(parseEnvironment(undefined), undefined);
  assert.equal(parseEnvironment([]), undefined);
});

test("parseEnvironment refuses a pair with no name and a bare name alike", () => {
  for (const bad of ["OOPS", "=value", ""]) {
    assert.throws(
      () => parseEnvironment([bad]),
      (err: unknown) => err instanceof CaiCliError && err.code === EXIT.USAGE,
      `accepted ${JSON.stringify(bad)}`,
    );
  }
});
