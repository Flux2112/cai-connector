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

import * as path from "path";
import * as cp from "child_process";
import { EndpointHostConfig, EndpointState } from "./types";
import { startIdleMonitor } from "./idleMonitor";
import {
  ensureDir,
  readJson,
  safeKill,
  splitLines,
  stopCmlSessions,
  writeStateFile,
  appendLog,
} from "./endpointHostUtils";

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
const writeState = (state: EndpointState) => writeStateFile(hostConfig.statePath, state);
const logLine = (msg: string) => appendLog(hostConfig.logPath, msg);

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
let idleMonitor: { markConnectionSeen: () => void } | null = null;
let shuttingDown = false;

endpoint.stdout?.on("data", (data) => {
  onEndpointData(data.toString(), false);
});

endpoint.stderr?.on("data", (data) => {
  onEndpointData(data.toString(), true);
});

endpoint.on("exit", (code) => {
  logLine(`cdswctl exited with code ${code ?? "unknown"}.`);
  if (shuttingDown) {
    return;
  }
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
  if (shuttingDown) {
    return;
  }
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
  shutdown("Session timed out after 10 hours.");
}, TIMEOUT_MS);
timeoutTimer.unref();

process.on("SIGTERM", () => {
  shutdown("Helper received SIGTERM.");
});

process.on("uncaughtException", (err) => {
  shutdown(`Helper uncaught exception: ${String(err)}`, 1);
});

process.on("unhandledRejection", (reason) => {
  shutdown(`Helper unhandled rejection: ${String(reason)}`, 1);
});

process.on("exit", () => {
  safeKill(endpoint.pid);
});

function onEndpointData(text: string, isError: boolean): void {
  const lines = splitLines(text);
  for (const line of lines) {
    const prefix = isError ? "cdswctl err" : "cdswctl";
    logLine(`${prefix}: ${line}`);
    if (/Handling connection on port/i.test(line)) {
      idleMonitor?.markConnectionSeen();
    }
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
        idleMonitor = startIdleMonitor(port, hostConfig, logLine, (reason) => {
          shutdown(reason);
        });
      }
    }
  }
}

function shutdown(reason: string, code = 0): void {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  clearTimeout(timeoutTimer);
  logLine(`Shutting down helper: ${reason}`);
  writeState({
    status: "error",
    message: reason,
    endpointPid: endpoint.pid,
    helperPid,
    timestamp: new Date().toISOString(),
  });
  stopCmlSessions(hostConfig.cdswctlPath, hostConfig.project, logLine);
  safeKill(endpoint.pid);
  process.exit(code);
}