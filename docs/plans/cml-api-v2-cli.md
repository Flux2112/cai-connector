# Plan: Cloudera AI API v2 support and an agent-first `cai` CLI

Status: proposed, 2026-08-15. Phases 1 to 4 are done (2026-08-17). Phase 5 is built and
tested (2026-08-18), but its one live end-to-end check is blocked; see the note under it.
The npm prerequisites are done — see CI.

Goal: expose Cloudera AI to coding agents through a standalone, agent-first CLI built on
the documented **API v2**, while keeping `cdswctl` for the one thing the API cannot do —
creating sessions and SSH endpoints.

## Decisions already taken

| Question | Decision |
|---|---|
| Agent surface | Standalone CLI. Not MCP, not new extension commands. |
| Write scope | Reads plus *safe* writes. No deletes, no project/model destruction. |
| Location | Same repo, separate published packages. |
| Client | Generated from the instance's own `swagger.json`, JS toolchain (no Java). |
| CLI framework | oclif, mirroring `../livy-sessions/packages/cli`. |
| Session creation | The CLI shells out to `cdswctl` — API v2 has no session endpoints. |
| npm scope | `@defysoftware` (`@defy` is taken — see Findings). |

## Findings (all verified, not assumed)

### cdswctl

`C:\Program Files\CDSW\cdswctl.exe`, version **2.0.0.91635**, self-described as
"in beta and subject to change".

| Command | Subcommands |
|---|---|
| `sessions` | list, start, stop |
| `ssh-endpoint` | — (the tunnel) |
| `projects` | list, getEngineType |
| `jobs` / `jobruns` | get / create, get, list, stop |
| `models` | 18 verbs (build, deploy, restart, getReplicaLogs, …) |
| `runtimes`, `runtime-addons`, `engine-images`, `cpu-profiles`, `gpu-profiles`, `resource-groups` | list only |

`login` accepts both `/y --api-key` (what `auth.ts` passes today) and
`/t --updated-key`, documented as *"the new-style api key. New cdswctl functionality
uses this key."* This suggested two key generations. It turned out not to matter — see
Credentials below.

### API v2

Pulled from the live instance: `https://oenbml.apps.anucdp-cml-master-01.w.oenb.co.at/api/v2/swagger.json`
— served **unauthenticated**, `"swagger": "2.0"`, spec version `26.06.13`, **118 paths**,
single security definition `authorization: Bearer <key>`.

What matters, grouped by consequence:

- **Not available in cdswctl at all**: project CRUD, project **files**
  (`POST .../files` upload, `POST .../files/{path}:download`, list, delete),
  applications (create/stop/restart), experiments + runs + batch metric logging,
  model registry, teams/users/quotas/usage, `POST /api/v2/auth/validate_key`.
  Two things about the upload, verified live on 2026-08-17: it is the API's only
  `multipart/form-data` operation and takes the **destination path as the field name**, and
  it **does not overwrite** — an occupied path keeps its file and the upload is stored as
  `name(1).ext`, still answering 200. There is no replace-in-place anywhere in v2; the only
  route to the original name is a delete, which this CLI does not have.
- **Available in both, but typed and paginated here**: runtimes, runtime-addons,
  projects, jobs, job runs, models/builds/deployments.
- **`GET /api/v2/workloads/executions`** — every running workload in one paginated call:
  `workload_type`, `status`, `start_time`, allocated CPU/mem/GPU, `pod_name`, `runtime`,
  plus `search_filter={"status":"running"}`. ~~A candidate replacement for the per-project
  `cdswctl sessions list` in `reconcileWithCml`.~~ **Not usable with a normal user key.**
  Tested 2026-08-17 with the key in `%CML_API_KEY%`: it answers
  `403 {"code":7,"message":"User is not an observability machine user"}`. The endpoint needs
  an observability machine-user role that an ordinary user does not have, so the Phase 5
  idea of replacing the per-project `cdswctl sessions list` with one call **does not work**
  unless the extension is prepared to require that role. Reconciliation stays as it is.
  `cai workloads list` ships anyway — it is correct, and it works for a key that does have
  the role.
