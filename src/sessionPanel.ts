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
import { EndpointHostConfig, EndpointState, HOST_CONFIG_FILE, SessionRecord, STATE_FILE } from "./types";
import { addOrUpdateSession, loadHistory, markAllInactive } from "./sessionHistory";

function parseArgsToResourceParams(
  args: string[],
): { runtimeId: number; addonId: number | null; cpus: number; memoryGb: number; gpus: number } {
  let runtimeId = 0, cpus = 0, memoryGb = 0, gpus = 0;
  let addonId: number | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "-r") { runtimeId = Number(args[i + 1]); }
    if (args[i] === "-c") { cpus = Number(args[i + 1]); }
    if (args[i] === "-m") { memoryGb = Number(args[i + 1]); }
    if (args[i] === "-g") { gpus = Number(args[i + 1]); }
    if (args[i].startsWith("--addons=")) { addonId = Number(args[i].slice(9)); }
  }
  return { runtimeId, addonId, cpus, memoryGb, gpus };
}

export class SessionItem extends vscode.TreeItem {
  constructor(public readonly record: SessionRecord) {
    super(record.projectName, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = record.status === "active" ? "activeSession" : "inactiveSession";
    this.description = record.status === "active"
      ? `active · port ${record.port ?? "?"}`
      : record.status;
    this.iconPath = record.status === "active"
      ? new vscode.ThemeIcon("vm-running", new vscode.ThemeColor("charts.green"))
      : new vscode.ThemeIcon("vm");
    this.tooltip = [
      `Project: ${record.projectName}`,
      `Status: ${record.status}`,
      `Runtime: ${record.runtimeId}${record.addonId != null ? ` / Addon: ${record.addonId}` : ""}`,
      `Resources: ${record.cpus} CPU · ${record.memoryGb} GB RAM · ${record.gpus} GPU`,
      record.port ? `Port: ${record.port}` : "",
      record.sessionId ? `Session ID: ${record.sessionId}` : "",
      `Started: ${new Date(record.startedAt).toLocaleString()}`,
    ].filter(Boolean).join("\n");
  }
}

export class SessionDetailItem extends vscode.TreeItem {
  constructor(label: string, value: string) {
    super(`${label}: ${value}`, vscode.TreeItemCollapsibleState.None);
    this.contextValue = "sessionDetail";
  }
}

type TreeNode = SessionItem | SessionDetailItem;

export class SessionPanel implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private watcher: vscode.FileSystemWatcher | undefined;

  constructor(private readonly storagePath: string) {}

  start(): void {
    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(this.storagePath),
      STATE_FILE,
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
    this.watcher.onDidChange(() => this.onStateChange());
    this.watcher.onDidCreate(() => this.onStateChange());
    this.watcher.onDidDelete(() => { markAllInactive(this.storagePath); this.refresh(); });

    // Sync with existing state on activation
    const statePath = path.join(this.storagePath, STATE_FILE);
    if (fs.existsSync(statePath)) {
      this.onStateChange();
    } else {
      markAllInactive(this.storagePath);
    }
  }

  dispose(): void {
    this.watcher?.dispose();
  }

  private onStateChange(): void {
    try {
      const statePath = path.join(this.storagePath, STATE_FILE);
      if (!fs.existsSync(statePath)) { return; }
      const state = JSON.parse(fs.readFileSync(statePath, "utf8").trim()) as EndpointState;
      if (state.status !== "ready") { return; }

      const configPath = path.join(this.storagePath, HOST_CONFIG_FILE);
      if (!fs.existsSync(configPath)) { return; }
      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as EndpointHostConfig;
      const p = parseArgsToResourceParams(config.args);

      addOrUpdateSession(this.storagePath, {
        id: state.timestamp,
        projectName: config.project,
        runtimeId: p.runtimeId,
        addonId: p.addonId,
        cpus: p.cpus,
        memoryGb: p.memoryGb,
        gpus: p.gpus,
        status: "active",
        port: state.port,
        sessionId: state.sessionId,
        helperPid: state.helperPid,
        endpointPid: state.endpointPid,
        startedAt: state.timestamp,
      });
    } catch { /* ignore transient read/parse errors */ }
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return loadHistory(this.storagePath).map(r => new SessionItem(r));
    }
    if (element instanceof SessionItem) {
      const r = element.record;
      return [
        new SessionDetailItem("Project", r.projectName),
        new SessionDetailItem("Status", r.status),
        new SessionDetailItem("Runtime ID", String(r.runtimeId)),
        new SessionDetailItem("Addon ID", r.addonId != null ? String(r.addonId) : "none"),
        new SessionDetailItem("CPUs", String(r.cpus)),
        new SessionDetailItem("Memory", `${r.memoryGb} GB`),
        new SessionDetailItem("GPUs", String(r.gpus)),
        new SessionDetailItem("Port", r.port ?? "—"),
        new SessionDetailItem("Session ID", r.sessionId ?? "—"),
        new SessionDetailItem("Started", new Date(r.startedAt).toLocaleString()),
      ];
    }
    return [];
  }
}
