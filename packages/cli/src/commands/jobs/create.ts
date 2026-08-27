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

import { Flags } from "@oclif/core";
import { createJob, resolveProject, type Job } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { CaiCliError, EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";
import { parseEnvironment } from "../../lib/env";
import { resolveRuntimeIdentifier } from "../../lib/runtime";
import { positiveNumber } from "../../lib/spec";

export default class JobsCreate extends BaseCommand<typeof JobsCreate> {
  static description = [
    "Create a job in a project.",
    "The script has to exist in the project already — upload it with `cai files put` first.",
    "On an ML Runtimes project --runtime is required; on a legacy-engine project --kernel is.",
    "Nothing here deletes a job, so an unwanted one has to be removed from the CML UI.",
  ].join(" ");

  static examples = [
    '<%= config.bin %> jobs create hanke/analysis --name Nightly --script src/daily.py --runtime "python3.12 workbench"',
    '<%= config.bin %> jobs create hanke/analysis --name Nightly --script src/daily.py --runtime <id> --schedule "0 3 * * *" --timezone Europe/Vienna',
    '<%= config.bin %> jobs create hanke/analysis --name Ingest --script src/ingest.py --runtime <id> --arguments "--table foo" --cpu 0.5 --memory 2',
  ];

  static args = {
    project: projectArg,
  };

  static flags = {
    name: Flags.string({ description: "Job name.", required: true }),
    script: Flags.string({
      description: "Script path relative to the project root, e.g. src/daily.py.",
      required: true,
    }),
    runtime: Flags.string({
      description:
        "ML Runtime image identifier, or terms matching exactly one from `cai runtimes list`. Required on a runtime project.",
    }),
    kernel: Flags.string({
      description: "Legacy-engine projects only: python3, python2, r or scala.",
      options: ["python3", "python2", "r", "scala"],
    }),
    addon: Flags.string({
      description: "Runtime addon identifier, e.g. a Spark or Hadoop CLI addon. Repeatable.",
      multiple: true,
    }),
    cpu: Flags.string({ description: "vCPU cores. Fractions allowed." }),
    memory: Flags.string({ description: "Memory in GB." }),
    gpus: Flags.integer({ description: "Nvidia GPUs.", min: 0 }),
    arguments: Flags.string({
      description: "Default arguments, reaching runs as the JOB_ARGUMENTS environment variable.",
    }),
    env: Flags.string({
      description: "Default environment variable for every run, as NAME=value. Repeatable.",
      multiple: true,
    }),
    schedule: Flags.string({ description: 'Cron schedule, e.g. "0 3 * * *". Omit for a manual job.' }),
    timezone: Flags.string({
      description:
        "Timezone for --schedule, e.g. Europe/Vienna. The API defaults to America/Los_Angeles, which is rarely what anyone means.",
    }),
    paused: Flags.boolean({ description: "Create a scheduled job paused instead of running." }),
    timeout: Flags.integer({ description: "Run timeout in seconds.", min: 1 }),
    "kill-on-timeout": Flags.boolean({ description: "Kill a run that hits --timeout." }),
    "parent-job": Flags.string({ description: "Run this job after the given job id finishes." }),
  };

  public async run(): Promise<Job> {
    /* Everything that can be judged without the network is judged first, so a
     * mistyped flag costs no calls and cannot create a half-configured job. */
    const environment = parseEnvironment(this.flags.env);
    const cpus = this.flags.cpu === undefined ? undefined : positiveNumber(this.flags.cpu, "--cpu");
    const memoryGb = this.flags.memory === undefined ? undefined : positiveNumber(this.flags.memory, "--memory");

    if (this.flags.timezone !== undefined && this.flags.schedule === undefined) {
      throw new CaiCliError("--timezone only means anything with --schedule", EXIT.USAGE);
    }
    if (this.flags.paused && this.flags.schedule === undefined) {
      throw new CaiCliError("--paused only means anything with --schedule: a manual job runs when told to", EXIT.USAGE);
    }
    if (this.flags.runtime !== undefined && this.flags.kernel !== undefined) {
      throw new CaiCliError(
        "--runtime and --kernel are alternatives: a runtime project takes --runtime, a legacy-engine project --kernel",
        EXIT.USAGE,
      );
    }

    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const projectId = project.id as string;

    /* The project itself settles which of the two engine fields is legal, so
     * this is checked here rather than left to a 400 that says less. */
    const usesRuntimes = (project as { default_engine_type?: string }).default_engine_type === "ml_runtime";
    if (usesRuntimes && this.flags.runtime === undefined) {
      throw new CaiCliError(
        `${this.flags.name}: this is an ML Runtimes project, so --runtime is required. Run \`cai runtimes list\` for the identifiers.`,
        EXIT.USAGE,
      );
    }
    if (!usesRuntimes && this.flags.kernel === undefined) {
      throw new CaiCliError(
        `${this.flags.name}: this is a legacy-engine project, so --kernel is required (python3, python2, r or scala).`,
        EXIT.USAGE,
      );
    }

    const runtimeIdentifier =
      this.flags.runtime === undefined ? undefined : await resolveRuntimeIdentifier(client, this.flags.runtime);

    /* A cron schedule with no timezone is the single easiest way to create a job
     * that runs at the wrong time, since the API's default is Pacific. Warned
     * about rather than defaulted, because inventing a timezone here would make
     * the CLI disagree with the API about what was asked for. */
    if (this.flags.schedule !== undefined && this.flags.timezone === undefined) {
      this.warn("--schedule without --timezone: the API will use America/Los_Angeles");
    }

    const job = await createJob(client, projectId, {
      name: this.flags.name,
      script: this.flags.script,
      runtimeIdentifier,
      kernel: this.flags.kernel,
      addonIdentifiers: this.flags.addon,
      cpus,
      memoryGb,
      gpus: this.flags.gpus,
      arguments: this.flags.arguments,
      environment,
      schedule: this.flags.schedule,
      timezone: this.flags.timezone,
      paused: this.flags.paused ? true : undefined,
      timeoutSeconds: this.flags.timeout,
      killOnTimeout: this.flags["kill-on-timeout"] ? true : undefined,
      parentJobId: this.flags["parent-job"],
    });

    /* What `emit` returns, not `job`: with --json oclif prints the return value,
     * so returning the raw one would hand the environment blob straight to the
     * caller the redaction is for. */
    return this.emit(job, [
      { header: "id", get: (j) => j.id },
      { header: "name", get: (j) => j.name },
      { header: "script", get: (j) => j.script },
      { header: "type", get: (j) => j.type },
      { header: "schedule", get: (j) => j.schedule },
    ]);
  }
}
