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
import { createClient, validateKey } from "@defysoftware/cai-core";

import { BaseCommand } from "../baseCommand";
import { configDir, saveCredentials } from "../lib/config";
import { CaiCliError, EXIT } from "../lib/exit";
import { promptSecret, readPipedInput } from "../lib/prompt";

export default class Login extends BaseCommand<typeof Login> {
  static description =
    "Validate an API key against an instance and store it for later commands. The key is verified before anything is written.";

  static examples = [
    "<%= config.bin %> login --url https://ml.example.com",
    "$CML_API_KEY is already set:  <%= config.bin %> login --url https://ml.example.com",
    "From a file:  <%= config.bin %> login --url https://ml.example.com < key.txt",
  ];

  static flags = {
    check: Flags.boolean({
      description: "Validate only; do not write the credentials file.",
    }),
  };

  public async run(): Promise<{ username: string; url: string; file?: string }> {
    const resolved = this.resolution();
    const url = resolved.baseUrl.value;
    if (!url) {
      throw new CaiCliError("missing instance URL: pass --url or set $CAI_URL", EXIT.CONFIG);
    }

    const apiKey = await this.obtainKey(resolved.apiKey.value);

    /* Validated before it is stored, so a typo never becomes a saved credential
     * that fails on every later command with a confusing error. */
    const client = createClient({
      baseUrl: url,
      apiKey,
      userAgent: `cai/${this.config.version}`,
      log: this.flags.verbose ? (line) => process.stderr.write(`${line}\n`) : undefined,
    });
    const validation = await validateKey(client, "API");
    if (validation.valid !== true || !validation.username) {
      throw new CaiCliError(
        `API key rejected by ${url}: ${validation.message ?? "no reason given"}`,
        EXIT.AUTH,
      );
    }

    if (this.flags.check) {
      return this.emit({ username: validation.username, url });
    }

    const file = saveCredentials(configDir(), { baseUrl: url, apiKey });
    return this.emit({ username: validation.username, url, file });
  }

  /**
   * Flag, then environment, then stdin, then a hidden prompt.
   *
   * A non-TTY stdin is read to the end rather than prompted for, so this works
   * unattended in a pipeline; a TTY gets a prompt with no echo. Neither path
   * ever puts the key in argv — that is what the `--api-key` warning is about.
   */
  private async obtainKey(resolved: string | undefined): Promise<string> {
    if (resolved) {
      return resolved;
    }
    if (!process.stdin.isTTY) {
      const piped = await readPipedInput();
      if (piped) {
        return piped;
      }
      throw new CaiCliError(
        "no API key: set $CML_API_KEY, pipe the key on stdin, or run this on a terminal",
        EXIT.CONFIG,
      );
    }
    const typed = await promptSecret("Cloudera AI API key: ");
    if (!typed) {
      throw new CaiCliError("no API key entered", EXIT.CONFIG);
    }
    return typed;
  }
}