- **No sessions endpoints.** No create, no stop, no SSH. `cdswctl ssh-endpoint` stays
  mandatory and remains the reason this extension exists.

`/api/v1/users` and `/api/v1/projects` return 401 rather than 404, so v1 exists — but it
is undocumented and not contractual. Target v2 only.

### Credentials — one key, not two

Verified against the live instance with the key already in `%CML_API_KEY%`:

```
POST /api/v2/auth/validate_key  {"audience":"API"}
  -> 200 {"valid":true,"username":"HANKE","message":"API key is valid for the given audience"}
GET  /api/v2/projects?page_size=1
  -> 200
```

`{"audience":"Application"}` returns 403 `audience mismatch`; the only accepted values are
`API` and `Application`.

**The same API key works for `cdswctl login` and for API v2 Bearer auth.** There is no
second credential to design, no v2 key rotation flow, and no dual-secret storage. The
extension's existing `SECRET_KEY = "CML_API_KEY"` value is directly reusable.

`GET /api/v2/projects` returns projects carrying both `id` (opaque) and
`slug` / `owner` / `name`, so resolving `owner/project` → `project_id` is a single
filtered list call.

### npm

- `https://registry.npmjs.org/-/org/defy/package` → **200**. The `@defy` scope is taken
  (`@defy/helpers`, `@defy/wx-jssdk`, `@defy/vue-wx-jssdk`, `@defy/postcss-px-to-viewport`,
  `@defy/event-bus`, `@defy/helper-js`). Unscoped `cai` is also taken.
- Free: `@defysoftware`, `@defy-software`, `@defysoftwaresolutions`, `@defyss`.
  **Chosen: `@defysoftware`**, matching the Marketplace publisher `DefySoftwareSolutions`.
- Free npm orgs publish **public packages only**. GPL-3.0 and public is fine here.

### The livy-sessions precedent

`../livy-sessions` is the model: npm workspaces root, `packages/{core,cli,extension}`,
`@oclif/core` v4 CLI with topics and `oclif.manifest.json`, `@oenb/livy-sessions-core`
consumed by both the CLI and the extension, versions pinned equal across packages,
publish gated on a tag whose value must match every package version.

Two things worth copying beyond the layout: oclif's `enableJsonFlag` (a real `--json`
contract on every command) and livy's bundled agent skills installed via a `postinstall`
script — the latter is the actual payoff for "agent interaction".

One thing worth *not* copying: livy splits publishing across GitHub Actions (VSIX) and
GitLab CI (npm to internal Nexus). Here both go in the one GitHub workflow.

## Target layout

```
cai-connector/
  package.json                 private monorepo root, workspaces: ["packages/*"]
  packages/
    core/       @defysoftware/cai-core    generated types + client + operations
    cli/        @defysoftware/cai         oclif, bin: cai
    extension/  cai-connector             everything currently at the repo root
  tools/icon-trace/            unchanged
  docs/                        unchanged
```

### `packages/core` — zero runtime dependencies

This is the constraint that shapes the package. The extension may consume `core` in
Phase 5, and the extension's zero-runtime-dependency rule must survive that. So:

- `openapi-typescript` emits **types only** — a `.d.ts` with a `paths` interface and no
  runtime code at all. Committed to the repo.
- A hand-written request function (~80 lines) typed against those `paths`: Bearer
  injection, pagination helper, typed errors, key redaction in any log output.
- `createClient({ baseUrl, apiKey, fetch?, log? })` — transport injectable, so the
  extension can pass a `node:https`-based fetch if corporate proxy handling demands it,
  and tests can pass a stub. Same dependency-injection discipline as the existing
  `OutputChannel` parameter convention.
- Operation wrappers (`listProjects`, `resolveProject`, `uploadFile`, `runJob`, …) and
  the session-record logic shared with the extension.
- Tests with `node --test` against a local `http.createServer` stub, matching the repo's
  existing runner.

`openapi-typescript` v7 consumes OpenAPI 3.x only, and the instance serves Swagger 2.0,
so generation is `swagger2openapi` → `openapi-typescript`. Both are devDependencies of
`core`; neither ships.

