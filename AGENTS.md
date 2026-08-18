# Agent Guidelines for CAI Connector

> Single source of truth for AI coding agents working in this repository.
> `CLAUDE.md` includes this file; keep guidance here rather than duplicating it elsewhere.

## Project Overview

Windows-only VS Code extension (`extensionKind: ["ui"]`) that creates SSH endpoints on Cloudera AI (CML) by driving the external `cdswctl.exe` CLI, writes a `Host cml-<project>` block into `~/.ssh/config` per session, then hands off to Remote-SSH. **Several sessions can run in parallel**, each with its own endpoint process, host alias and remote window.

- **Language**: TypeScript 5.4, ES2020 target, CommonJS output, `strict` mode
- **Runtime deps**: none — Node built-ins and the VS Code API only
- **Requires**: VS Code 1.85.0+, `cdswctl.exe`, the Remote-SSH extension
- No bundler and no linter are configured; output is raw CommonJS in `out/`

## Repository layout

An npm **workspaces monorepo**. The repository root is a private, unpublished package; everything shippable lives under `packages/`.

```
package.json                 private root, workspaces: ["packages/*"]
packages/extension/          cai-connector — the VS Code extension (VSIX)
  package.json               the extension manifest
  src/ media/ out/ tsconfig.json .vscodeignore README.md LICENSE
packages/core/               @defysoftware/cai-core — typed CML API v2 client
  spec/ scripts/ src/ out/ tsconfig.json README.md LICENSE
packages/cli/                @defysoftware/cai — the `cai` CLI (oclif)
  bin/ src/ out/ skills/ scripts/ tsconfig.json README.md LICENSE
tools/icon-trace/            private, excluded from the VSIX
docs/  AGENTS.md  CLAUDE.md  .github/  .vscode/
```

**Every path in this document below this section is relative to `packages/extension/`** unless it starts with `docs/`, `tools/`, `.github/`, `.vscode/`, `packages/core/` or `packages/cli/`. So `src/sshConfig.ts` means `packages/extension/src/sshConfig.ts`.

All three packages are **pinned to one version**, equal to the release tag, so `core` and the extension stay version-locked once Phase 5 makes them share code. The CLI therefore takes a version bump on extension-only changes; that is deliberate.

## Commands

Run these from the **repository root**. `compile` and `test` fan out across every workspace with `--workspaces --if-present`; `watch` and `package` target the extension alone.

```bash
npm run compile   # tsc in every package    → packages/*/out/
npm run watch     # tsc watch mode, extension only
npm test          # tsc, then node --test, in every package
npm run package   # vsce package --no-dependencies → packages/extension/*.vsix
npm run generate  # regenerate packages/core's types from the committed spec
npm run cai       # run the CLI from source (compile first)
```

**`--no-dependencies` is load-bearing, not tidiness.** Inside a workspace, `npm ls --omit=dev --parseable --all` run from `packages/extension` reports the *workspace root* as a dependency path. vsce would follow that, glob the entire repository (`.git` included) and then fail on paths escaping the package directory. The extension has no runtime dependencies, so there is nothing legitimate for vsce to collect. Do not drop the flag.

Tests use Node's built-in `node:test` runner — there is no Mocha/Jest and no `@vscode/test-electron`. Test files live in `src/test/` as `*.test.ts` and compile to `out/test/`.

Run a single test by name (compile first), from the repository root:

```bash
npm run compile && node --test --test-name-pattern "never discards a live session to make room" "packages/extension/out/test/**/*.test.js"
```

Only modules free of the VS Code API are unit-testable this way: `sshConfig.ts`, `sessionStatus.ts`, `sessionHistory.ts`, `resourceInput.ts` and `sessionFormModel.ts` (all covered), plus `endpointRegistry.ts`, `runtimeManager.ts`, `cdswctl.ts`, and the pure helpers in `utils.ts` (`buildEndpointArgs`, `multiTermFilter`) — these take `OutputChannel` as a parameter, which can be stubbed. Keep new pure logic out of `sessionForm.ts` and `sessionReconciler.ts` so it stays testable.

Debug the extension with the **Run Extension** launch config (`.vscode/launch.json`); it points `--extensionDevelopmentPath` at `packages/extension` and runs the `compile` task from `.vscode/tasks.json` first. That task is declared explicitly rather than relying on npm-script auto-detection, which becomes ambiguous once the repository has more than one `package.json`.

**CI publishes on every push to `main`** (`.github/workflows/publish.yml`): compiles, runs `npm test`, checks the generated types for drift, verifies both credentials, bumps the minor version across all workspaces, commits `chore: bump minor version [skip ci]`, tags `v<version>`, then publishes the VSIX to the Marketplace and both npm packages. Treat any merge to `main` as a release of all three artifacts. The tag step reads the version from `packages/extension/package.json`.

Four non-obvious things about that workflow:

