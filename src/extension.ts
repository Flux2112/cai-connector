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

import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as cp from "child_process";
import { ensureCdswctl, runCdswctl } from "./cdswctl";
import { RuntimeManager } from "./runtimeManager";
import { updateSshConfig } from "./sshConfig";
import { LastSessionConfig, RuntimeAddonData, RuntimeData } from "./types";

let activeProject: string | null = null;

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("CAI Connector");

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.connect", async () => {
      await connectFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.disconnect", async () => {
      await disconnectFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.browseRuntimes", async () => {
      await browseRuntimesFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.resetApiKey", async () => {
      await resetApiKeyFlow(context, output);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("caiConnector.reconnect", async () => {
      await reconnectFlow(context, output);
    })
  );

  // Check if an endpoint is already running from a previous session
  checkActiveEndpoint(context, output);
}

export function deactivate(): void {
  // Intentionally empty — the helper process is detached and should
  // survive window closes. Use "CAI Connector: Disconnect" to stop it.
}

async function connectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  output.show(true);

  const config = vscode.workspace.getConfiguration("caiConnector");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");
  const defaultCpus = config.get<number>("defaultCpus", 2);
  const defaultMemoryGb = config.get<number>("defaultMemoryGb", 4);
  const cacheHours = config.get<number>("cacheHours", 24);

  const cachePath = path.join(context.globalStorageUri.fsPath, "runtimes_cache.json");
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");

  // Clean up any existing endpoint and SSH sessions before creating a new one
  if (fs.existsSync(statePath)) {
    const existing = readState(statePath);
    if (existing?.helperPid && isProcessAlive(existing.helperPid)) {
      output.appendLine("Cleaning up existing endpoint before reconnecting...");
      stopEndpointHost(statePath, output);
    } else {
      clearFile(statePath);
    }
  }
  killOrphanedHelperProcesses(output);

  let cdswctlPath: string;
  try {
    cdswctlPath = await ensureCdswctl(output, cdswctlPathSetting);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to locate cdswctl: ${String(err)}`);
    return;
  }

  const projectName = await vscode.window.showInputBox({
    title: "Project Name",
    prompt: "Enter your CML project name (or owner/project for another user's project)",
    ignoreFocusOut: true,
  });
  if (!projectName) {
    return;
  }

  const apiKey = await getApiKey(context);
  if (!apiKey) {
    return;
  }

  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const success = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!success) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  const runtime = await pickRuntime(runtimeManager.getAll());
  if (!runtime) {
    return;
  }

  const addons = await fetchRuntimeAddons(cdswctlPath, output);
  if (!addons) {
    return;
  }
  const addon = await pickRuntimeAddon(addons);
  if (addon === undefined) {
    return;
  }

  const cpus = await promptNumber("CPUs", defaultCpus);
  if (!cpus) {
    return;
  }

  const memory = await promptNumber("Memory (GB)", defaultMemoryGb);
  if (!memory) {
    return;
  }

  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
  const project = projectName.includes("/") ? projectName : `${username}/${projectName}`;
  activeProject = project;

  output.appendLine(`Connecting to project ${project}...`);

  const connected = await executeConnect(context, output, {
    project,
    runtimeId: runtime.id,
    addonId: addon?.id ?? null,
    cpus,
    memory,
    cdswctlPath,
    username,
    apiKey,
    autoStopSessions: "prompt",
  });

  if (connected) {
    saveLastSession(context, {
      projectName: project,
      runtimeId: runtime.id,
      addonId: addon?.id ?? null,
      cpus,
      memoryGb: memory,
      timestamp: new Date().toISOString(),
    });
  }
}

type ConnectParams = {
  project: string;
  runtimeId: number;
  addonId: number | null;
  cpus: number;
  memory: number;
  cdswctlPath: string;
  username: string;
  apiKey: string;
  autoStopSessions: boolean | "prompt";
};

async function executeConnect(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  params: ConnectParams,
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cmlUrl = config.get<string>("cmlUrl", "");
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");
  const logPath = path.join(context.globalStorageUri.fsPath, "endpoint_host.log");

  const loginResult = await runCdswctl(
    params.cdswctlPath,
    ["login", "-n", params.username, "-u", cmlUrl, "-y", "%CML_API_KEY%"],
    output,
    30000,
    { CML_API_KEY: params.apiKey },
  );

  if (loginResult.exitCode !== 0) {
    vscode.window.showErrorMessage("Login failed. See output for details.");
    const sanitized = (loginResult.stderr || loginResult.stdout).split(params.apiKey).join("***");
    output.appendLine(sanitized);
    return false;
  }

  if (params.autoStopSessions === true) {
    output.appendLine(`Stopping existing SSH sessions in project ${params.project}...`);
    await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, 30000);
  } else if (params.autoStopSessions === "prompt") {
    const stopSessions = await vscode.window.showQuickPick(
      [
        { label: "No", description: "Keep existing sessions running", picked: true },
        { label: "Yes", description: "Stop all existing sessions in this project" },
      ],
      {
        title: "Stop Existing Sessions?",
        placeHolder: `Stop all running sessions in ${params.project}?`,
      },
    );
    if (!stopSessions) {
      return false;
    }
    if (stopSessions.label === "Yes") {
      output.appendLine(`Stopping existing SSH sessions in project ${params.project}...`);
      await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, 30000);
    } else {
      output.appendLine("Skipping session cleanup.");
    }
  }

  output.appendLine("Creating SSH endpoint...");
  const args = [
    "ssh-endpoint",
    "-p",
    params.project,
    "-r",
    String(params.runtimeId),
    "-c",
    String(params.cpus),
    "-m",
    String(params.memory),
  ];
  if (params.addonId !== null) {
    args.push(`--addons=${String(params.addonId)}`);
  }

  clearFile(statePath);
  clearFile(logPath);

  const helperPid = startEndpointHost(context, output, {
    cdswctlPath: params.cdswctlPath,
    args,
    statePath,
    logPath,
  });

  if (!helperPid) {
    vscode.window.showErrorMessage("Failed to start endpoint host.");
    return false;
  }

  let state: EndpointState | null = null;
  try {
    state = await waitForEndpointReady(statePath, output, 60000);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to establish SSH endpoint: ${String(err)}`);
    await disconnectFlow(context, output);
    return false;
  }

  if (!state || !state.port || !state.userAndHost) {
    vscode.window.showErrorMessage("Failed to parse SSH endpoint output.");
    await disconnectFlow(context, output);
    return false;
  }

  output.appendLine(`SSH: ${state.userAndHost}:${state.port}`);

  if (!updateSshConfig(state.port)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    await disconnectFlow(context, output);
    return false;
  }

  output.appendLine("SSH config updated. Opening Remote-SSH window...");

  const remoteUri = vscode.Uri.parse("vscode-remote://ssh-remote+cml/home/cdsw");
  await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow: true });

  vscode.window.showInformationMessage("Remote-SSH window launched for host 'cml'.");
  return true;
}

