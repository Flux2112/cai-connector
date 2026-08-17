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

const PLACEHOLDER = /\{([^}]+)\}/g;

/**
 * Fill `{project_id}` style placeholders in a path template.
 *
 * Values are percent-encoded, so a `/` inside one becomes `%2F` rather than a
 * new path segment — a caller cannot reach an operation it did not name.
 *
 * Note for whoever adds `cai files`: the spec models the file path as a plain
 * `{path}` parameter, so a nested file arrives here as `a%2Fb.txt`. Whether the
 * gateway wants that or a raw slash is unverified, and is a question for the
 * command that first needs it — not something to relax here by default.
 *
 * Paths like `/…/{run_id}:stop` carry a literal colon suffix. Nothing here
 * treats `:` specially, so those templates need no special handling.
 */
export function buildPath(template: string, params?: Record<string, string | number>): string {
  const used = new Set<string>();
  const filled = template.replace(PLACEHOLDER, (_match, name: string) => {
    const value = params?.[name];
    if (value === undefined || value === null || value === "") {
      throw new CaiRequestError(`missing path parameter "${name}" for ${template}`);
    }
    used.add(name);
    return encodeURIComponent(String(value));
  });

  for (const name of Object.keys(params ?? {})) {
    if (!used.has(name)) {
      throw new CaiRequestError(`unknown path parameter "${name}" for ${template}`);
    }
  }
  return filled;
}

/**
 * Serialize a query object. `undefined` and `null` are dropped rather than sent
 * as empty strings, so an unset option is genuinely absent; arrays repeat the
 * key, which is what the gRPC gateway expects.
 */
export function buildQuery(query?: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null) {
      continue;
    }
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item === undefined || item === null) {
        continue;
      }
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
    }
  }
  return parts.length === 0 ? "" : `?${parts.join("&")}`;
}

/** Trailing slashes on the base and a leading slash on the path both survive
 *  user input, so normalize rather than trusting either. */
export function joinUrl(baseUrl: string, path: string): string {
  if (!/^https?:\/\//i.test(baseUrl)) {
    throw new CaiRequestError(`baseUrl must be an http(s) URL, got "${baseUrl}"`);
  }
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
