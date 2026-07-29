# VS Code Shutdown Prompt Research

Research date: 2026-07-29. Scope: the extension's supported VS Code baseline
(`^1.85.0`) and the current upstream API declarations.

## Conclusion

A Marketplace extension cannot reliably prompt the user when VS Code, its
window, or its extension host is closing and then choose whether to keep or
stop a long-lived external process. There is no public stable or proposed
extension API for a pre-close/shutdown event, a shutdown veto, or a guaranteed
interactive shutdown phase. Do not use `deactivate()` as a decision point.

## Public Extension Lifecycle

- VS Code activates an extension when an activation event occurs. An optional
  exported `deactivate()` is documented as a cleanup opportunity when VS Code
  shuts down or the extension is disabled or uninstalled. It is not documented
  as a window-close callback or user-decision API. [Official extension anatomy
  documentation](https://code.visualstudio.com/api/get-started/extension-anatomy#extension-entry-file)
- In VS Code 1.85, the extension host calls `deactivate()` for active
  extensions, waits for returned promises collectively, but races that work
  against a five-second timeout before exiting. It passes no reason or
  `CancellationToken` to `deactivate()`. The current source retains the same
  ordering and timeout. [1.85 extension-host
  source](https://raw.githubusercontent.com/microsoft/vscode/1.85.0/src/vs/workbench/api/common/extHostExtensionService.ts)
  and [current extension-host
  source](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/common/extHostExtensionService.ts)
- The public `WindowState` has only `focused` and `active`, and the only public
  state event is `window.onDidChangeWindowState`. Both the 1.85 baseline and
  current declaration lack `onBeforeShutdown`, `onWillShutdown`,
  `onDidShutdown`, `onWillCloseWindow`, and `onDidCloseWindow`.
  [1.85 `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/1.85.0/src/vscode-dts/vscode.d.ts)
  and [current `vscode.d.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.d.ts)

## Why A Shutdown Dialog Is Unsound

Normal `window.showInformationMessage`, `showWarningMessage`, and
`showErrorMessage` calls can offer actions, including modal actions. That only
describes normal UI operation; it does not establish a shutdown interaction
contract. [Public message API](https://code.visualstudio.com/api/references/vscode-api#window.showInformationMessage)

More specifically, during normal extension-host termination VS Code disposes
the extension-host RPC context before it invokes extension deactivation. The
message service sends its request to the workbench through that RPC proxy. A
message started in `deactivate()` therefore has no supported route to display
or receive a choice, and waiting for it consumes the shared five-second budget.
[Termination ordering](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/common/extHostExtensionService.ts),
[extension-side message service](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/common/extHostMessageService.ts),
and [workbench message service](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/browser/mainThreadMessageService.ts).

This also rules out treating focus loss as a proxy for close: it can occur for
ordinary window activation changes, and it carries no close reason, veto,
deadline, or cancellation signal. [Window-state implementation](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/common/extHostWindow.ts).

## Internal And Proposed APIs

The workbench itself has an internal `ILifecycleService` with
`onBeforeShutdown` vetoes and `onWillShutdown` joiners. Its `WillShutdownEvent`
does carry a cancellation token for a forced shutdown. This is workbench source,
not an extension API: it is absent from the public `vscode.d.ts` declarations
above and cannot be imported by a Marketplace extension. [Internal lifecycle
service](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/services/lifecycle/common/lifecycle.ts).

The current proposed declaration tree has no shutdown or window-close proposal.
The only window-named proposals are agent-window configuration, interactive
window tab input, and a read-only native window handle; none exposes a lifecycle
event. [Proposal tree](https://api.github.com/repos/microsoft/vscode/git/trees/main?recursive=1),
[agent-window configuration](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.proposed.agentsWindowConfiguration.d.ts),
[interactive window](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.proposed.interactiveWindow.d.ts),
and [native window handle](https://raw.githubusercontent.com/microsoft/vscode/main/src/vscode-dts/vscode.proposed.nativeWindowHandle.d.ts).

## Remote-SSH Handoff

For Remote Development, UI extensions run on the user's local machine, whereas
workspace extensions run in a remote extension host when a remote workspace is
opened. Remote-SSH installs and manages VS Code Server on the SSH host. A
handoff to Remote-SSH is consequently a host transition, not a reliable
completion callback from the originating extension. [Remote extension
architecture](https://code.visualstudio.com/api/advanced-topics/remote-extensions#architecture-and-extension-kinds)
and [Remote-SSH architecture](https://code.visualstudio.com/docs/remote/ssh#remote-development-using-ssh).

Persist all state required to find and control the endpoint before launching the
remote handoff. Do not make process lifetime depend on which local extension
host happens to survive the transition.

## Recommended Pattern

1. While the local UI is live, make the keep/stop choice explicit: a connection
   form default, a persisted setting, or an explicit `Disconnect/Stop` command.
   The default for an established long-lived endpoint should be "keep running".
2. Before opening the Remote-SSH target, synchronously persist an authoritative
   record containing the endpoint PID or durable identity, CML session ID, host
   alias, and lifecycle policy. Mark the endpoint as handed off so local
   deactivation will not terminate it.
3. Make the external endpoint independent of the extension-host lifetime as
   required by the OS and endpoint CLI. Treat `deactivate()` only as bounded,
   best-effort cleanup; it must neither prompt nor make a new keep/stop
   decision.
4. On later activation, reconcile the persisted record with the local process
   and remote CML state. Offer explicit stop/disconnect and orphan-cleanup
   commands when a user is present.
5. If a close-time confirmation is a product requirement, request a new public
   VS Code lifecycle API. The internal lifecycle service is not a viable
   extension dependency.

## Limitations

- `deactivate()` is best effort, not a durable transaction boundary: its shared
  shutdown time is capped, and it receives neither a cancellation token nor a
  reason. It cannot safely wait for remote I/O or user input.
- A forced termination, crash, power loss, or process kill can prevent cleanup
  entirely. The durable record and startup reconciliation must preserve safety
  even when no deactivation runs.
- This conclusion covers VS Code `1.85.0` and the upstream declarations/source
  examined on 2026-07-29. Internal workbench APIs can change without providing a
  supported extension contract.

No production code was changed for this research.