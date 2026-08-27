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

import type { Job, UpdateJobOptions } from "@defysoftware/cai-core";

/** One requested field, and how to read the same thing back off the answer. */
type Check = {
  flag: string;
  applied: (want: never, job: Job) => boolean;
};

const CHECKS: { [K in keyof UpdateJobOptions]-?: Check } = {
  name: { flag: "--name", applied: (want: string, job) => job.name === want },
  script: { flag: "--script", applied: (want: string, job) => job.script === want },
  arguments: { flag: "--arguments", applied: (want: string, job) => job.arguments === want },
  schedule: { flag: "--schedule", applied: (want: string, job) => job.schedule === want },
  cpus: { flag: "--cpu", applied: (want: number, job) => job.cpu === want },
  memoryGb: { flag: "--memory", applied: (want: number, job) => job.memory === want },
  gpus: { flag: "--gpus", applied: (want: number, job) => job.nvidia_gpu === want },
  timeoutSeconds: { flag: "--timeout", applied: (want: number, job) => Number(job.timeout) === want },
  killOnTimeout: { flag: "--kill-on-timeout", applied: (want: boolean, job) => job.kill_on_timeout === want },
  runtimeIdentifier: {
    flag: "--runtime",
    applied: (want: string, job) => job.runtime_identifier === want,
  },
  /* The environment travels as a JSON string and comes back as one, so the
   * comparison has to happen on the parsed value. An unset one reads as `""`. */
  environment: {
    flag: "--env",
    applied: (want: Record<string, string>, job) => {
      try {
        return JSON.stringify(JSON.parse(job.environment || "{}")) === JSON.stringify(want);
      } catch {
        return false;
      }
    },
  },
  /* Containment rather than equality: the API adds addons nobody asked for —
   * a job created with none came back carrying a `hadoop-cli-…` — so extras are
   * expected and only a missing one means the request did not land. */
  addonIdentifiers: {
    flag: "--addon",
    applied: (want: string[], job) => {
      const got = new Set(job.runtime_addon_identifiers ?? []);
      return want.every((addon) => got.has(addon));
    },
  },
};

/**
 * The flags whose value is not what the returned job actually carries.
 *
 * `UpdateJob` answers 200 for fields it then ignores — `paused`, `timezone` and
 * the recipient lists all behave that way, verified against a live instance on
 * 2026-08-27. No flag reaches those, so this should normally come back empty;
 * it exists so that a field which joins them later is reported rather than
 * quietly assumed to have worked.
 */
export function unappliedFields(requested: UpdateJobOptions, job: Job): string[] {
  const unapplied: string[] = [];
  for (const [key, check] of Object.entries(CHECKS) as [keyof UpdateJobOptions, Check][]) {
    const want = requested[key];
    if (want === undefined) {
      continue;
    }
    if (!check.applied(want as never, job)) {
      unapplied.push(check.flag);
    }
  }
  return unapplied;
}
