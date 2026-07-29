/*
 * CAI Connector - a VS Code extension for Cloudera AI SSH endpoints.
 * Copyright (C) 2025  Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

// Minimal PNG reader/writer for 8-bit RGBA, non-interlaced files. Exists so the
// pipeline can inspect the logo's alpha channel with no image-library
// dependency; zlib from Node covers the only hard part.

"use strict";

const fs = require("fs");
const zlib = require("zlib");

function decode(file) {
  const b = fs.readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file}: not a PNG`);
  const W = b.readUInt32BE(16);
  const H = b.readUInt32BE(20);
  const depth = b[24];
  const colorType = b[25];
  const interlace = b[28];
  if (depth !== 8 || colorType !== 6 || interlace !== 0) {
    throw new Error(
      `${file}: need 8-bit RGBA, non-interlaced (got depth ${depth}, colorType ${colorType}, interlace ${interlace})`,
    );
  }

  let off = 8;
  const idat = [];
  while (off < b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") idat.push(b.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));

  const BPP = 4;
  const stride = W * BPP;
  const px = Buffer.alloc(H * stride);
  for (let y = 0; y < H; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = px.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= BPP ? cur[i - BPP] : 0;
      const bb = prev[i];
      const c = i >= BPP ? prev[i - BPP] : 0;
      let v = src[i];
      if (filter === 1) v += a;
      else if (filter === 2) v += bb;
      else if (filter === 3) v += (a + bb) >> 1;
      else if (filter === 4) {
        const p = a + bb - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - bb);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? bb : c;
      }
      cur[i] = v & 0xff;
    }
  }

  return {
    W,
    H,
    px,
    stride,
    alpha: (x, y) => px[y * stride + x * BPP + 3],
    rgb: (x, y) => {
      const i = y * stride + x * BPP;
      return [px[i], px[i + 1], px[i + 2]];
    },
  };
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    let c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = c ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const cr = Buffer.alloc(4);
  cr.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, cr]);
}

// rgba: Buffer of W * H * 4 bytes.
function encode(file, W, H, rgba) {
  const stride = W * 4;
  const raw = Buffer.alloc(H * (stride + 1));
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

module.exports = { decode, encode };