- **The runner is on Node 24, and that is a requirement.** npm trusted publishing needs npm ≥ 11.5.1 and Node ≥ 22.14.0; Node 20 ships npm 10 and cannot do OIDC publishing at all. It is the build runner only and does not touch `engines.vscode` or the compiled output.
- **`npm version --workspaces` does not rewrite inter-workspace dependency ranges.** Verified, not assumed: it bumps each package's own version and leaves `cli`'s pin on `cai-core` at the previous value, which would publish a CLI depending on a `cai-core` version that was never published. The `npm pkg set` line after the bump is what fixes it, and the `node -e` check after that fails the build if the four versions ever fall out of step.
- **The npm pre-flight is `npm publish --dry-run`, not `npm whoami`.** Checked against npm 11's source: `publish.js` calls the OIDC token exchange *before* it branches on `--dry-run`, so a dry run genuinely proves the trusted publisher is configured. `npm whoami` goes through `getIdentity`, which only reads a token from `.npmrc` — with trusted publishing there is no token, so it would fail every time and prove nothing. The guard sits before the version bump for the same reason the Marketplace check does: a broken credential must not leave a bumped version and a pushed tag behind with no release.
- **`cai-core` publishes before `cai`**, because the CLI pins it exactly and the reverse order leaves a window in which `npm install @defysoftware/cai` cannot resolve.

Publishing authenticates with **Microsoft Entra ID via workload identity federation**, not a PAT — Marketplace PATs retire on 1 December 2026. `azure/login@v2` exchanges GitHub's OIDC token (hence `permissions: id-token: write`) for an Azure CLI session, and `vsce publish --azure-credential` picks it up through its credential chain (`EnvironmentCredential` → `AzureCliCredential` → …), requesting a token for the Azure DevOps resource `499b84ac-1321-427f-aa17-267ca6975798`. Only `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` are stored, and neither is a secret in the usual sense. No subscription is involved, so the login sets `allow-no-subscriptions`. Note the upstream docs describe this for **Azure Pipelines** (an `AzureCLI@2` task against an ADO service connection); the GitHub Actions form here is an adaptation of the same mechanism.

## `packages/core` — the CML API v2 client

`@defysoftware/cai-core`. Paths in this section are relative to `packages/core/`. Its only consumer is `packages/cli`; the extension may adopt it in Phase 5. Nothing in it may be broken by extension work, and nothing in the extension currently depends on it.

**Zero runtime dependencies is the constraint that shapes the package**, because the extension's own no-runtime-dependency rule has to survive adopting it. `openapi-typescript` emits types only; the request layer is hand-written against them; `swagger2openapi` and `openapi-typescript` are devDependencies that never ship.

`npm run generate` converts `spec/swagger.json` (Swagger 2.0 — `openapi-typescript` v7 reads OpenAPI 3.x only, hence the hop) into `src/generated/schema.ts`. The spec is committed because it lives on an internal host CI can never reach; `-- --url $CAI_URL` refetches it and `-- --check` fails on drift without writing. Regeneration is deterministic, so `--check` is safe to wire into CI.

Three things that are not obvious from reading the code:

- **The generated file is `schema.ts`, not `schema.d.ts`.** `tsc` treats a `.d.ts` under `rootDir` as input only and never copies it to `outDir`, so the published package's `export type { paths } from "./generated/schema"` would resolve to nothing. As a `.ts` it emits declarations plus an empty module, and the type-only re-export is still elided. Do not "tidy" it back to `.d.ts`.
- **The request options type is built with mapped-type key remapping, not `infer`.** A mapped type preserves the optional modifier, which is exactly what distinguishes `path: {...}` (required), `query?: {...}` (optional) and `path?: never` (absent) in openapi-typescript's output. TS strips `undefined` from an optional property in `infer` position, so an inference-based version makes every slot look required. `src/test/typing.test.ts` pins this down: `npm test` type-checks first, so each `@ts-expect-error` there is a real assertion that fails the build if the client ever degrades to `any`.
- **`CaiTransportError` and `CaiApiError` are deliberately different types.** No HTTP response at all is not the same as an answer, for the same reason `listEndpointProcesses` returns `null` rather than `[]` — a failed listing must never be read as "the thing is gone". The transport error also carries a `code`, dug out by `causeCode`: `String(err)` on a `fetch` rejection is `TypeError: fetch failed` and nothing more, the identical sentence for a bad host name, a refused port and an untrusted certificate, while the reason undici does have sits on a nested `cause`. The CLI turns the known codes into a one-line fix; without the code there is nothing to key that on.

Other invariants: the API key reaches `redact()` on every logged line and a `bearer \S+` pattern catches it even when a caller forgets to pass it in; `paginate` refuses to follow a repeated page token or run past `MAX_PAGES`, because an endless loop against a paginated API is worse than an error; `buildPath` percent-encodes every value and rejects both missing and undeclared parameters.

Five things about paths and files, all verified against a live instance on 2026-08-17 rather than inferred from the spec:

