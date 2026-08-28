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

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Keeping the bundled agent skill in `~/.claude/skills` current.
 *
 * This runs from the CLI itself rather than only from `postinstall`, because a
 * postinstall cannot be relied on to run at all: npm 12 blocks lifecycle
 * scripts unless the package is named in `allow-scripts`, and the block is a
 * warning on somebody else's terminal — the install succeeds, the skill is
 * simply never written. Telling users to copy a file by hand after every
 * upgrade is not a distribution mechanism, so the CLI repairs its own skill on
 * the way out of any command. The postinstall path still exists and shares this
 * code, so a machine that does allow scripts has the skill before the first run.
 *
 * What makes an upgrade land is the stamp. The rule "leave anything that
 * differs from the bundled copy alone" cannot tell an edited file from last
 * version's file, and treating both as edits means the skill installs once and
 * then never changes again. So we record what we wrote; a destination matching
 * that record is ours to replace, and anything else is the user's to keep.
 */

/** What to do with one file of a bundled skill. */
export type SkillAction = "current" | "install" | "update" | "keep-local" | "adopt";

/** Written beside the skill, recording the version and the exact bytes we last
 *  wrote. It is what distinguishes "stale copy of ours" from "your edit". */
export const STAMP_FILE = ".cai-skill.json";

export type SkillStamp = {
  version?: string;
  /** File name to the digest of the content this CLI last wrote there. */
  files?: Record<string, string>;
};

export function digest(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * The decision for one file, as a pure function of the three things that matter.
 *
 * `recorded` is the digest the stamp holds for this file, absent when we have
 * never written it. Absent plus present-on-disk is deliberately `keep-local`:
 * a file of unknown provenance is somebody else's, and guessing wrong here
 * destroys work that cannot be recovered.
 */
export function planSkillFile(shipped: string, existing: string | null, recorded?: string): SkillAction {
  if (existing === null) return "install";
  if (existing === shipped) return "current";
  return recorded !== undefined && recorded === digest(existing) ? "update" : "keep-local";
}

/**
 * The same decision for a skill directory that predates the stamp.
 *
 * Every copy that got there before stamps existed came from this CLI, so
 * `keep-local` would freeze exactly the users this change is for — the ones
 * carrying a skill from an older version, which is all of them — one upgrade
 * short of ever being fixed. So a legacy copy is adopted rather than kept, and
 * the file it replaces is put beside it as `.bak`: the one case where we cannot
 * prove whose bytes those are is the one case worth keeping a copy of.
 *
 * This applies only while no stamp exists at all. Once there is one, a file
 * missing from it is a file we did not write, and the ordinary rule holds.
 */
export function planLegacyFile(shipped: string, existing: string | null): SkillAction {
  if (existing === null) return "install";
  return existing === shipped ? "current" : "adopt";
}

export type SyncOptions = {
  /** The installed package's root — `config.root` from oclif, or `..` from the
   *  postinstall script. `skills/` sits directly inside it. */
  packageDir: string;
  /** The CLI's version, which becomes the stamp's fast path. */
  version: string;
  env?: NodeJS.ProcessEnv;
  /** One line per thing that actually happened. Never called on the fast path. */
  report?: (line: string) => void;
};

/** `~/.claude/skills`, or wherever the caller says. */
function destination(env: NodeJS.ProcessEnv): { dir: string; explicit: boolean } {
  const override = (env.CAI_SKILLS_DIR ?? "").trim();
  return override ? { dir: override, explicit: true } : { dir: path.join(os.homedir(), ".claude", "skills"), explicit: false };
}

/**
 * Whether this is the repository that builds the CLI rather than an install of
 * it, so that `npm run cai` never overwrites the developer's own skill.
 *
 * A `node_modules` segment settles it: that is an installation, whatever git
 * repository happens to be above it. The older INIT_CWD test could not make
 * that distinction, so it also skipped an ordinary `npm install` into any
 * project that was itself a git checkout.
 */
function isDevelopmentCheckout(packageDir: string): boolean {
  if (packageDir.split(path.sep).includes("node_modules")) {
    return false;
  }
  let dir = path.resolve(packageDir);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

function readStamp(file: string): SkillStamp {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? (parsed as SkillStamp) : {};
  } catch {
    return {};
  }
}

/** Written whole and moved into place, so a second `cai` running at the same
 *  moment never reads half a stamp. */
function writeAtomic(file: string, content: string): void {
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, content, "utf8");
  fs.renameSync(temporary, file);
}