**The spec lives on an internal host CI can never reach.** Commit both
`packages/core/spec/swagger.json` (version-stamped, currently `26.06.13`) and the
generated output. Regeneration is a manual `npm run generate -w @defysoftware/cai-core`
pointed at `$CAI_URL/api/v2/swagger.json`, producing a reviewable diff.

### `packages/cli` — oclif

`@oclif/core` v4 lives here and only here (~35 transitive deps that never touch the VSIX).

```
cai login | whoami                       validate_key, audience "API"
cai projects list|get                    accepts owner/name or project_id
cai files ls|get|put <project> [path]
cai jobs list|get|run <project> [job]    run = POST .../runs, --wait polls
cai runs list|get|stop <project> <job>
cai apps list|restart|stop <project>
cai runtimes list
cai workloads list [--status running]
cai session create|list|kill             shells out to cdswctl, win32 only
cai raw GET /api/v2/...                  GET only, escape hatch
```

Agent ergonomics: JSON on stdout by default, `--table` for humans, errors as JSON on
stderr, stable exit codes, no interactive prompt unless stdin is a TTY.

**Safe-writes is enforced by the command surface, not at call time.** Generation emits all
118 paths; no `cai` verb maps to `DELETE /projects/{id}`, model deletion, or team/quota
mutation, and `cai raw` refuses anything but GET. This is the same posture as the existing
rule against `cdswctl`'s blanket `/a` stop flag: the dangerous capability is simply not
reachable.

Credentials: `CML_API_KEY` env → `%APPDATA%\cai\credentials.json` (written with `icacls`
restricted to the user) → error. A `--api-key` flag exists but warns, because argv is
visible process-wide — the same reasoning behind the `%CML_API_KEY%` indirection in
`auth.ts`. SecretStorage is unreachable outside VS Code, so the CLI keeps its own store.

### Sessions and the shared history file

`cai session create` spawns `cdswctl ssh-endpoint`, screen-scrapes the same two regexes,
and the process *is* the tunnel — identical to `executeConnect`.

**The CLI writes to the extension's `session_history.json`.** Confirmed decision. The
record logic moves to `core`, and both point at
`%APPDATA%\Code\User\globalStorage\defysoftwaresolutions.cai-connector\`.

This is not a nicety, it is required for correctness: `activate()` kills endpoint
processes **no stored record claims**. A CLI that kept its own registry would have its
tunnels killed by the next extension window that starts. Sharing the file also means the
sidebar shows agent-created sessions for free, and `SessionPanel`'s watcher picks them up
with no cross-process messaging — exactly what the parallel-session design was built for.

Invariants the CLI inherits verbatim:

- History record written **immediately** after spawn, before the endpoint is ready.
- Session id patched in as soon as it is scraped.
- Only `inactive` records are ever dropped by `MAX_SESSION_RECORDS`.
- `sessions stop /s` prints `unexpected end of JSON input` on success.
- Never stop a CML session in bulk; only ones recorded in our own history.

API commands are cross-platform. `cai session *` inherits the Windows-only constraint
(the PowerShell `Win32_Process` scan) and should be gated on `win32`.

## CI

Extend the existing `.github/workflows/publish.yml` rather than adding a second workflow.
Keep its current shape — bump minor, commit `[skip ci]`, tag `v<version>`,
`vsce publish --azure-credential` via Entra workload identity federation — and add npm.

Auth: npm **trusted publishing** (OIDC), not an `NPM_TOKEN` secret. The workflow already
requests `id-token: write` for Azure, and GitHub is configured as a trusted publisher on
each npm package. No long-lived credential, and it yields provenance attestations — the
same reasoning that replaced the Marketplace PAT.

Trusted publishing can only be configured *after* a package exists, so the first release
of each package is a one-time manual `npm publish` from a workstation. That, the npm org
creation, and the trusted-publisher configuration are covered by a one-off wizard script
(see the note at the end of this section).

```yaml
- run: npm publish -w @defysoftware/cai-core --access public
- run: npm publish -w @defysoftware/cai       --access public
```

No `--provenance` flag: trusted publishing generates and publishes provenance attestations
automatically. No `NPM_TOKEN` either — the npm CLI detects the OIDC environment and uses it
before falling back to tokens.

Three changes to the existing workflow beyond adding those steps:

0. **Bump the runner to Node 24.** Trusted publishing requires **npm ≥ 11.5.1 and Node ≥
   22.14.0**; the workflow currently pins `node-version: '20'`, which ships npm 10 and
   cannot do OIDC publishing at all. This is the build runner only — it does not change
   the extension's `engines.vscode` target or its compiled output.

1. **Verify npm auth before the version bump.** The workflow already places
   "Verify Marketplace credential" before the bump so a broken federation cannot leave a
   bumped version and a pushed tag with no release behind them. npm publishing needs the
   same guard — `npm whoami` plus a `npm publish --dry-run` before anything is committed.
2. **Add `npm test`.** The workflow currently runs `npm run compile` only. `npm test`
   type-checks *and* runs the suite, and `core` is the first module here with real
   network-layer coverage.

The one-time human steps — npm account and 2FA, creating the `@defysoftware` org, the
first manual publish of both packages, and configuring the trusted publisher on each — were
scripted as a wizard and **completed on 2026-08-17**. Both names are claimed and both have
GitHub configured as a trusted publisher:

```
@defysoftware/cai-core  0.0.1  GPL-3.0-or-later  maintainer aule2112
@defysoftware/cai       0.0.1  GPL-3.0-or-later  maintainer aule2112
```

Neither is real code — each is a two-file placeholder (`package.json` + `README.md`, 383
bytes) whose only job was to make the package exist so a trusted publisher could be
attached. The first real release must therefore be a version **above** `0.0.1`.

One machine-local gotcha, since it will recur on any public-npm work here: this machine's
`~/.npmrc` sets `cafile` to the corporate root, which *replaces* Node's root store instead
of extending it, so `registry.npmjs.org` fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`.
`NODE_EXTRA_CA_CERTS` is already set to the same file and appends correctly, so the fix is
`npm config delete cafile`. CI is unaffected.

