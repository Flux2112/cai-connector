# @defysoftware/cai

An agent-first command line interface to [Cloudera AI](https://www.cloudera.com/products/machine-learning.html)
(Cloudera Machine Learning), built on the documented **API v2**.

Agent-first means the defaults are chosen for a program reading the output, not for a
person reading a screen:

- **JSON on stdout** by default. `--table` is the concession to humans.
- **Errors are JSON on stderr**, never mixed into stdout.
- **Exit codes are a contract** (below) — you can branch on them without parsing prose.
- **No prompts** unless stdin is a terminal.
- Colour is off unless `FORCE_COLOR` is set.

Reads plus **safe writes**: a file can be uploaded, a job run started or stopped, an
application restarted or stopped. **Nothing here deletes anything** — no project, model,
job, file or application. That is enforced by the command surface, not by a check: no `cai`
verb maps to a destructive path, and `cai raw` refuses any verb but GET.

## Install

```bash
npm install -g @defysoftware/cai
```

Needs Node 20 or newer.

## Authenticate

The same API key works for the API and for `cdswctl`, so there is only ever one credential
to manage. It is resolved in this order:

1. `--api-key` — works, but warns: argv is readable by every process on the machine.
2. `$CML_API_KEY` — the same variable the CAI Connector VS Code extension uses.
3. `%APPDATA%\cai\credentials.json` (`~/.config/cai/credentials.json` elsewhere), written
   by `cai login`.

The instance URL follows the same order, from `--url`, `$CAI_URL` (or `$CML_URL`), then the
stored file.

```bash
cai login --url https://ml.example.com          # prompts, no echo
cai login --url https://ml.example.com < key    # or read it from a file
cai login --check                               # validate without storing
```

`login` validates the key against the instance **before** writing anything, so a typo never
becomes a stored credential that fails on every later command.

## Commands

```
cai login                                    validate a key and store it
cai whoami                                   who the current key belongs to

cai projects list [--owner U] [--name N]     projects visible to the key
cai projects get <project>                   one project, by owner/name or id

cai files ls  <project> [path]               list a directory
cai files get <project> <path> [-o file]     download a file, bytes verbatim
cai files put <project> <local> [remote]     upload a file  [--force]

cai jobs list <project> [--name N]           jobs defined in a project
cai jobs get  <project> <job>
cai jobs run  <project> <job>                start a run  [--wait --timeout S --env K=V]
cai runs list <project> <job> [--status S]   runs of one job
cai runs get  <project> <job> <run>
cai runs stop <project> <job> <run>          stop one named run

cai apps list    <project> [--status S]      applications in a project
cai apps get     <project> <app>
cai apps restart <project> <app>             restart, or start a stopped one
cai apps stop    <project> <app>

cai runtimes list                            runtimes on the instance
cai workloads list [--status running]        every running workload, one call

cai session runtimes [filter]                cdswctl runtimes, with numeric ids
cai session create <project>                 an SSH endpoint; the tunnel outlives this
cai session list [--live]                    sessions stored on this machine
cai session kill <alias|id|project>          stop one session, named explicitly

cai raw <path> [--method GET]                any API v2 path, GET only
```

`cai session *` is **Windows-only**: API v2 has no session endpoints at all, so it
drives `cdswctl.exe` and finds tunnels with a PowerShell process scan.

`<project>` is accepted as `owner/name` or as an opaque project id. Listings take `--limit`
and `--page-size`; `--verbose` logs each request to stderr with the key redacted.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | success |
| 1 | unexpected failure — a bug, until shown otherwise |
| 2 | bad flags or arguments |
| 3 | no instance URL or no API key could be resolved |
| 4 | the instance rejected the credential (401/403) |
| 5 | the instance answered, with a failure |
| 6 | **no answer at all** — DNS, TLS, refused, timeout |
| 7 | the request failed validation and never left |
| 8 | the call worked; the **workload** did not succeed |

The 5/6 split is deliberate and load-bearing: no answer is not the same as a negative
answer, so "the listing failed" must never be read as "the thing is gone".

8 is the same idea one level up. `cai jobs run --wait` exits 8 when the run failed, was
stopped, or was still going when the wait expired — nothing went wrong with the *call*, so a
caller that read it as a request failure and retried would start the job a second time. The
run is printed on stdout either way, so its id is always available.

## Sessions

A session is a CML session plus an SSH tunnel, and the tunnel is a `cdswctl`
process that must outlive the command that started it.

```bash
cai session runtimes "workbench python3.11"   # the numeric id --runtime takes
cai session create HANKE/dse --runtime 281 --cpus 1 --memory 4
ssh cml-dse                                   # or open the printed remote URI
cai session list --live
cai session kill cml-dse
```

These share `session_history.json` with the **CAI Connector VS Code extension**,
which is not a nicety: the extension kills every endpoint process that no stored
record claims, so a CLI keeping its own registry would have its tunnels killed by
the next window that opened. Sharing the file also means the sidebar shows sessions
created here, for free.

If `create` times out with an **empty log**, the project is the suspect rather than
the tunnel: `cdswctl` given a project that cannot start a session prints nothing at
all and waits, so a silent timeout is not the same failure as one with output. The
error says so, and names the log either way.

`--runtime` takes a numeric id or terms to match one, and falls back to whatever
the newest stored session for that project used. The number comes from
`cai session runtimes`, not from `cai runtimes list` — the API's runtime listing
carries no numeric id, and `cdswctl` wants one.

## Agent skills

Installing this package copies a `cai` skill into `~/.claude/skills`, describing
these commands, the exit codes and the sharp edges. It never overwrites a copy you
have edited — it writes `SKILL.md.new` beside it instead. `CAI_SKIP_SKILLS=1` turns
it off; `CAI_SKILLS_DIR` sends it somewhere else.

## Notes

- `cai workloads list` needs the observability role on the instance; an ordinary user key
  gets 403 (exit 4). Everything else works with a plain user key.
- `files ls` returns names relative to the directory listed, not paths from the project
  root — listing `data` gives `raw`, not `data/raw`.
- `files get` writes bytes verbatim, so binary files survive intact. Without `-o` the bytes
  go to stdout; `--json` then requires `-o`, because a file's bytes cannot be part of a
  JSON document.
- **`files put` cannot replace a file.** The API has no overwrite: uploading onto an
  occupied path leaves the old file alone and stores the new one beside it as
  `name(1).ext`, answering 200 without saying which name it chose. So an occupied
  destination is refused by default; `--force` uploads anyway and the result's `stored`
  field reports the name that was really created. Delete the old file first if you need
  the original name — from the CML UI or a session, since this CLI never deletes.
- A destination that is absolute or contains `..` is refused before anything is sent. It
  travels in the request body rather than the URL, so nothing else would catch it.
- If your instance serves only its leaf certificate, Node cannot build the chain the way a
  browser can. Point `NODE_EXTRA_CA_CERTS` at a PEM file containing the issuing
  intermediate as well as the root — a root-only file is not enough, and it fails exactly
  like a wrong URL unless you read the `cause`. Exit 6 reports that `cause`
  (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `ENOTFOUND`, `ECONNREFUSED`, …) and, for the ones with
  a standard answer, a `hint` field saying what to do.

## Related

- [`cai-connector`](https://marketplace.visualstudio.com/items?itemName=DefySoftwareSolutions.cai-connector)
  — the VS Code extension, for SSH endpoints and remote sessions.
- [`@defysoftware/cai-core`](../core) — the typed API v2 client this is built on.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE).
