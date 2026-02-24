# Plan: Per-Session CML Cleanup on Endpoint Shutdown

**TL;DR:** CML sessions are not being stopped when the VS Code remote session ends because of a critical execution-order bug and missing cleanup paths in the detached helper process. The fix involves: (1) parsing the CML session ID from `cdswctl` output, (2) creating a centralized `shutdown()` function with session-stop logic, (3) wiring it into **all** exit paths (idle timeout, 10-hour timeout, SIGTERM), and (4) switching from the blanket `/a` flag to per-session stop (`/s <SESSION_ID>`). The per-session stop command has a known `cdswctl` bug where it outputs "unexpected end of JSON input" despite succeeding — this must be handled gracefully.

---

## Root Cause Analysis

**Bug 1 — `stopCmlSessions()` never executes on idle shutdown.** In `src/idleMonitor.ts` (lines 88–91), `onShutdown(state)` is called first, which triggers the callback in `src/endpointHost.ts` (lines 134–137) that calls `process.exit(0)`. The subsequent `stopCmlSessions(config, log)` on the next line never runs because the process has already exited.

**Bug 2 — 10-hour timeout skips session cleanup.** The `setTimeout` handler in `src/endpointHost.ts` (lines 89–100) calls `safeKill(endpoint.pid)` and `process.exit(0)` but never calls `stopCmlSessions()`.

**Bug 3 — SIGTERM handler skips session cleanup.** The SIGTERM handler in `src/endpointHost.ts` (lines 102–106) kills the endpoint and exits but never stops the CML session.

**Bug 4 — No session ID captured.** The `onEndpointData` regex only matches `ssh -p <port> <user@host>`. The session ID from the preceding line (`Forwarding local port ... on session <ID> in project ...`) is ignored, forcing all cleanup to use the dangerous `/a` (all sessions) flag.

---

## Steps

### 1. Add `sessionId` field to `EndpointState`

**File:** `src/types.ts`

Add an optional `sessionId?: string` field to the `EndpointState` type. This allows the detached helper to communicate which CML session it created back to the extension (via the state file) and to use it during cleanup.

### 2. Parse session ID from `cdswctl` output

**File:** `src/endpointHost.ts`

In the `onEndpointData` function (~line 112), add a second regex **before** the existing SSH-port regex to capture the session ID from lines like `Forwarding local port 6108 to port 2222 on session 1qypgc7ph4onn7vb in project HANKE/ingestion`. Pattern: `on session\s+(\S+)\s+in project`. Store the captured ID in a module-level variable (e.g., `let sessionId: string | undefined`). Include `sessionId` in the `EndpointState` written when the endpoint becomes ready.

### 3. Move `stopCmlSessions` from `idleMonitor.ts` to `endpointHostUtils.ts`

**File:** `src/endpointHostUtils.ts`

The function is needed from multiple call sites (idle monitor, timeout, SIGTERM). Move it to `src/endpointHostUtils.ts` and update its signature to accept an optional `sessionId` parameter. When `sessionId` is provided, use `["sessions", "stop", "/s", sessionId, "/p", project]`. When absent, fall back to `["sessions", "stop", "/p", project, "/a"]`.

**Important:** The per-session stop command (`/s <SESSION_ID>`) has a known `cdswctl` bug where it outputs `"unexpected end of JSON input"` despite successfully stopping the session. The function must treat this as a non-error: log the output for transparency but do **not** report it as a failure. In practice this means accepting any exit from `execFileSync` (including throws due to non-zero exit code) and logging the stderr/stdout message without alarming the user. Something like:

```typescript
try {
  execFileSync(cdswctlPath, args, ...);
  log("CML session stopped.");
} catch (err) {
  // cdswctl /s returns "unexpected end of JSON input" on success — known bug
  log(`CML session stop returned: ${String(err)} (session likely stopped successfully).`);
}
```

### 4. Create a centralized `shutdown()` function in `endpointHost.ts`

**File:** `src/endpointHost.ts`

Replace the scattered cleanup logic with a single `shutdown(reason: string)` function that:

1. Guards against double-entry (set a `shuttingDown` flag, return early if already set)
2. Logs the reason
3. Writes an `"error"` state with the message
4. Calls `stopCmlSession()` (synchronous — `execFileSync`) with the captured `sessionId`
5. Calls `safeKill(endpoint.pid)`
6. Calls `process.exit(0)`

This ensures session cleanup always happens **before** process exit.

### 5. Wire `shutdown()` into all exit paths in `endpointHost.ts`

