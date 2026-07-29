/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Turns potrace's raw trace into an icon: splits the single <path> into
// subpaths, drops the ones inside unwanted regions, then reframes what is left
// into a 24x24 viewBox painted with currentColor.
//
// potrace emits one path whose subpaths are alternately outlines and holes,
// relying on fill-rule="evenodd" - so the output keeps that rule. Dropping a
// subpath removes exactly one contour, which is why element removal has to
// happen here and not by editing the bitmap.

"use strict";

// Exact bbox of one subpath, flattening cubics. potrace only emits M/C/L/Z.
function subpathBBox(sp) {
  const toks = sp.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
  let i = 0;
  let cur = null;
  let start = null;
  let cmd = null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  const hit = (x, y) => {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  const num = () => parseFloat(toks[i++]);
  while (i < toks.length) {
    if (/[MCLZ]/i.test(toks[i])) {
      cmd = toks[i].toUpperCase();
      i++;
      if (cmd === "Z") cur = start;
      continue;
    }
    if (cmd === "M") {
      cur = [num(), num()];
      start = cur;
      hit(cur[0], cur[1]);
    } else if (cmd === "L") {
      cur = [num(), num()];
      hit(cur[0], cur[1]);
    } else if (cmd === "C") {
      const p1 = [num(), num()];
      const p2 = [num(), num()];
      const p3 = [num(), num()];
      for (let k = 0; k <= 24; k++) {
        const u = k / 24;
        const m = 1 - u;
        hit(
          m * m * m * cur[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0],
          m * m * m * cur[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1],
        );
      }
      cur = p3;
    } else {
      i++;
    }
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// A subpath matches a region when its bbox satisfies every bound the region
// specifies. Omitted bounds are unconstrained, so `{ y0: 570 }` is a half-plane.
function matchesRegion(bb, region) {
  if (region.x0 !== undefined && bb.x0 < region.x0) return false;
  if (region.x1 !== undefined && bb.x1 > region.x1) return false;
  if (region.y0 !== undefined && bb.y0 < region.y0) return false;
  if (region.y1 !== undefined && bb.y1 > region.y1) return false;
  return true;
}

function splitSubpaths(d) {
  return d
    .split(/(?=M)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param rawSvg  potrace output (source-pixel coordinate space)
 * @param opts    { drop: string[], regions: {}, margin, precision, title }
 * @returns       { svg, kept, dropped, bbox }
 */
function refine(rawSvg, opts) {
  const { drop = [], regions = {}, margin = 0.6, precision = 3, title = "" } = opts;
  const m = rawSvg.match(/<path[^>]*\sd="([^"]*)"/);
  if (!m) throw new Error("no <path d=...> in trace output");

  const subs = splitSubpaths(m[1]).map((sp, i) => ({ i, sp, bb: subpathBBox(sp) }));

  const kept = [];
  const dropped = [];
  for (const s of subs) {
    const hitName = drop.find((name) => {
      const region = regions[name];
      if (!region) throw new Error(`unknown region "${name}"`);
      return matchesRegion(s.bb, region);
    });
    if (hitName) dropped.push({ ...s, region: hitName });
    else kept.push(s);
  }
  if (!kept.length) throw new Error("every subpath was dropped");

  // Reframe: fit the longer axis into 24 - 2*margin, centre the other.
  let X0 = Infinity;
  let Y0 = Infinity;
  let X1 = -Infinity;
  let Y1 = -Infinity;
  for (const s of kept) {
    X0 = Math.min(X0, s.bb.x0);
    Y0 = Math.min(Y0, s.bb.y0);
    X1 = Math.max(X1, s.bb.x1);
    Y1 = Math.max(Y1, s.bb.y1);
  }
  const span = 24 - 2 * margin;
  const scale = span / Math.max(X1 - X0, Y1 - Y0);
  const ox = margin + (span - (X1 - X0) * scale) / 2;
  const oy = margin + (span - (Y1 - Y0) * scale) / 2;
  const fx = (v) => +((v - X0) * scale + ox).toFixed(precision);
  const fy = (v) => +((v - Y0) * scale + oy).toFixed(precision);

  const remap = (sp) => {
    const toks = sp.match(/[MCLZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [];
    let out = "";
    let i = 0;
    let cmd = null;
    let pend = [];
    const flush = () => {
      if (pend.length) {
        out += `${pend.join(" ")} `;
        pend = [];
      }
    };
    while (i < toks.length) {
      if (/[MCLZ]/i.test(toks[i])) {
        flush();
        cmd = toks[i].toUpperCase();
        out += `${cmd} `;
        i++;
        continue;
      }
      const x = parseFloat(toks[i++]);
      const y = parseFloat(toks[i++]);
      pend.push(`${fx(x)} ${fy(y)}`);
      if (cmd === "M" || cmd === "L" || (cmd === "C" && pend.length === 3)) flush();
    }
    return out.replace(/\s+/g, " ").trim();
  };

  const d = kept.map((s) => remap(s.sp)).join(" ");
  const titleTag = title ? `\n  <title>${title}</title>` : "";
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd">` +
    `${titleTag}\n  <path d="${d}"/>\n</svg>\n`;

  return { svg, kept, dropped, bbox: { x0: X0, y0: Y0, x1: X1, y1: Y1 }, scale };
}

module.exports = { refine, subpathBBox, splitSubpaths, matchesRegion };