- **`{path}` may be percent-encoded.** The gateway decodes `%2F` and answers identically to a raw slash, so `buildPath`'s blanket encoding needs no exception for project file paths.
- **`buildPath` rejects `""` and `".."`.** Empty counts as missing, because an empty `project_id` would silently address a different operation. `".."` survives percent-encoding as a dot segment and is then resolved away by the URL layer, so it would reach the parent operation rather than a file — `files.ROOT` is `"."` for exactly this reason, since `.` resolves to the directory itself.
- **`ListProjectFiles` is not paginated and returns basenames.** It declares no `page_size`/`page_token` unlike every other listing, so `listFiles` makes one call with no `collect`; and listing `.local` returns `lib`, `bin`, `share`, not `.local/lib`. A caller walking the tree rejoins them itself.
- **`UploadFile` does not replace, and nothing in its answer says so.** Uploading onto an occupied path leaves the existing file alone, stores the new one beside it as `notes(1).txt` — browser-download style — and still returns 200 with an empty body. Read literally that is a silent no-op for the caller's purposes: an agent that re-uploads a script and then reads it back would see the stale one forever. `cai files put` therefore lists the destination directory first and refuses an occupied path unless `--force`, then re-lists to report the name that was actually created. Do not "simplify" that away.
- **`search_filter` is case-sensitive and matches substrings.** `{"name":"dse"}` returns nothing where `{"name":"DSE"}` returns the project, `{"name":"DS"}` also finds `DSE`, and `owner.username` behaves the same. Both facts shape `resolveProject`: the filter is a narrowing *hint*, matching happens on our side, an exact-case hit wins, and when the hint drops the project entirely it falls back to **one** unfiltered listing. That fallback is what makes `hanke/dse` resolve to the project CML reports as `HANKE`/`DSE` — which is the form the extension produces, since it prefixes bare names with a lower-cased `%USERNAME%`.

- **`projectRef` returns `owner/slug`, and the difference is not cosmetic.** A project CML displays as `DSE` has the slug `dse`, and `Real_DWH_Import` has `real_dwh_import`. Handed the display-name form, `cdswctl ssh-endpoint -p HANKE/DSE` does not fail: it prints nothing, creates no session and waits forever (verified 2026-08-18). A wrong project reference is therefore indistinguishable from a broken instance, so the one form known to resolve is the only one to hand it.

`client.bytes()` and `requestBytes` exist because the download operation declares no content type and project files are not necessarily text — `text()` would UTF-8 decode a parquet file and corrupt it silently. `send()` leaves the body unread on success so JSON and byte callers can each consume it their own way; on failure it reads text, because the error envelope is always JSON or nothing.

**`multipart.ts` and `options.rawBody` exist for exactly one operation.** `UploadFile` is the API's only `multipart/form-data` path, and two of its properties are unexpressible in the generated types: the form field **name is the destination path** (the spec says so — "the key being the location to upload to"), and the content is binary, which `openapi-typescript` renders as `string`. So the body is hand-built and sent through `client.raw`, `FetchInit.body` widened to `string | Uint8Array`, and `buildMultipart` takes its boundary as a parameter so a test can assert the exact bytes. The platform's `FormData` is not an option: the transport is injectable by design, so the extension can hand in a `node:https` implementation later. `assertUploadPath` is the fence that `buildPath` cannot be — the destination never appears in the URL, so nothing else would reject an absolute path or a `..` segment.

The safe-writes rule is **not** enforced here. `core` exposes `delete` because it is a client for the whole API; the fence is the CLI's command surface, the same way the extension's safety rule is enforced by never passing `cdswctl`'s blanket `/a` flag. What that means concretely: job runs, applications and file uploads have wrappers; `CreateApplication`, `DeleteApplication` and every other destructive operation deliberately have none, because an unused wrapper is an invitation.

`waitForJobRun` takes its clock and its sleep as options for the same reason the transport is injected — the polling loop is unit-tested without spending wall-clock time. `FINISHED_RUN_STATUSES` excludes `ENGINE_STOPPING` (it becomes `ENGINE_STOPPED`) and `ENGINE_UNKNOWN`: treating "we do not know" as finished is the same mistake as reading a failed listing as "the thing is gone".

Everything in the package is unit-testable — there is no VS Code API anywhere in it. `src/test/stub.ts` starts a real `http.createServer` on a real socket so the tests exercise the actual global-`fetch` transport rather than a double.

### `src/session/` — the session layer

Not an API client at all: `cdswctl.exe`, `session_history.json`, `~/.ssh/config`. It lives here because API v2 has **no session endpoints whatsoever** — no create, no stop, no SSH — so a session is a spawned process plus a file, and the CLI needs exactly the rules the extension already holds. Windows-only, and the only part of this package that spawns anything. Exported from the main index because both packages use node10 module resolution, where a subpath export would not resolve.

**It is a port, and the extension still has its own copy.** Deliberate, and the trade-off is stated rather than hidden: making the extension import `@defysoftware/cai-core` would give it a runtime dependency, and the VSIX has none — `vsce package --no-dependencies` is load-bearing for the reason documented above, so adopting `core` means adding a bundler to a shipping extension. That is its own change with its own release risk, so it is not in this phase. What guards the duplication meanwhile: `src/test/session.test.ts` and `sessionSsh.test.ts` assert the same rules the extension's `sessionHistory.test.ts`, `sessionStatus.test.ts` and `sshConfig.test.ts` assert, including that the JSON written is byte-identical in shape. **The extension's copy is the reference.** A rule changed on one side without the other is a session the sidebar cannot see, so change both or neither.

Four things in it that are not guesses:

