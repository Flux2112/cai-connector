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
5. Choose a **runtime**, **CPU**, **memory**, and **GPU** allocation.
6. Wait for the endpoint to become ready — VS Code opens a new Remote-SSH window automatically.

---

## Commands

All commands are available via the Command Palette (`Ctrl+Shift+P`).

| Command | Description |
|---|---|
| `CAI Connector: Connect` | Create a new CML SSH endpoint and open it in Remote-SSH. Prompts for runtime and resource allocation. |
| `CAI Connector: Disconnect` | Tear down the current endpoint and clean up the SSH config entry. |
| `CAI Connector: Recreate Last Session` | Reconnect instantly using the same runtime and resource settings as your previous session. |
| `CAI Connector: Browse Runtimes` | View the list of available CML runtimes (cached locally for speed). |
| `CAI Connector: Clear Cache` | Clear the locally cached runtime list and fetch a fresh copy on next connect. |

---

## Configuration

Open settings with `Ctrl+,` and search for `caiConnector`, or add them to `settings.json` directly.

### Connection

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.cmlUrl` | `string` | `""` | Base URL of your Cloudera AI (CML) workspace, e.g. `https://ml-abc123.my-company.com`. |
| `caiConnector.cdswctlPath` | `string` | `""` | Full path to `cdswctl.exe`. Leave empty to use the one on your PATH. |

### Resource Defaults

These values pre-fill the resource picker when you run **Connect** or **Recreate Last Session**. You can always override them at connection time.

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.defaultCpus` | `number` | `2` | Default number of vCPUs for new sessions. |
| `caiConnector.defaultMemoryGb` | `number` | `4` | Default memory allocation in GB. |
| `caiConnector.defaultGpus` | `number` | `0` | Default number of GPUs. Set to `0` for CPU-only sessions. |

### Runtime Cache

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.cacheHours` | `number` | `24` | How long (in hours) the runtime list is cached locally before being refreshed. |

### Idle Shutdown

| Setting | Type | Default | Description |
|---|---|---|---|
| `caiConnector.idleTimeoutMinutes` | `number` | `30` | Minutes of SSH inactivity before the endpoint is shut down automatically. Set to `0` to disable. |

### Example `settings.json`

```json
{
  "caiConnector.cmlUrl": "https://ml-abc123.my-company.com",
  "caiConnector.defaultCpus": 4,
  "caiConnector.defaultMemoryGb": 8,
  "caiConnector.defaultGpus": 0,
  "caiConnector.idleTimeoutMinutes": 60
}
```

---

## How It Works

1. **Connect** — the extension spawns `cdswctl ssh-endpoint` as a background process and monitors its output for readiness.
2. **SSH config** — once the endpoint is ready, the extension writes a `Host cml` block to your SSH config so Remote-SSH can connect without any manual setup.
3. **Remote-SSH window** — VS Code opens a new window connected to `cml` over SSH. You can edit files, run terminals, and use any VS Code extension as if you were on the machine.
4. **Idle monitor** — a background watcher checks for active SSH connections. After the configured idle timeout with no active connections, the endpoint and its CML session are shut down to conserve resources.
5. **Disconnect** — tears down the endpoint process, removes the SSH config entry, and cleans up state.

### New: Sidebar
Manage your sessions directly from the sidebar. Start, recreate or stop sessions. See your previous runtime configurations etc.

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
Run `CAI Connector: Connect` again — you will be prompted to re-enter your API key. The old key is replaced in Secret Storage automatically.

**Remote-SSH window does not open**
Ensure the [Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh) extension is installed and enabled. Check that `ssh` is on your PATH (open a terminal and run `ssh -V`).

**Runtimes list is stale or empty**
Run `CAI Connector: Clear Cache`, then `CAI Connector: Browse Runtimes` to fetch a fresh list from CML.

---

## License

Copyright (C) 2026 Marvin Hanke

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
