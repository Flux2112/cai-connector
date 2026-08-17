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

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { CaiRequestError } from "../errors";
import { buildMultipart, multipartBoundary } from "../multipart";

const CRLF = String.fromCharCode(13) + String.fromCharCode(10);

test("buildMultipart lays out one part exactly as the wire format requires", () => {
  const { contentType, bytes } = buildMultipart(
    [{ name: "src/train.py", filename: "train.py", bytes: new TextEncoder().encode("print(1)") }],
    "BOUND",
  );

  assert.equal(contentType, "multipart/form-data; boundary=BOUND");
  assert.equal(
    Buffer.from(bytes).toString("utf8"),
    [
      "--BOUND",
      'Content-Disposition: form-data; name="src/train.py"; filename="train.py"',
      "Content-Type: application/octet-stream",
      "",
      "print(1)",
      "--BOUND--",
      "",
    ].join(CRLF),
  );
});

test("buildMultipart carries bytes that are not valid UTF-8 through untouched", () => {
  const payload = new Uint8Array([0x00, 0xff, 0xfe, 0x50, 0x4b]);
  const { bytes } = buildMultipart([{ name: "model.pkl", bytes: payload }], "B");
  const body = Buffer.from(bytes);

  /* Locating the payload by its own bytes rather than by a computed offset: the
   * point of the test is that the five bytes are somewhere in the body intact. */
  assert.ok(body.includes(Buffer.from(payload)), "the payload survived the body");
  assert.equal(body.subarray(0, 3).toString("utf8"), "--B");
});

test("buildMultipart omits filename when there is none", () => {
  const { bytes } = buildMultipart([{ name: "notes.txt", bytes: new Uint8Array() }], "B");
  const body = Buffer.from(bytes).toString("utf8");
  assert.ok(body.includes('name="notes.txt"'));
  assert.ok(!body.includes("filename="));
});

test("buildMultipart refuses a name that would escape the header", () => {
  const quote = String.fromCharCode(34);
  for (const name of [`a${quote}b`, `a${String.fromCharCode(13)}b`, `a${String.fromCharCode(10)}b`]) {
    assert.throws(
      () => buildMultipart([{ name, bytes: new Uint8Array() }], "B"),
      (err: unknown) => err instanceof CaiRequestError && /may not contain/.test(err.message),
    );
  }
});

test("buildMultipart refuses an empty body", () => {
  assert.throws(() => buildMultipart([], "B"), CaiRequestError);
});

test("multipartBoundary is unpredictable and long enough to be unique", () => {
  const first = multipartBoundary();
  const second = multipartBoundary();
  assert.notEqual(first, second);
  /* 16 random bytes as hex, so 32 characters after the fixed prefix. */
  assert.match(first, /^----caiFormBoundary[0-9a-f]{32}$/);
});
