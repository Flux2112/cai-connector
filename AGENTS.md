# Agent Guidelines for CAI Connector

> Single source of truth for AI coding agents working in this repository.
> `CLAUDE.md` includes this file; keep guidance here rather than duplicating it elsewhere.

## Project Overview

Windows-only VS Code extension (`extensionKind: ["ui"]`) that creates SSH endpoints on Cloudera AI (CML) by driving the external `cdswctl.exe` CLI, writes a `Host cml-<project>` block into `~/.ssh/config` per session, then hands off to Remote-SSH. **Several sessions can run in parallel**, each with its own endpoint process, host alias and remote window.

- **Language**: TypeScript 5.4, ES2020 target, CommonJS output, `strict` mode
- **Runtime deps**: none — Node built-ins and the VS Code API only
- **Requires**: VS Code 1.85.0+, `cdswctl.exe`, the Remote-SSH extension
- No bundler and no linter are configured; output is raw CommonJS in `out/`

## Commands

```bash
npm run compile   # tsc -p ./            → out/
npm run watch     # tsc watch mode
npm test          # tsc, then: node --test "out/test/**/*.test.js"
npm run package   # vsce package → .vsix
```

Tests use Node's built-in `node:test` runner — there is no Mocha/Jest and no `@vscode/test-electron`. Test files live in `src/test/` as `*.test.ts` and compile to `out/test/`. 110 tests across `sshConfig.test.ts` (32), `sessionStatus.test.ts` (33), `sessionHistory.test.ts` (12), `resourceInput.test.ts` (16), and `sessionFormModel.test.ts` (17).

Run a single test by name (compile first):

```bash
npm run compile && node --test --test-name-pattern "never discards a live session to make room" "out/test/**/*.test.js"
```

Only modules free of the VS Code API are unit-testable this way: `sshConfig.ts`, `sessionStatus.ts`, `sessionHistory.ts`, `resourceInput.ts` and `sessionFormModel.ts` (all covered), plus `endpointRegistry.ts`, `runtimeManager.ts`, `cdswctl.ts`, and the pure helpers in `utils.ts` (`buildEndpointArgs`, `multiTermFilter`) — these take `OutputChannel` as a parameter, which can be stubbed. Keep new pure logic out of `sessionForm.ts` and `sessionReconciler.ts` so it stays testable.

Debug the extension with the **Run Extension** launch config (`.vscode/launch.json`); it runs `npm: compile` first.

**CI publishes on every push to `main`** (`.github/workflows/publish.yml`): bumps the minor version, commits `chore: bump minor version [skip ci]`, tags `v<version>`, then `vsce publish` to the Marketplace. Treat any merge to `main` as a release.

Publishing authenticates with **Microsoft Entra ID via workload identity federation**, not a PAT — Marketplace PATs retire on 1 December 2026. `azure/login@v2` exchanges GitHub's OIDC token (hence `permissions: id-token: write`) for an Azure CLI session, and `vsce publish --azure-credential` picks it up through its credential chain (`EnvironmentCredential` → `AzureCliCredential` → …), requesting a token for the Azure DevOps resource `499b84ac-1321-427f-aa17-267ca6975798`. Only `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` are stored, and neither is a secret in the usual sense. No subscription is involved, so the login sets `allow-no-subscriptions`. Note the upstream docs describe this for **Azure Pipelines** (an `AzureCLI@2` task against an ADO service connection); the GitHub Actions form here is an adaptation of the same mechanism.

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

- `sshConfig.syncSshConfig` rewrites every managed block in one pass, correctly handling `Host` lines that list several patterns (`Host cml-a other`) and collapsing pre-existing duplicates. A block is "ours" iff one of its patterns matches `cml` or `cml-<slug>` — `cmlserver` and `my-cml-thing` are left alone. It returns `false` unless every requested alias ends up in the file exactly once. Keep this module VS Code-free so it stays unit-testable.
- Sessions created before parallel support have no `hostAlias`. `syncSshConfigFromHistory` falls back to the bare legacy `cml` host for them so a window already connected through it survives the upgrade, and `joinSessionFlow` assigns a real alias on first use.
- `connectFlow` and `reconnectFlow` hard-guard on `process.platform !== "win32"`.
- Project names without `/` are prefixed with the lowercased `USERNAME`, producing `owner/project`.
- Activation is lazy (contributed commands + the sidebar view). There is no `activationEvents` array; VS Code infers it.
- There is **no idle monitor and no auto-reconnect**. Both were removed along with the detached `endpointHost.ts` helper in commit `cdad9fa`; the endpoint now runs as a child of the extension host. Do not reference `endpointHost.ts`, `endpointHostUtils.ts`, or `idleMonitor.ts` — they no longer exist.

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

- `OutputChannel` is dependency-injected as a parameter, never a module global.
- Every `src/*.ts` file carries the GPL-3.0 header comment — copy it into new files.
- **150-line soft limit per file.** Currently exceeded by `sessionManager.ts` (296), `sessionReconciler.ts` (243), `types.ts` (219), `extension.ts` (215), `sessionFormHtml.ts` (204, almost entirely markup), `sessionForm.ts` (195), `sshConfig.ts` (189), `sessionPanel.ts` (167), `runtimePicker.ts` (163), `sessionStatus.ts` (159), `cdswctl.ts` (157), and `sessionFormData.ts` (154); split by responsibility rather than growing these further. The two `media/` files are exempt — they are assets, not modules.

## Security

- **API keys**: stored via `context.secrets` (`SECRET_KEY = "CML_API_KEY"`), prompted with `password: true`. Never write them to settings, argv, or logs; on retrieval failure re-prompt rather than silently proceeding.
- **Sensitive logging**: `output.appendLine()` echoes raw CLI output — redact secrets before logging (see the `.split(apiKey).join("***")` pattern in `auth.ts`).
- **State location**: cache and state files stay under `globalStorageUri` (OS-protected user directory), never workspace-relative.

## Agent Conventions

- **Never use shell commands to modify source files.** Use the file-editing tools. Shell approaches like `sed -i`, `cp`, `head`, or output redirection (`>`) to write or truncate source files are fragile and non-reversible — do not use them even as a fallback.
- Run `npm test` after changes; it type-checks the whole project as well as running the tests.
- `docs/plans/` holds historical planning documents that describe superseded designs. Do not treat them as current architecture.
