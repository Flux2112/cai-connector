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
import { loadHistory } from "./sessionHistory";
import { reconcileLocal } from "./sessionReconciler";
import {
  cmlStatusOf, endpointStatusOf, isOrphanedOnCml, statusProblem, statusSummary,
} from "./sessionStatus";
import { HISTORY_FILE, SessionRecord, STATUS_POLL_INTERVAL_MS } from "./types";

function iconFor(record: SessionRecord): vscode.ThemeIcon {
  if (record.status === "starting") {
    return new vscode.ThemeIcon("loading~spin");
  }
  if (record.status === "error") {
    return new vscode.ThemeIcon("warning", new vscode.ThemeColor("charts.yellow"));
  }
  if (record.status === "active") {
    return new vscode.ThemeIcon("vm-running", new vscode.ThemeColor("charts.green"));
  }
  return new vscode.ThemeIcon("vm");
}

/**
 * `orphanSession` is its own context value so the sidebar can offer cleanup on a
 * session whose two statuses disagree, which is neither active nor inactive.
 */
function contextValueFor(record: SessionRecord): string {
  if (record.status === "error") { return "orphanSession"; }
  if (record.status === "inactive") { return "inactiveSession"; }
  return "activeSession";
}

export class SessionItem extends vscode.TreeItem {
  constructor(public readonly record: SessionRecord) {
    super(record.projectName, vscode.TreeItemCollapsibleState.Collapsed);
    this.contextValue = contextValueFor(record);
    this.description = statusSummary(record);
    this.iconPath = iconFor(record);
    this.tooltip = [
      `Project: ${record.projectName}`,
      `Local endpoint: ${endpointStatusOf(record)}`,
      `CML session: ${cmlStatusOf(record)}`,
      statusProblem(record) ?? "",
      `Runtime: ${record.runtimeId}${record.addonId != null ? ` / Addon: ${record.addonId}` : ""}`,
      `Resources: ${record.cpus} CPU · ${record.memoryGb} GB RAM · ${record.gpus} GPU`,
      record.hostAlias ? `SSH host: ${record.hostAlias}` : "",
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
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly storagePath: string,
    private readonly output: vscode.OutputChannel,
  ) {}

  private readonly log = (msg: string): void => this.output.appendLine(msg);

  /**
   * The history file is the single source of truth, so the view reacts to it
   * directly. Other windows creating or tearing down sessions show up here
   * without any cross-window messaging.
   */
  start(): void {
    const pattern = new vscode.RelativePattern(vscode.Uri.file(this.storagePath), HISTORY_FILE);
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);
    this.watcher.onDidChange(() => this.refresh());
    this.watcher.onDidCreate(() => this.refresh());
    this.watcher.onDidDelete(() => this.refresh());
    this.reconcileAndRefresh();
  }

  dispose(): void {
    this.watcher?.dispose();
    this.stopPolling();
  }

  /**
   * Re-checks endpoint pids on a timer while the view is visible, so a session
   * whose tunnel dies stops being shown as running. Cheap by design: pid
   * liveness only, no CLI calls.
   */
  startPolling(): void {
    if (this.timer) { return; }
    this.timer = setInterval(() => {
      if (reconcileLocal(this.storagePath, this.log).changed) {
        this.refresh();
      }
    }, STATUS_POLL_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Refreshes statuses from the OS, then redraws. Never called from the watcher. */
  reconcileAndRefresh(): void {
    reconcileLocal(this.storagePath, this.log);
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
      const rows = [
        new SessionDetailItem("Local endpoint", endpointStatusOf(r)),
        new SessionDetailItem("CML session", cmlStatusOf(r)),
        new SessionDetailItem("Runtime ID", String(r.runtimeId)),
        new SessionDetailItem("Addon ID", r.addonId != null ? String(r.addonId) : "none"),
        new SessionDetailItem("CPUs", String(r.cpus)),
        new SessionDetailItem("Memory", `${r.memoryGb} GB`),
        new SessionDetailItem("GPUs", String(r.gpus)),
        new SessionDetailItem("SSH host", r.hostAlias ?? "—"),
        new SessionDetailItem("Port", r.port ?? "—"),
        new SessionDetailItem("Session ID", r.sessionId ?? "—"),
        new SessionDetailItem("Started", new Date(r.startedAt).toLocaleString()),
      ];
      if (isOrphanedOnCml(r)) {
        rows.unshift(new SessionDetailItem("Warning", "orphaned on CML — needs cleanup"));
      }
      return rows;
    }
    return [];
  }
}
