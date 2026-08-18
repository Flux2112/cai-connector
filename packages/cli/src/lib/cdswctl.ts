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
import { cdswctlLogin, loginUsername, resolveCdswctl } from "@defysoftware/cai-core";

import { CaiCliError, EXIT } from "./exit";

/** Where `cdswctl.exe` is, when PATH and the default location are both wrong. */
export const cdswctlFlag = Flags.string({
  description: "Path to cdswctl.exe. Defaults to PATH, then C:\\Program Files\\CDSW\\cdswctl.exe.",
});

export type LoginArgs = {
  url: string;
  apiKey: string;
  /** As CML reports it; lower-cased before it is sent. */
  username: string;
  cdswctlPath?: string;
  log?: (line: string) => void;
};

/**
 * Resolve `cdswctl.exe` and log it in, returning its path.
 *
 * Every session command starts here, exactly as the extension does: `cdswctl`
 * holds its own session, and the same API key authenticates both it and the API.
 * A failed login is a credential problem, so it exits AUTH rather than API — the
 * fix is a new key, not a retry.
 */
export async function loginToCdswctl(args: LoginArgs): Promise<string> {
  let cdswctlPath: string;
  try {
    cdswctlPath = resolveCdswctl(args.cdswctlPath, args.log);
  } catch (err) {
    throw new CaiCliError(err instanceof Error ? err.message : String(err), EXIT.CONFIG);
  }

  const result = await cdswctlLogin(cdswctlPath, {
    url: args.url,
    username: loginUsername(args.username),
    apiKey: args.apiKey,
    log: args.log,
  });

  if (result.exitCode !== 0) {
    /* Already redacted by core, but say as little as possible anyway. */
    const detail = (result.stderr || result.stdout).trim().split(/\r?\n/)[0] ?? "";
    throw new CaiCliError(`cdswctl login failed${detail ? `: ${detail}` : ""}`, EXIT.AUTH);
  }

  return cdswctlPath;
}
