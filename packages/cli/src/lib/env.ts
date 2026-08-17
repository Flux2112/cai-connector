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

import { CaiCliError, EXIT } from "./exit";

/**
 * `NAME=value` pairs into an object.
 *
 * Split at the *first* `=` only, so a value may contain them. An empty value is
 * accepted — `NAME=` is a meaningful thing to send — but an empty name is not,
 * and neither is a bare `NAME`: guessing that it meant the empty string, or that
 * it should be read from the caller's own environment, would each be wrong half
 * the time.
 */
export function parseEnvironment(pairs?: string[]): Record<string, string> | undefined {
  if (!pairs || pairs.length === 0) {
    return undefined;
  }

  const environment: Record<string, string> = {};
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    if (at <= 0) {
      throw new CaiCliError(`--env expects NAME=value, got ${JSON.stringify(pair)}`, EXIT.USAGE);
    }
    environment[pair.slice(0, at)] = pair.slice(at + 1);
  }
  return environment;
}
