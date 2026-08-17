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

import { Args, Flags } from "@oclif/core";

/** Flags every paginated listing accepts, mapping onto core's `ListOptions`. */
export const listFlags = {
  limit: Flags.integer({
    description: "Stop after this many items.",
    min: 1,
  }),
  "page-size": Flags.integer({
    description: "Items per API request. Left to the server when unset.",
    min: 1,
  }),
};

/**
 * The project argument, accepted as `owner/name` or an opaque project id.
 *
 * Both forms are supported because `owner/name` is what a human and the
 * extension's host aliases use, while the id is what every other API response
 * hands back.
 */
export const projectArg = Args.string({
  description: 'Project as "owner/name" or a project id.',
  required: true,
});
