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
import * as vscode from "vscode";
import { runCdswctl } from "./cdswctl";
import { resolveAndLogin } from "./auth";
import { addOrUpdateSession } from "./sessionHistory";
import { loadLastSession, saveLastSession, setActiveProject } from "./state";
import { updateSshConfig } from "./sshConfig";
import { buildEndpointArgs, clearFile, getStoragePath, readState, stopCmlSessions } from "./utils";
import {
  CDSWCTL_TIMEOUT_MS, ConnectParams, EndpointState,
  ENDPOINT_READY_TIMEOUT_MS, REMOTE_URI, STATE_FILE,
} from "./types";

type ActiveEndpoint = {
  process: cp.ChildProcess;
  cdswctlPath: string;
  sessionId?: string;
  project: string;
  statePath: string;
};

let activeEndpoint: ActiveEndpoint | null = null;
// Set to true when we hand the running endpoint off to Remote-SSH in same-window mode.
// Prevents deactivate() from killing the process that Remote-SSH needs to connect to.
let surrenderedToSsh = false;

export function getActiveEndpoint(): ActiveEndpoint | null {
  return activeEndpoint;
}

export function isSurrenderedToSsh(): boolean {
  return surrenderedToSsh;
}

export function clearActiveEndpoint(): void {
  const ep = activeEndpoint;
  activeEndpoint = null;
  if (ep) {
    if (ep.process.pid) {
      try { process.kill(ep.process.pid); } catch { /* already dead */ }
    }
    clearFile(ep.statePath);
  }
}

export async function executeConnect(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  params: ConnectParams,
): Promise<string | false> {
  const statePath = getStoragePath(context, STATE_FILE);

  if (params.autoStopSessions !== false) {
    const prevSessionId = params.autoStopSessions;
    output.appendLine(`Stopping previous extension session ${prevSessionId} in project ${params.project}...`);
    await runCdswctl(
      params.cdswctlPath,
      ["sessions", "stop", "/s", prevSessionId, "/p", params.project],
      output,
      CDSWCTL_TIMEOUT_MS,
    );
  }

  output.appendLine("Creating SSH endpoint...");
  const args = buildEndpointArgs(params);
  output.appendLine(`Command: ${params.cdswctlPath} ${args.join(" ")}`);

  clearFile(statePath);
  try { fs.mkdirSync(path.dirname(statePath), { recursive: true }); } catch { /* already exists */ }

  const child = cp.spawn(params.cdswctlPath, args, {
    windowsHide: true,
    stdio: ["pipe", "pipe", "pipe"],
    cwd: path.dirname(params.cdswctlPath),
    detached: true,
  });

  child.unref();

  activeEndpoint = {
    process: child,
    cdswctlPath: params.cdswctlPath,
    sessionId: undefined,
    project: params.project,
    statePath,
  };

  const readyPromise = new Promise<EndpointState | null>((resolve) => {
    let stdoutBuf = "";
    let stderrBuf = "";
    let sessionId: string | undefined;
    let settled = false;

    const done = (val: EndpointState | null): void => {
      if (!settled) { settled = true; resolve(val); }
    };

    const onLine = (line: string, isErr: boolean): void => {
      output.appendLine(isErr ? `cdswctl err: ${line}` : `cdswctl: ${line}`);

      if (!sessionId) {
        const m = line.match(/on session\s+(\S+)\s+in project/i);
        if (m) {
          sessionId = m[1];
          if (activeEndpoint) { activeEndpoint.sessionId = sessionId; }
        }
      }

      if (!settled) {
        const portMatch = line.match(/ssh\s+-p\s+(\d+)\s+(\S+)/);
        if (portMatch) {
          const port = portMatch[1];
          const userAndHost = portMatch[2];
          const state: EndpointState = {
            status: "ready",
            sshCommand: `ssh -p ${port} ${userAndHost}`,
            userAndHost,
            port,
            sessionId,
            endpointPid: child.pid,
            timestamp: new Date().toISOString(),
            project: params.project,
            runtimeId: params.runtimeId,
            addonId: params.addonId,
            cpus: params.cpus,
            memoryGb: params.memory,
            gpus: params.gpus,
          };
          try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2), "utf8"); } catch { /* ignore */ }
          done(state);
        }
      }
    };

    child.stdout?.on("data", (data: Buffer) => {
      stdoutBuf += data.toString();
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() ?? "";
      lines.filter((l) => l.trim()).forEach((l) => onLine(l.trimEnd(), false));
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderrBuf += data.toString();
      const lines = stderrBuf.split(/\r?\n/);
      stderrBuf = lines.pop() ?? "";
      lines.filter((l) => l.trim()).forEach((l) => onLine(l.trimEnd(), true));
    });

    child.on("exit", (code) => {
      output.appendLine(`cdswctl exited with code ${code ?? "unknown"}.`);
      if (!settled) {
        const errState: EndpointState = {
          status: "error",
          message: `cdswctl exited with code ${code ?? "unknown"} before endpoint was ready.`,
          endpointPid: child.pid,
          timestamp: new Date().toISOString(),
        };
        try { fs.writeFileSync(statePath, JSON.stringify(errState, null, 2), "utf8"); } catch { /* ignore */ }
        done(null);
      }
    });

    child.on("error", (err) => {
      output.appendLine(`cdswctl spawn error: ${String(err)}`);
      done(null);
    });
  });

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), ENDPOINT_READY_TIMEOUT_MS),
  );

  const state = await Promise.race([readyPromise, timeoutPromise]);

  if (!state || !state.port || !state.userAndHost) {
    vscode.window.showErrorMessage("Failed to establish SSH endpoint.");
    clearActiveEndpoint();
    return false;
  }

  output.appendLine(`SSH: ${state.userAndHost}:${state.port}`);

  if (!updateSshConfig(state.port)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    await disconnectFlow(context, output);
    return false;
  }

  // Record the session synchronously before opening the remote window.
  // This ensures the next extension host's liveSession check finds the alive endpoint PID
  // and skips killOrphanedEndpointProcesses, which would otherwise kill the tunnel.
  addOrUpdateSession(context.globalStorageUri.fsPath, {
    id: state.timestamp,
    projectName: params.project,
    runtimeId: params.runtimeId,
    addonId: params.addonId ?? null,
    cpus: params.cpus,
    memoryGb: params.memory,
    gpus: params.gpus,
    status: "active",
    port: state.port,
    sessionId: state.sessionId,
    endpointPid: child.pid,
    startedAt: state.timestamp,
  });

  output.appendLine("SSH config updated. Opening Remote-SSH window...");
  const openInSameWindow = vscode.workspace.getConfiguration("caiConnector").get<boolean>("openInSameWindow", true);
  // Force a new window when already inside a remote session — the current window is being disconnected/replaced
  const forceNewWindow = !openInSameWindow || Boolean(vscode.env.remoteName);
  // Always surrender the endpoint before opening the remote window.
  // In same-window mode the current host is reloaded; in new-window mode it is deactivated.
  // Either way deactivate() must not kill the cdswctl tunnel that the new window needs.
  surrenderedToSsh = true;
  const remoteUri = vscode.Uri.parse(REMOTE_URI);
  try {
    await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow });
    vscode.window.showInformationMessage("Remote-SSH window launched for host 'cml'.");
  } catch (err) {
    output.appendLine(`Remote-SSH handoff failed: ${String(err)}`);
    vscode.window.showErrorMessage(`Failed to launch Remote-SSH window: ${String(err)}`);
    return false;
  }
  return state.sessionId ?? "";
}

