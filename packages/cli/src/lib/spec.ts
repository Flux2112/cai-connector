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

import {
  listCdswctlRuntimes,
  matchRuntimes,
  type EndpointSpec,
  type SessionRecord,
} from "@defysoftware/cai-core";

import { CaiCliError, EXIT } from "./exit";

/**
 * Turning flags into the endpoint spec `cdswctl` needs.
 *
 * Kept out of the command so the parsing rules have somewhere to be tested, and
 * so a bad value costs nothing: everything here runs before anything is spawned.
 */

/** Accepts a comma decimal, as the extension's resource input does. */
export function positiveNumber(value: string, flag: string): number {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CaiCliError(`${flag} must be a positive number, got ${JSON.stringify(value)}`, EXIT.USAGE);
  }
  return parsed;
}

/** The runtime of the newest stored session for one project, if there is one. */
export function lastRuntimeFor(records: SessionRecord[], project: string): number | undefined {
  const wanted = project.toLowerCase();
  return [...records]
    .filter((record) => record.projectName.toLowerCase() === wanted)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0]?.runtimeId;
}

export type RuntimeQuery = {
  cdswctlPath: string;
  /** A numeric id, or terms to match. Absent means "whatever this project used last". */
  requested?: string;
  project: string;
  records: SessionRecord[];
  log?: (line: string) => void;
};

/**
 * The numeric runtime id `ssh-endpoint -r` takes.
 *
 * Three ways to arrive at one, in order: given outright, matched from
 * `cdswctl runtimes list`, or inherited from the newest session recorded for this
 * project. There is deliberately no built-in default — which runtime a session
 * gets decides what is installed in it, so guessing is worse than an error that
 * names the command that lists them.
 */
export async function resolveRuntimeId(query: RuntimeQuery): Promise<number> {
  const requested = (query.requested ?? "").trim();

  if (/^\d+$/.test(requested)) {
    return Number(requested);
  }

  if (requested) {
    const matches = matchRuntimes(await listCdswctlRuntimes(query.cdswctlPath, query.log), requested);
    if (matches.length === 0) {
      throw new CaiCliError(
        `no runtime matches ${JSON.stringify(requested)}; see \`cai session runtimes\``,
        EXIT.USAGE,
      );
    }
    /* Newest first, and the choice is reported rather than silently made. */
    query.log?.(`Matched ${matches.length} runtime(s); using ${matches[0].id} (${matches[0].fullVersion}).`);
    return matches[0].id;
  }

  const inherited = lastRuntimeFor(query.records, query.project);
  if (inherited !== undefined) {
    query.log?.(`Reusing runtime ${inherited} from the newest stored session for ${query.project}.`);
    return inherited;
  }

  throw new CaiCliError(
    `--runtime is required for ${query.project}: no stored session to inherit one from. ` +
      "Run `cai session runtimes` to see the ids.",
    EXIT.USAGE,
  );
}

export type SpecFlags = {
  runtime?: string;
  addon?: number;
  cpus: string;
  memory: string;
  gpus: number;
};

export async function buildSpec(args: {
  project: string;
  flags: SpecFlags;
  cdswctlPath: string;
  records: SessionRecord[];
  log?: (line: string) => void;
}): Promise<EndpointSpec> {
  return {
    project: args.project,
    runtimeId: await resolveRuntimeId({
      cdswctlPath: args.cdswctlPath,
      requested: args.flags.runtime,
      project: args.project,
      records: args.records,
      log: args.log,
    }),
    addonId: args.flags.addon ?? null,
    cpus: positiveNumber(args.flags.cpus, "--cpus"),
    memoryGb: positiveNumber(args.flags.memory, "--memory"),
    gpus: args.flags.gpus,
  };
}
