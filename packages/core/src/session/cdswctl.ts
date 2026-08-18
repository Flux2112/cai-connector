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

import * as cp from "child_process";
import * as fs from "fs";
import * as path from "path";

import type { LogLine } from "../types";
import { CDSWCTL_TIMEOUT_MS } from "./types";

/**
 * The `cdswctl.exe` wrapper, ported from the extension.
 *
 * `cdswctl` stays mandatory because API v2 has no session endpoints at all — no
 * create, no stop, no SSH. Everything here is Windows-shaped for that reason.
 *
 * The extension passes a `vscode.OutputChannel`; this takes the same `LogLine`
 * callback the API client does, which is all that dependency ever was.
 */

export type CdswctlResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function findOnPath(fileName: string): string | null {
  for (const part of (process.env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    const candidate = path.join(part, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** The standard install location, checked after PATH. */
const DEFAULT_INSTALL = "C:\Program Files\CDSW\cdswctl.exe";

export function resolveCdswctl(configuredPath?: string, log?: LogLine): string {
  const override = (configuredPath ?? "").trim();
  if (override) {
    if (!fs.existsSync(override)) {
      throw new Error(`cdswctl.exe not found at ${override}`);
    }
    log?.(`Using cdswctl from the given path: ${override}`);
    return override;
  }

  const onPath = findOnPath("cdswctl.exe");
  if (onPath) {
    log?.(`Using cdswctl from PATH: ${onPath}`);
    return onPath;
  }
  if (fs.existsSync(DEFAULT_INSTALL)) {
    log?.(`Using cdswctl from its default location: ${DEFAULT_INSTALL}`);
    return DEFAULT_INSTALL;
  }

  throw new Error(
    "cdswctl.exe not found. Install it and add it to your PATH, or pass --cdswctl with the full path.",
  );
}

/**
 * One command line for the shell, rather than a command plus an argument array.
 *
 * `shell: true` with a separate argv is what Node 24 deprecates in DEP0190, and
 * the warning is right: the arguments are concatenated rather than escaped, so an
 * unquoted one is a command-injection hole. Quoting them here closes it. A
 * `%VAR%` token is deliberately left bare, since being expanded by the shell is
 * the whole reason this path exists. An embedded double quote is refused rather
 * than escaped, because cmd.exe has no escaping that works in every context.
 */
function shellCommand(cdswctlPath: string, args: string[]): string {
  for (const part of [cdswctlPath, ...args]) {
    if (part.includes('"')) {
      throw new Error(`refusing to build a shell command with a quote in it: ${JSON.stringify(part)}`);
    }
  }
  const quoted = args.map((arg) => (/^%[A-Za-z_][A-Za-z0-9_]*%$/.test(arg) ? arg : `"${arg}"`));
  return [`"${cdswctlPath}"`, ...quoted].join(" ");
}

/**
 * Run one `cdswctl` command and collect its output.
 *
 * `cwd` is the directory holding the binary because the CLI needs it, and the
 * `env`/`shell` pair exists so a caller can pass `%CML_API_KEY%` as a literal
 * argument and have Windows expand it inside the child — the key must never
 * appear in our own argv, where any process could read it.
 */
export function runCdswctl(
  cdswctlPath: string,
  args: string[],
  options: { log?: LogLine; timeoutMs?: number; env?: Record<string, string> } = {},
): Promise<CdswctlResult> {
  const { log, env } = options;
  const timeoutMs = options.timeoutMs ?? CDSWCTL_TIMEOUT_MS;
  const useShell = Boolean(env);

  return new Promise((resolve) => {
    if (!fs.existsSync(cdswctlPath)) {
      resolve({ exitCode: 1, stdout: "", stderr: `cdswctl.exe not found: ${cdswctlPath}` });
      return;
    }

    let child: cp.ChildProcess;
    try {
      child = cp.spawn(
        useShell ? shellCommand(cdswctlPath, args) : cdswctlPath,
        useShell ? [] : args,
        {
          windowsHide: true,
          cwd: path.dirname(cdswctlPath),
          ...(env ? { env: { ...process.env, ...env } } : {}),
          ...(useShell ? { shell: true } : {}),
        },
      );
    } catch (err) {
      log?.(`cdswctl spawn failed: ${String(err)}`);
      resolve({ exitCode: 1, stdout: "", stderr: String(err) });
      return;
    }

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      log?.(`cdswctl error: ${String(err)}`);
      resolve({ exitCode: 1, stdout: "", stderr: String(err) });
    });
  });
}

/**
 * `cdswctl sessions stop /s` prints `unexpected end of JSON input` **on success**.
 *
 * Every caller has to know this, so no caller should have to: a stop that is
 * wrongly read as failed leaves the record flagged as an orphan forever, and one
 * wrongly read as succeeded leaves a session burning cluster capacity. Note the
 * absence of `/a` — the blanket stop-everything flag killed unrelated user
 * sessions and is never used.
 */
export function stoppedSuccessfully(result: CdswctlResult): boolean {
  return (
    result.exitCode === 0 || /unexpected end of JSON/i.test(result.stdout + result.stderr)
  );
}

export async function stopCmlSession(
  cdswctlPath: string,
  project: string,
  sessionId: string,
  log?: LogLine,
): Promise<boolean> {
  log?.(`Stopping CML session ${sessionId} in project ${project}...`);
  const result = await runCdswctl(
    cdswctlPath,
    ["sessions", "stop", "/s", sessionId, "/p", project],
    { log },
  );
  return stoppedSuccessfully(result);
}
