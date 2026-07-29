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

import { FieldIssue } from "./types";

/**
 * Parses a resource value typed by a user, returning NaN when it is not a
 * plain non-negative decimal.
 *
 * A German keyboard layout produces "0,5" for one half, so the comma is
 * normalised to a period rather than rejected. Exponent notation, signs and
 * trailing separators are deliberately not accepted — they are far more likely
 * to be typos than intent.
 */
export function parseNumeric(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : NaN;
  }
  if (typeof raw !== "string") {
    return NaN;
  }
  const text = raw.trim().replace(",", ".");
  if (!/^\d*\.?\d+$/.test(text)) {
    return NaN;
  }
  return Number(text);
}

/**
 * Validates a CPU count. CML deploys CPU profiles that may be fractional
 * (0.5 is common), so any value greater than zero is accepted.
 *
 * A value that matches no deployed profile is a warning, never an error: the
 * extension cannot enumerate the platform's profiles, so refusing the input
 * would block legitimate values that this list simply does not know about.
 */
export function validateCpus(raw: unknown, profiles: number[] = []): FieldIssue | null {
  const value = parseNumeric(raw);
  if (Number.isNaN(value)) {
    return { severity: "error", message: "Enter a number, such as 0.5 or 2." };
  }
  if (value <= 0) {
    return { severity: "error", message: "Use more than 0 CPUs." };
  }
  if (profiles.length > 0 && !profiles.includes(value)) {
    return {
      severity: "warning",
      message: "No CPU profile of this size is deployed — CML may reject the session.",
    };
  }
  return null;
}

export function validateMemoryGb(raw: unknown): FieldIssue | null {
  const value = parseNumeric(raw);
  if (Number.isNaN(value) || value <= 0) {
    return { severity: "error", message: "Enter memory in GB, such as 8." };
  }
  return null;
}

export function validateGpus(raw: unknown): FieldIssue | null {
  const value = parseNumeric(raw);
  if (Number.isNaN(value) || !Number.isInteger(value)) {
    return {
      severity: "error",
      message: "Use a whole number of GPUs — 0 if you don't need one.",
    };
  }
  return null;
}

/** True when no field carries an error. Warnings do not block submission. */
export function isBlocking(issues: (FieldIssue | null)[]): boolean {
  return issues.some((issue) => issue?.severity === "error");
}
