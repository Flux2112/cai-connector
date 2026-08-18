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

/*
 * Regenerates src/generated/schema.ts from spec/swagger.json.
 *
 *   node scripts/generate.mjs                       use the committed spec
 *   node scripts/generate.mjs --url https://host    refetch, then generate
 *   node scripts/generate.mjs --check               generate to memory, fail on drift
 *
 * The spec lives on an internal host CI can never reach, so both the spec and
 * the generated types are committed. Refetching is a deliberate manual step
 * that produces a reviewable diff.
 *
 * Cloudera AI serves Swagger 2.0 and openapi-typescript v7 consumes OpenAPI
 * 3.x only, hence the swagger2openapi hop.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import converter from "swagger2openapi";
import openapiTS, { astToString } from "openapi-typescript";

const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const specPath = join(pkgRoot, "spec", "swagger.json");
/* Emitted as .ts, not .d.ts: tsc treats a .d.ts under rootDir as input only and
 * never copies it to outDir, which would leave the published package's
 * `export type { paths } from "./generated/schema"` pointing at nothing. As a
 * .ts it compiles to an empty module plus its declarations, and the type-only
 * re-export is still elided, so no runtime code results either way. */
const outPath = join(pkgRoot, "src", "generated", "schema.ts");

const args = process.argv.slice(2);
const check = args.includes("--check");
const urlArg = args.indexOf("--url");
const baseUrl = urlArg === -1 ? process.env.CAI_URL : args[urlArg + 1];

/* Refuse to overwrite the committed spec with something that is not one. */
function assertIsSpec(spec) {
  if (spec?.swagger !== "2.0") {
    throw new Error(`expected a Swagger 2.0 document, got swagger=${String(spec?.swagger)}`);
  }
  const paths = Object.keys(spec.paths ?? {}).length;
  if (paths === 0) {
    throw new Error("spec declares no paths");
  }
  return paths;
}

async function refetch(base) {
  const url = `${base.replace(/\/+$/, "")}/api/v2/swagger.json`;
  console.log(`fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  const spec = JSON.parse(text);
  const paths = assertIsSpec(spec);
  writeFileSync(specPath, `${JSON.stringify(spec, null, 2)}\n`);
  console.log(`wrote spec/swagger.json (version ${spec.info?.version}, ${paths} paths)`);
}

if (baseUrl && !check) {
  await refetch(baseUrl);
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const pathCount = assertIsSpec(spec);
const specVersion = spec.info?.version ?? "unknown";
console.log(`spec version ${specVersion}, ${pathCount} paths`);

const { openapi } = await converter.convertObj(spec, { patch: true, warnOnly: true });

const banner = [
  "/*",
  " * GENERATED FILE - DO NOT EDIT.",
  " *",
  ` * Cloudera AI API v2, spec version ${specVersion}, ${pathCount} paths.`,
  " * Regenerate with `npm run generate -w @defysoftware/cai-core`.",
  " *",
  " * Types only: this file emits no runtime code, which is what lets",
  " * @defysoftware/cai-core keep zero runtime dependencies.",
  " */",
  "",
  "",
].join("\n");

const generated = banner + astToString(await openapiTS(openapi));

/* Line endings are not drift. TypeScript's printer follows the platform, so it
 * emits CRLF on Windows and LF elsewhere, and git hands a Windows checkout
 * whatever core.autocrlf says — so a byte comparison calls the file stale
 * whenever those two disagree, on a file nobody has touched. Comparing content
 * cannot hide real drift: every difference that matters survives the swap. */
const sameContent = (a, b) => normalise(a) === normalise(b);
const normalise = (text) => text.split("\r\n").join("\n");

if (check) {
  const current = readFileSync(outPath, "utf8");
  if (!sameContent(current, generated)) {
    console.error("src/generated/schema.ts is stale - run `npm run generate`");
    process.exit(1);
  }
  console.log("src/generated/schema.ts is up to date");
} else {
  writeFileSync(outPath, generated);
  console.log(`wrote src/generated/schema.ts (${generated.split("\n").length} lines)`);
}