- **`ssh-endpoint -r` needs a numeric runtime id, and the API cannot supply one.** `GET /api/v2/runtimes` returns `image_identifier` and no id at all (verified 2026-08-18), so `listCdswctlRuntimes` shells out to `cdswctl runtimes list` — which does return `{runtimes: [{id, ...}]}`. That is why there is a `cai session runtimes` as well as a `cai runtimes list`; they are not duplicates.
- **`shell: true` with an argv is a command-injection hole**, which is what Node 24 deprecates in DEP0190. The `%CML_API_KEY%` indirection needs a shell to expand the variable, so `shellCommand` builds one quoted command line instead, refuses any part containing a quote, and `cdswctlLogin` additionally refuses a URL or username that does not look like one. The key still never appears in our argv.
- **`cdswctl login /t` is not an alternative to `/y`.** Tested 2026-08-18: `-t` with this key prompts for a password rather than accepting it, so `/y` is correct and the old open question is closed.
- `extensionStoragePath()` computes VS Code's `globalStorageUri` path itself (`%APPDATA%/Code/User/globalStorage/defysoftwaresolutions.cai-connector`). `CAI_STORAGE_DIR` overrides it, which is how the tests avoid touching real sessions.

## `packages/cli` — the `cai` command line interface

`@defysoftware/cai`, binary `cai`. Paths in this section are relative to `packages/cli/`. oclif v4, CommonJS, the same ES2020 target and `strict` settings as the other packages. Its runtime dependencies are `@oclif/core` and `@defysoftware/cai-core` and nothing else — the table renderer and the hidden-input prompt are hand-written for that reason, not for fun.

**Reads plus safe writes as of Phase 4** — `files put`, `jobs run`, `runs stop`, `apps restart|stop`. **Nothing deletes anything.** The fence is the command surface, not a check: no verb reaches a destructive path, and `cai raw` accepts only GET. That last one lives in `src/lib/readonly.ts` with its own test rather than inline in the command, because "the escape hatch cannot write" is a security property and not a detail of one command's parsing. Adding a `cai * delete`, or widening `raw`, would undo the whole posture; `writes.test.ts` asserts that `apps delete` is simply not a command.

Two properties the write commands hold that are easy to lose in a refactor:

- **Nothing starts before its arguments parse.** `jobs run` parses `--env` before it builds a client, and `files put` validates the destination before the project lookup, so a mistyped flag costs zero calls and cannot half-start a workload. The tests assert `requests.length === 0` for both.
- **`files put` never claims to have replaced anything.** It reports the requested `path` and the `stored` name separately, because the API stores a numbered duplicate instead of overwriting (see the `core` section). Saying "replaced" would be a lie an agent then acts on.

**Agent-first is a set of concrete decisions, not a slogan.** JSON on stdout by default and `--table` for humans — that way round. Errors are JSON on **stderr**, so stdout stays parseable even on failure. `--verbose` logs to stderr for the same reason. Exit codes are a contract in `src/lib/exit.ts`, so a caller branches instead of parsing prose; `EXIT.API` (5) and `EXIT.TRANSPORT` (6) are separate for the same reason `core` splits its two error types, and `EXIT.WORKLOAD` (8) is that idea one level up — the call succeeded, the job run did not, so a caller must not retry and start the job twice. It is set on `process.exitCode` *after* the run has been printed rather than thrown, because the run's id is the useful part of that outcome. Colour is off unless `FORCE_COLOR` is set.

Four things that will not be obvious from reading the code:

- **`BaseCommand.catch` sets `process.exitCode`; it must never call `this.exit()`.** oclif's exit path calls `process.exit()` immediately, and on Windows that aborts the process with a libuv assertion (`!(handle->flags & UV_HANDLE_CLOSING)`, `src/win/async.c`) when an idle keep-alive socket from an earlier request in the same command is still open. The process then dies with 127 and the chosen exit code is lost. This was reproducible 5/5 on `cai files ls <project> ..`, which is why that case is a test.
- **The command tests spawn the real binary.** In-process execution was tried and abandoned: capturing output means replacing `process.stdout.write`, and `node --test`'s own reporter writes there too, so a whole file's results vanished into the capture buffer. A child process also makes the exit code a genuine observation rather than a reading of `process.exitCode`.
- **`runCommand` strips the ambient environment.** Anyone running these tests on a machine that uses the CLI has `CML_API_KEY` set, which silently satisfies the very resolution the tests check — a missing-credentials assertion passed for the wrong reason until this was added. `APPDATA`/`XDG_CONFIG_HOME` are pointed at an empty temporary directory for the same reason.
- **No secret ever reaches argv from our side.** `--api-key` exists but warns, because argv is readable process-wide — the same reasoning behind the `%CML_API_KEY%` indirection in the extension's `auth.ts`. `cai login` validates a key against the instance *before* writing it, so a typo never becomes a stored credential that fails every later command with a confusing error.

`oclif.manifest.json` is generated by `prepack` and gitignored; only the tarball needs it. `bin/run.js` and `scripts/install-skills.js` are plain JavaScript outside `rootDir`, so `tsc` never sees them.

### `cai session *` — the tunnel commands

Windows-only, gated by `assertWindows()`, because they drive `cdswctl.exe` and find tunnels with a PowerShell `Win32_Process` scan. They write the extension's `session_history.json`, which is a correctness requirement and not a convenience: the extension kills every endpoint process **no stored record claims**, so a CLI with its own registry would have its tunnels killed by the next VS Code window that opened.