export async function disconnectFlow(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  output.show(true);
  const endpoint = activeEndpoint;
  const statePath = getStoragePath(context, STATE_FILE);

  if (endpoint) {
    const { sessionId, project } = endpoint;
    if (endpoint.process.pid) {
      output.appendLine(`Killing cdswctl process (PID ${endpoint.process.pid})...`);
      try { process.kill(endpoint.process.pid); } catch { /* already dead */ }
    }
    clearFile(statePath);
    activeEndpoint = null;
    setActiveProject(null);

    // Mark last session as explicitly disconnected so auto-reconnect skips it
    const lastSession = loadLastSession(context);
    if (lastSession) {
      saveLastSession(context, { ...lastSession, disconnectedAt: new Date().toISOString() });
    }

    if (project && sessionId) {
      output.appendLine(`Stopping session ${sessionId} in project ${project}...`);
      const cdswctlPath = await resolveAndLogin(context, output);
      if (cdswctlPath) {
        const result = await runCdswctl(
          cdswctlPath,
          ["sessions", "stop", "/s", sessionId, "/p", project],
          output,
          CDSWCTL_TIMEOUT_MS,
        );
        if (result.exitCode !== 0) {
          const combined = result.stdout + result.stderr;
          if (/unexpected end of JSON/i.test(combined)) {
            output.appendLine("Session stop returned known cdswctl bug (session likely stopped successfully).");
          }
        }
      } else {
        output.appendLine("Skipping remote session cleanup — login failed.");
      }
    } else {
      output.appendLine("No session ID available — skipping session cleanup to avoid stopping unrelated sessions.");
    }
  } else {
    // Fallback: check state file for a cdswctl PID left over from a previous run
    const currentState = readState(statePath, output);
    if (currentState?.endpointPid) {
      output.appendLine(`Killing orphaned cdswctl (PID ${currentState.endpointPid})...`);
      try { process.kill(currentState.endpointPid); } catch { /* already dead */ }
    }
    clearFile(statePath);
    output.appendLine("No active endpoint in this session — cleared stale state.");
  }

  vscode.window.showInformationMessage("Disconnected.");
}

export function stopCmlSessionsSync(
  cdswctlPath: string,
  project: string,
  sessionId: string | undefined,
): void {
  stopCmlSessions(cdswctlPath, project, (_msg) => { /* no-op in deactivate */ }, sessionId);
}
