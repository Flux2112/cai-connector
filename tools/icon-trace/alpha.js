/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// The logo's ALPHA channel is its ink: every stroke is opaque, and the
// background, the cloud's interior and the window's interior are transparent.
// That makes alpha - not luminance - the correct tracer input. Feeding potrace
// the composited RGB instead would trace the gradient's light/dark boundaries
// and miss the shape entirely.
//
// potrace treats *dark* pixels as foreground, so ink has to be inverted.

"use strict";

const path = require("path");
const { decode, encode } = require("./png.js");

function writeInkBitmap(sourcePng, outPng) {
  const img = decode(sourcePng);
  const out = Buffer.alloc(img.W * img.H * 4);
  for (let y = 0; y < img.H; y++) {
    for (let x = 0; x < img.W; x++) {
      const gray = 255 - img.alpha(x, y);
      const i = (y * img.W + x) * 4;
      out[i] = gray;
      out[i + 1] = gray;
      out[i + 2] = gray;
      out[i + 3] = 255;
    }
  }
  encode(outPng, img.W, img.H, out);
  return { W: img.W, H: img.H, file: path.resolve(outPng) };
}

// Bounding box of everything with alpha above `threshold`.
function inkBounds(sourcePng, threshold = 40) {
  const img = decode(sourcePng);
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (let y = 0; y < img.H; y++) {
    for (let x = 0; x < img.W; x++) {
      if (img.alpha(x, y) <= threshold) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { W: img.W, H: img.H, x0, y0, x1, y1 };
}

module.exports = { writeInkBitmap, inkBounds };
