# icon-trace

Traces `media/cai-connector-side.png` into the monochrome 24×24 activity-bar
SVGs. Build tooling only — a private package, excluded from the VSIX by
`.vscodeignore`, so the extension keeps its zero-runtime-dependency rule.

```bash
cd tools/icon-trace
npm install
npm run build          # writes media/cai-sidebar.svg + media/cai-sidebar-mark.svg
node build.js --dry-run   # trace and report, write nothing
npm run inspect        # measure the artwork (see below)
npm run compare        # re-render the contact sheet only
```

Outputs land in `build/` (gitignored): `ink.png`, `trace-raw.svg`, `compare.png`.

**Judge `build/compare.png` at its 24 px row.** Everything looks fine at 96 px.

## Files

| File | Role |
|---|---|
| `trace.config.json` | Source path, potrace options, drop regions, variants |
| `png.js` | Minimal 8-bit RGBA PNG read/write (no image dependency) |
| `alpha.js` | Alpha channel → inverted "ink" bitmap for potrace |
| `refine.js` | Split subpaths, drop by region, reframe to 24×24, `currentColor` |
| `compare.js` | resvg contact sheet at 24/32/48/96 px, dark + light |
| `build.js` | The whole pipeline |
| `inspect.js` | Diagnostics for deriving new drop regions |

## Adding or changing a variant

Variants are entries in `trace.config.json`; `drop` names regions whose subpaths
are removed. A region is a set of *optional* bounds in source-pixel space, so
`{ "y0": 570 }` is a half-plane and a full box is all four.

```jsonc
{ "out": "cai-sidebar-mark.svg", "drop": ["wordmark"], "title": "CAI Connector" }
```

To find the bounds for new artwork: `npm run inspect -- --rows 300,450 --cols 140,530`,
then `node build.js --dry-run` to see which subpath each region catches.

Full rationale, and two non-obvious facts about the artwork that will otherwise
be rediscovered the hard way, are in [`docs/icon-tracing.md`](../../docs/icon-tracing.md).
