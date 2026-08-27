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
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { digest, planLegacyFile, planSkillFile, STAMP_FILE, syncSkills } from "../lib/skills";

const SHIPPED = "# the skill, as this version ships it\n";
const LAST = "# the skill, as the last version shipped it\n";
const EDITED = "# the skill, with my own notes in it\n";

test("a file we have never written is left alone, whatever it says", () => {
  /* Unknown provenance is somebody else's file. Guessing wrong here destroys
   * work that cannot be recovered. */
  assert.equal(planSkillFile(SHIPPED, EDITED, undefined), "keep-local");
  assert.equal(planSkillFile(SHIPPED, null, undefined), "install");
});

test("last version's copy is ours to replace; an edit of it is not", () => {
  /* The whole point of the stamp: without it these two cases are the same
   * "differs from what we ship", and the skill installs once and then never
   * changes again. */
  assert.equal(planSkillFile(SHIPPED, LAST, digest(LAST)), "update");
  assert.equal(planSkillFile(SHIPPED, EDITED, digest(LAST)), "keep-local");
});

test("a copy that already matches is neither rewritten nor reported", () => {
  assert.equal(planSkillFile(SHIPPED, SHIPPED, digest(SHIPPED)), "current");
  assert.equal(planSkillFile(SHIPPED, SHIPPED, undefined), "current");
});

/** A stand-in package: `skills/cai/SKILL.md` and nothing else. */
function fixture(): { packageDir: string; skillsDir: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cai-skills-"));
  const packageDir = path.join(root, "node_modules", "@defysoftware", "cai");
  fs.mkdirSync(path.join(packageDir, "skills", "cai"), { recursive: true });
  fs.writeFileSync(path.join(packageDir, "skills", "cai", "SKILL.md"), SHIPPED, "utf8");
  return { packageDir, skillsDir: path.join(root, "skills") };
}

function sync(packageDir: string, skillsDir: string, version: string): string[] {
  const notes: string[] = [];
  syncSkills({ packageDir, version, env: { CAI_SKILLS_DIR: skillsDir }, report: (line) => notes.push(line) });
  return notes;
}

test("the first run installs the skill without anyone asking", () => {
  const { packageDir, skillsDir } = fixture();
  const notes = sync(packageDir, skillsDir, "1.23.0");

  assert.equal(fs.readFileSync(path.join(skillsDir, "cai", "SKILL.md"), "utf8"), SHIPPED);
  assert.match(notes.join("\n"), /installed the cai skill/);
});

test("an upgrade refreshes a copy nobody has touched", () => {
  const { packageDir, skillsDir } = fixture();
  const installed = path.join(skillsDir, "cai", "SKILL.md");

  fs.mkdirSync(path.join(skillsDir, "cai"), { recursive: true });
  fs.writeFileSync(installed, LAST, "utf8");
  fs.writeFileSync(
    path.join(skillsDir, "cai", STAMP_FILE),
    JSON.stringify({ version: "1.21.0", files: { "SKILL.md": digest(LAST) } }),
    "utf8",
  );

  const notes = sync(packageDir, skillsDir, "1.23.0");
  assert.equal(fs.readFileSync(installed, "utf8"), SHIPPED, "the stale skill must not survive the upgrade");
  assert.match(notes.join("\n"), /updated the cai skill/);
});

test("an edited skill is kept, and the new one is put beside it", () => {
  const { packageDir, skillsDir } = fixture();
  const installed = path.join(skillsDir, "cai", "SKILL.md");

  fs.mkdirSync(path.join(skillsDir, "cai"), { recursive: true });
  fs.writeFileSync(installed, EDITED, "utf8");
  fs.writeFileSync(
    path.join(skillsDir, "cai", STAMP_FILE),
    JSON.stringify({ version: "1.21.0", files: { "SKILL.md": digest(LAST) } }),
    "utf8",
  );

  const notes = sync(packageDir, skillsDir, "1.23.0");
  assert.equal(fs.readFileSync(installed, "utf8"), EDITED, "an edit is work, and must survive an upgrade");
  assert.equal(fs.readFileSync(`${installed}.new`, "utf8"), SHIPPED);
  assert.match(notes.join("\n"), /kept your/);
});

