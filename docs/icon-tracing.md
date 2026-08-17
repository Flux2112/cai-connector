# Tracing the logo into the activity-bar icon

How `media/cai-connector-side.png` becomes `media/cai-sidebar.svg`, and why the
pipeline is shaped the way it is. The tooling lives in `tools/icon-trace/`; run
`npm install && npm run build` there to regenerate both SVGs.

Written 2026-07-29, after the first trace was rejected for looking hand-made.

> Path note (2026-08-17): the repository became an npm workspaces monorepo, so
> every `media/…` path below now lives at `packages/extension/media/…`.
> `tools/icon-trace/` stayed at the root and its `trace.config.json` was
> repointed accordingly.

## What ships

| File | Contents | Used by |
|---|---|---|
| `media/cai-sidebar.svg` | Cloud, window, `>_`, SSH pill, **CAI wordmark** | `contributes.viewsContainers.activitybar` |
| `media/cai-sidebar-mark.svg` | Same minus the wordmark | Nothing yet — kept as the cleaner-at-small-sizes alternative |

The wordmark is a deliberate trade. It is an unreadable smear at 24 px and it
costs a third of the icon's height, shrinking the mark. It was kept anyway
because a bare cloud-plus-terminal reads as "some cloud extension" in a crowded
activity bar, whereas the `CAI` block is instantly identifiable as the Cloudera
AI extension even when the letters themselves are illegible — the silhouette
does the work. Differentiation beat legibility. If that judgement is ever
revisited, `cai-sidebar-mark.svg` is the other side of it and needs no new work.

## The colour and alpha config is not negotiable

`viewBox="0 0 24 24"`, paint with `currentColor`, no explicit opacity. This is
copied from the icon that shipped before this rewrite (see
`git show HEAD~:media/cai-sidebar.svg` around commit `b328754`) — it is *known*
to render correctly in the activity bar. VS Code recolours the icon and applies
60 % opacity when the view container is inactive and 100 % when active, so the
file must not bake in a colour or an opacity of its own.

Do not go looking this up in the VS Code docs and re-derive it. A previously
shipped, working file is stronger evidence than documentation.

## Pipeline

```
media/cai-connector-side.png
  └─ alpha.js    alpha channel → inverted greyscale "ink" bitmap
      └─ potrace  → one <path>, 11 subpaths, fill-rule="evenodd"
          └─ refine.js  drop subpaths by region, reframe into 24×24, currentColor
              └─ svgo    → media/*.svg
                  └─ compare.js  resvg contact sheet at 24/32/48/96 px, dark + light
```

`build.js` runs the whole thing. `inspect.js` is the only step needing human
judgement — see *Changing the artwork* below.

### Trace the alpha channel, not the pixels

The logo's **alpha channel is its ink**: every stroke is opaque, while the
background, the cloud's interior and the window's interior are transparent. So
`alpha.js` builds a bitmap from alpha alone and inverts it, because potrace
treats *dark* pixels as foreground.

Handing potrace the composited RGB instead traces the blue→teal gradient's
internal light/dark boundaries and misses the shape.

### Removing elements happens on the vector, not the bitmap

potrace emits a single `<path>` whose subpaths alternate between outlines and
holes, relying on `fill-rule="evenodd"`. Each logo element is therefore one or
more whole subpaths, and `refine.js` drops them by testing each subpath's
bounding box against named regions from `trace.config.json`:

```json
"regions": {
  "wordmark": { "y0": 570 },
  "sshPill":  { "x0": 418, "x1": 700, "y0": 380, "y1": 530 }
}
```

A region is a set of *optional* bounds, so `{ "y0": 570 }` is a half-plane and
`sshPill` is a full box. Erasing elements from the bitmap before tracing was
tried first and is worse: it leaves ragged edges where the erased shape
overlapped a kept one.

For the current artwork the subpaths are: `#0` cloud + window (merged, because
their strokes touch), `#1` the `>` chevron, `#2`–`#5` the pill and its knocked-out
`SSH`, `#6` the cursor underscore, `#7`–`#10` the `CAI` letters and the `A`'s
counter.

## Two facts about the artwork worth not rediscovering

**The window has no right edge.** The source never draws one — the SSH pill
covers where it would be. Anything that removes the pill has to invent a closing
edge, or the window looks unfinished. This is why `cai-sidebar-mark.svg` drops
only the wordmark and keeps the pill: the pill is load-bearing, not decoration.

**The cloud's right lobe is not a circle.** Its outer flank fits an arc of
radius ≈ 80 centred near (632, 330) in source pixels, while the shoulder above
it is far broader — no single circle fits both. An abandoned first attempt
modelled the cloud as three least-squares circles (left lobe (161, 322) r 146,
rms 0.5 px; centre bump (356, 187) r 173, rms 0.4 px; right lobe (490, 318)
r 196, rms **7.5 px**). The first two are excellent; the third is the tell, and
the resulting silhouette was visibly wrong. Hence tracing rather than fitting.

## Changing the artwork

1. Drop the new PNG in `media/` and point `source` in `trace.config.json` at it.
   It must be 8-bit RGBA, non-interlaced — `png.js` rejects anything else rather
   than guessing.
2. `npm run inspect` prints the ink bbox, an ASCII map with source coordinates,
   and scanline runs (`--rows 300,450 --cols 140,530`). Use it to read off new
   `regions` boxes.
3. `node build.js --dry-run` reports each subpath's index, bbox and which region
   caught it, writing nothing. Iterate on the regions until the right subpaths
   are dropped.
4. `npm run build` writes the SVGs and `build/compare.png`.
5. **Judge the 24 px row of the contact sheet**, not the 96 px one. Every
   candidate looks fine at 96 px; that is the trap this whole document exists to
   record.

## Tool choices

| Tool | Verdict |
|---|---|
| **potrace** 2.1.8 | Used. Pure JS, no native build. One path, 170 commands. |
| **VTracer** (`@neplex/vectorizer`) | Rejected. On a flat monochrome mark it produced 5 paths / 618 commands for the same input. Better at colour photos, worse here. Note its `Config` has no optional fields — omit one and napi rejects the whole object. |
| **svgo** 4.0.2 | Used. Roughly halves output. In v4 `removeViewBox` and `removeTitle` are no longer in `preset-default`, so `viewBox` and `<title>` survive by default — do not add overrides for them or svgo warns on every run. |
| **resvg** (`@resvg/resvg-js`) | Used for verification only. Rendering the result is the only way to catch this class of mistake. |
| ImageMagick / Inkscape CLI | Not viable. The `convert` on a stock Windows PATH is the disk-conversion tool, not ImageMagick, and Inkscape does not expose Trace Bitmap usefully from the CLI. |

None of this reaches the VSIX — `tools/icon-trace/` sits outside `packages/extension/`,
which is the only directory vsce packages, and `.vscodeignore` excludes `tools/**`
besides. The extension keeps its zero-runtime-dependency rule either way: these are
devDependencies of a separate, private package, never of the extension.

## Marketplace icon

Unrelated field, unchanged by this work: the root `package.json` `icon` is still
the 128×128 `cai-connector.png`. `docs/vscode-extension-icon-research.md` notes
it misses the documented 256×256 Retina guidance, and `media/cai-connector-logo.png`
(1254×1254) is available if that is ever worth fixing.
