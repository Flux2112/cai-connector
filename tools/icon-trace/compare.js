/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Renders SVGs with resvg at real activity-bar sizes and writes one contact
// sheet, dark row over light row. An icon that reads at 96px routinely turns to
// mush at 24px, so never judge one of these files by its large preview.
//
//   node compare.js out.png a.svg b.svg ...
//   (no args: renders every variant from trace.config.json)

"use strict";

const fs = require("fs");
const path = require("path");
const { Resvg } = require("@resvg/resvg-js");
const { encode } = require("./png.js");

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "trace.config.json"), "utf8"));

// Coverage (alpha) at NxN. VS Code recolours the icon, so only alpha matters -
// currentColor is forced to an opaque value first.
function coverage(file, N) {
  const svg = fs.readFileSync(file, "utf8").replace(/currentColor/g, "#000");
  const img = new Resvg(svg, {
    fitTo: { mode: "width", value: N },
    background: "rgba(0,0,0,0)",
  }).render();
  const out = new Float32Array(N * N);
  for (let y = 0; y < Math.min(img.height, N); y++) {
    for (let x = 0; x < Math.min(img.width, N); x++) {
      out[y * N + x] = img.pixels[(y * img.width + x) * 4 + 3] / 255;
    }
  }
  return out;
}

function sheet(outFile, files, sizes) {
  const TILE = 168;
  const PAD = 6;
  // VS Code's own activity-bar colours, so the comparison shows real chrome.
  const themes = [
    { bg: [0x18, 0x18, 0x18], fg: [0xd7, 0xd7, 0xd7] },
    { bg: [0xf8, 0xf8, 0xf8], fg: [0x3b, 0x3b, 0x3b] },
  ];
  const rows = themes.flatMap((t) => sizes.map((N) => ({ ...t, N })));
  const W = files.length * TILE + (files.length + 1) * PAD;
  const H = rows.length * TILE + (rows.length + 1) * PAD;
  const rgba = Buffer.alloc(W * H * 4);

  rows.forEach((row, ri) => {
    const bandTop = ri * (TILE + PAD);
    for (let y = bandTop; y < bandTop + TILE + PAD && y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        rgba[i] = row.bg[0];
        rgba[i + 1] = row.bg[1];
        rgba[i + 2] = row.bg[2];
        rgba[i + 3] = 255;
      }
    }
  });
  rows.forEach((row, ri) => {
    const oy = PAD + ri * (TILE + PAD);
    files.forEach((file, ci) => {
      const ox = PAD + ci * (TILE + PAD);
      let cov;
      try {
        cov = coverage(file, row.N);
      } catch (err) {
        console.log(`  ! ${path.basename(file)} @${row.N}: ${String(err).split("\n")[0]}`);
        return;
      }
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const sxi = Math.floor((x / TILE) * row.N);
          const syi = Math.floor((y / TILE) * row.N);
          const a = cov[syi * row.N + sxi] || 0;
          if (a <= 0) continue;
          const i = ((oy + y) * W + ox + x) * 4;
          for (let c = 0; c < 3; c++) {
            rgba[i + c] = Math.round(row.bg[c] * (1 - a) + row.fg[c] * a);
          }
        }
      }
    });
  });

  encode(outFile, W, H, rgba);
  console.log(`contact sheet: ${path.relative(process.cwd(), outFile)}  ${W}x${H}`);
  console.log(`  rows: ${rows.map((r) => `${r.N}px`).join(" / ")}  (dark then light)`);
  console.log(`  cols: ${files.map((f) => path.basename(f)).join(" | ")}`);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const sizes = cfg.compareSizes || [24, 32, 48, 96];
  if (args.length >= 2) {
    sheet(path.resolve(args[0]), args.slice(1).map((f) => path.resolve(f)), sizes);
  } else {
    const outDir = path.resolve(__dirname, cfg.outDir);
    const files = cfg.variants.map((v) => path.join(outDir, v.out));
    const work = path.resolve(__dirname, cfg.workDir);
    fs.mkdirSync(work, { recursive: true });
    sheet(path.join(work, "compare.png"), files, sizes);
  }
}

module.exports = { sheet, coverage };
