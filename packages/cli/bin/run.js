#!/usr/bin/env node

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

/* Colour is off by default: the primary consumer is an agent reading stdout,
 * and ANSI escapes in a captured buffer are noise. A human who wants colour
 * sets FORCE_COLOR. */
if (!process.env.FORCE_COLOR) {
  process.env.NO_COLOR = "1";
}

(async () => {
  const oclif = await import("@oclif/core");
  await oclif.execute({ dir: __dirname });
})();