**`lib/tunnel.ts` is where the CLI has to differ from the extension.** The extension pipes `cdswctl`'s stdio and stays alive to read it; the CLI exits while the tunnel must keep running, and a pipe whose reader has gone is a broken pipe waiting to kill the child. So the child gets `stdio: ["ignore", fd, fd]` onto a log file it owns under `globalStorage/logs/`, and the command tails that file for the same two regexes. Three consequences worth keeping: the child cannot be killed by our exit, the log is the only record of what a failed endpoint said (the extension gets that from its output channel), and `waitForReady` must watch for the child *exiting* as well as for the ready line, or a login failure would sit out the full 60-second timeout. `src/test/tunnel.test.ts` covers all of that against a stand-in that prints the two lines and lingers.

The order of writes is the extension's, for the extension's reasons: record written immediately after spawn (before that write the pid belongs to no session and a starting window would sweep it up), session id patched in the moment it is scraped (if creation then fails it is the only handle on a session CML has already started), then activate, then sync the SSH config. `session kill` stops the CML session **before** killing the tunnel, so a connected Remote-SSH window survives until the remote side is actually gone, and leaves the record flagged `error` rather than "cleaned up" when the stop could not be confirmed.

**A silent timeout is a statement about the project, not about the tunnel.** `cdswctl ssh-endpoint` given a project that cannot start a session prints *nothing* and waits — no error, no exit — so `waitForReady` hitting its deadline with a zero-byte log is the one case worth interpreting rather than merely reporting. Verified 2026-08-18 by elimination: `HANKE/dse` timed out silently across repeated attempts, on both project-reference forms and with several runtimes, while `HANKE/ingestion` was ready in 17s with the same binary, flags, runtime and addon, and `cdswctl sessions list` answered instantly and empty for the silent project. `silentTimeoutHint` in `commands/session/create.ts` therefore fires only on an empty log and points at the project. Keep that condition: a log with content means cdswctl already said what was wrong, and guessing over it would bury the real message.

`skills/cai/SKILL.md` is installed into `~/.claude/skills` by the `postinstall` script. It never fails an install, never overwrites a locally edited copy (it writes `SKILL.md.new` beside it and says so), and skips workspace installs of this repository — `INIT_CWD` containing this package plus a `.git` there means somebody is working on the CLI, not installing it. `CAI_SKIP_SKILLS=1` opts out, `CAI_SKILLS_DIR` redirects.

## Architecture

`extension.ts` is a thin registration layer: it wires commands to `*Flow` functions, builds the `SessionPanel` tree view, and runs startup orphan cleanup. All real work lives in the flow modules, and **every endpoint creation funnels through `executeConnect` in `sessionManager.ts`** — `connectFlow`, `reconnectFlow` (recreate from `last_session.json`), and `recreateSessionFlow` (recreate from a sidebar item) each build a `ConnectParams` and call it.

`connectFlow` is **event-driven, not linear**: it logs in, assembles a `SessionFormInit`, and hands control to the `SessionFormPanel` webview. Nothing happens until the webview posts `submit`, which lands in `launchSession`. The old sequence of five QuickPick/InputBox prompts is gone.

| Module | Responsibility |
|---|---|
| `extension.ts` | Command/view registration, startup orphan cleanup, `deactivate()`, `resetApiKey` + `clearCache` flows |
| `auth.ts` | API key prompt/storage, CML URL prompt, `cdswctl login`, `resolveAndLogin` |
| `cdswctl.ts` | CLI wrapper — PATH/config resolution, `runCdswctl` via `spawn` with `execFile` fallback |
| `connectFlow.ts` | `connectFlow` (opens the session form) + `launchSession` + `browseRuntimesFlow` |
| `resourceInput.ts` | Pure resource parsing/validation — comma decimals, fractional CPUs |
| `sessionEdit.ts` | `editSessionFlow` — edit a stored session config from the sidebar |
| `sessionForm.ts` | `SessionFormPanel` — webview lifecycle and message dispatch |
| `sessionFormData.ts` | Assembles `SessionFormInit`; `refreshRuntimes` |
| `sessionFormHtml.ts` | Webview HTML shell, CSP + nonce |
| `sessionFormModel.ts` | Pure — `normalizeProjectName`, authoritative `validateSessionForm` |
| `disconnectFlow.ts` | `disconnectFlow` — pick which live sessions to tear down |
| `endpointManager.ts` | `listEndpointProcesses`, `killUntrackedEndpointProcesses` (PowerShell scan) |
| `endpointRegistry.ts` | Pure — the `Map` of endpoints this host spawned, with per-endpoint surrender flags |
| `orphanCleanup.ts` | `cleanUpOrphansFlow` command, `warnAboutOrphans` startup nudge |
| `output.ts` | `createTimestampedOutput` — the one `OutputChannel`, stamping every line |
| `reconnectFlow.ts` | Recreate the last session, validating saved runtime/addon still exist |
| `runtimeManager.ts` | Fetches runtimes, disk TTL cache |
| `runtimePicker.ts` | Runtime/addon QuickPicks, `filterLatestRuntimes` |
| `sessionActions.ts` | `joinSessionFlow`, `recreateSessionFlow` (sidebar item actions) |
| `sessionHistory.ts` | Pure — `session_history.json` read/write, `addOrUpdateSession`, `patchSession` |
| `sessionKill.ts` | `killSessionRecord` — kill one endpoint PID + stop its remote CML session |
| `sessionManager.ts` | `executeConnect` and the scrape/abort helpers around it |
| `sessionPanel.ts` | Sidebar `TreeDataProvider`, history-file watcher, status poll timer |
| `sessionReconciler.ts` | Local/process/CML reconciliation, orphan stopping, SSH-config sync |
| `sessionStatus.ts` | Pure — `rollUpStatus`, `isOrphanedOnCml`, `statusSummary`, `parseSessionIds`, `capRecords` |
| `sshConfig.ts` | Pure — host aliases and the N managed `Host cml-*` blocks in `~/.ssh/config` |
| `state.ts` | `last_session.json` load/save |
| `types.ts` | Shared types and all magic constants |
| `utils.ts` | Storage paths, PID liveness, arg building, `stopCmlSessions` |