async function reconnectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  if (process.platform !== "win32") {
    vscode.window.showErrorMessage("CAI Connector is Windows-only right now.");
    return;
  }

  output.show(true);

  const lastSession = loadLastSession(context);
  if (!lastSession) {
    vscode.window.showInformationMessage("No previous session found.");
    return;
  }

  const config = vscode.workspace.getConfiguration("caiConnector");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");
  const cacheHours = config.get<number>("cacheHours", 24);
  const cachePath = path.join(context.globalStorageUri.fsPath, "runtimes_cache.json");
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");

  // Clean up any existing endpoint
  if (fs.existsSync(statePath)) {
    const existing = readState(statePath);
    if (existing?.helperPid && isProcessAlive(existing.helperPid)) {
      output.appendLine("Cleaning up existing endpoint before reconnecting...");
      stopEndpointHost(statePath, output);
    } else {
      clearFile(statePath);
    }
  }
  killOrphanedHelperProcesses(output);

  let cdswctlPath: string;
  try {
    cdswctlPath = await ensureCdswctl(output, cdswctlPathSetting);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to locate cdswctl: ${String(err)}`);
    return;
  }

  const apiKey = await getApiKey(context);
  if (!apiKey) {
    return;
  }

  // Validate saved runtime against cache
  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const fetchSuccess = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!fetchSuccess) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  let runtimeId = lastSession.runtimeId;
  const allRuntimes = runtimeManager.getAll();
  const savedRuntime = allRuntimes.find((r) => r.id === runtimeId);

  if (!savedRuntime) {
    output.appendLine(`Saved runtime ID ${runtimeId} no longer exists. Showing runtime picker...`);
    vscode.window.showWarningMessage("Previously used runtime is no longer available. Please select a new one.");
    const picked = await pickRuntime(allRuntimes);
    if (!picked) {
      return;
    }
    runtimeId = picked.id;
  }

  // Validate saved addon if one was used
  let addonId: number | null = lastSession.addonId ?? null;
  if (addonId !== null) {
    const allAddons = await fetchRuntimeAddons(cdswctlPath, output);
    if (!allAddons) {
      return;
    }
    const savedAddon = allAddons.find((a) => a.id === addonId);
    if (!savedAddon) {
      output.appendLine(`Saved addon ID ${addonId} no longer exists. Showing addon picker...`);
      vscode.window.showWarningMessage("Previously used runtime addon is no longer available. Please select a new one.");
      const pickedAddon = await pickRuntimeAddon(allAddons);
      if (pickedAddon === undefined) {
        return;
      }
      addonId = pickedAddon?.id ?? null;
    }
  }

  // Build confirmation message
  const runtimeLabel = savedRuntime
    ? `${savedRuntime.editor} - ${savedRuntime.kernel} (${savedRuntime.edition})`
    : `Runtime ${runtimeId}`;
  const addonLabel = addonId !== null ? `, Addon ${addonId}` : "";
  const confirm = await vscode.window.showQuickPick(
    [
      { label: "Yes", description: "Recreate this session" },
      { label: "No", description: "Cancel" },
    ],
    {
      title: "Recreate Last Session?",
      placeHolder: `${lastSession.projectName} — ${runtimeLabel}, ${lastSession.cpus} CPU, ${lastSession.memoryGb} GB${addonLabel}`,
    },
  );
  if (!confirm || confirm.label !== "Yes") {
    return;
  }

  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
  activeProject = lastSession.projectName;

  output.appendLine(`Reconnecting to project ${lastSession.projectName}...`);

  // Determine stop-sessions behavior based on project ownership
  const projectOwner = lastSession.projectName.split("/")[0].toLowerCase();
  const autoStopSessions: boolean | "prompt" = projectOwner === username ? true : "prompt";

  const connected = await executeConnect(context, output, {
    project: lastSession.projectName,
    runtimeId,
    addonId,
    cpus: lastSession.cpus,
    memory: lastSession.memoryGb,
    cdswctlPath,
    username,
    apiKey,
    autoStopSessions,
  });

  if (connected) {
    saveLastSession(context, {
      projectName: lastSession.projectName,
      runtimeId,
      addonId,
      cpus: lastSession.cpus,
      memoryGb: lastSession.memoryGb,
      timestamp: new Date().toISOString(),
    });
  }
}

function saveLastSession(context: vscode.ExtensionContext, session: LastSessionConfig): void {
  const sessionPath = path.join(context.globalStorageUri.fsPath, "last_session.json");
  try {
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
  } catch {
    // Best-effort — don't block the flow
  }
}

function loadLastSession(context: vscode.ExtensionContext): LastSessionConfig | null {
  const sessionPath = path.join(context.globalStorageUri.fsPath, "last_session.json");
  try {
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    const raw = fs.readFileSync(sessionPath, "utf8");
    return JSON.parse(raw) as LastSessionConfig;
  } catch {
    return null;
  }
}

async function browseRuntimesFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");
  const cacheHours = config.get<number>("cacheHours", 24);

  const cachePath = path.join(context.globalStorageUri.fsPath, "runtimes_cache.json");

  let cdswctlPath: string;
  try {
    cdswctlPath = await ensureCdswctl(output, cdswctlPathSetting);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to locate cdswctl: ${String(err)}`);
    return;
  }

  const runtimeManager = new RuntimeManager(cachePath, cacheHours);
  const success = await runtimeManager.fetchRuntimes(cdswctlPath, false, output);
  if (!success) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return;
  }

  await pickRuntime(runtimeManager.getAll());
}

