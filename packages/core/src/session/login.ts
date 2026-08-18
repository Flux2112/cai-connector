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

import { CaiRequestError } from "../errors";
import { redact } from "../redact";
import type { LogLine } from "../types";
import { runCdswctl, type CdswctlResult } from "./cdswctl";

/**
 * Logging `cdswctl` in, which every session command has to do first.
 *
 * The same API key works for `cdswctl login` and for API v2 Bearer auth, so there
 * is only ever one credential involved.
 */

/** The variable name the key travels under. The extension's `SECRET_KEY`. */
export const KEY_VAR = "CML_API_KEY";

export type LoginOptions = {
  url: string;
  username: string;
  apiKey: string;
  log?: LogLine;
};

/**
 * **The key never reaches our argv.**
 *
 * `%CML_API_KEY%` is passed as a literal argument while the real value goes in as
 * an environment variable, and `shell: true` makes Windows expand it inside the
 * child. argv is readable by every process on the machine; the child's own
 * environment is not. Any output is redacted before it is logged, because
 * `cdswctl` has been known to echo arguments back on failure.
 */
/**
 * The two values that reach the shell alongside the credential.
 *
 * They are quoted before they get there, but a value that could not be quoted
 * safely has no business being sent at all: this refuses anything that is not
 * plainly a URL or a username, rather than trusting the quoting alone.
 */
function assertShellSafe(url: string, username: string): void {
  if (!/^https?:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/.test(url)) {
    throw new CaiRequestError(`refusing to log in with an implausible URL: ${JSON.stringify(url)}`);
  }
  if (!/^[A-Za-z0-9._@-]+$/.test(username)) {
    throw new CaiRequestError(`refusing to log in with an implausible username: ${JSON.stringify(username)}`);
  }
}

export async function cdswctlLogin(
  cdswctlPath: string,
  options: LoginOptions,
): Promise<CdswctlResult> {
  const { url, username, apiKey, log } = options;
  assertShellSafe(url, username);

  const result = await runCdswctl(
    cdswctlPath,
    ["login", "-n", username, "-u", url, "-y", `%${KEY_VAR}%`],
    {
      env: { [KEY_VAR]: apiKey },
      log: log ? (line) => log(redact(line, apiKey)) : undefined,
    },
  );

  return {
    exitCode: result.exitCode,
    stdout: redact(result.stdout, apiKey),
    stderr: redact(result.stderr, apiKey),
  };
}

/**
 * The username `cdswctl login` expects, lower-cased.
 *
 * CML reports usernames upper-cased (`HANKE`) and accepts them either way here;
 * the extension has always sent a lower-cased `%USERNAME%`, so this keeps the two
 * sending the same thing.
 */
export function loginUsername(reported: string): string {
  return reported.trim().toLowerCase();
}
