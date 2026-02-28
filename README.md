# CAI Connector

Create Cloudera AI (CML) SSH endpoints from VS Code and connect with Remote-SSH. This extension is Windows-only and uses the `cdswctl.exe` CLI.

## Features

- Connect to CML sessions over SSH with a single command.
- Recreate the last session with one click.
- Browse available runtimes and cache the list locally.
- Store API keys securely in VS Code Secret Storage.
- Manage SSH config entries for a dedicated `Host cml` block.
- Auto-shutdown idle endpoints after a configurable timeout.

## Requirements

- Windows 10 or later.
- VS Code with the Remote-SSH extension installed.
- `cdswctl.exe` available on your PATH or configured via settings.
- A CML API key with permission to create SSH endpoints.

## Quick start

1. Install the extension.
2. Ensure `cdswctl.exe` is on your PATH, or set `caiConnector.cdswctlPath`.
3. Run `CAI Connector: Connect` and follow the prompts for CML URL and API key.
4. VS Code opens a new Remote-SSH window when the endpoint is ready.

## Commands

- `CAI Connector: Connect` - Create a new SSH endpoint and connect.
- `CAI Connector: Disconnect` - Tear down the current endpoint.
- `CAI Connector: Recreate Last Session` - Reconnect using the previous session configuration.
- `CAI Connector: Browse Runtimes` - View available runtimes.
- `CAI Connector: Clear Cache` - Clear the cached runtime list.

## Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `caiConnector.cmlUrl` | string | `""` | Cloudera AI (CML) base URL. |
| `caiConnector.cdswctlPath` | string | `""` | Full path to `cdswctl.exe`. When empty, PATH is used. |
| `caiConnector.defaultCpus` | number | `2` | Default CPU count. |
| `caiConnector.defaultMemoryGb` | number | `4` | Default memory (GB). |
| `caiConnector.defaultGpus` | number | `0` | Default number of GPUs. |
| `caiConnector.cacheHours` | number | `24` | Runtime cache duration (hours). |
| `caiConnector.idleTimeoutMinutes` | number | `30` | Minutes of SSH inactivity before auto-shutdown. Set to 0 to disable. |

## How it works

- The extension spawns a detached helper process that runs `cdswctl ssh-endpoint`.
- Endpoint state is written to a JSON file under the extension storage directory.
- When ready, the extension updates your SSH config and opens Remote-SSH.
- An idle monitor watches for active SSH connections; after a configurable timeout the endpoint and CML sessions are automatically shut down.

## Troubleshooting

- **`cdswctl.exe` not found**: Set `caiConnector.cdswctlPath` or add it to PATH.
- **Endpoint stuck in starting**: Check the Output channel: `View > Output > CAI Connector`.
- **Auth errors**: Run `CAI Connector: Reset API Key` and re-enter your key.

## Security

- API keys are stored using VS Code Secret Storage.
- Endpoint state and temporary config are stored in your user profile storage folder.
- The extension does not log or persist raw API keys.

## Development

```bash
npm install
npm run compile
```

## CI/CD

Every push to `main` triggers the GitHub Actions publish workflow, which:

1. Compiles the TypeScript source.
2. Bumps the minor version and pushes a `[skip ci]` commit + git tag.
3. Packages the extension as a `.vsix`.
4. Publishes to the VS Code Marketplace via `vsce` using the `AZURE_PAT` secret.
5. Uploads the `.vsix` as a GitHub Actions artifact.

## License

Copyright (C) 2026 Marvin Hanke

This program is free software: you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
