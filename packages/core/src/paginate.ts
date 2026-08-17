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
import { MAX_PAGES } from "./types";

/**
 * One page as every v2 list endpoint returns it: an array field plus
 * `next_page_token`, which is absent or empty on the last page.
 */
export type Page<T> = {
  items: T[] | undefined;
  nextPageToken: string | undefined;
};

export type PaginateOptions = {
  /** Stop after this many items. The last page is still fetched whole. */
  limit?: number;
  maxPages?: number;
};

/**
 * Walk every page, yielding items as they arrive so a caller can stop early.
 *
 * Two guards, both for servers rather than for callers: a page cap, and a
 * refusal to follow a token identical to the one just used. A gateway that
 * echoes its token instead of ending the list would otherwise loop forever,
 * and an endless loop against a paginated API is far worse than an error.
 */
export async function* paginate<T>(
  fetchPage: (pageToken: string | undefined) => Promise<Page<T>>,
  options: PaginateOptions = {},
): AsyncGenerator<T> {
  const maxPages = options.maxPages ?? MAX_PAGES;
  const limit = options.limit ?? Infinity;

  let token: string | undefined;
  let yielded = 0;

  for (let page = 0; page < maxPages; page++) {
    const result = await fetchPage(token);
    for (const item of result.items ?? []) {
      yield item;
      if (++yielded >= limit) {
        return;
      }
    }

    const next = result.nextPageToken;
    if (!next) {
      return;
    }
    if (next === token) {
      throw new CaiRequestError("pagination stalled: the server repeated its page token");
    }
    token = next;
  }

  throw new CaiRequestError(`pagination exceeded ${maxPages} pages`);
}

/** Collect a paginated listing into one array. */
export async function collect<T>(
  fetchPage: (pageToken: string | undefined) => Promise<Page<T>>,
  options: PaginateOptions = {},
): Promise<T[]> {
  const out: T[] = [];
  for await (const item of paginate(fetchPage, options)) {
    out.push(item);
  }
  return out;
}
