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

import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { test } from "node:test";

type UriLike = { toString(): string };
type ModuleLoader = {
  _load(request: string, parent: unknown, isMain: boolean): unknown;
};

const moduleLoader = require("module") as ModuleLoader;

function loadRenderer(): (webview: unknown, mediaRoot: unknown) => string {
  const originalLoad = moduleLoader._load;
  moduleLoader._load = (request, parent, isMain) => {
    if (request === "vscode") {
      return {
        Uri: {
          joinPath: (base: UriLike, ...segments: string[]): UriLike => ({
            toString: () => [base.toString(), ...segments].join("/"),
          }),
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    return require("../sessionFormHtml").renderSessionFormHtml;
  } finally {
    moduleLoader._load = originalLoad;
  }
}

function idsReadByScript(script: string): string[] {
  const directIds = Array.from(script.matchAll(/\$\("([^"]+)"\)/g), ([, id]) => id);
  const documentIds = Array.from(script.matchAll(/getElementById\("([^"]+)"\)/g), ([, id]) => id).filter(
    (id) => id !== "elapsed",
  );
  const loopIds = Array.from(script.matchAll(/for \(const id of \[([^\]]+)\]\)/g), ([, ids]) =>
    Array.from(ids.matchAll(/"([^"]+)"/g), ([, id]) => id),
  ).flat();
  return [...new Set([...directIds, ...documentIds, ...loopIds])];
}

test("renders CSP-authorized assets and every element the webview script reads", () => {
  const renderSessionFormHtml = loadRenderer();
  const html = renderSessionFormHtml(
    {
      cspSource: "vscode-webview-resource:",
      asWebviewUri: (uri: UriLike): UriLike => ({
        toString: () => `webview-resource:${uri.toString()}`,
      }),
    },
    { toString: () => "media" },
  );
  const script = fs.readFileSync(path.join(__dirname, "../../media/sessionForm.js"), "utf8");
  const renderedIds = new Set(Array.from(html.matchAll(/\bid="([^"]+)"/g), ([, id]) => id));
  const nonce = html.match(/<script nonce="([^"]+)" src=/)?.[1];

  assert.ok(nonce, "the webview script needs a CSP nonce");
  assert.ok(html.includes(`script-src 'nonce-${nonce}'`));
  assert.match(html, /href="webview-resource:media\/sessionForm\.css"/);
  assert.match(html, /src="webview-resource:media\/sessionForm\.js"/);
  assert.deepStrictEqual(
    idsReadByScript(script).filter((id) => !renderedIds.has(id)),
    [],
    "every DOM element requested by sessionForm.js must be rendered by sessionFormHtml.ts",
  );
});