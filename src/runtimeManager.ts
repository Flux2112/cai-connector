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
import { RuntimeCache, RuntimeData } from "./types";
import { runCdswctl } from "./cdswctl";

export class RuntimeManager {
  private cachePath: string;
  private cacheDurationMs: number;
  private runtimes: RuntimeData[] = [];

  constructor(cachePath: string, cacheHours: number) {
    this.cachePath = cachePath;
    this.cacheDurationMs = cacheHours * 60 * 60 * 1000;
  }

  public getAll(): RuntimeData[] {
    return this.runtimes;
  }

  public search(query: string): RuntimeData[] {
    if (!query) {
      return this.runtimes;
    }

    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);

    if (terms.length === 0) {
      return this.runtimes;
    }

    return this.runtimes.filter((r) => {
      const haystack = [
        String(r.id),
        r.imageIdentifier,
        r.editor,
        r.kernel,
        r.edition,
        r.description,
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  public async fetchRuntimes(cdswctlPath: string, forceRefresh: boolean, output: vscode.OutputChannel): Promise<boolean> {
    if (!forceRefresh && this.isCacheValid()) {
      if (this.loadFromCache()) {
        output.appendLine(`Loaded ${this.runtimes.length} runtimes from cache.`);
        return true;
      }
    }

    output.appendLine("Fetching runtimes from cdswctl...");
    const result = await runCdswctl(cdswctlPath, ["runtimes", "list"], output, 30000);
    if (result.exitCode !== 0) {
      output.appendLine(`Error fetching runtimes: ${result.stderr}`);
      return false;
    }

    try {
      const parsed = JSON.parse(result.stdout) as { runtimes?: RuntimeData[] };
      const list = parsed.runtimes || [];
      if (list.length === 0) {
        output.appendLine("Warning: No runtimes found in response.");
        return false;
      }
      this.runtimes = list;
      this.saveToCache();
      output.appendLine(`Fetched ${this.runtimes.length} runtimes successfully.`);
      return true;
    } catch (err) {
      output.appendLine(`Error parsing runtimes: ${String(err)}`);
      return false;
    }
  }

  private isCacheValid(): boolean {
    if (!fs.existsSync(this.cachePath)) {
      return false;
    }
    try {
      const raw = fs.readFileSync(this.cachePath, "utf8");
      const data = JSON.parse(raw) as RuntimeCache;
      const cacheTime = new Date(data.timestamp).getTime();
      return Date.now() - cacheTime < this.cacheDurationMs;
    } catch {
      return false;
    }
  }

  private loadFromCache(): boolean {
    try {
      const raw = fs.readFileSync(this.cachePath, "utf8");
      const data = JSON.parse(raw) as RuntimeCache;
      this.runtimes = data.runtimes || [];
      return true;
    } catch {
      return false;
    }
  }

  private saveToCache(): void {
    const data: RuntimeCache = {
      timestamp: new Date().toISOString(),
      runtimes: this.runtimes,
    };

    fs.mkdirSync(path.dirname(this.cachePath), { recursive: true });
    fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2), "utf8");
  }
}
