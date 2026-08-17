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