### Endpoint lifecycle — the core of the extension

`executeConnect` spawns `cdswctl ssh-endpoint` **detached but with piped stdio**, and screen-scrapes its output line by line for two regexes:

- `on session (\S+) in project` → the CML session ID (needed for targeted cleanup)
- `ssh -p (\d+) (\S+)` → endpoint ready; port + user@host

That race is bounded by `ENDPOINT_READY_TIMEOUT_MS` (60s). The order of writes is load-bearing:

1. **`spawn` → history record written immediately** with `status: "starting"` and the pid. Until that write lands the pid belongs to no session, and a window activating in the (up to 60s) startup gap would sweep it up as untracked and kill the tunnel mid-creation.
2. Session id patched into the record **as soon as it is scraped**, before the endpoint is ready. If creation then fails, that id is the only handle on the session CML has already started.
3. On ready: record upgraded to `active` with the port, **then** `syncSshConfigFromHistory`, **then** surrender, **then** `openFolder`.

**The subtlest invariant in the codebase**: the `cdswctl` process *is* the SSH tunnel, so it must outlive the extension host that spawned it. Two mechanisms protect it, and breaking either silently kills users' sessions:

1. `ActiveEndpoint.surrendered` (per endpoint, in `endpointRegistry.ts`) is set immediately before `vscode.openFolder`. `deactivate()` skips every surrendered endpoint. It is per-endpoint, not a global flag, because one host can own several tunnels.
2. `activate()` kills only endpoint processes **no stored record claims** (`killUntrackedEndpointProcesses`). A session another window created is in the shared history file, so this host spares it. The old "kill everything unless one looks alive" rule could not tell those apart, which is why it had to go.

`listEndpointProcesses` shells out to PowerShell `Get-CimInstance Win32_Process` to find `cdswctl.exe` processes whose command line contains `ssh-endpoint` — inherently Windows-only. It returns **`null` on failure, not `[]`**: no evidence is not evidence of absence, and treating the two alike would kill healthy tunnels. Cross-checking recorded pids against this list is also what makes reconciliation immune to pid reuse.

### Parallel sessions

Anything that assumes "the current session" is a bug. Concretely:

- **Each session owns an SSH host alias**, `cml-<project-slug>` (`-2`, `-3` on collision), assigned once at creation and stored on the record. It ends up inside the remote window's URI, so it must never be recomputed. `syncSshConfig` rewrites *all* managed blocks in one pass; incremental edits cannot guarantee a removed session leaves no stale alias behind.
- **Connect never stops anything.** A second session in a project you already have open is a supported thing to want. `Recreate` stops only its own record; `Kill` and `Disconnect` are the explicit ways to end a session.
- **Every status is two statuses.** `endpointStatus` (local pid) and `cmlStatus` (remote session) are tracked separately and both rendered; `rollUpStatus` combines them only for icons and menus. `error` means they disagree.

### State files (all under `context.globalStorageUri.fsPath`)

| File | Constant | Role |
|---|---|---|
| `session_history.json` | `HISTORY_FILE` | **The single source of truth.** Up to `MAX_SESSION_RECORDS` (8), any number `active`. Only `inactive` records are ever dropped by the cap — discarding a live one would make its endpoint look untracked to the next orphan sweep. Watched by `SessionPanel`. |
| `last_session.json` | `SESSION_FILE` | Last config, for `reconnectFlow`. `disconnectedAt` marks an explicit user disconnect. |
| `runtimes_cache.json` | `CACHE_FILE` | `RuntimeManager` TTL cache (`caiConnector.cacheHours`). |

`endpoint_state.json` (`STATE_FILE`) is **gone** — it held one endpoint and could not represent several. `activate()` deletes any leftover copy. Do not reintroduce it; add fields to the history record instead.

`SessionPanel` watches `session_history.json` directly, so sessions created or torn down by other windows appear without any cross-window messaging. The watcher only calls `refresh()`; `reconcileAndRefresh()` (which writes) is called from flows and commands, never from the watcher, so there is no write→watch→write loop.

### Reconciliation

Three tiers, cheapest first — pick the weakest one that answers the question:

| Function | Cost | Answers |
|---|---|---|
| `reconcileLocal` | sync, `process.kill(pid, 0)` | Is the pid alive? Safe on a 10s timer. |
| `reconcileProcesses` | one PowerShell spawn | Is the pid *really our endpoint*? Returns the pid set the orphan sweep must spare. |
| `reconcileWithCml` | one `sessions list` per project | Is the CML session still running? |

### Safety rule: never stop CML sessions in bulk

