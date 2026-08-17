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

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/** Where a resolved value came from, so `cai login` can explain itself. */
export type Source = "flag" | "env" | "file" | "unset";

export type Resolved<T> = { value: T | undefined; source: Source };

export type Credentials = {
  baseUrl?: string;
  apiKey?: string;
};

export type ResolveInput = {
  /** Values from command flags. `apiKey` here is discouraged — see below. */
  flags?: Credentials;
  env?: NodeJS.ProcessEnv;
  /** Overridable so tests never touch the real config directory. */
  configDir?: string;
};

export type Resolution = {
  baseUrl: Resolved<string>;
  apiKey: Resolved<string>;
  /** Absolute path of the credentials file, whether or not it exists. */
  file: string;
};

export const CREDENTIALS_FILE = "credentials.json";

/**
 * `%APPDATA%\cai` on Windows, `$XDG_CONFIG_HOME/cai` or `~/.config/cai`
 * elsewhere. The API commands are cross-platform even though the extension
 * that shares this repository is not.
 */
export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  if (process.platform === "win32" && env.APPDATA) {
    return path.join(env.APPDATA, "cai");
  }
  if (env.XDG_CONFIG_HOME) {
    return path.join(env.XDG_CONFIG_HOME, "cai");
  }
  return path.join(os.homedir(), ".config", "cai");
}

function readCredentialsFile(file: string): Credentials {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const { baseUrl, apiKey } = parsed as Credentials;
    return {
      baseUrl: typeof baseUrl === "string" ? baseUrl : undefined,
      apiKey: typeof apiKey === "string" ? apiKey : undefined,
    };
  } catch {
    /* Absent or unreadable is not an error here: the caller reports "unset",
     * which is a better message than a JSON parse error the user cannot act on. */
    return {};
  }
}

function pick(flag: string | undefined, env: string | undefined, file: string | undefined): Resolved<string> {
  if (flag) return { value: flag, source: "flag" };
  if (env) return { value: env, source: "env" };
  if (file) return { value: file, source: "file" };
  return { value: undefined, source: "unset" };
}

/**
 * Resolve the instance URL and API key, flag then environment then file.
 *
 * `CML_API_KEY` is the same variable the VS Code extension stores its key
 * under, deliberately: the plan verified that one key serves both `cdswctl
 * login` and API v2 Bearer auth, so there is no second credential to manage.
 */
export function resolveConfig(input: ResolveInput = {}): Resolution {
  const env = input.env ?? process.env;
  const dir = input.configDir ?? configDir(env);
  const file = path.join(dir, CREDENTIALS_FILE);
  const stored = readCredentialsFile(file);

  return {
    baseUrl: pick(input.flags?.baseUrl, env.CAI_URL ?? env.CML_URL, stored.baseUrl),
    apiKey: pick(input.flags?.apiKey, env.CML_API_KEY, stored.apiKey),
    file,
  };
}

/**
 * Persist credentials with the file readable by its owner only.
 *
 * The mode is set at creation rather than afterwards so there is no window in
 * which the key sits in a world-readable file. On Windows the mode bits are
 * largely advisory, but `%APPDATA%` is already a per-user directory.
 */
export function saveCredentials(dir: string, credentials: Credentials): string {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, CREDENTIALS_FILE);
  fs.writeFileSync(file, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}