test("a skill dir from before the stamp is adopted, with the old copy kept beside it", () => {
  /* Every copy that predates the stamp came from this CLI, so keeping it would
   * freeze exactly the users this change is for — everyone carrying a skill
   * from an older version — one upgrade short of ever being fixed. */
  const { packageDir, skillsDir } = fixture();
  const installed = path.join(skillsDir, "cai", "SKILL.md");
  fs.mkdirSync(path.join(skillsDir, "cai"), { recursive: true });
  fs.writeFileSync(installed, LAST, "utf8");

  const notes = sync(packageDir, skillsDir, "1.24.0");
  assert.equal(fs.readFileSync(installed, "utf8"), SHIPPED);
  assert.equal(fs.readFileSync(`${installed}.bak`, "utf8"), LAST, "the bytes we cannot vouch for must survive");
  assert.match(notes.join("\n"), /the copy it replaced is at/);

  /* And from then on the stamp decides: an edit after adoption is kept. */
  fs.writeFileSync(installed, EDITED, "utf8");
  const later = sync(packageDir, skillsDir, "1.25.0");
  assert.equal(fs.readFileSync(installed, "utf8"), EDITED);
  assert.match(later.join("\n"), /kept your/);
});

test("adopting never clobbers a backup that is already there", () => {
  const { packageDir, skillsDir } = fixture();
  const installed = path.join(skillsDir, "cai", "SKILL.md");
  fs.mkdirSync(path.join(skillsDir, "cai"), { recursive: true });
  fs.writeFileSync(installed, LAST, "utf8");
  fs.writeFileSync(`${installed}.bak`, "something I put there myself\n", "utf8");

  sync(packageDir, skillsDir, "1.24.0");
  assert.equal(fs.readFileSync(`${installed}.bak`, "utf8"), "something I put there myself\n");
  assert.equal(fs.readFileSync(`${installed}.1.24.0.bak`, "utf8"), LAST);
});

test("a legacy copy that already matches is adopted quietly", () => {
  assert.equal(planLegacyFile(SHIPPED, SHIPPED), "current");
  assert.equal(planLegacyFile(SHIPPED, LAST), "adopt");
  assert.equal(planLegacyFile(SHIPPED, null), "install");
});

test("a second run at the same version does nothing and says nothing", () => {
  /* This runs at the end of every command, so the quiet path has to be the
   * common one. */
  const { packageDir, skillsDir } = fixture();
  sync(packageDir, skillsDir, "1.23.0");
  assert.deepEqual(sync(packageDir, skillsDir, "1.23.0"), []);
});

test("nothing is written when the caller opted out", () => {
  const { packageDir, skillsDir } = fixture();
  syncSkills({ packageDir, version: "1.23.0", env: { CAI_SKILLS_DIR: skillsDir, CAI_SKIP_SKILLS: "1" } });
  assert.equal(fs.existsSync(path.join(skillsDir, "cai")), false);
});

test("an unwritable destination is reported, never thrown", () => {
  /* A skill that could not be written is not a reason for a command that
   * worked to report failure. */
  const { packageDir } = fixture();
  const notes: string[] = [];
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cai-skills-")), "not-a-directory");
  fs.writeFileSync(file, "", "utf8");

  syncSkills({ packageDir, version: "1.23.0", env: { CAI_SKILLS_DIR: file }, report: (line) => notes.push(line) });
  assert.match(notes.join("\n"), /could not update the bundled skills/);
});

test("the repository that builds the CLI is not an installation of it", () => {
  /* `npm run cai` must not overwrite the developer's own skill — but a
   * `node_modules` segment settles it, so an ordinary install inside a git
   * checkout still gets one. */
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cai-skills-repo-"));
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });

  const checkout = path.join(root, "packages", "cli");
  fs.mkdirSync(path.join(checkout, "skills", "cai"), { recursive: true });
  fs.writeFileSync(path.join(checkout, "skills", "cai", "SKILL.md"), SHIPPED, "utf8");
  const home = path.join(root, "home-skills");

  syncSkills({ packageDir: checkout, version: "1.23.0", env: {} });
  assert.equal(fs.existsSync(home), false, "a development checkout must touch nothing");

  /* An explicit CAI_SKILLS_DIR is a request, so it outranks the guard. */
  syncSkills({ packageDir: checkout, version: "1.23.0", env: { CAI_SKILLS_DIR: home } });
  assert.equal(fs.readFileSync(path.join(home, "cai", "SKILL.md"), "utf8"), SHIPPED);
});