`ConnectParams.autoStopSessions` is `string | false` — a *specific* session ID or nothing. Only sessions the extension itself recorded in `session_history.json` / `last_session.json` are ever stopped, always via `sessions stop /s <id> /p <project>`. `cdswctl`'s blanket `/a` flag was deliberately removed because it killed unrelated user sessions; do not reintroduce it.

Automatic orphan cleanup (`stopOrphanedCmlSessions`) is the one place the extension stops a session the user did not point at, and it is fenced accordingly: the record must be in our own history, it must have a session id, its endpoint must be gone, **and CML must have confirmed the session `running`**. A `cmlStatus` of `unknown` is never sufficient — `isOrphanedOnCml` encodes exactly that, and every widening of it is a bug. `caiConnector.autoStopOrphanedSessions` (default `true`) turns the automatic pass off; the `Clean Up Orphaned Sessions` command stays available either way.

### cdswctl quirks

- **`sessions stop /s` prints `unexpected end of JSON input` on success.** Four call sites (`sessionKill.killSessionRecord`, `sessionManager.abortSession`, `sessionReconciler.stopOrphanedCmlSessions`, `utils.stopCmlSessions`) match that string and treat it as success. Preserve this when touching stop logic — a stop that is wrongly read as failed leaves the record flagged as an orphan forever.
- **`sessions list` output is not contractual.** `parseSessionIds` tokenises generously rather than assuming columns. Over-matching is harmless (the result is only tested for ids we recorded); a failed *listing* leaves `cmlStatus` untouched rather than setting it to something the cleanup pass might act on.
- **The API key never reaches argv**: `ensureLoggedIn` passes `%CML_API_KEY%` as a literal argument while injecting the real key as an env var and setting `shell: true`, so Windows expands it inside the child. Failure output is sanitized with `.split(apiKey).join("***")` before logging.
- `runCdswctl` spawns with `cwd: path.dirname(cdswctlPath)` (the CLI needs it) and falls back to `execFile` if `spawn` errors.

### The session form webview

The only UI code in the repo. `media/sessionForm.{css,js}` are **plain CSS and ES2020 shipped as-is** — `media/` is outside `rootDir: src`, so `tsc` never touches them and they are not type-checked. They cannot `require` compiled modules.

- **Theming is free**: every colour and font comes from a `--vscode-*` variable, so the panel follows the user's theme with no light/dark branching of its own. Never hard-code a colour; add a token to the `:root` block in `sessionForm.css` instead.
- **Validation is deliberately duplicated.** `media/sessionForm.js` re-implements `parseNumeric` and the three validators for instant feedback; `validateSessionForm` in `sessionFormModel.ts` is the authority and treats every payload as untrusted. Changing a rule means changing both — the pure side is the one with tests.
- **No untrusted string is interpolated into HTML.** `sessionFormHtml.ts` emits a static shell; the script fills it via `textContent` and `createElement`. Project names and runtime descriptions come from CML, so keep it that way. CSP is `default-src 'none'` with a per-render nonce.
- **The panel must never delay the endpoint handoff.** `executeConnect` takes an optional `onProgress` reporter; every call is synchronous, wrapped in try/catch, and never awaited, so it cannot reorder the history-write → `surrenderEndpoint` → `openFolder` sequence. `launchSession` disposes the panel only *after* `executeConnect` returns.
- The API key prompt stays a native `showInputBox`. **No secret ever enters the webview** — `SessionFormInit` carries none.
- The view layer has no automated coverage. Verify changes manually with *Developer: Toggle Developer Tools*; a CSP or `asWebviewUri` mistake renders a blank panel with an error only in that console.

### Other notes

- **`ServerAliveInterval 30` / `ServerAliveCountMax 6` in the generated host block are load-bearing.** The connection runs through the `cdswctl` tunnel to CML, and gateways/proxies in that path cut connections idle for ~300s; OpenSSH's inherited `TCPKeepAlive` only fires after the OS default of ~2h. Without the keepalives an idle remote window loses its tunnel on its own, and because `cdswctl` never re-dials and the extension has no auto-reconnect, the window is unrecoverable — Remote-SSH's reconnect finds a listener with a dead upstream. Do not remove them as "tuning".
- **Every line in the output channel is timestamped**, because `activate()` builds the channel via `createTimestampedOutput`. Diagnosing a dropped tunnel means lining these lines up against the Remote-SSH log, which is impossible otherwise. Do not call `vscode.window.createOutputChannel` directly, and keep `appendLine` (not `append`) for whole messages — the stamp is added there.
- `reconcileLocal`/`reconcileProcesses` take an optional `log` callback and emit one line the moment a recorded endpoint pid disappears. It is the only record of *which half of a session died first*, which is what distinguishes "the orphan pass stopped this CML session" from "CML ended it" after the fact. `stopOrphanedCmlSessions` requires the endpoint to be gone first, so the ordering is the whole answer.
- `sshConfig.syncSshConfig` rewrites every managed block in one pass, correctly handling `Host` lines that list several patterns (`Host cml-a other`) and collapsing pre-existing duplicates. A block is "ours" iff one of its patterns matches `cml` or `cml-<slug>` — `cmlserver` and `my-cml-thing` are left alone. It returns `false` unless every requested alias ends up in the file exactly once. Keep this module VS Code-free so it stays unit-testable.
- Sessions created before parallel support have no `hostAlias`. `syncSshConfigFromHistory` falls back to the bare legacy `cml` host for them so a window already connected through it survives the upgrade, and `joinSessionFlow` assigns a real alias on first use.
- `connectFlow` and `reconnectFlow` hard-guard on `process.platform !== "win32"`.
- Project names without `/` are prefixed with the lowercased `USERNAME`, producing `owner/project`.
- Activation is lazy (contributed commands + the sidebar view). There is no `activationEvents` array; VS Code infers it.
- There is **no idle monitor and no auto-reconnect**. Both were removed along with the detached `endpointHost.ts` helper in commit `cdad9fa`; the endpoint now runs as a child of the extension host. Do not reference `endpointHost.ts`, `endpointHostUtils.ts`, or `idleMonitor.ts` — they no longer exist.

