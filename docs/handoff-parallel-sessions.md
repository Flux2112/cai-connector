# Handoff: parallel sessions — Windows verification

**Branch**: `feat/session-form-webview` (issue #2 sits on top of the issue #1 work)
**Issue**: [#2 — Allow for multiple Sessions in parallel](https://github.com/Flux2112/cai-connector/issues/2)
**Status**: implemented, type-checks clean, 110/110 unit tests pass. **Nothing below the unit-test line has been run.**

Written on macOS against a Windows-only extension, same as the issue #1 work. Test that one first (`docs/handoff-session-form-webview.md`) — if the session form is broken, everything here is untestable.

---

## What was built

Issue #2 asked for three things.

1. **Multiple sessions in parallel.** Connect no longer tears down what is already running.
2. **Correct status in the sidebar,** with the local endpoint and the CML session shown separately rather than conflated.
3. **No sessions orphaned on CML.** A session whose local endpoint is gone is stopped on the platform.

### The four changes that make it work

| Change | Why it was required |
|---|---|
| **Per-session SSH host aliases** — `cml-<project>` instead of one shared `Host cml` | Two sessions cannot share one alias. The second `updateSshConfig` used to silently repoint the first window's host at a different container. |
| **`session_history.json` is the only state file** — `endpoint_state.json` is gone | It held exactly one endpoint. It also drove the sidebar, which is why the sidebar's status was wrong. |
| **Orphan sweep is pid-aware** — kills only processes no record claims | The old sweep killed *every* `cdswctl ssh-endpoint` unless one session looked alive, which is incompatible with N of them. |
| **Two statuses per record** — `endpointStatus` + `cmlStatus` | The whole of the "status is flawed" half of the issue. |

---

## The three open risks, in priority order

### 1. The remote window's host alias must survive a reload — BLOCKING

The alias is baked into the window URI (`vscode-remote://ssh-remote+cml-myproject/home/cdsw`). If a later `syncSshConfig` ever removes or repoints that alias, the window breaks on reload.

The design says it cannot: the alias is assigned once and stored on the record, and `syncSshConfig` writes a block for every session whose endpoint is running. But it has never been exercised. **Test B4 below is the one to run first.**

### 2. Upgrading with a live session

A session created by the *previous* version has no `hostAlias` and is reachable only through the bare `Host cml`. `syncSshConfigFromHistory` keeps emitting that legacy block for such records, so an already-open window should keep working. Untested, and only testable once — install the previous version, connect, then upgrade.

If it does break: the already-established SSH connection survives (ssh config only matters at connect time); a **window reload** is what fails. Recovery is **Join Session** on that record, which assigns a real alias.

### 3. cdswctl behaviour under concurrency

Two unknowns that no amount of local testing could settle:

- Does `cdswctl ssh-endpoint` tolerate two instances running at once? They share a config directory (`cwd: path.dirname(cdswctlPath)`) and a login token.
- Does CML allow two simultaneous sessions in the *same* project?

If either is a no, the feature still works across *different* projects, and the same-project case needs a guard in `launchSession`. Capture the exact error before changing anything.

---

## Running it

```powershell
npm install        # if needed
npm test           # tsc + 110 tests — expect 110 pass, 0 fail
```

Then <kbd>F5</kbd> (**Run Extension**).

Watching `~/.ssh/config` in an editor while you test is the single most useful thing you can do — almost every failure mode shows up there first.

---

## Test checklist

### A. Two sessions at once — the headline

- [ ] Connect to project A. Wait for the remote window.
- [ ] From the original window, Connect to project B. **Session A stays up**: its window keeps working, its sidebar entry stays `endpoint up`.
- [ ] `~/.ssh/config` contains **both** `Host cml-a` and `Host cml-b`, each with its own port, and no bare `Host cml`.
- [ ] Both remote windows can run a terminal and see *different* containers (`hostname` differs).
- [ ] Two sessions in the **same** project produce `cml-proj` and `cml-proj-2`.
- [ ] Kill session A from the sidebar. Session B is completely unaffected, and `Host cml-a` disappears from the config while `Host cml-b` stays.

### B. SSH config integrity — where damage would be worst

- [ ] Unrelated `Host` blocks in your config survive every operation.
- [ ] A `Host cmlserver` or `Host my-cml-thing` block is never touched (there are unit tests, but confirm against your real config).
- [ ] After killing every session, no `Host cml*` block remains.
- [ ] **B4 (blocking):** with two sessions open, reload one remote window (*Developer: Reload Window*). It reconnects to **its own** container, not the other one. Then create a third session and reload again — still correct.

### C. Sidebar status

- [ ] A running session reads `:<port> · endpoint up · CML up`.
- [ ] Expanding it shows **Local endpoint** and **CML session** as separate rows.
- [ ] Kill the `cdswctl.exe` process in Task Manager without touching the extension. Within ~10s the sidebar flips to `endpoint gone`. (The poll only runs while the Sessions view is visible.)
- [ ] That record then shows a warning icon and an `orphaned on CML — needs cleanup` row.
- [ ] Sessions created in one VS Code window appear in a second window's sidebar.
- [ ] While a session is coming up it reads `starting…` with a spinner.

### D. Orphan cleanup — the "must not be orphaned" requirement

- [ ] Kill `cdswctl.exe` in Task Manager, then open the Sessions view. The extension notices, stops the CML session, and reports how many it stopped.
- [ ] Confirm on the CML web UI that the session is really gone.
- [ ] Set `caiConnector.autoStopOrphanedSessions` to `false`. The orphan is now only *flagged*, not stopped, until you run **Clean Up Orphaned Sessions**.
- [ ] **Kill VS Code entirely** (Task Manager, not a clean exit) while a session runs. On restart the extension either adopts the still-live endpoint or, if the process died with it, flags/stops the CML session. Nothing is left running on the platform.
- [ ] A session in a project you have **no access to** does not cause repeated failed stop attempts — `sessions list` failing leaves the status untouched rather than looping.
- [ ] **Nothing the extension did not create is ever stopped.** Start a session manually in the CML web UI, then run **Clean Up Orphaned Sessions**. That session must still be running afterwards. This is the safety rule from `AGENTS.md`; a failure here is the most serious possible outcome of this branch.

### E. Startup sweep

- [ ] With a session live in window 1, open a second VS Code window. The output channel logs `[startup] tracked endpoint pids: [<pid>]` and kills **0** processes. Session 1 survives.
- [ ] Leave a stray `cdswctl ssh-endpoint` running that no record claims (kill VS Code mid-creation, or start one by hand). Next startup kills it.
- [ ] On a machine where PowerShell is blocked, startup logs the scan failure and kills **nothing** — absence of evidence must not be treated as evidence.

### F. Disconnect

- [ ] With one session live, **Disconnect Sessions** tears it down with no prompt.
- [ ] With three live, it offers a multi-select; picking two leaves the third running.
- [ ] Cancelling the picker changes nothing.
- [ ] With nothing live, it says so and cleans the SSH config.

### G. Regressions in the issue #1 work

- [ ] The session form still opens, validates, and shows progress.
- [ ] Recall cards show the right pill: `running`, `starting`, `stopped`, `needs cleanup`.
- [ ] **Recreate Last Session** still works.
- [ ] **Edit Session Configuration** still saves, and offers a recreate for a live session.
- [ ] **Recreate Session** on one record leaves every other session running (this behaviour changed — it used to kill whichever session was active).
- [ ] **Browse Runtimes** and **Clear Runtime Cache** unaffected.

---

## What must not break

Restated from `AGENTS.md` because this branch rewrote the code around it:

> The `cdswctl` process *is* the SSH tunnel, so it must outlive the extension host that spawned it.

The global `surrenderedToSsh` boolean is now a per-endpoint `surrendered` flag in `endpointRegistry.ts`, because one host can own several tunnels. `deactivate()` skips every surrendered endpoint. The write order in `executeConnect` is load-bearing and documented in the code:

1. `spawn` → history record written **immediately** with `status: "starting"` and the pid
2. session id patched in **as soon as it is scraped**, before ready
3. on ready: record upgraded to `active` → `syncSshConfigFromHistory` → `surrenderEndpoint` → `openFolder`

Step 1 is new and load-bearing: it closes a window of up to 60s in which a freshly spawned endpoint belonged to no record and would have been swept up as untracked.

---

## File map

New:

| File | Role | Tested |
|---|---|---|
| `src/sessionStatus.ts` | Pure — the two-status model, `parseSessionIds`, `capRecords` | 33 tests |
| `src/sessionReconciler.ts` | Local / process / CML reconciliation, orphan stopping, SSH sync | no |
| `src/endpointRegistry.ts` | Pure — endpoints this host spawned, per-endpoint surrender | no |
| `src/orphanCleanup.ts` | `Clean Up Orphaned Sessions` command, startup warning | no |
| `src/disconnectFlow.ts` | Multi-session disconnect | no |

Rewritten: `sshConfig.ts` (N aliases, 32 tests), `sessionManager.ts` (parallel-safe `executeConnect`), `sessionPanel.ts` (history watcher, dual status, poll timer), `endpointManager.ts` (pid-aware sweep), `sessionKill.ts`, `extension.ts`.

Modified: `sessionHistory.ts` (12 new tests), `connectFlow.ts`, `reconnectFlow.ts`, `sessionActions.ts`, `sessionEdit.ts`, `state.ts`, `utils.ts`, `types.ts`, `package.json`, `media/sessionForm.{js,css}`.

Removed: `endpoint_state.json` and everything reading it (`EndpointState`, `readState`, `STATE_FILE` beyond a one-time delete), `markAllInactive`, `refreshSessionStatusesFromCml`, `killOrphanedEndpointProcesses` (the blanket version), `updateSshConfig`, `setActiveProject`.

## New settings

| Setting | Default | Note |
|---|---|---|
| `caiConnector.autoStopOrphanedSessions` | `true` | Stop CML sessions whose endpoint is gone. Only extension-created sessions CML confirms are running. |

`MAX_SESSION_RECORDS` went from 5 to 8, and the cap now only ever discards `inactive` records.

---

## Reverting

Less separable than issue #1 — the four changes depend on each other. The realistic fallback is reverting the whole issue #2 commit and keeping the webview work.

The one piece that *is* separable: setting `caiConnector.autoStopOrphanedSessions` to `false` disables all automatic stopping without touching code, leaving cleanup manual.

**Do not merge to `main` until D-last (nothing the extension did not create is ever stopped) and B4 (alias survives a reload) both pass.** CI publishes to the Marketplace on every push to `main` — a merge is a release.
