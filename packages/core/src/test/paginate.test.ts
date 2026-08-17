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
import { collect, paginate, type Page } from "../paginate";

/** Pages of `size` items each, ending after `pages` of them. */
function pager(pages: string[][]): { fetch: (token: string | undefined) => Promise<Page<string>>; seen: (string | undefined)[] } {
  const seen: (string | undefined)[] = [];
  return {
    seen,
    fetch: async (token) => {
      seen.push(token);
      const index = token === undefined ? 0 : Number(token);
      return {
        items: pages[index],
        nextPageToken: index + 1 < pages.length ? String(index + 1) : undefined,
      };
    },
  };
}

test("collect walks every page in order", async () => {
  const { fetch, seen } = pager([["a", "b"], ["c"], ["d", "e"]]);
  assert.deepEqual(await collect(fetch), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(seen, [undefined, "1", "2"]);
});

test("collect stops at the first page without a token", async () => {
  const { fetch, seen } = pager([["only"]]);
  assert.deepEqual(await collect(fetch), ["only"]);
  assert.deepEqual(seen, [undefined]);
});

test("collect tolerates a page whose array field is absent", async () => {
  const result = await collect<string>(async () => ({ items: undefined, nextPageToken: undefined }));
  assert.deepEqual(result, []);
});

test("limit stops early and fetches no further page", async () => {
  const { fetch, seen } = pager([["a", "b"], ["c"]]);
  assert.deepEqual(await collect(fetch, { limit: 2 }), ["a", "b"]);
  assert.deepEqual(seen, [undefined]);
});

test("a repeated page token is an error, not an infinite loop", async () => {
  await assert.rejects(
    collect<string>(async () => ({ items: ["x"], nextPageToken: "same" })),
    CaiRequestError,
  );
});

test("the page cap bounds a server that never stops paging", async () => {
  let calls = 0;
  await assert.rejects(
    collect<number>(
      async () => {
        calls++;
        return { items: [calls], nextPageToken: String(calls) };
      },
      { maxPages: 3 },
    ),
    /exceeded 3 pages/,
  );
  assert.equal(calls, 3);
});

test("paginate yields lazily, so a consumer can stop mid-page", async () => {
  const { fetch, seen } = pager([["a", "b"], ["c"]]);
  const taken: string[] = [];
  for await (const item of paginate(fetch)) {
    taken.push(item);
    if (taken.length === 1) {
      break;
    }
  }
  assert.deepEqual(taken, ["a"]);
  assert.deepEqual(seen, [undefined]);
});
