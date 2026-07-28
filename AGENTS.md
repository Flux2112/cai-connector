# Agent Guidelines for CAI Connector

> Single source of truth for AI coding agents working in this repository.
> `CLAUDE.md` includes this file; keep guidance here rather than duplicating it elsewhere.

## Project Overview

Windows-only VS Code extension (`extensionKind: ["ui"]`) that creates an SSH endpoint on Cloudera AI (CML) by driving the external `cdswctl.exe` CLI, writes a `Host cml` block into `~/.ssh/config`, then hands off to Remote-SSH.

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

Tests use Node's built-in `node:test` runner — there is no Mocha/Jest and no `@vscode/test-electron`. Test files live in `src/test/` as `*.test.ts` and compile to `out/test/`. 44 tests across `sshConfig.test.ts` (11), `resourceInput.test.ts` (16), and `sessionFormModel.test.ts` (17).

Run a single test by name (compile first):

```bash
npm run compile && node --test --test-name-pattern "collapses multiple existing Host cml blocks" "out/test/**/*.test.js"
```

Only modules free of the VS Code API are unit-testable this way: `sshConfig.ts`, `resourceInput.ts` and `sessionFormModel.ts` (all covered), plus `runtimeManager.ts`, `cdswctl.ts`, and the pure helpers in `utils.ts` (`buildEndpointArgs`, `multiTermFilter`) — these take `OutputChannel` as a parameter, which can be stubbed. Keep new pure logic out of `sessionForm.ts` so it stays testable.

Debug the extension with the **Run Extension** launch config (`.vscode/launch.json`); it runs `npm: compile` first.

**CI publishes on every push to `main`** (`.github/workflows/publish.yml`): bumps the minor version, commits `chore: bump minor version [skip ci]`, tags `v<version>`, then `vsce publish` to the Marketplace. Treat any merge to `main` as a release.

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
| `endpointManager.ts` | `killOrphanedEndpointProcesses` (PowerShell process scan) |
| `reconnectFlow.ts` | Recreate the last session, validating saved runtime/addon still exist |
| `runtimeManager.ts` | Fetches runtimes, disk TTL cache |
| `runtimePicker.ts` | Runtime/addon QuickPicks, `filterLatestRuntimes` |
| `sessionActions.ts` | `joinSessionFlow`, `recreateSessionFlow` (sidebar item actions) |
| `sessionHistory.ts` | `session_history.json` read/write and status reconciliation against CML |
| `sessionKill.ts` | `killSessionRecord` — kill endpoint PID + stop the remote CML session |
| `sessionManager.ts` | `executeConnect`, `disconnectFlow`, active-endpoint module state |
| `sessionPanel.ts` | Sidebar `TreeDataProvider`, state-file watcher |
| `sshConfig.ts` | Rewrites the `Host cml` block in `~/.ssh/config` |
| `state.ts` | `activeProject` setter, `last_session.json` load/save |
| `types.ts` | Shared types and all magic constants |
| `utils.ts` | Storage paths, PID liveness, state-file I/O, arg building, resource prompt, `stopCmlSessions` |

### Endpoint lifecycle — the core of the extension

`executeConnect` spawns `cdswctl ssh-endpoint` **detached but with piped stdio**, and screen-scrapes its output line by line for two regexes:

- `on session (\S+) in project` → the CML session ID (needed for targeted cleanup)
- `ssh -p (\d+) (\S+)` → endpoint ready; port + user@host

That race is bounded by `ENDPOINT_READY_TIMEOUT_MS` (60s). On ready it writes `endpoint_state.json`, updates the SSH config, records session history **synchronously**, then opens the remote window.

**The subtlest invariant in the codebase**: the `cdswctl` process *is* the SSH tunnel, so it must outlive the extension host that spawned it. Two mechanisms protect it, and breaking either silently kills users' sessions:

1. `surrenderedToSsh` (module-level flag in `sessionManager.ts`) is set to `true` before `vscode.openFolder`. `deactivate()` returns early when it is set instead of killing the endpoint.
2. `activate()` scans session history for a record with `status === "active"` and a live `endpointPid`; if found it **skips** `killOrphanedEndpointProcesses` entirely. This is why the history record is written before the window opens, not after.

`killOrphanedEndpointProcesses` shells out to PowerShell `Get-CimInstance Win32_Process` to find `cdswctl.exe` processes whose command line contains `ssh-endpoint` — inherently Windows-only, best-effort, returns 0 on failure.

### State files (all under `context.globalStorageUri.fsPath`)

| File | Constant | Role |
|---|---|---|
| `endpoint_state.json` | `STATE_FILE` | Current endpoint (`"starting" \| "ready" \| "error"`). Watched by `SessionPanel`; deleting it marks all history inactive. |
| `session_history.json` | `HISTORY_FILE` | Max 5 records, **one per project**, at most one `"active"` — `addOrUpdateSession` enforces both. Backs the sidebar. |
| `last_session.json` | `SESSION_FILE` | Last config, for `reconnectFlow`. `disconnectedAt` marks an explicit user disconnect. |
| `runtimes_cache.json` | `CACHE_FILE` | `RuntimeManager` TTL cache (`caiConnector.cacheHours`). |

