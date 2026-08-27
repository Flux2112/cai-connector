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
import { getJob, resolveProject, updateJob, type Job, type UpdateJobOptions } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { CaiCliError, EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";
import { parseEnvironment } from "../../lib/env";
import { resolveRuntimeIdentifier } from "../../lib/runtime";
import { positiveNumber } from "../../lib/spec";
import { unappliedFields } from "../../lib/jobUpdate";

export default class JobsUpdate extends BaseCommand<typeof JobsUpdate> {
  static description = [
    "Update an existing job in place. Only the flags given are changed; everything else is left alone.",
    "--env replaces the whole environment rather than merging into it, and --schedule '' (or --manual) turns a scheduled job back into a manual one.",
    "The API cannot pause, unpause or re-timezone a job at all — recreating it is the only way.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> jobs update hanke/analysis 1234567890123456789 --name Nightly",
    '<%= config.bin %> jobs update hanke/analysis 1234567890123456789 --schedule "0 4 * * *"',
    "<%= config.bin %> jobs update hanke/analysis 1234567890123456789 --manual",
    '<%= config.bin %> jobs update hanke/analysis 1234567890123456789 --runtime "python3.12 workbench" --addon <addon-id>',
  ];

  static args = {
    project: projectArg,
    job: Args.string({ description: "Job id, as `cai jobs list` reports it.", required: true }),
  };

  static flags = {
    name: Flags.string({ description: "New job name. May not be empty." }),
    script: Flags.string({
      description: "New script path, relative to the project root. Must already exist in the project.",
    }),
    runtime: Flags.string({
      description:
        "New ML Runtime image identifier, or terms matching exactly one from `cai runtimes list`. Runtime projects only.",
    }),
    addon: Flags.string({
      description:
        "Runtime addon identifier. Repeatable, and replaces the current set. Implies the job's current runtime when --runtime is absent.",
      multiple: true,
    }),
    "reset-addons": Flags.boolean({
      description: "Ask the API for its default addons instead of keeping the job's. Rarely empties the list.",
    }),
    cpu: Flags.string({ description: "vCPU cores. Fractions allowed." }),
    memory: Flags.string({ description: "Memory in GB." }),
    gpus: Flags.integer({ description: "Nvidia GPUs.", min: 0 }),
    arguments: Flags.string({
      description: "Default arguments, reaching runs as the JOB_ARGUMENTS environment variable. Empty clears them.",
    }),
    env: Flags.string({
      description: "Default environment variable, as NAME=value. Repeatable, and replaces the whole environment.",
      multiple: true,
    }),
    schedule: Flags.string({ description: 'New cron schedule, e.g. "0 3 * * *". Empty makes the job manual.' }),
    manual: Flags.boolean({ description: "Drop the schedule, turning a recurring job into a manual one." }),
    timeout: Flags.integer({ description: "Run timeout in seconds. 0 removes it.", min: 0 }),
    "kill-on-timeout": Flags.boolean({
      description: "Kill a run that hits the timeout. --no-kill-on-timeout turns it off.",
      allowNo: true,
    }),
    /* Neither of these does anything on the API side, and both come back with a
     * 200 that says otherwise. They exist so the CLI can say so, since silently
     * having no flag would send a caller looking for a spelling mistake. */
    timezone: Flags.string({ description: "Refused: the API ignores a timezone on update." }),
    paused: Flags.boolean({ description: "Refused: the API ignores paused on update.", allowNo: true }),
  };

  public async run(): Promise<Job> {
    /* Everything judgeable without the network is judged first, so a mistyped
     * flag costs no calls and cannot half-apply an update. */
    const environment = parseEnvironment(this.flags.env);
    const cpus = this.flags.cpu === undefined ? undefined : positiveNumber(this.flags.cpu, "--cpu");
    const memoryGb = this.flags.memory === undefined ? undefined : positiveNumber(this.flags.memory, "--memory");

    if (this.flags.timezone !== undefined) {
      throw new CaiCliError(
        "the API ignores a timezone on update — it answers 200 and leaves the old one in place. " +
          "Recreating the job with `cai jobs create --timezone` is the only way to change it.",
        EXIT.USAGE,
      );
    }
    if (this.flags.paused !== undefined) {
      throw new CaiCliError(
        "the API ignores paused on update, and API v2 has no pause operation at all. " +
          "Pause or unpause the job in the CML UI, or recreate it with `cai jobs create --paused`.",
        EXIT.USAGE,
      );
    }
    if (this.flags.manual && this.flags.schedule !== undefined) {
      throw new CaiCliError("--manual and --schedule are alternatives", EXIT.USAGE);
    }
    if (this.flags["reset-addons"] && this.flags.addon !== undefined) {
      throw new CaiCliError("--reset-addons and --addon are alternatives", EXIT.USAGE);
    }

    const schedule = this.flags.manual ? "" : this.flags.schedule;
    const options: UpdateJobOptions = {
      name: this.flags.name,
      script: this.flags.script,
      cpus,
      memoryGb,
      gpus: this.flags.gpus,
      arguments: this.flags.arguments,
      environment,
      schedule,
      timeoutSeconds: this.flags.timeout,
      killOnTimeout: this.flags["kill-on-timeout"],
    };
    const wantsRuntime = this.flags.runtime !== undefined;
    const wantsAddons = this.flags.addon !== undefined || this.flags["reset-addons"];
    if (!wantsRuntime && !wantsAddons && Object.values(options).every((v) => v === undefined)) {
      throw new CaiCliError(
        "nothing to update: give at least one field flag. `cai jobs update --help` lists them.",
        EXIT.USAGE,
      );
    }

    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const projectId = project.id as string;

    if ((wantsRuntime || wantsAddons) && (project as { default_engine_type?: string }).default_engine_type !== "ml_runtime") {
      throw new CaiCliError("--runtime and --addon apply to ML Runtimes projects only", EXIT.USAGE);
    }

    Object.assign(options, await this.engineFields(projectId));

    const job = await updateJob(client, projectId, this.args.job, options);

    /* A 200 here is not proof, so the answer is checked against what was asked
     * for rather than reported as success. `paused`, `timezone` and the
     * recipient fields are the known cases, which is why no flag reaches them —
     * this catches whatever the next firmware adds to that list. */
    const unapplied = unappliedFields(options, job);
    if (unapplied.length > 0) {
      this.warn(`the instance did not apply: ${unapplied.join(", ")}`);
    }

    /* The check above reads the real `job`; what leaves the process is what
     * `emit` returns, with the environment reduced to the mode's marker. */
    return this.emit(job, [
      { header: "id", get: (j) => j.id },
      { header: "name", get: (j) => j.name },
      { header: "script", get: (j) => j.script },
      { header: "type", get: (j) => j.type },
      { header: "schedule", get: (j) => j.schedule },
    ]);
  }

  /**
   * Settle `runtime_identifier` and `runtime_addon_identifiers`, which the API
   * only accepts as a pair.
   *
   * Addons alone are a 500, and a runtime alone silently resets the addons to
   * the API's defaults — both verified against a live instance. So whichever
   * half the caller left out is read off the job itself, and the carry-over is
   * announced rather than done quietly.
   */
  private async engineFields(projectId: string): Promise<Partial<UpdateJobOptions>> {
    const requestedRuntime = this.flags.runtime;
    const requestedAddons = this.flags["reset-addons"] ? [] : this.flags.addon;
    if (requestedRuntime === undefined && requestedAddons === undefined) {
      return {};
    }

    const runtimeIdentifier =
      requestedRuntime === undefined ? undefined : await resolveRuntimeIdentifier(this.client(), requestedRuntime);
    if (runtimeIdentifier !== undefined && requestedAddons !== undefined) {
      return { runtimeIdentifier, addonIdentifiers: requestedAddons };
    }

    const current = await getJob(this.client(), projectId, this.args.job);
    if (runtimeIdentifier === undefined) {
      const currentRuntime = current.runtime_identifier;
      if (!currentRuntime) {
        throw new CaiCliError(
          "this job runs on a legacy engine, so it has no runtime to attach addons to",
          EXIT.USAGE,
        );
      }
      return { runtimeIdentifier: currentRuntime, addonIdentifiers: requestedAddons };
    }

    const carried = current.runtime_addon_identifiers ?? [];
    if (carried.length > 0) {
      this.warn(
        `carrying the job's current addons over: ${carried.join(", ")} — ` +
          "a runtime sent without addons resets them. Pass --addon or --reset-addons to decide yourself.",
      );
    }
    return { runtimeIdentifier, addonIdentifiers: carried };
  }
}
