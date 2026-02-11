# Project Guidelines

## Overview

CAI Connector is a Windows-only VS Code extension that creates SSH endpoints on Cloudera AI (CML) via the `cdswctl.exe` CLI, then connects using Remote-SSH. No runtime dependencies — only Node.js built-ins and VS Code API.

## Code Style

- **Imports**: `import * as X` for Node/VS Code built-ins; `{ named }` for local modules. Order: Node built-ins → `vscode` → local modules.
- **Types**: Use `type` aliases, not `interface`, for data shapes (see [src/types.ts](../src/types.ts)).
- **Strings**: Double quotes, semicolons, trailing commas in multi-line objects, 2-space indent.
- **Error handling**: Wrap in `try/catch`, use `String(err)` for messages (never `.message`). Report to user via `vscode.window.showErrorMessage()`, log detail via `output.appendLine()`.
- **Async**: Prefer `async/await` over `.then()` chains.
- **Naming**: `camelCase` functions/variables, `PascalCase` types. Command flows use `*Flow` suffix (e.g., `connectFlow`, `disconnectFlow`).

## Architecture

| Module | Responsibility |
|---|---|
| [src/extension.ts](../src/extension.ts) | Entry point, command registration, orchestrates connect/disconnect/browse flows |
| [src/cdswctl.ts](../src/cdswctl.ts) | CLI wrapper — locates and runs `cdswctl.exe` via `spawn` with `execFile` fallback |
| [src/endpointHost.ts](../src/endpointHost.ts) | **Standalone Node.js script** (not a VS Code module) — runs detached, spawns `cdswctl ssh-endpoint`, writes state to JSON |
| [src/runtimeManager.ts](../src/runtimeManager.ts) | Fetches/caches available runtimes with disk-based TTL cache |
| [src/sshConfig.ts](../src/sshConfig.ts) | Reads/writes `~/.ssh/config`, manages the `Host cml` block |
| [src/types.ts](../src/types.ts) | Shared type definitions (`RuntimeData`, `RuntimeCache`) |

Key patterns:
- **Detached helper process**: `endpointHost.ts` runs as `node out/endpointHost.js <configPath>`, survives VS Code window closes. IPC is via a polled JSON state file (`endpoint_state.json`), not sockets.
- **State lifecycle**: `"starting" → "ready" | "error"` tracked in the state file.
- **Secret storage**: API keys via `context.secrets` API. Cache/state under `context.globalStorageUri.fsPath`.
- **Synchronous file I/O**: Uses `fs.readFileSync`/`writeFileSync`/`existsSync` throughout (not `fs/promises`).
- **Known tech debt**: `EndpointHostConfig` and `EndpointState` types are duplicated in [src/extension.ts](../src/extension.ts) and [src/endpointHost.ts](../src/endpointHost.ts) instead of shared from [src/types.ts](../src/types.ts). New shared types should go in `types.ts`; consolidate duplicates when touching those files.

## Build and Test

```bash
npm run compile    # one-shot tsc build
npm run watch      # watch mode for development
```

No test framework, linter, or bundler is configured. Output goes to `out/` as raw CommonJS. Target is ES2020 with strict mode.

When adding tests, prefer a lightweight framework (e.g., VS Code's `@vscode/test-electron` for integration tests). Unit-testable logic lives in [src/cdswctl.ts](../src/cdswctl.ts), [src/sshConfig.ts](../src/sshConfig.ts), and [src/runtimeManager.ts](../src/runtimeManager.ts) — these have no direct VS Code API dependency beyond the `OutputChannel` parameter, which can be stubbed.

## Project Conventions

- **OutputChannel logging**: `vscode.window.createOutputChannel("CAI Connector")` is passed as a parameter to functions (dependency injection style).
- **Process management**: Detached processes via `cp.spawn({ detached: true, stdio: "ignore" })` + `.unref()`. Liveness checked with `process.kill(pid, 0)`.
- **User interaction**: Exclusively uses VS Code built-in UI — `showInputBox` (with `validateInput` for numbers, `password: true` for secrets), `showQuickPick` (with `matchOnDescription`/`matchOnDetail`), and message APIs.
- **Configuration**: All settings under `caiConnector.*` namespace via `vscode.workspace.getConfiguration("caiConnector")` with typed `.get<T>()` and defaults.
- **Extension activation**: Lazy — only on command invocation (`caiConnector.connect`, `caiConnector.disconnect`, `caiConnector.browseRuntimes`).
- **`deactivate()` is intentionally empty** — the detached helper process must survive window close.

## Integration Points

- **`cdswctl.exe`**: External CLI binary for CML API interaction. Located via config setting or PATH lookup.
- **Remote-SSH**: Connects by writing SSH config then calling `vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow: true })`.
- **SSH config**: Regex-based parsing of `~/.ssh/config` to insert/update `Host cml` block with dynamic port.

## Security

- **API keys**: Stored via VS Code's `context.secrets` API — never written to plain-text config or logs. Prompted with `password: true` on `showInputBox`. On retrieval failure, re-prompt the user rather than silently proceeding.
- **Sensitive logging**: `output.appendLine()` may log CLI output. Avoid logging raw API keys or tokens; redact or omit them.
- **Process isolation**: The detached `endpointHost.ts` process reads credentials from a config JSON file under `globalStorageUri` (OS-protected user directory). Do not move this file to a workspace-relative or shared location.
