---
name: cai
description: Work with Cloudera AI (CML) from the command line — projects, files, jobs, runs, applications, and SSH endpoint sessions. Use when the task involves a CML instance, a CML project, running a CML job, or getting a shell on a CML session.
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
intermediate as well as the root; Node will not fetch it the way a browser does.

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
cai runs stop <project> <job> <run>
cai files put <project> ./local.py src/local.py
```

**`files put` cannot replace a file.** The API has no overwrite: uploading onto an
occupied path keeps the old file and stores yours as `name(1).ext`, answering 200
without saying which name it chose. So an occupied destination is refused, and
with `--force` the result's `stored` field is the name that was really created —
read it, do not assume. To reuse the original name, delete the old file from the
CML UI or a session first.

`jobs run --wait` prints the run either way, so the id is always available. Exit 8
means the run failed, was stopped, or was still going when the wait expired — the
job did start, so retrying starts it a second time.

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

## Notes worth knowing before you get surprised

- `cai workloads list` needs an observability machine-user role. An ordinary key
  gets 403 (exit 4); everything else works with a plain user key.
- `files ls` returns basenames, not paths: listing `data` gives `raw`, not
  `data/raw`. Rejoin them yourself when walking a tree.
- Listings take `--limit` and `--page-size`; `--verbose` logs every request to
  stderr with the key redacted; `--table` renders for a human instead of JSON.
