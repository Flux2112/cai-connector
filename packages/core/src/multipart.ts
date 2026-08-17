/*
 * Copyright (C) 2026 Marvin Hanke
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import { CaiRequestError } from "./errors";
import type { RawBody } from "./types";

/**
 * `multipart/form-data`, hand-written for the same reason everything else here
 * is: the package ships zero runtime dependencies, and the platform's own
 * `FormData` is not usable through this transport — the injectable `FetchLike`
 * takes a string or bytes, deliberately, so the extension can hand in a
 * `node:https` implementation later.
 */

const encoder = new TextEncoder();

export type MultipartPart = {
  /**
   * The form field name. For the API's upload operation this is the
   * *destination path*, not a field label — see `uploadFile`.
   */
  name: string;
  filename?: string;
  contentType?: string;
  bytes: Uint8Array;
};

/** A quote, CR or LF — the three characters that would break out of a quoted
 *  `Content-Disposition` value. Built from char codes rather than written as a
 *  regex literal so no control character ends up in the source. */
const HEADER_UNSAFE = [34, 13, 10].map((code) => String.fromCharCode(code));

/**
 * A value that cannot escape a `Content-Disposition` header.
 *
 * RFC 7578 leaves the escaping of a quote or a newline to the sender, and the
 * two plausible conventions disagree, so a name carrying one is refused rather
 * than mangled into something the server would resolve differently from what
 * was asked for.
 */
function assertHeaderSafe(label: string, value: string): void {
  if (HEADER_UNSAFE.some((char) => value.includes(char))) {
    throw new CaiRequestError(`${label} may not contain a quote or a newline: ${JSON.stringify(value)}`);
  }
}

/**
 * A boundary no payload will contain by accident.
 *
 * 128 bits from the platform CSPRNG when there is one. The fallback exists only
 * so the module stays free of `node:crypto`; both branches are far past the
 * point where a collision is worth guarding against.
 */
export function multipartBoundary(): string {
  const raw = new Uint8Array(16);
  const webCrypto = (globalThis as { crypto?: { getRandomValues?(a: Uint8Array): void } }).crypto;
  if (typeof webCrypto?.getRandomValues === "function") {
    webCrypto.getRandomValues(raw);
  } else {
    for (let i = 0; i < raw.length; i += 1) {
      raw[i] = Math.floor(Math.random() * 256);
    }
  }
  let hex = "";
  for (const byte of raw) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return `----caiFormBoundary${hex}`;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

/**
 * Build one multipart body.
 *
 * The boundary is a parameter so a test can assert the exact bytes on the wire;
 * callers leave it out.
 */
export function buildMultipart(parts: MultipartPart[], boundary: string = multipartBoundary()): RawBody {
  if (parts.length === 0) {
    throw new CaiRequestError("a multipart body needs at least one part");
  }

  const chunks: Uint8Array[] = [];
  for (const part of parts) {
    assertHeaderSafe("part name", part.name);
    if (part.filename !== undefined) {
      assertHeaderSafe("part filename", part.filename);
    }

    const disposition =
      `form-data; name="${part.name}"` +
      (part.filename === undefined ? "" : `; filename="${part.filename}"`);

    chunks.push(
      encoder.encode(
        `--${boundary}\r\n` +
          `Content-Disposition: ${disposition}\r\n` +
          `Content-Type: ${part.contentType ?? "application/octet-stream"}\r\n\r\n`,
      ),
    );
    chunks.push(part.bytes);
    chunks.push(encoder.encode("\r\n"));
  }
  chunks.push(encoder.encode(`--${boundary}--\r\n`));

  return { contentType: `multipart/form-data; boundary=${boundary}`, bytes: concat(chunks) };
}
