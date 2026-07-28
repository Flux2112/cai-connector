# CAI Connector

Connect to [Cloudera AI (CML)](https://docs.cloudera.com/machine-learning/cloud/index.html) from VS Code over SSH — without leaving your editor.

The extension uses `cdswctl` to create a CML SSH endpoint, updates your SSH config automatically, and opens a **Remote-SSH** window into your session. When you are done, it tears the endpoint down cleanly.

---

## Requirements

- **Windows 10 or later** (the extension uses `cdswctl.exe`)
- **VS Code 1.85.0** or later
- The **[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)** extension installed
- `cdswctl.exe` — available on your PATH, or configured via `caiConnector.cdswctlPath`
- A CML API key with permission to create SSH endpoints

---

## Quick Start

1. Install the extension.
2. Make sure `cdswctl.exe` is on your PATH, or set **`caiConnector.cdswctlPath`** to its full path.
3. Open the Command Palette (`Ctrl+Shift+P`) and run **`CAI Connector: Connect`**.
4. Enter your **CML URL** and **API key** when prompted (stored securely — you only need to do this once).
5. Fill in the **session form**: project, runtime, and resources are all on one page. Fractional CPU sizes such as `0.5` are supported, and a previous session can be recalled with one click.
6. Press **Create session** and watch the endpoint come up — VS Code opens a Remote-SSH window automatically.

Run **Connect** again whenever you need another session. Sessions run **in parallel** — several projects, or several sessions in the same project, each in its own window. Connecting never disturbs a session you already have open.

---

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`).

| Command | Description |
|---|---|
| `CAI Connector: Connect` | Open the session form to create a new CML SSH endpoint and connect to it with Remote-SSH. Existing sessions keep running. |
| `CAI Connector: Disconnect Sessions` | Tear down sessions and clean up their SSH config entries. With more than one session running, you pick which. |
| `CAI Connector: Clean Up Orphaned Sessions` | Check every recorded session against CML, stop any that is still running without a local endpoint, and kill leftover endpoint processes. |
| `CAI Connector: Recreate Last Session` | Reconnect instantly using the same runtime and resource settings as your previous session. |
| `CAI Connector: Browse Runtimes` | View the list of available CML runtimes (cached locally for speed). |
| `CAI Connector: Clear Runtime Cache` | Clear the locally cached runtime list and fetch a fresh copy on next connect. |
| `CAI Connector: Reset API Key` | Remove the stored CML API key. You will be prompted for a new one on next connect. |
| `CAI Connector: Refresh Sessions` | Reload the Sessions sidebar. |

These commands act on a session selected in the **Sessions** sidebar and are also available as inline icons there:

| Command | Description |
|---|---|
| `CAI Connector: Join Session` | Open a Remote-SSH window into an already-running session. |
| `CAI Connector: Recreate Session` | Stop the session and start a fresh one with the same runtime and resources. |
| `CAI Connector: Kill Session` | Stop the endpoint process and the remote CML session. |
| `CAI Connector: Edit Session Configuration` | Change the runtime, addon, or resources stored for a session. A running session is offered a recreate, since resources only change when the container restarts. |

---

## Configuration

Open settings with `Ctrl+,` and search for `caiConnector`, or add them to `settings.json` directly.

### Connection

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.cmlUrl` | `string` | `""` | Base URL of your Cloudera AI (CML) workspace, e.g. `https://ml-abc123.my-company.com`. |
| `caiConnector.cdswctlPath` | `string` | `""` | Full path to `cdswctl.exe`. Leave empty to use the one on your PATH. |

### Resource Defaults

These values pre-fill the session form when you run **Connect** or **Recreate Last Session**. You can always override them at connection time, and tick **Use these resources as my defaults** in the form to write your current values back here.

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.defaultCpus` | `number` | `2` | Default number of vCPUs for new sessions. Fractional values such as `0.5` are allowed. |
| `caiConnector.defaultMemoryGb` | `number` | `4` | Default memory allocation in GB. Fractional values are allowed. |
| `caiConnector.defaultGpus` | `number` | `0` | Default number of GPUs. Set to `0` for CPU-only sessions. |
| `caiConnector.cpuProfiles` | `number[]` | `[0.5, 1, 2, 4, 8]` | CPU sizes offered as one-click choices in the session form. Set this to the profiles your platform actually deploys. Any other value is still accepted, with a warning — the extension cannot enumerate your platform's profiles. |
| `caiConnector.memoryProfiles` | `number[]` | `[2, 4, 8, 16, 32]` | Memory sizes in GB offered as one-click choices. |

### Runtimes

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.cacheHours` | `number` | `24` | How long (in hours) the runtime list is cached locally before being refreshed. |
| `caiConnector.latestRuntimesOnly` | `boolean` | `true` | Show only the newest version of each runtime (grouped by editor, kernel, and edition) in the picker. |

### Window Behaviour

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.openInSameWindow` | `boolean` | `true` | Open the remote session in the current window instead of a new one. A new window is always used when you are already inside a remote session. |

### Session Cleanup

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.autoStopOrphanedSessions` | `boolean` | `true` | Stop CML sessions whose local SSH endpoint has gone away, so they stop consuming cluster capacity. Only sessions this extension created and that CML confirms are still running are ever stopped. Turn this off to clean up manually with **Clean Up Orphaned Sessions**. |

### Example `settings.json`

```json
{
  "caiConnector.cmlUrl": "https://ml-abc123.my-company.com",
  "caiConnector.defaultCpus": 4,
  "caiConnector.defaultMemoryGb": 8,
  "caiConnector.defaultGpus": 0,
  "caiConnector.openInSameWindow": false
}
```

---

## How It Works

1. **Connect** — the extension spawns `cdswctl ssh-endpoint` as a background process and monitors its output for readiness.
2. **SSH config** — once the endpoint is ready, the extension writes a `Host cml-<project>` block to your SSH config so Remote-SSH can connect without any manual setup. Each session gets its own host name, so several can be reachable at once.
3. **Remote-SSH window** — VS Code opens a window connected to that host over SSH. You can edit files, run terminals, and use any VS Code extension as if you were on the machine.
4. **Disconnect** — tears down the endpoint process, stops the CML session it created, removes its SSH config entry, and cleans up state.

The endpoint process keeps running while your remote window is open, including across window reloads. Only the sessions this extension created are ever stopped — other sessions in your CML project are left untouched.

Sessions are **not** shut down automatically after a period of inactivity; use **Disconnect Sessions** or **Kill Session** when you are finished.

### Session status

Two things can independently be up or down: the **local SSH endpoint** on your machine, and the **CML session** on the platform. The sidebar shows both, because they can disagree:

| What you see | What it means |
|---|---|
| `endpoint up · CML up` | Healthy. Join it. |
| `endpoint up · CML gone` | The tunnel is still running but the platform ended the session. Kill it and recreate. |
| `endpoint gone · CML up` | **Orphaned**: the session is still consuming cluster capacity with no way to reach it. Cleaned up automatically, or with **Clean Up Orphaned Sessions**. |
| `endpoint gone · CML gone` | Stopped. Its settings are kept so you can recreate it. |
| `CML unchecked` | The platform has not been asked yet. Open the Sessions view to refresh. |

### Sidebar

The **CAI Connector** activity-bar icon opens a **Sessions** view listing your recent sessions with their runtime, resource allocation, SSH host, port, and both statuses. From there you can start a new session, join a running one, recreate it with the same settings, or kill it. Sessions started from other VS Code windows appear here too.

---

## Security

- **API keys** are stored using VS Code's built-in [Secret Storage](https://code.visualstudio.com/api/references/vscode-api#SecretStorage) — never written to `settings.json` or any plain-text file.
- Endpoint state is stored in your VS Code user profile storage folder (not your workspace).
- The extension does not log or transmit your API key.

---

## Troubleshooting

**`cdswctl.exe` not found**
Set `caiConnector.cdswctlPath` to the full path of `cdswctl.exe`, or add its directory to your system PATH and restart VS Code.

**Endpoint stuck in "starting"**
Open the Output channel (`View > Output`, select **CAI Connector**) to see live logs from `cdswctl`. Common causes: insufficient cluster capacity, an expired API key, or network connectivity issues between VS Code and your CML workspace.

**Authentication errors / API key rejected**
Run `CAI Connector: Reset API Key` to clear the stored key, then `CAI Connector: Connect` — you will be prompted for a new one. A stored key is reused until you reset it, so simply retrying **Connect** will keep failing with the same rejected key.

**Remote-SSH window does not open**
Ensure the [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) extension is installed and enabled. Check that `ssh` is on your PATH (open a terminal and run `ssh -V`).

**Runtimes list is stale or empty**
Run `CAI Connector: Clear Runtime Cache`, then `CAI Connector: Browse Runtimes` to fetch a fresh list from CML.

**A session shows `endpoint gone · CML up`**
Its container is still running on the cluster with no local endpoint to reach it. Run `CAI Connector: Clean Up Orphaned Sessions` to stop it, or use **Recreate Session** to get a fresh endpoint for the same configuration.

**Remote-SSH connects to the wrong session**
Each session has its own host name (`cml-<project>`), shown in the sidebar under **SSH host**. If an older window is still pointing at the bare `cml` host from a previous version of the extension, reconnect it via **Join Session** to move it onto a per-session alias.

---

## License

Copyright (C) 2026 Marvin Hanke

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