Versioning: pin all three packages to one version equal to the tag, as livy does. The CLI
takes a version bump on extension-only changes — accepted deliberately, because it keeps
`cai-core` and the extension version-locked once Phase 5 makes them share code. Paths in
the workflow change (`packages/extension/*.vsix`, `-w` flags, working directories).

## Phases

**Phase 1 — move the extension into `packages/extension`.** Its own commit, its own PR,
nothing else in it. Manifest, `src/`, `media/`, `.vscodeignore`, `tsconfig.json`, launch
config, and every CI path shift. Merging to `main` triggers a real Marketplace release, so
verify before merge: `npm run package` locally, then diff the VSIX file list against the
currently published one. It must be identical.

~~**Phase 2 — `packages/core`.** Spec committed, generation script, typed request function,
auth, pagination, error mapping, redaction. Tests against a local HTTP stub. No consumers
yet.~~ Done 2026-08-17. 48 tests, zero runtime dependencies, `private: true` until Phase 3
gives it a consumer and a publish step. Wrappers shipped: `validateKey`/`whoami`,
`listProjects`/`getProject`/`resolveProject`, `listRuntimes`, `listWorkloadExecutions` —
enough to prove the typing across query, path and body shapes. Files and jobs wrappers were
deliberately left to the phase whose commands need them rather than written speculatively.
See AGENTS.md for the two traps found on the way (`schema.ts` vs `schema.d.ts`, and why the
options type is a mapped type rather than an `infer` conditional).

~~**Phase 3 — read-only CLI.** oclif scaffold, `login`/`whoami`, projects, runtimes,
workloads, jobs, `files ls`/`get`, `raw`. First manual npm publish of both packages, then
trusted publishing configured and the workflow steps added.~~ Done 2026-08-17. 38 CLI tests
(command tests spawn the real binary), plus 9 more in `core` for the jobs and files wrappers
this phase needed. `core` lost its `private: true`; all three packages are pinned to one
version. CI gained Node 24, `npm test`, the `--check` drift guard, an npm pre-flight and the
two publish steps. Everything shipped is read-only.

Five things learned on the way, all recorded in AGENTS.md:

