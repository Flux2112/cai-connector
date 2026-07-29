/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// One-shot pipeline: logo PNG -> monochrome 24x24 activity-bar SVGs.
//
//   alpha channel -> ink bitmap -> potrace -> drop regions -> reframe -> svgo
//
//   node build.js            write every variant in trace.config.json
//   node build.js --dry-run  trace and report, write nothing to media/

"use strict";

const fs = require("fs");
const path = require("path");
const potrace = require("potrace");
const { optimize } = require("svgo");

const { writeInkBitmap } = require("./alpha.js");
const { refine } = require("./refine.js");
const { sheet } = require("./compare.js");

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "trace.config.json"), "utf8"));
const DRY = process.argv.includes("--dry-run");

const source = path.resolve(__dirname, cfg.source);
const outDir = path.resolve(__dirname, cfg.outDir);
const workDir = path.resolve(__dirname, cfg.workDir);

// svgo 4 dropped removeViewBox and removeTitle from preset-default, so the
// viewBox and <title> survive without needing an override. Do not add one back:
// configuring a plugin that is not in the preset makes svgo warn on every run.
const SVGO = {
  multipass: true,
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          convertPathData: { floatPrecision: 2, transformPrecision: 3 },
          cleanupNumericValues: { floatPrecision: 2 },
        },
      },
    },
  ],
};

const tracePromise = (file, options) =>
  new Promise((resolve, reject) => {
    potrace.trace(file, options, (err, svg) => (err ? reject(err) : resolve(svg)));
  });

async function main() {
  fs.mkdirSync(workDir, { recursive: true });

  const inkFile = path.join(workDir, "ink.png");
  const { W, H } = writeInkBitmap(source, inkFile);
  console.log(`source     ${path.relative(process.cwd(), source)}  ${W}x${H}`);
  console.log(`ink bitmap ${path.relative(process.cwd(), inkFile)}  (alpha inverted for potrace)`);

  const rawSvg = await tracePromise(inkFile, cfg.potrace);
  const rawFile = path.join(workDir, "trace-raw.svg");
  fs.writeFileSync(rawFile, rawSvg);
  console.log(`trace      ${path.relative(process.cwd(), rawFile)}  ${Buffer.byteLength(rawSvg)} bytes\n`);

  const written = [];
  for (const variant of cfg.variants) {
    const res = refine(rawSvg, {
      drop: variant.drop || [],
      regions: cfg.regions,
      margin: cfg.margin,
      precision: cfg.precision,
      title: variant.title || "",
    });
    const opt = optimize(res.svg, SVGO).data;
    const finalSvg = opt.endsWith("\n") ? opt : `${opt}\n`;

    const target = path.join(outDir, variant.out);
    if (!DRY) fs.writeFileSync(target, finalSvg);
    written.push(target);

    const cmds = (finalSvg.match(/[MmCcLlZzAaHhVvSsQqTt]/g) || []).length;
    console.log(`${variant.out}`);
    console.log(`  kept ${res.kept.length} subpaths, dropped ${res.dropped.length}` +
      (res.dropped.length ? ` (${res.dropped.map((s) => `#${s.i}:${s.region}`).join(" ")})` : ""));
    console.log(`  source bbox x ${res.bbox.x0.toFixed(0)}..${res.bbox.x1.toFixed(0)} ` +
      `y ${res.bbox.y0.toFixed(0)}..${res.bbox.y1.toFixed(0)}  scale ${res.scale.toFixed(6)}`);
    console.log(`  ${Buffer.byteLength(res.svg)} -> ${Buffer.byteLength(finalSvg)} bytes after svgo, ${cmds} path commands`);
    if (variant.note) console.log(`  ${variant.note}`);
    if (DRY) console.log("  (dry run - not written)");
    console.log();
  }

  if (!DRY) {
    sheet(path.join(workDir, "compare.png"), written, cfg.compareSizes || [24, 32, 48, 96]);
    console.log("\nCheck the 24px row before shipping - that is the size VS Code uses.");
  }
}

main().catch((err) => {
  console.error(`icon-trace failed: ${String(err)}`);
  process.exit(1);
});
