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

"use strict";

/*
 * Install the bundled agent skill at install time, where that is still allowed.
 *
 * Plain JavaScript outside `rootDir`, like `bin/run.js`, so `tsc` never sees it.
 *
 * **This is the optimisation, not the mechanism.** npm 12 blocks lifecycle
 * scripts unless the package is named in `allow-scripts`, and the block is a
 * warning on the installing user's terminal rather than an error — so a package
 * that depends on this script to place its skill simply does not place it, and
 * nobody finds out. `src/lib/skills.ts` therefore repairs the skill from the CLI
 * itself on every command, and this script only gets it there sooner, on the
 * machines that do run it. Both call the same code so the two paths cannot
 * drift; the rules, including the stamp that makes an upgrade land, live there.
 *
 * It never fails an install: every path out of here is exit 0, whatever
 * happened. An unwritable home directory is not a reason for `npm install` to
 * fail.
 */

const path = require("node:path");

const PACKAGE_DIR = path.resolve(__dirname, "..");

try {
  const { syncSkills } = require(path.join(PACKAGE_DIR, "out", "lib", "skills.js"));
  const { version } = require(path.join(PACKAGE_DIR, "package.json"));

  syncSkills({
    packageDir: PACKAGE_DIR,
    version,
    report: (line) => process.stdout.write(`cai: ${line}\n`),
  });
} catch (err) {
  /* Deliberately swallowed: see the header. `out/` is missing in a source
   * checkout that has not been compiled, which is a developer's problem and
   * never an installing user's. */
  process.stdout.write(`cai: could not install the bundled skills (${String(err)}); the CLI itself is fine\n`);
}
