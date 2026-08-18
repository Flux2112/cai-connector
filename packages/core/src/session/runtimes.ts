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

import type { LogLine } from "../types";
import { runCdswctl } from "./cdswctl";

/**
 * Runtimes, from `cdswctl` rather than from the API.
 *
 * Not a duplicate of `listRuntimes`: **the API's runtime listing carries no
 * numeric id** — only an `image_identifier` — and `cdswctl ssh-endpoint -r` wants
 * the number. Verified against a live instance on 2026-08-18. So a session cannot
 * be created from the API's view of runtimes alone, and this is the only source of
 * the value `-r` needs.
 */

export type CdswctlRuntime = {
  id: number;
  imageIdentifier: string;
  editor: string;
  kernel: string;
  edition: string;
  shortVersion: string;
  fullVersion: string;
  description: string;
};

export async function listCdswctlRuntimes(
  cdswctlPath: string,
  log?: LogLine,
): Promise<CdswctlRuntime[]> {
  const result = await runCdswctl(cdswctlPath, ["runtimes", "list"], { log });
  if (result.exitCode !== 0) {
    throw new Error(`cdswctl runtimes list failed: ${(result.stderr || result.stdout).trim()}`);
  }

  const parsed = JSON.parse(result.stdout) as { runtimes?: CdswctlRuntime[] };
  return parsed.runtimes ?? [];
}

/** Everything about one runtime a filter should be able to match on. */
function haystack(runtime: CdswctlRuntime): string {
  return [
    runtime.imageIdentifier,
    runtime.editor,
    runtime.kernel,
    runtime.edition,
    runtime.shortVersion,
    runtime.fullVersion,
    runtime.description,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Runtimes matching every whitespace-separated term, newest first.
 *
 * Every term has to match, the way the extension's own multi-term filter works,
 * so `workbench python3.11` narrows instead of widening. The order is by
 * `fullVersion` descending, which is a string comparison — the versions are
 * `2024.10.1-b12`, so it sorts correctly without pretending to understand them.
 */
export function matchRuntimes(runtimes: CdswctlRuntime[], filter: string): CdswctlRuntime[] {
  const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const matched = runtimes.filter((runtime) => {
    const text = haystack(runtime);
    return terms.every((term) => text.includes(term));
  });
  return matched.sort((a, b) => (b.fullVersion ?? "").localeCompare(a.fullVersion ?? ""));
}
