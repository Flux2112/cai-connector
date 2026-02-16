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
import { ConnectParams, EndpointState, ResourceInput } from "./types";

export function getStoragePath(context: vscode.ExtensionContext, fileName: string): string {
  return path.join(context.globalStorageUri.fsPath, fileName);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0); // signal 0 = check if alive, don't actually kill
    return true;
  } catch {
    return false;
  }
}

export function clearFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore
  }
}

export function readState(statePath: string, output?: vscode.OutputChannel): EndpointState | null {
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

export function buildEndpointArgs(params: ConnectParams): string[] {
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

export function multiTermFilter(items: vscode.QuickPickItem[], value: string): vscode.QuickPickItem[] {
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

export async function promptResources(
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