async function disconnectFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  output.show(true);
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");

  output.appendLine("Stopping ssh-endpoint process...");
  stopEndpointHost(statePath, output);

  // Also stop CML sessions if we know the project
  if (activeProject) {
    const config = vscode.workspace.getConfiguration("caiConnector");
    const cdswctlPathSetting = config.get<string>("cdswctlPath", "");

    output.appendLine(`Stopping sessions in project ${activeProject}...`);
    let cdswctlPath: string | undefined;
    try {
      cdswctlPath = await ensureCdswctl(
        output,
        cdswctlPathSetting
      );
    } catch (err) {
      output.appendLine(`Failed to locate cdswctl for disconnect: ${String(err)}`);
    }
    if (cdswctlPath) {
      await runCdswctl(cdswctlPath, ["sessions", "stop", "/p", activeProject, "/a"], output, 30000);
    }
    activeProject = null;
  }

  vscode.window.showInformationMessage("Disconnected.");
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string | null> {
  const stored = await context.secrets.get("CML_API_KEY");
  if (stored) {
    return stored;
  }

  const apiKey = await vscode.window.showInputBox({
    title: "CML API Key",
    prompt: "Enter your CML API key",
    ignoreFocusOut: true,
    password: true,
  });

  if (!apiKey) {
    return null;
  }

  await context.secrets.store("CML_API_KEY", apiKey);
  return apiKey;
}

