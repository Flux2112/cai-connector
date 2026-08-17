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

import * as os from "os";
import * as vscode from "vscode";
import { RuntimeManager } from "./runtimeManager";
import { fetchRuntimeAddons, filterLatestRuntimes } from "./runtimePicker";
import { loadHistory, recentSessionRecords } from "./sessionHistory";
import { projectOverviewUrl, resourcePrefill, runtimeLabel } from "./sessionFormModel";
import { getStoragePath } from "./utils";
import {
  CACHE_FILE, DEFAULT_CPU_PROFILES, DEFAULT_MEMORY_PROFILES,
  ENDPOINT_READY_TIMEOUT_MS, RuntimeAddonData, RuntimeData,
  SessionFormInit, SessionFormMode, SessionFormRecent, SessionRecord,
} from "./types";

export function currentUsername(): string {
  return (process.env["USERNAME"] || os.userInfo().username).toLowerCase();
}

/** Reads a profile-list setting, dropping anything that is not a usable size. */
function profiles(key: string, fallback: number[]): number[] {
  const raw = vscode.workspace.getConfiguration("caiConnector").get<unknown>(key);
  if (!Array.isArray(raw)) {
    return fallback;
  }
  const cleaned = raw
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0);
  const unique = [...new Set(cleaned)].sort((a, b) => a - b);
  return unique.length > 0 ? unique : fallback;
}

export function toRecents(
  records: SessionRecord[],
  runtimes: RuntimeData[],
  addons: RuntimeAddonData[],
): SessionFormRecent[] {
  return records.map((record) => {
    const runtime = runtimes.find((r) => r.id === record.runtimeId);
    const addon = addons.find((a) => a.id === record.addonId);
    return {
      id: record.id,
      projectName: record.projectName,
      runtimeId: record.runtimeId,
      addonId: record.addonId,
      cpus: record.cpus,
      memoryGb: record.memoryGb,
      gpus: record.gpus,
      status: record.status,
      port: record.port,
      startedAt: record.startedAt,
      runtimeLabel: runtime ? runtimeLabel(runtime) : `Runtime ${record.runtimeId}`,
      addonLabel: addon ? addon.displayName : null,
    };
  });
}

/**
 * Fetches everything the form renders. Returns null when runtimes cannot be
 * obtained at all — there is nothing to choose from in that case.
 *
 * No secret ever enters this object: the API key is handled by resolveAndLogin
 * before the panel opens and never crosses into the webview.
 */
export async function buildSessionFormInit(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  cdswctlPath: string,
  mode: SessionFormMode,
  editTarget?: SessionRecord,
): Promise<SessionFormInit | null> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const cacheHours = config.get<number>("cacheHours", 24);
  const latestRuntimesOnly = config.get<boolean>("latestRuntimesOnly", true);

  const manager = new RuntimeManager(getStoragePath(context, CACHE_FILE), cacheHours);
  await manager.fetchRuntimes(cdswctlPath, false, output);
  const all = manager.getAll();
  if (all.length === 0) {
    vscode.window.showErrorMessage("Failed to fetch runtimes. Check output for details.");
    return null;
  }
  const runtimes = latestRuntimesOnly ? filterLatestRuntimes(all) : all;
  const addons = (await fetchRuntimeAddons(cdswctlPath, output)) ?? [];

  const history = loadHistory(context.globalStorageUri.fsPath);
  const defaultResources = {
    cpus: config.get<number>("defaultCpus", 0.5),
    memoryGb: config.get<number>("defaultMemoryGb", 16),
    gpus: config.get<number>("defaultGpus", 0),
  };
  const resources = resourcePrefill(mode, editTarget, defaultResources);
  const prefill = {
    project: editTarget?.projectName ?? "",
    runtimeId: editTarget?.runtimeId ?? null,
    addonId: editTarget?.addonId ?? null,
    ...resources,
  };

  return {
    mode,
    username: currentUsername(),
    runtimes,
    addons,
    recents: mode === "edit" ? [] : toRecents(recentSessionRecords(history), runtimes, addons),
    cpuProfiles: profiles("cpuProfiles", DEFAULT_CPU_PROFILES),
    memoryProfiles: profiles("memoryProfiles", DEFAULT_MEMORY_PROFILES),
    latestRuntimesOnly,
    runtimesFromCache: manager.wasFromCache(),
    readyTimeoutMs: ENDPOINT_READY_TIMEOUT_MS,
    projectsUrl: projectOverviewUrl(config.get<string>("cmlUrl", "")),
    prefill,
    editTarget: editTarget
      ? { id: editTarget.id, projectName: editTarget.projectName, status: editTarget.status }
      : null,
  };
}

/** Re-fetch used by the form's "Refresh from CML" action. */
export async function refreshRuntimes(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  cdswctlPath: string,
): Promise<{ runtimes: RuntimeData[]; fromCache: boolean } | null> {
  const config = vscode.workspace.getConfiguration("caiConnector");
  const manager = new RuntimeManager(
    getStoragePath(context, CACHE_FILE),
    config.get<number>("cacheHours", 24),
  );
  await manager.fetchRuntimes(cdswctlPath, true, output);
  const all = manager.getAll();
  if (all.length === 0) {
    return null;
  }
  const latestOnly = config.get<boolean>("latestRuntimesOnly", true);
  return {
    runtimes: latestOnly ? filterLatestRuntimes(all) : all,
    fromCache: manager.wasFromCache(),
  };
}
