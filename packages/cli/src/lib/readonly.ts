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
 * The `cai raw` fence.
 *
 * `core` deliberately exposes every verb — it is a client for the whole API,
 * not a policy layer — so the safe-writes rule has to be enforced here, at the
 * command surface. This is the same posture as the extension never passing
 * `cdswctl`'s blanket `/a` stop flag: the dangerous capability is simply not
 * reachable from the CLI.
 *
 * Kept in its own module with its own test, because "the escape hatch is
 * read-only" is a security property and not a detail of one command's parsing.
 */
export function assertReadOnly(method: string): "get" {
  const normalized = method.trim().toLowerCase();
  if (normalized !== "get") {
    throw new CaiCliError(
      `raw is read-only: "${method}" is refused. Writes go through the dedicated commands.`,
      EXIT.USAGE,
    );
  }
  return "get";
}
