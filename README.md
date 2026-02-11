# CAI Connector

Create Cloudera AI (CML) SSH endpoints from VS Code and connect with Remote-SSH. This extension is Windows-only and uses the `cdswctl.exe` CLI.

## Features

- Connect to CML sessions over SSH with a single command.
- Browse available runtimes and cache the list locally.
- Store API keys securely in VS Code Secret Storage.
- Manage SSH config entries for a dedicated `Host cml` block.

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
- `CAI Connector: Browse Runtimes` - View available runtimes.
- `CAI Connector: Reset API Key` - Clear the stored API key.

## Settings

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `caiConnector.cmlUrl` | string | `https://cml.example.com/` | CML base URL. |
| `caiConnector.cdswctlPath` | string | `""` | Full path to `cdswctl.exe`. When empty, PATH is used. |
| `caiConnector.defaultCpus` | number | `2` | Default CPU count. |
| `caiConnector.defaultMemoryGb` | number | `4` | Default memory (GB). |
| `caiConnector.cacheHours` | number | `24` | Runtime cache duration (hours). |

## How it works

- The extension spawns a detached helper process that runs `cdswctl ssh-endpoint`.
- Endpoint state is written to a JSON file under the extension storage directory.
- When ready, the extension updates your SSH config and opens Remote-SSH.

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

## License

Add your license text here.
