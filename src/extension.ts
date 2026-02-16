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
import * as os from "os";
import * as path from "path";
import * as cp from "child_process";
import * as vscode from "vscode";
import { ensureCdswctl, runCdswctl } from "./cdswctl";
import { RuntimeManager } from "./runtimeManager";
import { updateSshConfig } from "./sshConfig";
import { ConnectParams, EndpointHostConfig, EndpointState, LastSessionConfig, ResourceInput, RuntimeAddonData, RuntimeData } from "./types";

const SECRET_KEY = "CML_API_KEY";
const STATE_FILE = "endpoint_state.json";
const LOG_FILE = "endpoint_host.log";
const CACHE_FILE = "runtimes_cache.json";
const SESSION_FILE = "last_session.json";
const CDSWCTL_TIMEOUT_MS = 30000;
const ENDPOINT_READY_TIMEOUT_MS = 60000;
const ENDPOINT_POLL_INTERVAL_MS = 500;
const REMOTE_URI = "vscode-remote://ssh-remote+cml/home/cdsw";

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
    vscode.commands.registerCommand("caiConnector.clearCache", async () => {
      await clearCacheFlow(context, output);
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
  const defaultCpus = config.get<number>("defaultCpus", 2);
  const defaultMemoryGb = config.get<number>("defaultMemoryGb", 4);
  const defaultGpus = config.get<number>("defaultGpus", 0);
  const cacheHours = config.get<number>("cacheHours", 24);

  const cachePath = getStoragePath(context, CACHE_FILE);
  const statePath = getStoragePath(context, STATE_FILE);

  await cleanupExistingEndpoint(statePath, output);

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
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

  const resources = await promptResources(defaultCpus, defaultMemoryGb, defaultGpus);
  if (!resources) {
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
    cpus: resources.cpus,
    memory: resources.memoryGb,
    gpus: resources.gpus,
    cdswctlPath,
    autoStopSessions: "prompt",
  });

  if (connected) {
    saveLastSession(context, {
      projectName: project,
      runtimeId: runtime.id,
      addonId: addon?.id ?? null,
      cpus: resources.cpus,
      memoryGb: resources.memoryGb,
      gpus: resources.gpus,
      timestamp: new Date().toISOString(),
    });
  }
}

async function executeConnect(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  params: ConnectParams,
): Promise<boolean> {
  const statePath = getStoragePath(context, STATE_FILE);
  const logPath = getStoragePath(context, LOG_FILE);

  const shouldContinue = await handleStopSessions(params, output);
  if (!shouldContinue) {
    return false;
  }

  output.appendLine("Creating SSH endpoint...");
  const args = buildEndpointArgs(params);
  output.appendLine(`Command: ${params.cdswctlPath} ${args.join(" ")}`);

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
    state = await waitForEndpointReady(statePath, output, ENDPOINT_READY_TIMEOUT_MS);
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

  const remoteUri = vscode.Uri.parse(REMOTE_URI);
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
  const cacheHours = config.get<number>("cacheHours", 24);
  const cachePath = getStoragePath(context, CACHE_FILE);
  const statePath = getStoragePath(context, STATE_FILE);

  await cleanupExistingEndpoint(statePath, output);

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
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
      placeHolder: `${lastSession.projectName} — ${runtimeLabel}, ${lastSession.cpus} CPU, ${lastSession.memoryGb} GB, ${lastSession.gpus ?? 0} GPU${addonLabel}`,
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
    gpus: lastSession.gpus ?? 0,
    cdswctlPath,
    autoStopSessions,
  });

  if (connected) {
    saveLastSession(context, {
      projectName: lastSession.projectName,
      runtimeId,
      addonId,
      cpus: lastSession.cpus,
      memoryGb: lastSession.memoryGb,
      gpus: lastSession.gpus ?? 0,
      timestamp: new Date().toISOString(),
    });
  }
}

function saveLastSession(context: vscode.ExtensionContext, session: LastSessionConfig): void {
  const sessionPath = getStoragePath(context, SESSION_FILE);
  try {
    fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), "utf8");
  } catch {
    // Best-effort — don't block the flow
  }
}

