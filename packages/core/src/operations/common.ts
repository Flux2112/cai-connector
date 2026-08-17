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

import type { components } from "../generated/schema";

export type Schemas = components["schemas"];

/** Options every paginated listing accepts. */
export type ListOptions = {
  /** Stop after this many items. */
  limit?: number;
  /** Items per request. Left to the server when unset. */
  pageSize?: number;
};

/**
 * The API takes its filters as a JSON object in a query string, e.g.
 * `search_filter={"status":"running"}`. Empty objects are dropped so the
 * parameter is absent rather than sent as `{}`.
 */
export function searchFilter(fields: Record<string, string | undefined>): string | undefined {
  const present = Object.entries(fields).filter(([, value]) => value !== undefined && value !== "");
  return present.length === 0 ? undefined : JSON.stringify(Object.fromEntries(present));
}
