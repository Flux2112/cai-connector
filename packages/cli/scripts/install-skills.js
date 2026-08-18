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
 * Copy the bundled agent skill into the user's skills directory on install.
 *
 * Plain JavaScript outside `rootDir`, like `bin/run.js`, so `tsc` never sees it.
 *
 * Three rules this script holds to, because a postinstall that writes into
 * someone's home directory has to be a good guest:
 *
 *  - **It never fails the install.** Every path out of here is exit 0, whatever
 *    happened. An unwritable home directory is not a reason for `npm install` to
 *    fail.
 *  - **It never overwrites edits.** A destination that differs from the bundled
 *    copy and is not a previous copy of it is left alone; the user is told where
 *    the new version is instead.
 *  - **It skips development installs.** Running `npm install` in the repository
 *    that contains this package must not touch the developer's own skills.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PACKAGE_DIR = path.resolve(__dirname, "..");
const SOURCE = path.join(PACKAGE_DIR, "skills");

function say(line) {
  process.stdout.write(`cai: ${line}\n`);
}

/** `~/.claude/skills`, or wherever the caller says. */
function destination() {
  const override = (process.env.CAI_SKILLS_DIR ?? "").trim();
  return override || path.join(os.homedir(), ".claude", "skills");
}

/**
 * A workspace install of this very repository, rather than a real installation.
 *
 * `INIT_CWD` is where npm was invoked. If this package sits inside it and that
 * directory is a git checkout, the install is somebody working on the CLI.
 */
function isDevelopmentInstall() {
  const initCwd = process.env.INIT_CWD;
  if (!initCwd) {
    return false;
  }
  const relative = path.relative(path.resolve(initCwd), PACKAGE_DIR);
  const inside = relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  return inside && fs.existsSync(path.join(initCwd, ".git"));
}

function copySkill(name, from, to) {
  const target = path.join(to, name);
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copySkill(entry.name, path.join(from, entry.name), target);
      continue;
    }
    const source = path.join(from, entry.name);
    const destinationFile = path.join(target, entry.name);
    const incoming = fs.readFileSync(source, "utf8");

    if (fs.existsSync(destinationFile)) {
      const existing = fs.readFileSync(destinationFile, "utf8");
      if (existing === incoming) {
        continue;
      }
      /* Changed on both sides, or edited locally: leave it and say so. */
      const beside = `${destinationFile}.new`;
      fs.writeFileSync(beside, incoming, "utf8");
      say(`kept your ${destinationFile}; the new version is at ${beside}`);
      continue;
    }

    fs.writeFileSync(destinationFile, incoming, "utf8");
    say(`installed the ${name} skill into ${target}`);
  }
}

function main() {
  if (process.env.CAI_SKIP_SKILLS) {
    return;
  }
  if (!fs.existsSync(SOURCE)) {
    return;
  }
  if (isDevelopmentInstall()) {
    return;
  }

  const to = destination();
  for (const entry of fs.readdirSync(SOURCE, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      copySkill(entry.name, path.join(SOURCE, entry.name), to);
    }
  }
}

try {
  main();
} catch (err) {
  /* Deliberately swallowed: see the header. */
  say(`could not install the bundled skills (${String(err)}); the CLI itself is fine`);
}
