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
import * as cp from "child_process";
import { EndpointHostConfig, EndpointState } from "./types";

const configPath = process.argv[2];
if (!configPath) {
  process.stderr.write("Missing config path.\n");
  process.exit(1);
}

const config = readJson<EndpointHostConfig>(configPath);
if (!config) {
  process.stderr.write("Failed to read endpoint host config.\n");
  process.exit(1);
}

const hostConfig = config as EndpointHostConfig;

ensureDir(path.dirname(hostConfig.statePath));
ensureDir(path.dirname(hostConfig.logPath));

const helperPid = process.pid;
writeState({ status: "starting", helperPid, timestamp: new Date().toISOString() });

logLine(`Starting endpoint host. Helper PID: ${helperPid}`);
logLine(`Command: ${hostConfig.cdswctlPath} ${hostConfig.args.join(" ")}`);

const endpoint = cp.spawn(hostConfig.cdswctlPath, hostConfig.args, {
  windowsHide: true,
  stdio: ["pipe", "pipe", "pipe"],
  cwd: path.dirname(hostConfig.cdswctlPath),
});

let endpointReady = false;

endpoint.stdout?.on("data", (data) => {
  onEndpointData(data.toString(), false);
});

endpoint.stderr?.on("data", (data) => {
  onEndpointData(data.toString(), true);
});

endpoint.on("exit", (code) => {
  logLine(`cdswctl exited with code ${code ?? "unknown"}.`);
  if (!endpointReady) {
    writeState({
      status: "error",
      message: "cdswctl exited before SSH endpoint was ready.",
      endpointPid: endpoint.pid,
      helperPid,
      timestamp: new Date().toISOString(),
    });
  }
  process.exit(code ?? 1);
});

endpoint.on("error", (err) => {
  logLine(`cdswctl error: ${String(err)}`);
  writeState({
    status: "error",
    message: String(err),
    endpointPid: endpoint.pid,
    helperPid,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

const TIMEOUT_MS = 10 * 60 * 60 * 1000; // 10 hours
const timeoutTimer = setTimeout(() => {
  logLine("Helper reached 10-hour timeout. Shutting down...");
  writeState({
    status: "error",
    message: "Session timed out after 10 hours.",
    endpointPid: endpoint.pid,
    helperPid,
    timestamp: new Date().toISOString(),
  });
  safeKill(endpoint.pid);
  process.exit(0);
}, TIMEOUT_MS);
timeoutTimer.unref();

process.on("SIGTERM", () => {
  logLine("Helper received SIGTERM. Stopping endpoint...");
  clearTimeout(timeoutTimer);
  safeKill(endpoint.pid);
  process.exit(0);
});

process.on("exit", () => {
  safeKill(endpoint.pid);
});

function onEndpointData(text: string, isError: boolean): void {
  const lines = splitLines(text);
  for (const line of lines) {
    const prefix = isError ? "cdswctl err" : "cdswctl";
    logLine(`${prefix}: ${line}`);
    if (!endpointReady) {
      const match = line.match(/ssh\s+-p\s+(\d+)\s+(\S+)/);
      if (match) {
        endpointReady = true;
        const port = match[1];
        const userAndHost = match[2];
        const sshCommand = `ssh -p ${port} ${userAndHost}`;
        writeState({
          status: "ready",
          sshCommand,
          userAndHost,
          port,
          endpointPid: endpoint.pid,
          helperPid,
          timestamp: new Date().toISOString(),
        });
        logLine("Endpoint ready. Waiting for extension to launch Remote-SSH.");
      }
    }
  }
}

function writeState(state: EndpointState): void {
  fs.writeFileSync(hostConfig.statePath, JSON.stringify(state, null, 2), "utf8");
}

function readJson<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function logLine(message: string): void {
  fs.appendFileSync(hostConfig.logPath, message + "\n", "utf8");
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function safeKill(pid?: number): void {
  if (!pid) {
    return;
  }
  try {
    process.kill(pid);
  } catch {
    // Ignore
  }
}


