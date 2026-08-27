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

import { Command, Flags, type Interfaces } from "@oclif/core";
import { createClient, type CaiClient } from "@defysoftware/cai-core";

import { resolveConfig, type Resolution } from "./lib/config";
import { CaiCliError, EXIT, reportError } from "./lib/exit";
import { table, type Column } from "./lib/output";
import { resolveEnvMode, sanitizeOutput } from "./lib/sanitize";
import { syncSkills } from "./lib/skills";

export type BaseFlags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"] & T["flags"]
>;

export type BaseArgs<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

/**
 * Everything every `cai` command shares.
 *
 * Output is JSON on stdout by default because the primary consumer is an agent;
 * `--table` is the concession to humans, not the other way round. Diagnostics
 * and errors go to stderr so a caller can pipe stdout straight into a parser.
 */
export abstract class BaseCommand<T extends typeof Command> extends Command {
  /* Accepted even though JSON is already the default, so a caller can be
   * explicit and so oclif documents the contract in --help. */
  static enableJsonFlag = true;

  static baseFlags = {
    url: Flags.string({
      description: "Cloudera AI base URL. Defaults to $CAI_URL, then the stored credentials.",
      helpGroup: "GLOBAL",
    }),
    "api-key": Flags.string({
      description:
        "API key. Prefer $CML_API_KEY or `cai login`: argv is visible to every process on the machine.",
      helpGroup: "GLOBAL",
    }),
    table: Flags.boolean({
      description: "Render a table for humans instead of JSON.",
      helpGroup: "GLOBAL",
    }),
    verbose: Flags.boolean({
      description: "Log each request to stderr. The API key is redacted.",
      helpGroup: "GLOBAL",
    }),
    "show-env": Flags.boolean({
      description:
        "Print environment blobs, with credential-shaped names masked. They are replaced by a marker otherwise.",
      helpGroup: "GLOBAL",
    }),
    reveal: Flags.boolean({
      description: "Print environment blobs verbatim, credentials included. Implies --show-env.",
      helpGroup: "GLOBAL",
    }),
  };

  protected flags!: BaseFlags<T>;
  protected args!: BaseArgs<T>;

  public async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
      enableJsonFlag: this.ctor.enableJsonFlag,
    });
    this.flags = flags as BaseFlags<T>;
    this.args = args as BaseArgs<T>;

    if (this.flags["api-key"]) {
      this.warn("--api-key puts the key in argv, where any process can read it. Prefer $CML_API_KEY.");
    }

    /* Deliberately noisy, and on every command rather than only when something
     * was actually revealed: by the time the caller could check, the values are
     * already in the terminal, the scrollback and any transcript around it. */
    if (this.flags.reveal) {
      this.warn(
        "--reveal prints environment values verbatim, credentials included. They stay in your scrollback and in any transcript of this session.",
      );
    }
  }

  /** Resolve credentials without building a client, for `cai login`. */
  protected resolution(): Resolution {
    return resolveConfig({
      flags: { baseUrl: this.flags.url, apiKey: this.flags["api-key"] },
    });
  }

  /**
   * Build a client, or fail with EXIT.CONFIG naming what is missing.
   *
   * The message names the three ways to supply a value rather than just the
   * one, because the first thing a user hits on a fresh machine is this error.
   */
  protected client(): CaiClient {
    const resolved = this.resolution();
    const missing: string[] = [];
    if (!resolved.baseUrl.value) missing.push("instance URL (--url, $CAI_URL, or `cai login`)");
    if (!resolved.apiKey.value) missing.push("API key (--api-key, $CML_API_KEY, or `cai login`)");
    if (missing.length > 0) {
      throw new CaiCliError(`missing ${missing.join(" and ")}`, EXIT.CONFIG);
    }

    return createClient({
      baseUrl: resolved.baseUrl.value as string,
      apiKey: resolved.apiKey.value as string,
      userAgent: `cai/${this.config.version}`,
      /* stderr, so --verbose never contaminates the JSON on stdout. */
      log: this.flags.verbose ? (line) => process.stderr.write(`${line}\n`) : undefined,
    });
  }

  /**
   * Print a result and return what was printed.
   *
   * Returning the value matters twice over. With `--json` oclif prints the
   * return value itself, so this suppresses its own output in that case to
   * avoid printing twice — which also means the *sanitized* value is what has
   * to come back, or `--json` would become the way around the redaction. A
   * command must therefore return what `emit` handed it rather than the object
   * it passed in.
   *
   * This is the one seam every command's output goes through, so it is where
   * the environment blob is dealt with: a per-command list would be one command
   * behind the next place CML decides to attach one.
   */
  protected emit<R>(data: R, columns?: Column<R extends readonly (infer E)[] ? E : R>[]): R {
    const shown = sanitizeOutput(data, resolveEnvMode(this.flags));
    if (this.jsonEnabled()) {
      return shown;
    }
    if (this.flags.table && columns) {
      const rows = (Array.isArray(shown) ? shown : [shown]) as (R extends readonly (infer E)[] ? E : R)[];
      this.log(table(rows, columns));
      return shown;
    }
    this.log(JSON.stringify(shown, null, 2));
    return shown;
  }

  /**
   * The bundled agent skill is brought up to date here, after the command has
   * printed and whatever it did is done.
   *
   * Here rather than in `postinstall` because npm 12 blocks lifecycle scripts
   * unless the package is allow-listed, so an upgrade otherwise leaves the skill
   * describing a CLI that no longer behaves that way — and the block is a
   * warning nobody acts on. Last rather than first so it can never delay an
   * answer, and on stderr so it can never contaminate stdout.
   */
  protected async finally(err: Error | undefined): Promise<unknown> {
    syncSkills({
      packageDir: this.config.root,
      version: this.config.version,
      report: (line) => process.stderr.write(`cai: ${line}\n`),
    });
    return super.finally(err);
  }

  /**
   * Errors are JSON on stderr with a stable exit code, so a caller never has to
   * parse prose. oclif's own signals — `--help`, `--version`, an explicit exit 0
   * — are rethrown untouched rather than reported as failures.
   */
  protected async catch(err: Error & { exitCode?: number }): Promise<void> {
    const oclifExit = (err as { oclif?: { exit?: number } }).oclif?.exit;
    if (oclifExit === 0) {
      throw err;
    }

    const report = reportError(err);
    process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);

    /* `process.exitCode` rather than `this.exit()`, which calls `process.exit()`
     * straight away. On Windows that aborts with a libuv assertion
     * (`!(handle->flags & UV_HANDLE_CLOSING)`, src/win/async.c) when an idle
     * keep-alive socket from an earlier request in the same command is still
     * open — the process dies with 127 and the carefully chosen exit code is
     * lost. Returning instead lets Node close its handles and exit on its own. */
    process.exitCode = report.code;
  }
}
