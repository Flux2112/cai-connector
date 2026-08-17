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
import { collect } from "../paginate";
import { searchFilter, type ListOptions, type Schemas } from "./common";

export type Runtime = Schemas["Runtime"];

export type ListRuntimesOptions = ListOptions & {
  editor?: string;
  kernel?: string;
  edition?: string;
  imageIdentifier?: string;
};

/**
 * Every runtime the instance offers.
 *
 * The extension reads the same list through `cdswctl runtimes list` today and
 * caches it on disk; this is the typed, paginated equivalent. Filtering by
 * "latest version only" stays a caller's decision — `filterLatestRuntimes` in
 * the extension is a display rule, not a property of the data.
 */
export async function listRuntimes(client: CaiClient, options: ListRuntimesOptions = {}): Promise<Runtime[]> {
  return collect<Runtime>(
    async (pageToken) => {
      const page = await client.get("/api/v2/runtimes", {
        query: {
          search_filter: searchFilter({
            editor: options.editor,
            kernel: options.kernel,
            edition: options.edition,
            image_identifier: options.imageIdentifier,
          }),
          page_size: options.pageSize,
          page_token: pageToken,
        },
      });
      return { items: page.runtimes, nextPageToken: page.next_page_token };
    },
    { limit: options.limit },
  );
}