async function resetApiKeyFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  await context.secrets.delete("CML_API_KEY");
  output.appendLine("API key has been removed from secret storage.");
  vscode.window.showInformationMessage("CML API key has been reset. You will be prompted on next connect.");
}

async function pickRuntime(runtimes: RuntimeData[]): Promise<RuntimeData | null> {
  const allItems: vscode.QuickPickItem[] = runtimes.map((r) => ({
    label: `[${r.id}] ${r.editor} - ${r.kernel} (${r.edition})`,
    description: r.shortVersion,
    detail: `Image: ${r.imageIdentifier}\n${r.description}`,
  }));

  return new Promise<RuntimeData | null>((resolve) => {
    const qp = vscode.window.createQuickPick();
    qp.title = "Select Runtime";
    qp.matchOnDescription = true;
    qp.matchOnDetail = true;
    qp.ignoreFocusOut = true;
    qp.items = allItems;

    qp.onDidChangeValue((value) => {
      const terms = value
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      if (terms.length <= 1) {
        // Single term or empty: let VS Code's built-in fuzzy matching handle it
        qp.items = allItems;
        return;
      }

      // Multiple terms: filter items that contain ALL terms (case-insensitive)
      qp.items = allItems.filter((item) => {
        const haystack = `${item.label} ${item.description ?? ""} ${item.detail ?? ""}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
    });

    let accepted = false;

    qp.onDidAccept(() => {
      accepted = true;
      const selected = qp.selectedItems[0];
      qp.dispose();
      if (!selected) {
        resolve(null);
        return;
      }
      const idMatch = selected.label.match(/\[(\d+)\]/);
      if (!idMatch) {
        resolve(null);
        return;
      }
      const id = Number(idMatch[1]);
      resolve(runtimes.find((r) => r.id === id) || null);
    });

    qp.onDidHide(() => {
      qp.dispose();
      if (!accepted) {
        resolve(null);
      }
    });

    qp.show();
  });
}

async function fetchRuntimeAddons(
  cdswctlPath: string,
  output: vscode.OutputChannel,
): Promise<RuntimeAddonData[] | null> {
  output.appendLine("Fetching runtime addons from cdswctl...");
  const result = await runCdswctl(cdswctlPath, ["runtime-addons", "list"], output, 30000);
  if (result.exitCode !== 0) {
    output.appendLine(`Error fetching runtime addons: ${result.stderr}`);
    vscode.window.showErrorMessage("Failed to fetch runtime addons. Check output for details.");
    return null;
  }

  try {
    const parsed = JSON.parse(result.stdout) as RuntimeAddonData[];
    output.appendLine(`Fetched ${parsed.length} runtime addons.`);
    return parsed;
  } catch (err) {
    output.appendLine(`Error parsing runtime addons: ${String(err)}`);
    vscode.window.showErrorMessage("Failed to parse runtime addons. Check output for details.");
    return null;
  }
}

/**
 * Shows a QuickPick for runtime addon selection.
 * Returns the selected addon, `null` for "None", or `undefined` if the user dismissed.
 */
async function pickRuntimeAddon(addons: RuntimeAddonData[]): Promise<RuntimeAddonData | null | undefined> {
  const noneItem: vscode.QuickPickItem = { label: "None", description: "No runtime addon" };
  const addonItems: vscode.QuickPickItem[] = addons.map((a) => ({
    label: `[${a.id}] ${a.displayName}`,
    description: a.component,
  }));
  const allItems = [noneItem, ...addonItems];

  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick();
    qp.title = "Select Runtime Addon";
    qp.matchOnDescription = true;
    qp.ignoreFocusOut = true;
    qp.items = allItems;

    qp.onDidChangeValue((value) => {
      const terms = value
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0);

      if (terms.length <= 1) {
        qp.items = allItems;
        return;
      }

      qp.items = allItems.filter((item) => {
        const haystack = `${item.label} ${item.description ?? ""}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      });
    });

    let accepted = false;

    qp.onDidAccept(() => {
      accepted = true;
      const selected = qp.selectedItems[0];
      qp.dispose();
      if (!selected) {
        resolve(undefined);
        return;
      }
      if (selected === noneItem) {
        resolve(null);
        return;
      }
      const idMatch = selected.label.match(/\[(\d+)\]/);
      if (!idMatch) {
        resolve(undefined);
        return;
      }
      const id = Number(idMatch[1]);
      resolve(addons.find((a) => a.id === id) || null);
    });

    qp.onDidHide(() => {
      qp.dispose();
      if (!accepted) {
        resolve(undefined);
      }
    });

    qp.show();
  });
}