**File:** `src/endpointHost.ts`

- **Idle monitor callback** (~line 134): Replace the inline `writeState` / `safeKill` / `process.exit` with a call to `shutdown()`. Update `startIdleMonitor` to accept a simpler `onShutdown: (reason: string) => void` callback and remove `stopCmlSessions()` from `src/idleMonitor.ts` (line 91) since it's now handled centrally.
- **10-hour timeout** (~line 89): Replace the inline logic with `shutdown("Session timed out after 10 hours.")`.
- **SIGTERM handler** (~line 102): Replace with `shutdown("Helper received SIGTERM.")`.
- **`process.on("exit")`** (~line 108): Keep `safeKill(endpoint.pid)` as a last-resort safety net only — do NOT add `stopCmlSession()` here since Node.js `exit` handlers cannot reliably run external processes.

### 6. Simplify `startIdleMonitor` signature

**File:** `src/idleMonitor.ts`

Change the `onShutdown` callback type from `(state: EndpointState) => void` to `(reason: string) => void` since the centralized `shutdown()` in `endpointHost.ts` now owns state writing and process management. Remove the `stopCmlSessions()` call and function definition from idleMonitor entirely. Remove the `endpointPid` and `helperPid` parameters (no longer needed by the monitor).

### 7. Update `disconnectFlow` to use per-session stop

**File:** `src/sessionManager.ts`

When `disconnectFlow` is called, read the `EndpointState` from the state file (before calling `stopEndpointHost`) to extract the `sessionId`. If available, use `sessions stop /s <sessionId> /p <project>` instead of `/a`. Fall back to `/a` if the session ID is not available (e.g., state file missing or from an older version). Apply the same tolerant error handling for the "unexpected end of JSON input" bug — log but don't treat as failure.

### 8. Keep pre-connect cleanup with `/a` flag

The `autoStopSessions` logic in `executeConnect` (lines 41–62) intentionally stops **all** sessions before creating a new one. This should continue using `/a` since it's a deliberate user-directed action to clean the slate before connecting.

---

## File Change Summary

| File | Changes |
|------|---------|
| `src/types.ts` | Add `sessionId?: string` to `EndpointState` |
| `src/endpointHostUtils.ts` | Add `stopCmlSession()` function (moved from idleMonitor, with per-session support and tolerant error handling for the known cdswctl bug) |
| `src/endpointHost.ts` | Parse session ID in `onEndpointData`, add centralized `shutdown()` with double-entry guard, simplify all exit paths |
| `src/idleMonitor.ts` | Simplify callback type to `(reason: string) => void`, remove `stopCmlSessions` call and function, remove `endpointPid`/`helperPid` params |
| `src/sessionManager.ts` | Read `sessionId` from state file in `disconnectFlow`, use per-session stop with tolerant error handling |

---

## Verification

1. **Compile**: `npm run compile` — ensure no TypeScript errors
2. **Manual test — idle shutdown**: Connect with `idleTimeoutMinutes = 1`, close the Remote-SSH window, wait ~1 minute. Check `endpoint_host.log` for session stop with the session ID and the expected "unexpected end of JSON input" message logged non-fatally. Verify the CML session is stopped in the CML UI.
3. **Manual test — disconnect command**: While connected, run `CAI Connector: Disconnect`. Verify per-session stop appears in the output channel and the CML session is stopped.
4. **Manual test — SIGTERM**: Kill the helper process via Task Manager → verify CML session is stopped (check log file).
5. **Manual test — 10-hour timeout**: Temporarily lower `TIMEOUT_MS` to a short value (e.g., 30 seconds), connect, and verify session cleanup in the log.
6. **Edge case — idle disabled**: Set `idleTimeoutMinutes = 0`, connect, close Remote-SSH. Verify the 10-hour timeout path still cleans up the session.

---

## Decisions

- **Per-session stop** (`/s <SESSION_ID>`) chosen over `/a` — avoids killing independently-started sessions
- **Known cdswctl bug** (`"unexpected end of JSON input"` on `/s` stop) treated as non-fatal — logged for transparency but not surfaced as an error
- **Keep `idleTimeoutMinutes` default at 1 minute** — no change to package.json
- **Keep idle=0 as full disable** — 10-hour timeout is the backstop, now with session cleanup added
- **Pre-connect `/a` flag preserved** — that's an intentional user action, not automatic cleanup
- **Double-entry guard** on `shutdown()` — prevents cascading exits (e.g., SIGTERM during idle shutdown) from running cleanup twice
