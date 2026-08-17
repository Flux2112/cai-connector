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

This release is **read-only**. Every command is a GET or a validated read; nothing here can
change or delete anything on the instance. `cai raw` refuses any verb but GET.

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

cai jobs list <project> [--name N]           jobs defined in a project
cai jobs get  <project> <job>
cai runs list <project> <job> [--status S]   runs of one job
cai runs get  <project> <job> <run>

cai runtimes list                            runtimes on the instance
cai workloads list [--status running]        every running workload, one call

cai raw <path> [--method GET]                any API v2 path, GET only
```

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

The 5/6 split is deliberate and load-bearing: no answer is not the same as a negative
answer, so "the listing failed" must never be read as "the thing is gone".

## Notes

- `cai workloads list` needs the observability role on the instance; an ordinary user key
  gets 403 (exit 4). Everything else works with a plain user key.
- `files ls` returns names relative to the directory listed, not paths from the project
  root — listing `data` gives `raw`, not `data/raw`.
- `files get` writes bytes verbatim, so binary files survive intact. Without `-o` the bytes
  go to stdout; `--json` then requires `-o`, because a file's bytes cannot be part of a
  JSON document.
- If your instance serves only its leaf certificate, Node cannot build the chain the way a
  browser can. Point `NODE_EXTRA_CA_CERTS` at a PEM file containing the issuing
  intermediate as well as the root.

## Related

- [`cai-connector`](https://marketplace.visualstudio.com/items?itemName=DefySoftwareSolutions.cai-connector)
  — the VS Code extension, for SSH endpoints and remote sessions.
- [`@defysoftware/cai-core`](../core) — the typed API v2 client this is built on.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE).