async function promptNumber(title: string, defaultValue: number): Promise<number | null> {
  const raw = await vscode.window.showInputBox({
    title,
    prompt: `Enter ${title.toLowerCase()}`,
    value: String(defaultValue),
    ignoreFocusOut: true,
    validateInput: (value) => {
      if (!/^\d+$/.test(value)) {
        return "Enter a valid number";
      }
      if (Number(value) < 1) {
        return "Value must be at least 1";
      }
      return undefined;
    },
  });

  if (!raw) {
    return null;
  }

  return Number(raw);
}


type EndpointHostConfig = {
  cdswctlPath: string;
  args: string[];
  statePath: string;
  logPath: string;
};

type EndpointState = {
  status: "starting" | "ready" | "error";
  message?: string;
  sshCommand?: string;
  userAndHost?: string;
  port?: string;
  endpointPid?: number;
  helperPid?: number;
  timestamp: string;
};

function startEndpointHost(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  config: EndpointHostConfig
): number | null {
  try {
    fs.mkdirSync(path.dirname(config.statePath), { recursive: true });
    fs.writeFileSync(config.statePath, "", "utf8");

    const configPath = path.join(context.globalStorageUri.fsPath, "endpoint_host_config.json");
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    const helperScript = context.asAbsolutePath("out/endpointHost.js");
    if (!fs.existsSync(helperScript)) {
      output.appendLine(`Endpoint host script not found: ${helperScript}`);
      return null;
    }

    const child = cp.spawn(process.execPath, [helperScript, configPath], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return child.pid ?? null;
  } catch (err) {
    output.appendLine(`Failed to start endpoint host: ${String(err)}`);
    return null;
  }
}

async function waitForEndpointReady(
  statePath: string,
  output: vscode.OutputChannel,
  timeoutMs: number
): Promise<EndpointState> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (fs.existsSync(statePath)) {
      const state = readState(statePath, output);
      if (state?.status === "ready") {
        return state;
      }
      if (state?.status === "error") {
        throw new Error(state.message || "Endpoint host reported an error.");
      }
    }
    await sleep(500);
  }
  throw new Error("Timed out waiting for SSH endpoint.");
}