`SessionPanel` is reactive by file watching, not by direct calls: `executeConnect` writes the state file, a `FileSystemWatcher` fires `onStateChange`, which upserts a history record and refreshes the tree. Some flows additionally call `panel.refresh()`.

### Safety rule: never stop CML sessions in bulk

`ConnectParams.autoStopSessions` is `string | false` — a *specific* session ID or nothing. Only sessions the extension itself recorded in `session_history.json` / `last_session.json` are ever stopped, always via `sessions stop /s <id> /p <project>`. `cdswctl`'s blanket `/a` flag was deliberately removed because it killed unrelated user sessions; do not reintroduce it.

### cdswctl quirks

- **`sessions stop /s` prints `unexpected end of JSON input` on success.** Three call sites (`sessionManager.disconnectFlow`, `sessionKill.killSessionRecord`, `utils.stopCmlSessions`) match that string and treat it as success. Preserve this when touching stop logic.
- **The API key never reaches argv**: `ensureLoggedIn` passes `%CML_API_KEY%` as a literal argument while injecting the real key as an env var and setting `shell: true`, so Windows expands it inside the child. Failure output is sanitized with `.split(apiKey).join("***")` before logging.
- `runCdswctl` spawns with `cwd: path.dirname(cdswctlPath)` (the CLI needs it) and falls back to `execFile` if `spawn` errors.

### The session form webview

The only UI code in the repo. `media/sessionForm.{css,js}` are **plain CSS and ES2020 shipped as-is** — `media/` is outside `rootDir: src`, so `tsc` never touches them and they are not type-checked. They cannot `require` compiled modules.

- **Theming is free**: every colour and font comes from a `--vscode-*` variable, so the panel follows the user's theme with no light/dark branching of its own. Never hard-code a colour; add a token to the `:root` block in `sessionForm.css` instead.
- **Validation is deliberately duplicated.** `media/sessionForm.js` re-implements `parseNumeric` and the three validators for instant feedback; `validateSessionForm` in `sessionFormModel.ts` is the authority and treats every payload as untrusted. Changing a rule means changing both — the pure side is the one with tests.
- **No untrusted string is interpolated into HTML.** `sessionFormHtml.ts` emits a static shell; the script fills it via `textContent` and `createElement`. Project names and runtime descriptions come from CML, so keep it that way. CSP is `default-src 'none'` with a per-render nonce.
- **The panel must never delay the endpoint handoff.** `executeConnect` takes an optional `onProgress` reporter; every call is synchronous, wrapped in try/catch, and never awaited, so it cannot reorder the history-write → `surrenderedToSsh` → `openFolder` sequence. `launchSession` disposes the panel only *after* `executeConnect` returns.
- The API key prompt stays a native `showInputBox`. **No secret ever enters the webview** — `SessionFormInit` carries none.
- The view layer has no automated coverage. Verify changes manually with *Developer: Toggle Developer Tools*; a CSP or `asWebviewUri` mistake renders a blank panel with an error only in that console.

### Other notes

- `sshConfig.updateSshConfig` rewrites a single `Host cml` block, correctly handling `Host` lines that list several patterns (`Host cml other`) and collapsing pre-existing duplicates. It returns `false` unless exactly one `Host cml` line ends up in the file. Keep this module VS Code-free so it stays unit-testable.
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
- **150-line soft limit per file.** Currently exceeded by `sessionManager.ts` (322), `types.ts` (205), `sessionFormHtml.ts` (204, almost entirely markup), `extension.ts` (196), `sessionForm.ts` (195), `runtimePicker.ts` (163), `cdswctl.ts` (157), and `sessionFormData.ts` (154); split by responsibility rather than growing these further. The two `media/` files are exempt — they are assets, not modules.

## Security

- **API keys**: stored via `context.secrets` (`SECRET_KEY = "CML_API_KEY"`), prompted with `password: true`. Never write them to settings, argv, or logs; on retrieval failure re-prompt rather than silently proceeding.
- **Sensitive logging**: `output.appendLine()` echoes raw CLI output — redact secrets before logging (see the `.split(apiKey).join("***")` pattern in `auth.ts`).
- **State location**: cache and state files stay under `globalStorageUri` (OS-protected user directory), never workspace-relative.

## Agent Conventions

- **Never use shell commands to modify source files.** Use the file-editing tools. Shell approaches like `sed -i`, `cp`, `head`, or output redirection (`>`) to write or truncate source files are fragile and non-reversible — do not use them even as a fallback.
- Run `npm test` after changes; it type-checks the whole project as well as running the tests.
- `docs/plans/` holds historical planning documents that describe superseded designs. Do not treat them as current architecture.