function loadLastSession(context: vscode.ExtensionContext): LastSessionConfig | null {
  const sessionPath = getStoragePath(context, SESSION_FILE);
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
  const cacheHours = config.get<number>("cacheHours", 24);
  const cachePath = getStoragePath(context, CACHE_FILE);

  const cdswctlPath = await resolveAndLogin(context, output);
  if (!cdswctlPath) {
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
  const statePath = getStoragePath(context, STATE_FILE);

  output.appendLine("Stopping ssh-endpoint process...");
  stopEndpointHost(statePath, output);

  // Also stop CML sessions if we know the project
  if (activeProject) {
    output.appendLine(`Stopping sessions in project ${activeProject}...`);
    const cdswctlPath = await resolveAndLogin(context, output);
    if (cdswctlPath) {
      await runCdswctl(cdswctlPath, ["sessions", "stop", "/p", activeProject, "/a"], output, CDSWCTL_TIMEOUT_MS);
    } else {
      output.appendLine("Skipping remote session cleanup — login failed.");
    }
    activeProject = null;
  }

  vscode.window.showInformationMessage("Disconnected.");
}

async function getApiKey(context: vscode.ExtensionContext): Promise<string | null> {
  const stored = await context.secrets.get(SECRET_KEY);
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

  await context.secrets.store(SECRET_KEY, apiKey);
  return apiKey;
}

async function clearCacheFlow(context: vscode.ExtensionContext, output: vscode.OutputChannel): Promise<void> {
  const items: vscode.QuickPickItem[] = [
    { label: "Runtime cache", description: "Deletes cached runtime list; forces re-fetch on next connect", picked: false },
    { label: "CML URL", description: "Clears the stored Cloudera AI base URL; will prompt again on next login", picked: false },
    { label: "API key", description: "Removes the stored API key from secret storage", picked: false },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    title: "Clear Cache",
    placeHolder: "Select items to clear",
    canPickMany: true,
    ignoreFocusOut: true,
  });

  if (!selected || selected.length === 0) {
    return;
  }

  const labels = selected.map((s) => s.label);
  const cleared: string[] = [];

  if (labels.includes("Runtime cache")) {
    clearFile(getStoragePath(context, CACHE_FILE));
    cleared.push("runtime cache");
  }

  if (labels.includes("CML URL")) {
    const config = vscode.workspace.getConfiguration("caiConnector");
    await config.update("cmlUrl", "", vscode.ConfigurationTarget.Global);
    cleared.push("CML URL");
  }

  if (labels.includes("API key")) {
    await context.secrets.delete(SECRET_KEY);
    cleared.push("API key");
  }

  const summary = cleared.join(", ");
  output.appendLine(`Cleared: ${summary}.`);
  vscode.window.showInformationMessage(`Cleared: ${summary}.`);
}

async function promptCmlUrl(): Promise<string | null> {
  const url = await vscode.window.showInputBox({
    title: "Cloudera AI Base URL",
    prompt: "Enter the base URL of your Cloudera AI (CML) instance",
    placeHolder: "https://your-cml-instance.example.com/",
    ignoreFocusOut: true,
    validateInput: (value) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return "URL cannot be empty.";
      }
      if (!trimmed.startsWith("https://")) {
        return "URL must start with https://";
      }
      return null;
    },
  });

  if (!url) {
    return null;
  }

  return url.trim();
}

