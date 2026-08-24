---
name: cai
description: Work with Cloudera AI (CML) from the command line — projects, files, jobs, runs, applications, and SSH endpoint sessions. Use when the task involves a CML instance, a CML project, running a CML job, or getting a shell on a CML session — or when asked how something is done against the CML API v2, since the instance serves its own Swagger document.
---

# Cloudera AI from the command line

`cai` is an agent-first CLI for the Cloudera AI (CML) API v2. **JSON on stdout by
default**, errors as JSON on stderr, and exit codes you can branch on — so parse
stdout, and never parse prose.

```bash
cai whoami                       # is the credential good, and whose is it
cai projects list                # everything the key can see
cai files ls  <project> [path]   # names relative to the directory listed
cai files get <project> <path> -o out.bin
cai jobs list <project>
cai runs list <project> <job>
cai apps list <project>
```

`<project>` is `owner/name` or an opaque project id. Case does not matter:
`hanke/dse` finds the project CML displays as `HANKE`/`DSE`.

## Credentials

One API key does everything, resolved in this order: `--api-key` (avoid — argv is
readable by every process), `$CML_API_KEY`, then what `cai login` stored. The
instance URL comes from `--url`, `$CAI_URL`, or the same file.

If TLS fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, the instance is serving only
its leaf certificate. Point `NODE_EXTRA_CA_CERTS` at a PEM holding the issuing
intermediate as well as the root; Node will not fetch it the way a browser does, and
a root-only PEM is not enough. Exit 6 reports the system `cause` and, where the fix
is standard, a `hint` — read those two fields before theorising, because every
transport failure otherwise reads as `TypeError: fetch failed`.

## Exit codes

| Code | Meaning | What to do |
|---|---|---|
| 0 | success | carry on |
| 2 | bad flags or arguments | fix the call |
| 3 | no URL or no API key resolved | `cai login` |
| 4 | credential rejected (401/403) | get a new key; do not retry |
| 5 | the instance answered with a failure | read `body` in the report |
| 6 | **no answer at all** — DNS, TLS, timeout | retryable; the state is unknown |
| 8 | the call worked, the **workload** did not | do **not** retry blindly |

5 versus 6 matters: no answer is not a negative answer, so a failed listing must
never be read as "the thing is gone".

## Writes: safe ones only

There is no delete anywhere in this CLI, and `cai raw` accepts only GET. What
exists: `files put`, `jobs run`, `runs stop`, `apps restart|stop`.

```bash
cai jobs run <project> <job> --wait --timeout 900   # exit 8 if the run failed
cai jobs run <project> <job> --arguments "A B C" --env RUN_MODE=full --env DAY=2026-08-19
cai runs stop <project> <job> <run>
cai files put <project> ./local.py src/local.py
```

**`arguments` and `environment` are different things, and the API models them
differently.** `arguments` is ONE string, appended to the job's script invocation,
so the script reads it as argv (`sys.argv[1:]` in Python) — there is no list form
and no per-argument flag, so `--arguments "A B C"` passes three arguments while
`--arguments "A,B,C"` passes one. `--env` is repeatable `NAME=value` and becomes a
JSON object. Both are per-run overrides: neither changes the job, and what the job
defines stays in place for runs that do not override it. The created run echoes
both back, so read `arguments` off it to confirm what it actually got.

**`files put` cannot replace a file.** The API has no overwrite: uploading onto an
occupied path keeps the old file and stores yours as `name(1).ext`, answering 200
without saying which name it chose. So an occupied destination is refused, and
with `--force` the result's `stored` field is the name that was really created —
read it, do not assume. To reuse the original name, delete the old file from the
CML UI or a session first.

`jobs run --wait` prints the run either way, so the id is always available. Exit 8
means the run failed, was stopped, or was still going when the wait expired — the
job did start, so retrying starts it a second time.

## Answering "how do I do X against the API?"

The instance serves its own OpenAPI (Swagger 2.0) document, and that is the source
of truth — 118 paths on the instance this was written against, including
operations this CLI deliberately does not wrap:

```bash
curl -s "$CAI_URL/api/v2/swagger.json"        # the spec needs no credential
cai raw /api/v2/swagger.json                  # same document, through the CLI
```

Read it rather than recalling it: `paths` gives the URL and method, `operationId`
the name Cloudera's own documentation uses, and `definitions.<Name>` the request
and response bodies. A request this CLI cannot make is still one you can describe
from the spec — but say which it is, because inventing a `cai` command that does
not exist is worse than a curl example that does.

Every call is `Authorization: Bearer $CML_API_KEY` with `Content-Type:
application/json`. Paths take the opaque `project_id` and `job_id`, never names,
so resolving names to ids is the first step of any answer.

### Worked example: trigger a job with arguments

`cai projects get <project>` gives `id`; `cai jobs list <project>` gives each
job's `id`, `script` and current `arguments`. Then either:

```bash
cai jobs run hanke/analysis 8f2q-abcd-... --arguments "A B C" --wait
```

or the same call directly, which is `CreateJobRun`:

```http
POST /api/v2/projects/{project_id}/jobs/{job_id}/runs
Authorization: Bearer $CML_API_KEY
Content-Type: application/json

{"arguments": "A B C", "environment": {"RUN_MODE": "full"}}
```

The 200 body is a `JobRun` carrying `id` and `status`. Poll `GetJobRun`
(`GET .../runs/{run_id}`) until the status leaves the running states, or let
`--wait` do it. Stop one with `POST .../runs/{run_id}:stop` — the `:stop` suffix is
a custom method, not a path segment, and it is easy to mistake for one.

**Creating the job is a separate matter from running it.** `CreateJob` is in the
spec, but a job needs its script in the project first, and its schedule, runtime,
resources and default arguments are part of the job definition. Set it up in the
CML UI (or with `CreateJob` if it has to be scripted), then treat `arguments` here
as the per-run override.

## Sessions (Windows only)

API v2 has no session endpoints at all, so these drive `cdswctl.exe` and are
Windows-only. They share `session_history.json` with the CAI Connector VS Code
extension, which means sessions appear in its sidebar and neither side kills the
other's tunnel.

```bash
cai session runtimes "workbench python3.11"   # the numeric ids --runtime takes
cai session create <project> --runtime 281 --cpus 1 --memory 4
cai session list --live
cai session kill <alias>
```

`session create` leaves the tunnel running after the command exits and prints the
host alias; connect with `ssh <alias>`, or open the printed
`vscode-remote://ssh-remote+<alias>/home/cdsw` URI. `session kill` is the way to
end one — always named explicitly, because several sessions run in parallel and
there is no flag that stops them all.

If `session create` exits 8 with a `hint` saying the log is empty, believe it: a
project that cannot start a session makes `cdswctl` print nothing and wait, so the
failure is that project's, not the tunnel's. Try another project before digging.

## Notes worth knowing before you get surprised

- `cai workloads list` needs an observability machine-user role. An ordinary key
  gets 403 (exit 4); everything else works with a plain user key.
- `files ls` returns basenames, not paths: listing `data` gives `raw`, not
  `data/raw`. Rejoin them yourself when walking a tree.
- Listings take `--limit` and `--page-size`; `--verbose` logs every request to
  stderr with the key redacted; `--table` renders for a human instead of JSON.
