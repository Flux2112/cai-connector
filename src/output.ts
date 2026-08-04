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

/**
 * `16:38:03.007` — deliberately the same shape Remote-SSH uses, so its log and
 * this channel can be read side by side when a tunnel dies.
 */
export function formatStamp(now: Date): string {
  const pad = (value: number, width = 2): string => String(value).padStart(width, "0");
  return (
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` +
    `.${pad(now.getMilliseconds(), 3)}`
  );
}

/**
 * The extension's output channel, with every line stamped.
 *
 * Wrapping the channel rather than stamping at the call sites keeps the
 * `OutputChannel` parameter every module already takes, so nothing else changes.
 * Timestamps are what make an after-the-fact question like "did cleanup stop
 * that session, or did CML?" answerable at all — an untimestamped line cannot be
 * lined up against the Remote-SSH log that recorded the disconnect.
 */
export function createTimestampedOutput(name: string): vscode.OutputChannel {
  const channel = vscode.window.createOutputChannel(name);
  return {
    get name(): string {
      return channel.name;
    },
    append: (value: string) => channel.append(value),
    appendLine: (value: string) => channel.appendLine(`[${formatStamp(new Date())}] ${value}`),
    replace: (value: string) => channel.replace(value),
    clear: () => channel.clear(),
    show: (columnOrPreserveFocus?: vscode.ViewColumn | boolean, preserveFocus?: boolean) => {
      if (typeof columnOrPreserveFocus === "number") {
        channel.show(columnOrPreserveFocus, preserveFocus);
      } else {
        channel.show(columnOrPreserveFocus);
      }
    },
    hide: () => channel.hide(),
    dispose: () => channel.dispose(),
  };
}
