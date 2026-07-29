/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Diagnostic pass over the source artwork. Prints the ink bounding box, an
// ASCII map with source coordinates, and scanline runs. Use it to derive the
// `regions` bounding boxes in trace.config.json whenever the logo changes -
// that is the only step of this pipeline that needs a human eye.
//
//   node inspect.js [--rows y0,y1,...] [--cols x0,x1,...] [--width 100]

"use strict";

const fs = require("fs");
const path = require("path");
const { decode } = require("./png.js");

const cfg = JSON.parse(fs.readFileSync(path.join(__dirname, "trace.config.json"), "utf8"));
const src = path.resolve(__dirname, cfg.source);

const argv = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const COLS = parseInt(flag("width", "100"), 10);
const THRESH = parseInt(flag("threshold", "100"), 10);

const img = decode(src);
const { W, H } = img;
console.log(`source: ${path.relative(process.cwd(), src)}  ${W}x${H}`);

let x0 = Infinity;
let y0 = Infinity;
let x1 = -Infinity;
let y1 = -Infinity;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (img.alpha(x, y) < THRESH) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}
console.log(`ink bbox: x ${x0}..${x1} (w ${x1 - x0 + 1})  y ${y0}..${y1} (h ${y1 - y0 + 1})`);

// --- ASCII map. Hue classification only helps a human spot which element is
// which; the trace itself never looks at colour.
const sx = W / COLS;
const sy = sx * (10 / 18); // terminal cells are roughly 10x18
const ROWS = Math.floor(H / sy);
console.log("\nASCII map  ('.' clear  '#' blue  'T' teal  'W' white  '+' other)");
let header = "     ";
for (let c = 0; c < COLS; c++) header += c % 10 === 0 ? String(Math.floor((c * sx) / 100) % 10) : " ";
console.log(`${header}   <- x/100`);
for (let r = 0; r < ROWS; r++) {
  let line = "";
  for (let c = 0; c < COLS; c++) {
    let best = null;
    for (let yy = Math.floor(r * sy); yy < Math.min(H, (r + 1) * sy); yy++) {
      for (let xx = Math.floor(c * sx); xx < Math.min(W, (c + 1) * sx); xx++) {
        const a = img.alpha(xx, yy);
        if (!best || a > best.a) best = { a, rgb: img.rgb(xx, yy) };
      }
    }
    if (!best || best.a < 60) {
      line += ".";
      continue;
    }
    const [R, G, B] = best.rgb;
    const mx = Math.max(R, G, B);
    const mn = Math.min(R, G, B);
    if (mx - mn < 28) line += mx > 150 ? "W" : "+";
    else if (B > G + 25) line += "#";
    else if (G >= B) line += "T";
    else line += "+";
  }
  console.log(`${String(Math.floor(r * sy)).padStart(4)} ${line}`);
}

// --- Scanline runs. This is how the SSH pill's bbox and the window's missing
// right edge were originally measured.
const runsAlong = (fixed, isRow) => {
  const runs = [];
  let start = null;
  const limit = isRow ? W : H;
  for (let i = 0; i < limit; i++) {
    const a = isRow ? img.alpha(i, fixed) : img.alpha(fixed, i);
    if (a >= THRESH) {
      if (start === null) start = i;
    } else if (start !== null) {
      runs.push([start, i - 1]);
      start = null;
    }
  }
  if (start !== null) runs.push([start, limit - 1]);
  return runs;
};
const fmt = (runs) => runs.map(([a, b]) => `${a}-${b}(w${b - a + 1})`).join("  ") || "-";

const rows = flag("rows", "") ? flag("rows", "").split(",").map(Number) : null;
const cols = flag("cols", "") ? flag("cols", "").split(",").map(Number) : null;
if (rows) {
  console.log("\nrow scans (opaque runs):");
  for (const y of rows) console.log(`  y=${String(y).padStart(4)}: ${fmt(runsAlong(y, true))}`);
}
if (cols) {
  console.log("\ncolumn scans (opaque runs):");
  for (const x of cols) console.log(`  x=${String(x).padStart(4)}: ${fmt(runsAlong(x, false))}`);
}
if (!rows && !cols) {
  console.log("\n(pass --rows 300,450 and/or --cols 140,530 for scanline runs)");
}
