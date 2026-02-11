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

import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as cp from "child_process";

export type CdswctlResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function ensureCdswctl(
  output: vscode.OutputChannel,
  configuredPath?: string
): Promise<string> {
  const overridePath = (configuredPath || "").trim();
  if (overridePath) {
    if (!fs.existsSync(overridePath)) {
      throw new Error(`Configured cdswctl.exe not found: ${overridePath}`);
    }
    output.appendLine(`Using cdswctl from config: ${overridePath}`);
    return overridePath;
  }

  const onPath = findOnPath("cdswctl.exe");
  if (onPath) {
    output.appendLine(`Using cdswctl from PATH: ${onPath}`);
    return onPath;
  }

  throw new Error(
    "cdswctl.exe not found. Install it and add it to your PATH, " +
    "or set the full path in Settings → caiConnector.cdswctlPath."
  );
}

export async function runCdswctl(
  cdswctlPath: string,
  args: string[],
  output: vscode.OutputChannel,
  timeoutMs: number,
  env?: Record<string, string>,
): Promise<CdswctlResult> {
  const mergedEnv = env ? { ...process.env, ...env } : undefined;
  const useShell = !!env;
  return new Promise((resolve) => {
    if (!fs.existsSync(cdswctlPath)) {
      resolve({ exitCode: 1, stdout: "", stderr: `cdswctl.exe not found: ${cdswctlPath}` });
      return;
    }

    let child: cp.ChildProcess;
    const spawnCommand = useShell ? `"${cdswctlPath}"` : cdswctlPath;
    try {
      child = cp.spawn(spawnCommand, args, {
        windowsHide: true,
        cwd: path.dirname(cdswctlPath),
        ...(mergedEnv ? { env: mergedEnv } : {}),
        ...(useShell ? { shell: true } : {}),
      });
    } catch (err) {
      const message = String(err);
      output.appendLine(`cdswctl spawn failed: ${message}`);
      execFileFallback(cdswctlPath, args, timeoutMs, output, mergedEnv).then(resolve);
      return;
    }
    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill();
    }, timeoutMs);

    if (child.stdout) {
      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });
    }

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      const message = String(err);
      output.appendLine(`cdswctl error: ${message}`);
      execFileFallback(cdswctlPath, args, timeoutMs, output, mergedEnv).then(resolve);
    });
  });
}

export function startSshEndpoint(
  cdswctlPath: string,
  args: string[],
  output: vscode.OutputChannel
): cp.ChildProcessWithoutNullStreams {
  if (!fs.existsSync(cdswctlPath)) {
    throw new Error(`cdswctl.exe not found: ${cdswctlPath}`);
  }
  output.appendLine(`Command: ${cdswctlPath} ${args.join(" ")}`);
  const child = cp.spawn(cdswctlPath, args, {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    cwd: path.dirname(cdswctlPath),
  });
  logStream(child.stdout, output, "cdswctl");
  logStream(child.stderr, output, "cdswctl err");
  return child;
}

function execFileFallback(
  cdswctlPath: string,
  args: string[],
  timeoutMs: number,
  output: vscode.OutputChannel,
  env?: NodeJS.ProcessEnv,
): Promise<CdswctlResult> {
  const useShell = !!env;
  const execCommand = useShell ? `"${cdswctlPath}"` : cdswctlPath;
  return new Promise((resolve) => {
    output.appendLine("Falling back to execFile for cdswctl...");
    const child = cp.execFile(
      execCommand,
      args,
      { timeout: timeoutMs, windowsHide: true, cwd: path.dirname(cdswctlPath), ...(env ? { env } : {}), ...(useShell ? { shell: true } : {}) },
      (error, stdout, stderr) => {
        if (error) {
          resolve({ exitCode: 1, stdout: stdout || "", stderr: stderr || String(error) });
          return;
        }
        resolve({ exitCode: 0, stdout: stdout || "", stderr: stderr || "" });
      }
    );

    child.on("error", (err) => {
      resolve({ exitCode: 1, stdout: "", stderr: String(err) });
    });
  });
}

function findOnPath(fileName: string): string | null {
  const pathValue = process.env.PATH || "";
  const parts = pathValue.split(path.delimiter).filter(Boolean);
  for (const part of parts) {
    const candidate = path.join(part, fileName);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function logStream(stream: NodeJS.ReadableStream, output: vscode.OutputChannel, prefix: string): void {
  let buffer = "";
  stream.on("data", (data) => {
    buffer += data.toString();
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || "";
    for (const part of parts) {
      const line = part.trimEnd();
      if (line) {
        output.appendLine(`${prefix}: ${line}`);
      }
    }
  });

  stream.on("close", () => {
    if (buffer.trim()) {
      output.appendLine(`${prefix}: ${buffer.trimEnd()}`);
    }
  });
}
