import * as vscode from "vscode";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import * as cp from "child_process";
import { ensureCdswctl, runCdswctl } from "./cdswctl";
import { RuntimeManager } from "./runtimeManager";
import { updateSshConfig } from "./sshConfig";
import { RuntimeData } from "./types";

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
  const cmlUrl = config.get<string>("cmlUrl", "");
  const cdswctlPathSetting = config.get<string>("cdswctlPath", "");
  const defaultCpus = config.get<number>("defaultCpus", 2);
  const defaultMemoryGb = config.get<number>("defaultMemoryGb", 4);
  const cacheHours = config.get<number>("cacheHours", 24);

  const cachePath = path.join(context.globalStorageUri.fsPath, "runtimes_cache.json");
  const statePath = path.join(context.globalStorageUri.fsPath, "endpoint_state.json");
  const logPath = path.join(context.globalStorageUri.fsPath, "endpoint_host.log");

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
    prompt: "Enter your CML project name",
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

  const cpus = await promptNumber("CPUs", defaultCpus);
  if (!cpus) {
    return;
  }

  const memory = await promptNumber("Memory (GB)", defaultMemoryGb);
  if (!memory) {
    return;
  }

  const username = (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
  const project = `${username}/${projectName}`;
  activeProject = project;

  output.appendLine(`Connecting to project ${project}...`);

  const loginResult = await runCdswctl(
    cdswctlPath,
    ["login", "-n", username, "-u", cmlUrl, "-y", "%CML_API_KEY%"],
    output,
    30000,
    { CML_API_KEY: apiKey },
  );

  if (loginResult.exitCode !== 0) {
    vscode.window.showErrorMessage("Login failed. See output for details.");
    const sanitized = (loginResult.stderr || loginResult.stdout).split(apiKey).join("***");
    output.appendLine(sanitized);
    return;
  }

  // Stop all existing SSH sessions in this project before creating a new one
  output.appendLine(`Stopping existing SSH sessions in project ${project}...`);
  await runCdswctl(cdswctlPath, ["sessions", "stop", "/p", project, "/a"], output, 30000);

  output.appendLine("Creating SSH endpoint...");
  const args = [
    "ssh-endpoint",
    "-p",
    project,
    "-r",
    String(runtime.id),
    "-c",
    String(cpus),
    "-m",
    String(memory),
  ];

  clearFile(statePath);
  clearFile(logPath);

  const helperPid = startEndpointHost(context, output, {
    cdswctlPath,
    args,
    statePath,
    logPath,
  });

  if (!helperPid) {
    vscode.window.showErrorMessage("Failed to start endpoint host.");
    return;
  }

  let state: EndpointState | null = null;
  try {
    state = await waitForEndpointReady(statePath, output, 60000);
  } catch (err) {
    vscode.window.showErrorMessage(`Failed to establish SSH endpoint: ${String(err)}`);
    await disconnectFlow(context, output);
    return;
  }

  if (!state || !state.port || !state.userAndHost) {
    vscode.window.showErrorMessage("Failed to parse SSH endpoint output.");
    await disconnectFlow(context, output);
    return;
  }

  output.appendLine(`SSH: ${state.userAndHost}:${state.port}`);

  if (!updateSshConfig(state.port)) {
    vscode.window.showErrorMessage("Failed to update SSH config.");
    await disconnectFlow(context, output);
    return;
  }

  output.appendLine("SSH config updated. Opening Remote-SSH window...");

  const remoteUri = vscode.Uri.parse("vscode-remote://ssh-remote+cml/home/cdsw");
  await vscode.commands.executeCommand("vscode.openFolder", remoteUri, { forceNewWindow: true });

  vscode.window.showInformationMessage("Remote-SSH window launched for host 'cml'.");
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
