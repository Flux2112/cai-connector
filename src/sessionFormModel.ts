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

import { parseNumeric, validateCpus, validateGpus, validateMemoryGb } from "./resourceInput";
import { ResourceInput, RuntimeAddonData, RuntimeData, SessionFormMode, SessionFormValues } from "./types";

export type SessionFormContext = {
  username: string;
  runtimeIds: number[];
  addonIds: number[];
  cpuProfiles: number[];
};

export type SessionFormResult =
  | { ok: true; values: SessionFormValues }
  | { ok: false; errors: string[] };

// Rejects control characters only. Spaces are legal in CML project names, and
// endpoint args go to spawn as separate argv entries, so no shell quoting applies.
function hasControlChars(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves what the user typed into the `owner/project` form cdswctl expects.
 * A name without a slash belongs to the signed-in user.
 */
export function normalizeProjectName(input: string, username: string): string {
  const name = input.trim();
  if (name.includes("/")) {
    return name;
  }
  return `${username.trim().toLowerCase()}/${name}`;
}

/** Human-readable runtime label, shared by the form and the sidebar. */
export function runtimeLabel(runtime: RuntimeData): string {
  return `${runtime.editor} · ${runtime.kernel} · ${runtime.edition}`;
}

export function addonLabel(addon: RuntimeAddonData): string {
  return addon.displayName;
}

/** Uses global defaults for a new form; saved resources belong only to an edit form. */
export function resourcePrefill(
  mode: SessionFormMode,
  savedResources: ResourceInput | undefined,
  defaults: ResourceInput,
): ResourceInput {
  return mode === "edit" && savedResources ? savedResources : defaults;
}

/** Returns the Projects page for a valid configured CML base URL. */
export function projectOverviewUrl(cmlUrl: string): string | null {
  try {
    const url = new URL(cmlUrl.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    url.search = "";
    url.hash = "";
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/projects`;
    return url.toString();
  } catch {
    return null;
  }
}

function projectError(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") {
    return "Enter the USER/PROJECT path from the CML project URL.";
  }
  const name = raw.trim();
  const parts = name.split("/");
  if (parts.length > 2 || parts.some((part) => part.trim() === "")) {
    return "Use either 'project' or 'owner/project'.";
  }
  if (hasControlChars(name)) {
    return "The project name contains characters that cannot be used.";
  }
  return null;
}

/**
 * Validates a submission from the webview.
 *
 * The webview validates the same rules for instant feedback, but its payload is
 * untrusted input as far as the extension host is concerned: this function is
 * the only path that produces SessionFormValues.
 */
export function validateSessionForm(payload: unknown, ctx: SessionFormContext): SessionFormResult {
  const errors: string[] = [];
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, errors: ["The form submitted no data."] };
  }
  const raw = payload as Record<string, unknown>;

  const projectIssue = projectError(raw["project"]);
  if (projectIssue) {
    errors.push(projectIssue);
  }

  const runtimeId = parseNumeric(raw["runtimeId"]);
  if (Number.isNaN(runtimeId) || !ctx.runtimeIds.includes(runtimeId)) {
    errors.push("Select a runtime.");
  }

  let addonId: number | null = null;
  const rawAddon = raw["addonId"];
  const addonOmitted =
    rawAddon === null || rawAddon === undefined || rawAddon === "" || rawAddon === 0 || rawAddon === "0";
  if (!addonOmitted) {
    const parsed = parseNumeric(rawAddon);
    if (Number.isNaN(parsed) || !ctx.addonIds.includes(parsed)) {
      errors.push("Select a runtime addon, or None.");
    } else {
      addonId = parsed;
    }
  }

  for (const issue of [
    validateCpus(raw["cpus"], ctx.cpuProfiles),
    validateMemoryGb(raw["memoryGb"]),
    validateGpus(raw["gpus"]),
  ]) {
    if (issue?.severity === "error") {
      errors.push(issue.message);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: {
      project: normalizeProjectName(String(raw["project"]), ctx.username),
      runtimeId,
      addonId,
      cpus: parseNumeric(raw["cpus"]),
      memoryGb: parseNumeric(raw["memoryGb"]),
      gpus: parseNumeric(raw["gpus"]),
      saveAsDefaults: raw["saveAsDefaults"] === true,
    },
  };
}