/** Every file of one bundled skill, flattened to `sub/dir/name` keys so the
 *  stamp can hold a nested skill without nesting itself. */
function bundledFiles(from: string, prefix = ""): { key: string; source: string }[] {
  const found: { key: string; source: string }[] = [];
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found.push(...bundledFiles(source, key));
    } else if (entry.name !== STAMP_FILE) {
      found.push({ key, source });
    }
  }
  return found;
}

/** Where a replaced legacy copy is kept. An existing `.bak` is never clobbered —
 *  losing the backup would defeat the point of taking one. */
function backupPath(file: string, version: string): string {
  return fs.existsSync(`${file}.bak`) ? `${file}.${version}.bak` : `${file}.bak`;
}

function syncOne(name: string, from: string, into: string, version: string, report?: (line: string) => void): void {
  const target = path.join(into, name);
  const stampFile = path.join(target, STAMP_FILE);
  const legacy = fs.existsSync(target) && !fs.existsSync(stampFile);
  const stamp = readStamp(stampFile);
  if (stamp.version === version) {
    return;
  }

  fs.mkdirSync(target, { recursive: true });
  const recorded = { ...(stamp.files ?? {}) };

  for (const { key, source } of bundledFiles(from)) {
    const shipped = fs.readFileSync(source, "utf8");
    const file = path.join(target, ...key.split("/"));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const existing = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;

    switch (legacy ? planLegacyFile(shipped, existing) : planSkillFile(shipped, existing, recorded[key])) {
      case "current":
        recorded[key] = digest(shipped);
        break;
      case "install":
        writeAtomic(file, shipped);
        recorded[key] = digest(shipped);
        report?.(`installed the ${name} skill into ${target}`);
        break;
      case "update":
        writeAtomic(file, shipped);
        recorded[key] = digest(shipped);
        report?.(`updated the ${name} skill in ${target} to ${version}`);
        break;
      case "adopt": {
        /* Predates the stamp, so it came from an older CLI. Replaced, with the
         * bytes we cannot vouch for kept beside it. */
        const backup = backupPath(file, version);
        writeAtomic(backup, existing as string);
        writeAtomic(file, shipped);
        recorded[key] = digest(shipped);
        report?.(`updated the ${name} skill in ${target} to ${version}; the copy it replaced is at ${backup}`);
        break;
      }
      case "keep-local":
        /* Left alone and said out loud: an edited skill is work, and the new
         * version is no reason to throw it away. */
        writeAtomic(`${file}.new`, shipped);
        report?.(`kept your ${file}; the ${version} version is beside it as ${path.basename(file)}.new`);
        break;
    }
  }

  writeAtomic(stampFile, `${JSON.stringify({ version, files: recorded }, null, 2)}\n`);
}

/**
 * Bring the bundled skills in line with this version of the CLI.
 *
 * Cheap enough to call on every command: the fast path is one small read per
 * skill, and it does nothing at all once the stamp names the running version.
 * It never throws — a skill that could not be written is not a reason for a
 * command that worked to report failure.
 */
export function syncSkills(options: SyncOptions): void {
  const env = options.env ?? process.env;
  if (env.CAI_SKIP_SKILLS) {
    return;
  }

  try {
    const source = path.join(options.packageDir, "skills");
    if (!fs.existsSync(source)) {
      return;
    }

    const { dir, explicit } = destination(env);
    /* An explicit CAI_SKILLS_DIR is a request, so it outranks the development
     * guard; the guard exists to protect a directory nobody named. */
    if (!explicit && isDevelopmentCheckout(options.packageDir)) {
      return;
    }

    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        syncOne(entry.name, path.join(source, entry.name), dir, options.version, options.report);
      }
    }
  } catch (err) {
    options.report?.(`could not update the bundled skills (${String(err)}); the CLI itself is fine`);
  }
}