### The activity-bar icon

`media/cai-sidebar.svg` is **generated**, not hand-authored — do not edit it directly. It is traced from `media/cai-connector-side.png` by `tools/icon-trace/` (`npm install && npm run build` in that directory), which also emits `media/cai-sidebar-mark.svg`, the same mark without the CAI wordmark. `tools/icon-trace` is a private package with its own dependencies and is excluded from the VSIX by `.vscodeignore`, so the extension keeps its zero-runtime-dependency rule.

Two things to know before touching the icon: the SVG's `viewBox="0 0 24 24"` + `currentColor` + no-explicit-opacity config is copied from a previously shipped icon and is known to work — VS Code recolours the icon and applies its own 60%/100% opacity, so never bake in a colour. And judge any change at **24px**, not at a large preview; everything looks fine at 96px. `docs/icon-tracing.md` has the full rationale plus two non-obvious facts about the artwork (the terminal window has no right edge; the cloud's right lobe is not a circle).

## Code Style

- Double quotes, semicolons, 2-space indent, trailing commas in multi-line literals.
- Imports ordered Node built-ins → `vscode` → local; `import * as X` for the first two, `{ named }` for local modules.
- **`type` aliases, never `interface`.** Shared types and all magic constants go in `src/types.ts`.
- `camelCase` functions/variables, `PascalCase` types and classes, `*Flow` suffix for command entry points.
- **Synchronous `fs`** (`readFileSync`/`writeFileSync`/`existsSync`) throughout — not `fs/promises`.
- Prefer `async/await` over `.then()` chains.
- Errors: always `String(err)`, never `.message`. User-facing via `vscode.window.showErrorMessage()`, detail via `output.appendLine()`.

```typescript
try {
  // operation
} catch (err) {
  vscode.window.showErrorMessage(`User-friendly message: ${String(err)}`);
  output.appendLine(`Detailed message: ${String(err)}`);
  return;
}
```

- `OutputChannel` is dependency-injected as a parameter, never a module global. In `core` and `cli` the equivalent is the `log` callback passed to `createClient`.
- Every `src/*.ts` file carries the GPL-3.0 header comment — copy it into new files. `packages/cli/bin/run.js` and `packages/cli/scripts/install-skills.js` carry it too.
- **150-line soft limit per file.** Currently exceeded by `sessionManager.ts` (296), `sessionReconciler.ts` (243), `types.ts` (219), `extension.ts` (215), `sessionFormHtml.ts` (204, almost entirely markup), `sessionForm.ts` (195), `sshConfig.ts` (189), `sessionPanel.ts` (167), `runtimePicker.ts` (163), `sessionStatus.ts` (159), `cdswctl.ts` (157), `sessionFormData.ts` (154), `packages/cli/src/baseCommand.ts` (156), and in `packages/core/src` `operations/runs.ts` (171), `types.ts` (163), `http.ts` (157), `operations/projects.ts` (151), `session/cdswctl.ts` (190) and `session/sshConfig.ts` (171), plus in `packages/cli/src` `commands/session/create.ts` (258 — the endpoint-creation sequence, which the extension spends 312 lines on), `lib/tunnel.ts` (172) and `commands/session/kill.ts` (155); split by responsibility rather than growing these further. The two `media/` files are exempt — they are assets, not modules.
- In `packages/cli`, command names come from the file path (`src/commands/projects/list.ts` → `cai projects list`), so those files are the one exception to the `camelCase` file-name rule — oclif decides. Everything else there follows the conventions above.

## Security

- **API keys**: stored via `context.secrets` (`SECRET_KEY = "CML_API_KEY"`), prompted with `password: true`. Never write them to settings, argv, or logs; on retrieval failure re-prompt rather than silently proceeding.
- **Sensitive logging**: `output.appendLine()` echoes raw CLI output — redact secrets before logging (see the `.split(apiKey).join("***")` pattern in `auth.ts`).
- **State location**: cache and state files stay under `globalStorageUri` (OS-protected user directory), never workspace-relative.

## Agent Conventions

- **Never use shell commands to modify source files.** Use the file-editing tools. Shell approaches like `sed -i`, `cp`, `head`, or output redirection (`>`) to write or truncate source files are fragile and non-reversible — do not use them even as a fallback.
- Run `npm test` after changes; it type-checks the whole project as well as running the tests.
- `docs/plans/` holds historical planning documents that describe superseded designs. Do not treat them as current architecture.
