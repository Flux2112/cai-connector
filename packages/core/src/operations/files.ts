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

import type { CaiClient } from "../client";
import { CaiRequestError } from "../errors";
import { buildMultipart } from "../multipart";
import type { Schemas } from "./common";

export type FileInfo = Schemas["FileInfo"];

/**
 * How to name the project root.
 *
 * Verified against a live instance on 2026-08-17: an empty path, `.` and `%2F`
 * all list the root. `.` is used because `buildPath` treats an empty value as a
 * missing parameter — a guard worth keeping, since an empty `project_id` would
 * otherwise address a different operation entirely.
 */
export const ROOT = ".";

/**
 * List one directory.
 *
 * Two things confirmed against a live instance rather than assumed:
 *
 * - **The listing is not paginated.** `ListProjectFiles` declares no
 *   `page_size` or `page_token`, unlike every other listing in the API, so
 *   there is no `collect` call here and a huge directory arrives in one
 *   response.
 * - **Entries are basenames relative to the requested directory**, not paths
 *   from the project root: listing `.local` returns `lib`, `bin`, `share`. A
 *   caller walking the tree has to rejoin them itself.
 *
 * The `{path}` parameter accepts raw and percent-encoded slashes alike — the
 * gateway decodes `%2F` — so `buildPath`'s blanket encoding is safe here.
 */
export async function listFiles(
  client: CaiClient,
  projectId: string,
  path: string = ROOT,
): Promise<FileInfo[]> {
  const res = await client.get("/api/v2/projects/{project_id}/files/{path}", {
    path: { project_id: projectId, path },
  });
  return res.files ?? [];
}

/**
 * Download one file, verbatim.
 *
 * Returns bytes rather than a string because project files are not necessarily
 * text — decoding a parquet or an image as UTF-8 corrupts it silently. The
 * operation is a `POST` in the spec despite being a read; that is the API's
 * choice, not ours, and it is still read-only.
 */
export async function downloadFile(
  client: CaiClient,
  projectId: string,
  path: string,
): Promise<Uint8Array> {
  return client.bytes("post", "/api/v2/projects/{project_id}/files/{path}:download", {
    path: { project_id: projectId, path },
  });
}

/**
 * The destination path an upload is allowed to name.
 *
 * This check has to exist here. Every other path in this package goes through
 * `buildPath`, which percent-encodes it and refuses `..`; an upload's
 * destination travels in the *request body* instead, so nothing upstream sees
 * it. An absolute path or a `..` segment would resolve outside the project on
 * the server, so both are refused before anything is sent.
 */
export function assertUploadPath(path: string): string {
  const trimmed = path.replace(/^\.\//, "");
  if (trimmed === "") {
    throw new CaiRequestError("upload path may not be empty");
  }
  if (trimmed.startsWith("/") || /^[A-Za-z]:/.test(trimmed) || trimmed.startsWith("\\")) {
    throw new CaiRequestError(`upload path must be relative to the project root: ${JSON.stringify(path)}`);
  }
  if (trimmed.split(/[/\\]/).includes("..")) {
    throw new CaiRequestError(`upload path may not contain "..": ${JSON.stringify(path)}`);
  }
  return trimmed;
}

/**
 * Upload one file, verbatim, to `path` inside the project.
 *
 * The one multipart operation in the API, and an unusual one: **the form field
 * name is the destination path**, not a label — the spec says so in as many
 * words ("the key being the location to upload to (relative to /home/cdsw)").
 * The generated types cannot express that, and cannot express binary content
 * either, since `openapi-typescript` renders a `format: binary` field as
 * `string`. So this goes through `client.raw` with a hand-built body rather
 * than the typed façade.
 *
 * **It does not replace an existing file.** Verified against a live instance on
 * 2026-08-17: uploading to a path that already holds a file leaves that file
 * alone, stores this one beside it under a numbered name — `notes.txt` becomes
 * `notes(1).txt`, browser-download style — and still answers 200. Nothing in the
 * response says which name it chose. A caller that assumes an upload replaced
 * what was there would keep reading the old content indefinitely, which is why
 * `cai files put` refuses an occupied destination unless told otherwise and then
 * re-lists the directory to report the name that was actually created.
 */
export async function uploadFile(
  client: CaiClient,
  projectId: string,
  path: string,
  bytes: Uint8Array,
): Promise<void> {
  const destination = assertUploadPath(path);
  const parts = destination.split(/[/\\]/);

  await client.raw("post", "/api/v2/projects/{project_id}/files", {
    path: { project_id: projectId },
    rawBody: buildMultipart([
      { name: destination, filename: parts[parts.length - 1], bytes },
    ]),
  });
}
