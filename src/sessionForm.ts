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
import { renderSessionFormHtml } from "./sessionFormHtml";
import { validateSessionForm } from "./sessionFormModel";
import {
  EndpointProgressStep, HostToWebviewMessage, RuntimeData,
  SessionFormInit, SessionFormSummary, SessionFormValues, WebviewToHostMessage,
} from "./types";

export type SessionFormHandlers = {
  /** Called once per valid submission. The panel stays open so it can show progress. */
  onSubmit: (values: SessionFormValues, panel: SessionFormPanel) => Promise<void>;
  onRefreshRuntimes: () => Promise<{ runtimes: RuntimeData[]; fromCache: boolean } | null>;
};

const VIEW_TYPE = "caiConnector.sessionForm";

/**
 * The session form. One panel at a time — a second request reveals the existing
 * one rather than opening a duplicate.
 */
export class SessionFormPanel {
  private static current: SessionFormPanel | undefined;

  private readonly disposables: vscode.Disposable[] = [];
  private submitted = false;
  private startedAt = 0;
  private summary: SessionFormSummary = { project: "", detail: "" };

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly output: vscode.OutputChannel,
    private readonly init: SessionFormInit,
    private readonly handlers: SessionFormHandlers,
  ) {
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewToHostMessage) => {
        this.handleMessage(message).catch((err: unknown) => {
          this.output.appendLine(`Session form action failed: ${String(err)}`);
          vscode.window.showErrorMessage(`Session form action failed: ${String(err)}`);
          this.reportFailure(String(err));
        });
      },
      undefined,
      this.disposables,
    );
    this.panel.onDidDispose(() => this.dispose(), undefined, this.disposables);
  }

  static show(
    context: vscode.ExtensionContext,
    output: vscode.OutputChannel,
    init: SessionFormInit,
    handlers: SessionFormHandlers,
  ): SessionFormPanel {
    SessionFormPanel.current?.dispose();

    const mediaRoot = vscode.Uri.joinPath(context.extensionUri, "media");
    const panel = vscode.window.createWebviewPanel(
      VIEW_TYPE,
      init.mode === "edit" ? "Edit saved session" : "New CAI session",
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        // Keeps whatever the user has typed when they switch tabs mid-form.
        retainContextWhenHidden: true,
        localResourceRoots: [mediaRoot],
      },
    );
    panel.webview.html = renderSessionFormHtml(panel.webview, mediaRoot);

    const instance = new SessionFormPanel(panel, output, init, handlers);
    SessionFormPanel.current = instance;
    return instance;
  }

  /** Reports a named endpoint phase to the form's progress view. */
  reportProgress(step: EndpointProgressStep, detail?: string): void {
    if (this.startedAt === 0) {
      this.startedAt = Date.now();
    }
    this.post({
      type: "progress",
      step,
      detail,
      elapsedMs: Date.now() - this.startedAt,
      summary: this.summary,
    });
  }

  reportFailure(message: string): void {
    this.post({ type: "failed", message });
  }

  dispose(): void {
    if (SessionFormPanel.current === this) {
      SessionFormPanel.current = undefined;
    }
    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
    this.panel.dispose();
  }

  private post(message: HostToWebviewMessage): void {
    // A disposed webview rejects posts; a UI failure must never break a flow.
    void this.panel.webview.postMessage(message).then(undefined, () => { /* panel gone */ });
  }

  private async handleMessage(message: WebviewToHostMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        this.post({ type: "init", init: this.init });
        return;
      case "cancel":
        this.dispose();
        return;
      case "showOutput":
        this.output.show(true);
        return;
      case "refreshRuntimes":
        await this.refreshRuntimes();
        return;
      case "submit":
        await this.handleSubmit(message.payload);
        return;
      default:
        return;
    }
  }

  private async refreshRuntimes(): Promise<void> {
    const result = await this.handlers.onRefreshRuntimes();
    if (!result) {
      this.post({ type: "banner", message: "Couldn't reach cdswctl. The runtime list is unchanged." });
      return;
    }
    this.init.runtimes = result.runtimes;
    this.init.runtimesFromCache = result.fromCache;
    this.post({ type: "runtimes", runtimes: result.runtimes, fromCache: result.fromCache });
  }

  private async handleSubmit(payload: unknown): Promise<void> {
    if (this.submitted) {
      return;
    }
    const result = validateSessionForm(payload, {
      username: this.init.username,
      runtimeIds: this.init.runtimes.map((r) => r.id),
      addonIds: this.init.addons.map((a) => a.id),
      cpuProfiles: this.init.cpuProfiles,
    });

    if (!result.ok) {
      this.output.appendLine(`Session form rejected: ${result.errors.join(" ")}`);
      this.post({ type: "invalid", errors: result.errors });
      return;
    }

    this.submitted = true;
    this.startedAt = Date.now();
    const runtime = this.init.runtimes.find((r) => r.id === result.values.runtimeId);
    const addon = this.init.addons.find((a) => a.id === result.values.addonId);
    const bits = [
      runtime ? `${runtime.editor} · ${runtime.kernel} · ${runtime.edition}` : `Runtime ${result.values.runtimeId}`,
      `${result.values.cpus} CPU`,
      `${result.values.memoryGb} GB`,
    ];
    if (result.values.gpus > 0) {
      bits.push(`${result.values.gpus} GPU`);
    }
    if (addon) {
      bits.push(addon.displayName);
    }
    this.summary = { project: result.values.project, detail: bits.join(" · ") };

    await this.handlers.onSubmit(result.values, this);
  }
}