function readState(statePath: string, output?: vscode.OutputChannel): EndpointState | null {
  try {
    const raw = fs.readFileSync(statePath, "utf8").trim();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as EndpointState;
  } catch (err) {
    output?.appendLine(`Failed to read endpoint state: ${String(err)}`);
    return null;
  }
}

function clearFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore
  }
}

function stopEndpointHost(statePath: string, output?: vscode.OutputChannel): void {
  if (!fs.existsSync(statePath)) {
    output?.appendLine("No endpoint state file found. Nothing to stop.");
    return;
  }

  const state = readState(statePath, output);
  if (!state) {
    return;
  }

  if (state.helperPid) {
    output?.appendLine(`Killing helper process (PID ${state.helperPid})...`);
    try {
      process.kill(state.helperPid);
    } catch {
      // Already dead
    }
  }

  if (state.endpointPid) {
    output?.appendLine(`Killing endpoint process (PID ${state.endpointPid})...`);
    try {
      process.kill(state.endpointPid);
    } catch {
      // Already dead
    }
  }

  // Clear state file so we don't show stale status
  clearFile(statePath);
}

function killOrphanedHelperProcesses(output: vscode.OutputChannel): void {
  try {
    const result = cp.execSync(
      "wmic process where \"commandline like '%endpointHost.js%' and name='node.exe'\" get processid /format:list",
      { encoding: "utf8", windowsHide: true },
    );
    const pids = result
      .split(/\r?\n/)
      .map((line) => line.replace(/\s/g, ""))
      .filter((line) => line.startsWith("ProcessId="))
      .map((line) => Number(line.split("=")[1]))
      .filter((pid) => pid && pid !== process.pid);

    for (const pid of pids) {
      output.appendLine(`Killing orphaned helper process (PID ${pid})...`);
      try {
        process.kill(pid);
      } catch {
        // Already dead
      }
    }
  } catch {
    // wmic may fail on some systems; best-effort cleanup
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 = check if alive, don't actually kill
    return true;
  } catch {
    return false;
  }
}

function checkActiveEndpoint(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");
  if (!fs.existsSync(statePath)) {
    return;
  }

  const state = readState(statePath);
  if (!state || state.status !== "ready") {
    return;
  }

  // Verify the helper is actually still running
  if (!state.helperPid || !isProcessAlive(state.helperPid)) {
    // Stale state file — clean it up
    clearFile(statePath);
    return;
  }

  output.appendLine(`Active endpoint detected (helper PID ${state.helperPid}, port ${state.port}).`);
  vscode.window.showInformationMessage(
    `An SSH endpoint is running on port ${state.port}. It will be stopped automatically when you connect again.`,
  );
}