async function ensureLoggedIn(
  context: vscode.ExtensionContext,
  cdswctlPath: string,
  output: vscode.OutputChannel,
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  let cmlUrl = config.get<string>("cmlUrl", "");
  if (!cmlUrl) {
    const prompted = await promptCmlUrl();
    if (!prompted) {
      return false;
    }
    await config.update("cmlUrl", prompted, vscode.ConfigurationTarget.Global);
    output.appendLine(`CML URL stored: ${prompted}`);
    cmlUrl = prompted;
  }
  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();

  const apiKey = await getApiKey(context);
  if (!apiKey) {
    return false;
  }

  const loginResult = await runCdswctl(
    cdswctlPath,
    ["login", "-n", username, "-u", cmlUrl, "-y", `%${SECRET_KEY}%`],
    output,
    CDSWCTL_TIMEOUT_MS,
    { [SECRET_KEY]: apiKey },
  );

  if (loginResult.exitCode !== 0) {
    vscode.window.showErrorMessage("Login failed. See output for details.");
    const sanitized = (loginResult.stderr || loginResult.stdout).split(apiKey).join("***");
    output.appendLine(sanitized);
    return false;
  }

  return true;
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
      qp.items = multiTermFilter(allItems, value);
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
  const result = await runCdswctl(cdswctlPath, ["runtime-addons", "list"], output, CDSWCTL_TIMEOUT_MS);
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
      qp.items = multiTermFilter(allItems, value);
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

async function promptResources(
  defaultCpus: number,
  defaultMemoryGb: number,
  defaultGpus: number,
): Promise<ResourceInput | null> {
  const raw = await vscode.window.showInputBox({
    title: "Resources (CPUs, Memory GB, GPUs)",
    prompt: "Enter as: CPUs, Memory (GB), GPUs — e.g. 2,4,0",
    value: `${defaultCpus},${defaultMemoryGb},${defaultGpus}`,
    ignoreFocusOut: true,
    validateInput: (value) => {
      const parts = value.split(",").map((s) => s.trim());
      if (parts.length !== 3) {
        return "Enter exactly 3 values: CPUs, Memory (GB), GPUs";
      }
      for (const part of parts) {
        if (!/^\d+$/.test(part)) {
          return "All values must be non-negative integers";
        }
      }
      const [cpus, mem, gpus] = parts.map(Number);
      if (cpus < 1) {
        return "CPUs must be at least 1";
      }
      if (mem < 1) {
        return "Memory must be at least 1 GB";
      }
      if (gpus < 0) {
        return "GPUs cannot be negative";
      }
      return undefined;
    },
  });

  if (!raw) {
    return null;
  }

  const [cpus, memoryGb, gpus] = raw.split(",").map((s) => Number(s.trim()));
  return { cpus, memoryGb, gpus };
}


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
    await sleep(ENDPOINT_POLL_INTERVAL_MS);
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

async function killOrphanedHelperProcesses(output: vscode.OutputChannel): Promise<void> {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      cp.exec(
        "powershell.exe -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*endpointHost.js*' -and $_.Name -eq 'node.exe' } | Select-Object -ExpandProperty ProcessId\"",
        { encoding: "utf8", windowsHide: true },
        (err, stdout) => (err ? reject(err) : resolve(stdout)),
      );
    });
    const pids = result
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line))
      .map(Number)
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
    // PowerShell may fail on some systems; best-effort cleanup
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

function getStoragePath(context: vscode.ExtensionContext, fileName: string): string {
  return path.join(context.globalStorageUri.fsPath, fileName);
}

async function cleanupExistingEndpoint(statePath: string, output: vscode.OutputChannel): Promise<void> {
  if (fs.existsSync(statePath)) {
    const existing = readState(statePath);
    if (existing?.helperPid && isProcessAlive(existing.helperPid)) {
      output.appendLine("Cleaning up existing endpoint before reconnecting...");
      stopEndpointHost(statePath, output);
    } else {
      clearFile(statePath);
    }
  }
  await killOrphanedHelperProcesses(output);
}

async function resolveAndLogin(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<string | null> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");

  let cdswctlPath: string;
  try {
    cdswctlPath = await ensureCdswctl(output, cdswctlPathSetting);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to locate cdswctl: ${String(err)}`);
    return null;
  }

  const loggedIn = await ensureLoggedIn(context, cdswctlPath, output);
  if (!loggedIn) {
    return null;
  }

  return cdswctlPath;
}

function checkActiveEndpoint(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
  const statePath = getStoragePath(context, STATE_FILE);
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

async function handleStopSessions(params: ConnectParams, output: vscode.OutputChannel): Promise<boolean> {
  if (params.autoStopSessions === true) {
    output.appendLine(`Stopping existing SSH sessions in project ${params.project}...`);
    await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, CDSWCTL_TIMEOUT_MS);
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
      await runCdswctl(params.cdswctlPath, ["sessions", "stop", "/p", params.project, "/a"], output, CDSWCTL_TIMEOUT_MS);
    } else {
      output.appendLine("Skipping session cleanup.");
    }
  }
  return true;
}

function buildEndpointArgs(params: ConnectParams): string[] {
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
    "-g",
    String(params.gpus),
  ];
  if (params.addonId !== null) {
    args.push(`--addons=${String(params.addonId)}`);
  }
  return args;
}

function multiTermFilter(items: vscode.QuickPickItem[], value: string): vscode.QuickPickItem[] {
  const terms = value
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  if (terms.length <= 1) {
    return items;
  }

  return items.filter((item) => {
    const haystack = `${item.label} ${item.description ?? ""} ${item.detail ?? ""}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}
