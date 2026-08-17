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

/** One rendered column: a header and how to read it off a row. */
export type Column<T> = {
  header: string;
  get: (row: T) => unknown;
};

function cell(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Render rows as a fixed-width table.
 *
 * Hand-rolled rather than pulled from a package: the CLI's dependency budget is
 * `@oclif/core` and nothing else, and this is the whole of what a table needs to
 * do here. Column widths come from the content, so nothing is truncated —
 * a truncated id is worse than a wrapped line, since an agent may pass it back.
 */
export function table<T>(rows: T[], columns: Column<T>[]): string {
  if (rows.length === 0) {
    return "(none)";
  }
  const body = rows.map((row) => columns.map((c) => cell(c.get(row))));
  const widths = columns.map((c, i) =>
    Math.max(c.header.length, ...body.map((r) => r[i].length)),
  );

  const line = (cells: string[]) =>
    cells
      .map((value, i) => (i === cells.length - 1 ? value : value.padEnd(widths[i])))
      .join("  ")
      .trimEnd();

  return [
    line(columns.map((c) => c.header.toUpperCase())),
    line(widths.map((w) => "-".repeat(w))),
    ...body.map(line),
  ].join("\n");
}

/** Bytes as a short human string. `file_size` arrives from the API as a string. */
export function humanSize(size: unknown): string {
  const bytes = typeof size === "string" ? Number(size) : typeof size === "number" ? size : NaN;
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "K", "M", "G", "T"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${value}${units[unit]}` : `${value.toFixed(1)}${units[unit]}`;
}