- `npm version --workspaces` does **not** rewrite inter-workspace dependency ranges, so
  without a follow-up `npm pkg set` the published CLI would have depended on a `cai-core`
  version that was never published.
- The npm pre-flight has to be `npm publish --dry-run`, not `npm whoami`: only `publish`
  performs the OIDC exchange, and it does so before it branches on `--dry-run`.
- `this.exit()` in an oclif error handler aborts the process with a libuv assertion on
  Windows when a keep-alive socket is still open, losing the exit code. `process.exitCode`
  instead.
- Capturing `process.stdout.write` in-process swallows `node --test`'s own reporter output;
  the command tests spawn the binary.
- The developer's own `CML_API_KEY` silently satisfied the credential-resolution tests until
  the test harness started stripping the ambient environment.

~~**Phase 4 — safe writes.** `files put`, `jobs run --wait`, `runs stop`, `apps restart|stop`.~~
Done 2026-08-17. All four shipped, plus `apps list|get`, and every one of them was exercised
against the live instance in the scratch project `HANKE/DSE` — not just against the stub.
78 tests in `core`, 54 in the CLI. New exit code `EXIT.WORKLOAD` (8): the call worked, the
workload did not.

Four things learned, all recorded in AGENTS.md:

- **The upload endpoint does not overwrite.** It stores a numbered duplicate
  (`probe.txt` → `probe(1).txt`) and answers 200 without saying which name it chose. The
  first version of `files put` had a `--force` flag that promised to "replace the file",
  which the API cannot do; found by reading the file back after a forced upload and getting
  the old content. The command now refuses an occupied path by default and reports the name
  that was really created as `stored`.
- **`search_filter` is case-sensitive** (`{"name":"dse"}` finds nothing, `{"name":"DSE"}`
  finds the project) **and matches substrings** (`"DS"` also finds `DSE`). `resolveProject`
  could therefore never resolve `HANKE/dse`, the form both a human and the extension type.
  It now falls back to one unfiltered listing when the hint drops everything.
- **The one multipart operation needs a hand-built body.** The field *name* is the
  destination path, and the content is binary, which `openapi-typescript` renders as
  `string`. Hence `multipart.ts`, `RawRequestOptions.rawBody`, and `FetchInit.body` widened
  to `string | Uint8Array` — and hence `assertUploadPath`, because a destination that
  travels in the body never passes `buildPath`.
- **A path in a request body is a fence `buildPath` cannot provide.** `..` in an upload
  destination was reachable until that check existed, for exactly the same reason the
  Phase 2 `..` guard was needed in the URL layer.

**Phase 5 - sessions and skills.** Built 2026-08-18: `cai session create|list|kill`, plus
`cai session runtimes`, and the bundled agent skill installed by `postinstall`. The shared
session logic is ported into `packages/core/src/session/`. 115 tests in `core`, 68 in the CLI.
~~and replacing the per-project `cdswctl sessions list` in `reconcileWithCml` with one
`workloads/executions` call~~ - that swap is off the table: the endpoint needs an
observability machine-user role a normal key does not have (see Findings).

**The extension does not consume `core` yet, and that is a deliberate deferral.** Importing it
would give the extension a runtime dependency, and the VSIX has none - `vsce package
--no-dependencies` is load-bearing (see AGENTS.md), so adopting `core` means adding a bundler
to a shipping extension. That is its own change with its own release risk. Until then the
extension keeps its own copy of the session logic and the tests on both sides assert the same
rules, including the shape of the JSON on disk; the extension's copy is the reference.

**Live endpoint creation could not be verified: `cdswctl ssh-endpoint` currently hangs on this
instance.** Established 2026-08-18, and it is not the CLI's doing - the same hang happens with
`cdswctl` invoked straight from a shell, with no code of ours involved:

- Silent for 2+ minutes, zero bytes of output, and **no CML session is created** (`cdswctl
  sessions list` stays empty while the process runs).
- Identical with stdout on a file, on a pipe, and with `2>&1`; identical with stdin inherited,
  `ignore`, an open pipe, and `yes` feeding it; identical for `HANKE/DSE` and `hanke/dse`;
  identical with the documented `cwd` of the binary's own directory.
