# Agent Guidelines for CAI Connector

> Instructions for AI coding agents working in this repository.

## Project Overview

CAI Connector is a **Windows-only VS Code extension** that creates SSH endpoints on Cloudera AI (CML) via the `cdswctl.exe` CLI, then connects using Remote-SSH.

- **Language**: TypeScript 5.4.5
- **Runtime**: VS Code Extension API (v1.85.0+)
- **Dependencies**: None at runtime — only Node.js built-ins and VS Code API
- **Target**: ES2020 with CommonJS output, strict mode enabled

## Build Commands

```bash
npm run compile        # One-shot TypeScript build
npm run watch          # Watch mode for development
npm run vscode:prepublish  # Build before publishing (same as compile)
```

Output goes to `out/` as raw CommonJS. No bundler (webpack, esbuild, etc.) is configured.

## Testing

**No test framework is currently configured.** When adding tests:

- Use `@vscode/test-electron` for integration tests
- Unit-testable modules (no direct VS Code API dependency): `src/cdswctl.ts`, `src/sshConfig.ts`, `src/runtimeManager.ts`
- These modules accept `OutputChannel` as a parameter, which can be stubbed

## Linting

**No linter is configured.** Follow the code style guidelines below manually.

## File Size Limit

**Maximum 150 lines per TypeScript source file.** If a file exceeds this limit, refactor into smaller modules by responsibility.

## Directory Structure

```
src/
├── extension.ts       # Entry point, command registration, cache clearing, endpoint check
├── auth.ts            # API key management, CML login, cdswctl resolution
├── cdswctl.ts         # CLI wrapper for cdswctl.exe
├── connectFlow.ts     # Connect + browse runtimes orchestration
├── endpointHost.ts    # Standalone Node.js script (detached process)
├── endpointManager.ts # Endpoint process lifecycle (start, stop, cleanup)
├── reconnectFlow.ts   # Reconnect orchestration (recreate last session)
├── runtimeManager.ts  # Runtime fetching/caching
├── runtimePicker.ts   # Runtime/addon selection QuickPick UI
├── sessionManager.ts  # SSH endpoint execution, disconnect
├── sshConfig.ts       # SSH config file management
├── state.ts           # Shared mutable state (activeProject), session save/load
├── types.ts           # Shared type definitions and constants
└── utils.ts           # Shared helpers (file I/O, process checks, UI prompts)
```

## Code Style

### Formatting

- **Double quotes** for strings
- **Semicolons** required
- **2-space indentation**
- **Trailing commas** in multi-line objects/arrays

### Imports

Order: Node built-ins → `vscode` → local modules

```typescript
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { RuntimeManager } from "./runtimeManager";
import { RuntimeData } from "./types";
```

- Use `import * as X` for Node built-ins and `vscode`
- Use `{ named }` imports for local modules

### Types

- Use `type` aliases, **NOT** `interface`, for data shapes
- Put shared types in `src/types.ts`

```typescript
// Correct                              // Avoid
export type RuntimeData = {             export interface RuntimeData {
  id: number;                             id: number;
};                                      }
```

### Naming Conventions

- `camelCase` for functions and variables
- `PascalCase` for types and classes
- `*Flow` suffix for command flow functions (e.g., `connectFlow`, `disconnectFlow`, `browseRuntimesFlow`)

### Error Handling

```typescript
try {
  // operation
} catch (err) {
  vscode.window.showErrorMessage(`User-friendly message: ${String(err)}`);
  output.appendLine(`Detailed message: ${String(err)}`);
  return;
}
```

- **Always use `String(err)`** for error messages (never `.message`)
- Report to user via `vscode.window.showErrorMessage()`
- Log details via `output.appendLine()`

### Async Patterns

- Prefer `async/await` over `.then()` chains
- Use polling with sleep for waiting operations:

```typescript
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### File I/O

- Use **synchronous** `fs` methods: `readFileSync`, `writeFileSync`, `existsSync`
- Do NOT use `fs/promises` (maintains consistency with existing code)

## Architecture Patterns

### Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `extension.ts` | Entry point — registers commands, delegates to flow modules, cache clearing, endpoint check |
| `auth.ts` | API key prompting/storage, CML URL prompting, login, cdswctl resolution |
| `cdswctl.ts` | CLI wrapper — locates and runs `cdswctl.exe` |
| `connectFlow.ts` | `connectFlow` + `browseRuntimesFlow` orchestration |
| `endpointHost.ts` | Standalone script — runs detached, spawns CLI, writes state |
| `endpointManager.ts` | Start/stop/cleanup endpoint host processes, orphan detection |
| `reconnectFlow.ts` | `reconnectFlow` — recreates last session with validation |
| `runtimeManager.ts` | Fetches/caches runtimes with disk-based TTL |
| `runtimePicker.ts` | QuickPick UI for runtime and runtime addon selection |
| `sessionManager.ts` | `executeConnect`, `disconnectFlow` |
| `sshConfig.ts` | Manages `~/.ssh/config` `Host cml` block |
| `state.ts` | Shared mutable state (`activeProject` accessor), session save/load |
| `types.ts` | Shared type definitions and constants |
| `utils.ts` | `getStoragePath`, `sleep`, `isProcessAlive`, `clearFile`, `readState`, `buildEndpointArgs`, `multiTermFilter`, `promptResources` |

### Key Patterns

- **Detached Helper Process**: `endpointHost.ts` runs as `node out/endpointHost.js <configPath>`, survives VS Code window closes. IPC via polled JSON file (`endpoint_state.json`), not sockets.
- **State Lifecycle**: `"starting" → "ready" | "error"`
- **Process Management**: `cp.spawn({ detached: true, stdio: "ignore" })` + `.unref()`. Liveness via `process.kill(pid, 0)`.
- **Lazy Activation**: Extension activates only on command invocation
- **Empty `deactivate()`**: Intentional — detached process must survive window close

### VS Code API Patterns

- `OutputChannel` for logging (passed via dependency injection)
- `context.secrets` for API key storage; `context.globalStorageUri.fsPath` for cache/state files
- `vscode.workspace.getConfiguration("caiConnector")` with typed `.get<T>()`

## Security Guidelines

- **API Keys**: Store via `context.secrets` API — never in plain-text config or logs
- **Password Input**: Use `showInputBox` with `password: true`
- **Sensitive Logging**: Never log raw API keys or tokens; redact or omit
- **Process Isolation**: Config files stay under `globalStorageUri` (OS-protected)
- **Retrieval Failure**: Re-prompt user rather than silently proceeding

## Known Technical Debt

`EndpointHostConfig` and `EndpointState` types in `src/endpointHost.ts` are duplicated from `src/types.ts`. When touching `endpointHost.ts`, consider importing from `types.ts` instead.

## Integration Points

- **`cdswctl.exe`**: External CLI for CML API. Located via config or PATH
- **Remote-SSH**: Connects via `vscode.commands.executeCommand("vscode.openFolder", remoteUri, ...)`
- **SSH Config**: Regex-based parsing of `~/.ssh/config` to manage `Host cml` block

## User Interaction Patterns

- `showInputBox` with `validateInput` for numbers, `password: true` for secrets
- `showQuickPick` with `matchOnDescription`/`matchOnDetail`
- `showErrorMessage`, `showInformationMessage`, `showWarningMessage`
- All settings under `caiConnector.*` namespace
