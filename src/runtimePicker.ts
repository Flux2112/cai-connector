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
import { runCdswctl } from "./cdswctl";
import { CDSWCTL_TIMEOUT_MS, RuntimeAddonData, RuntimeData } from "./types";
import { multiTermFilter } from "./utils";

export async function pickRuntime(runtimes: RuntimeData[]): Promise<RuntimeData | null> {
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

export async function fetchRuntimeAddons(
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
export async function pickRuntimeAddon(addons: RuntimeAddonData[]): Promise<RuntimeAddonData | null | undefined> {
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