- `cdswctl login -y` succeeds and `cdswctl runtimes list` returns 71 kB of JSON through the
  same redirection, so authentication, TLS and output redirection are all fine.
- `cdswctl login -t` (the "updated key") prompts for a password instead of accepting the key,
  so `/y` is correct and that open item is closed. Not the cause either.

The extension issues the identical command, so it would hit the same wall today; the newest
successful session in the local history is from 5 August. Most likely something in the path the
tunnel itself needs - its websocket upgrade through the gateway - rather than the API path.
**Next step for a human: start a session from the extension's sidebar.** If that hangs too,
this is an instance or network problem for the platform team, not a CLI defect.

What *was* verified live: `session list` against the real shared history, and `session kill`
end to end - API `validate_key`, `cdswctl login`, a real `cdswctl sessions stop` (correctly
reported as *not* stopped for a session id that does not exist, so the known-bug string is not
over-matched), the tunnel process actually killed, the record left flagged rather than recorded
as clean, and `~/.ssh/config` rewritten with foreign hosts untouched. The spawn-and-scrape
mechanism is covered by `packages/cli/src/test/tunnel.test.ts` against a stand-in that prints
the two lines and lingers, including that the child outlives the watcher.

## Risks and things not to break

- **The tunnel must outlive its parent.** Any CLI session command inherits the surrender
  discipline; a CLI that exits and takes the tunnel with it is the same bug.
- **`listEndpointProcesses` returns `null`, not `[]`, on failure.** The API client must
  follow the same rule: a failed listing leaves `cmlStatus` untouched rather than setting
  something the orphan pass might act on. `isOrphanedOnCml` still requires a *positive*
  running confirmation.
- **Two writers to `session_history.json`.** The extension already tolerates concurrent
  windows, but the CLI adds a non-VS-Code writer. Writes stay small and whole-file; verify
  no torn reads under the watcher.
- ~~**`openapi-typescript` on a Swagger 2.0 spec via conversion** may produce awkward types
  for the `:verb` style paths (`.../{id}:stop`).~~ Checked 2026-08-17: the 14 affected paths
  come through as ordinary literal keys, and nothing in the URL builder treats `:`
  specially. No overrides needed.
- **Phase 1 publishes on merge.** No way to rehearse a Marketplace release; the VSIX
  file-list diff is the only safety net.

## Open items

- ~~Whether `workload_crn` embeds the short session id `cdswctl sessions stop /s` expects.~~
  Moot: the endpoint that would supply it is closed to ordinary keys (see Findings), so the
  reconciliation swap is off regardless of what the CRN contains.
- **TLS on this instance needs the intermediate CA.** `https://oenbml.…` sends only its leaf
  certificate, issued by `OeNB-Server-CA`. Browsers fetch the missing intermediate via AIA;
  Node does not, so `fetch` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when
  `NODE_EXTRA_CA_CERTS` points at the root alone (`OeNB-Root-CA-PEM.cer`). Pointing it at
  `C:\dev\certs\oenb-ca-chain.pem` works. This never affected the extension, which delegates
  TLS to `cdswctl`, but it is the first thing a CLI user on this network will hit. Whether to
  add a `--ca-file` flag, bundle nothing and document it, or teach the client to follow AIA
  is undecided; the README documents the environment variable for now.
- ~~Whether `cdswctl login /t --updated-key` accepts this same key, or whether `/y` remains
  correct.~~ Answered 2026-08-18: `-t` with this key prompts for a password rather than
  accepting it, so `/y` is correct. `/t` is for a credential we do not have.
- **`cai session create` has no live green run yet** (see Phase 5). Its code path is covered
  by tests against a stand-in; what is missing is a real endpoint, which the instance is not
  currently producing for anyone.
- **The extension's adoption of `core`** needs a decision on how the VSIX would ship a
  runtime dependency: bundle with esbuild (one file, keeps `--no-dependencies` meaningful),
  or keep the two copies. Until then the conformance tests are what hold the line.
- ~~npm org creation and the one-time manual first publish are manual steps for a human.~~
  Done 2026-08-17.
