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
import {
  createJobRun,
  isRunFinished,
  isRunSuccessful,
  resolveProject,
  waitForJobRun,
  type JobRun,
} from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { CaiCliError, EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";
import { parseEnvironment } from "../../lib/env";

/**
 * What a finished run is worth printing.
 *
 * Waiting is something the caller asked the CLI to do on their behalf, so the
 * answer owed back is the outcome, not the whole run object — every field of
 * which `runs get` will hand over on request. That full print is what leaked a
 * live credential in issue #6, and it leaked while doing something nobody had
 * asked for.
 */
export type RunSummary = {
  id?: string;
  status?: string;
  started?: string;
  finished?: string;
};

export default class JobsRun extends BaseCommand<typeof JobsRun> {
  static description = [
    "Start one run of an existing job.",
    "With --wait, polls until the run finishes and exits 8 if it did not succeed or was still running when the wait expired.",
    "The run's id is printed either way; with --wait the print is the status summary rather than the whole run.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> jobs run hanke/analysis 42",
    "<%= config.bin %> jobs run hanke/analysis 42 --wait --timeout 600",
    '<%= config.bin %> jobs run hanke/analysis 42 --env SPLIT=test --arguments "--epochs 3"',
  ];

  static args = {
    project: projectArg,
    job: Args.string({ description: "Job id.", required: true }),
  };

  static flags = {
    wait: Flags.boolean({ description: "Poll until the run finishes." }),
    timeout: Flags.integer({
      description: "Seconds to wait with --wait. 0 waits indefinitely.",
      default: 900,
      min: 0,
    }),
    interval: Flags.integer({
      description: "Seconds between polls with --wait.",
      default: 5,
      min: 1,
    }),
    env: Flags.string({
      description: "Environment variable for this run only, as NAME=value. Repeatable.",
      multiple: true,
    }),
    arguments: Flags.string({ description: "Arguments passed to the job's script, as one string." }),
  };

  public async run(): Promise<JobRun | RunSummary> {
    /* Parsed before the client is built, so a mistyped --env costs no calls and
     * cannot half-start anything. */
    const environment = parseEnvironment(this.flags.env);

    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const projectId = project.id as string;

    let run = await createJobRun(client, projectId, this.args.job, {
      environment,
      arguments: this.flags.arguments,
    });

    const runId = run.id;
    if (this.flags.wait) {
      if (!runId) {
        throw new CaiCliError("the API returned a run with no id, so it cannot be polled", EXIT.API);
      }
      run = await waitForJobRun(client, projectId, this.args.job, runId, {
        intervalMs: this.flags.interval * 1000,
        timeoutMs: this.flags.timeout * 1000,
        /* stderr, so progress never contaminates the JSON on stdout. */
        onPoll: (polled) => process.stderr.write(`${polled.id ?? runId} ${polled.status ?? "?"}\n`),
      });
    }

    const shown = this.flags.wait
      ? this.emit<RunSummary>(
          { id: run.id, status: run.status, started: run.running_at, finished: run.finished_at },
          [
            { header: "id", get: (r) => r.id },
            { header: "status", get: (r) => r.status },
            { header: "started", get: (r) => r.started },
            { header: "finished", get: (r) => r.finished },
          ],
        )
      : this.emit(run, [
          { header: "id", get: (r) => r.id },
          { header: "status", get: (r) => r.status },
          { header: "created", get: (r) => r.created_at },
          { header: "finished", get: (r) => r.finished_at },
        ]);

    /* Set rather than thrown: the run is real and its JSON has already been
     * printed, so failing here would replace the useful output with an error
     * report. Without --wait there is nothing to judge yet, so this stays 0. */
    if (this.flags.wait && !isRunSuccessful(run.status)) {
      process.exitCode = EXIT.WORKLOAD;
      const reason = isRunFinished(run.status) ? `finished as ${run.status}` : `still ${run.status} when the wait expired`;
      process.stderr.write(`${JSON.stringify({ error: `run ${run.id} ${reason}`, code: EXIT.WORKLOAD }, null, 2)}\n`);
    }

    return shown;
  }
}
