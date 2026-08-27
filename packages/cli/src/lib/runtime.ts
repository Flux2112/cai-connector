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

import { listRuntimes, type CaiClient } from "@defysoftware/cai-core";

import { CaiCliError, EXIT } from "./exit";

/**
 * Accept either a full image identifier or terms that match exactly one.
 *
 * The identifiers are long container paths, so retyping one is its own source
 * of error; but a wrong runtime silently changes what is installed in the job,
 * so an ambiguous match is refused rather than resolved to the first hit.
 *
 * Shared by `jobs create` and `jobs update` because the two have to agree: a
 * job updated with a runtime the create command would have rejected is the same
 * mistake, arrived at later.
 */
export async function resolveRuntimeIdentifier(client: CaiClient, requested: string): Promise<string> {
  if (requested.includes(":") || requested.includes("/")) {
    return requested;
  }

  const terms = requested.toLowerCase().split(/\s+/).filter(Boolean);
  const runtimes = await listRuntimes(client, {});
  const matches = runtimes.filter((runtime) => {
    const haystack = JSON.stringify(runtime).toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  const identifiers = [...new Set(matches.map((m) => m.image_identifier).filter(Boolean))] as string[];
  if (identifiers.length === 0) {
    throw new CaiCliError(`no runtime matches ${JSON.stringify(requested)}; see \`cai runtimes list\``, EXIT.USAGE);
  }
  if (identifiers.length > 1) {
    throw new CaiCliError(
      `${JSON.stringify(requested)} matches ${identifiers.length} runtimes; be more specific:\n  ${identifiers
        .slice(0, 8)
        .join("\n  ")}`,
      EXIT.USAGE,
    );
  }
  return identifiers[0];
}
