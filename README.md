# CAI Connector

Tooling for working with [Cloudera AI](https://www.cloudera.com/products/machine-learning.html)
(Cloudera Machine Learning) from your editor and from the command line.

## Packages

| Package | Published as | What it is |
|---|---|---|
| [`packages/extension`](packages/extension) | [`DefySoftwareSolutions.cai-connector`](https://marketplace.visualstudio.com/items?itemName=DefySoftwareSolutions.cai-connector) on the VS Code Marketplace | The VS Code extension: creates SSH endpoints on Cloudera AI via `cdswctl`, writes per-session `~/.ssh/config` blocks, and hands off to Remote-SSH. **Start here** — its [README](packages/extension/README.md) is the user documentation. |

Two further packages are reserved on npm and not yet implemented — `@defysoftware/cai-core`
(a typed Cloudera AI API v2 client) and `@defysoftware/cai` (an agent-first CLI). The design
is in [`docs/plans/cml-api-v2-cli.md`](docs/plans/cml-api-v2-cli.md).

## Development

npm workspaces; run everything from the repository root.

```bash
npm install
npm run compile   # → packages/extension/out/
npm test          # type-checks and runs the suite
npm run package   # → packages/extension/*.vsix
```

Debug the extension with the **Run Extension** launch configuration.

`AGENTS.md` is the single source of truth for how this repository is put together —
read it before changing anything non-trivial.

## Licence

GPL-3.0-or-later. See [LICENSE](LICENSE).
