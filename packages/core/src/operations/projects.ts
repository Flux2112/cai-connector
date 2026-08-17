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

import type { CaiClient } from "../client";
import { CaiRequestError } from "../errors";
import { collect } from "../paginate";
import { searchFilter, type ListOptions, type Schemas } from "./common";

export type Project = Schemas["Project"];

export type ListProjectsOptions = ListOptions & {
  /** Filter by project name, exactly as the API's `name` search key does. */
  name?: string;
  /** Filter by owner username. */
  owner?: string;
  /** Include projects the user can see but does not own. */
  includePublic?: boolean;
};

export async function listProjects(client: CaiClient, options: ListProjectsOptions = {}): Promise<Project[]> {
  return collect<Project>(
    async (pageToken) => {
      const page = await client.get("/api/v2/projects", {
        query: {
          search_filter: searchFilter({ name: options.name, "owner.username": options.owner }),
          page_size: options.pageSize,
          page_token: pageToken,
          include_public_projects: options.includePublic,
        },
      });
      return { items: page.projects, nextPageToken: page.next_page_token };
    },
    { limit: options.limit },
  );
}

export async function getProject(client: CaiClient, projectId: string): Promise<Project> {
  return client.get("/api/v2/projects/{project_id}", { path: { project_id: projectId } });
}

/** `owner/name`, the form the extension and `cdswctl` both use. */
export function projectRef(project: Project): string {
  return `${project.owner?.username ?? "?"}/${project.name ?? project.slug ?? "?"}`;
}

/**
 * Resolve either an opaque `project_id` or an `owner/name` reference.
 *
 * A reference containing `/` is a name; anything else is an id. Deliberately
 * not guessing a bare name against the current user — the extension prefixes
 * bare names with `%USERNAME%` at its own layer, where the username is known
 * for free. Doing it here would mean an extra round trip on every call.
 */
export async function resolveProject(client: CaiClient, ref: string): Promise<Project> {
  if (!ref) {
    throw new CaiRequestError("project reference is required");
  }
  if (!ref.includes("/")) {
    return getProject(client, ref);
  }

  const [owner, ...rest] = ref.split("/");
  const name = rest.join("/");
  if (!owner || !name) {
    throw new CaiRequestError(`project reference must be "owner/name" or a project id, got "${ref}"`);
  }

  /* The filter is the server's, so treat it as a narrowing hint and match here.
   * One call answers a reference whose case matches the instance. */
  const hinted = await listProjects(client, { owner, name, includePublic: true });
  const match = pick(hinted, owner, name, ref);
  if (match) {
    return match;
  }

  /* Two things about `search_filter`, both verified against a live instance on
   * 2026-08-17 rather than inferred: it is **case-sensitive** (`name: "dse"`
   * returns nothing where `"DSE"` returns the project, and `owner.username`
   * behaves the same), and it matches **substrings** (`"DS"` also finds `DSE`),
   * which is why matching is done on this side at all.
   *
   * Case matters in practice: CML reports owners upper-cased while the extension
   * builds its references from a lower-cased `%USERNAME%`, and a project
   * displayed as `DSE` is universally typed `dse`. Such a reference is dropped by
   * the hint before any client-side matching can help, so the only way to answer
   * it is to look without one. A second call, but only on the path that would
   * otherwise have failed outright. */
  const all = await listProjects(client, { includePublic: true });
  const loose = pick(all, owner, name, ref);
  if (loose) {
    return loose;
  }

  throw new CaiRequestError(`no project matched "${ref}"`);
}

/**
 * The one project a reference names, or nothing.
 *
 * Exact case wins outright; otherwise a single case-insensitive match is taken.
 * Several matches are refused rather than guessed at, and refused *here* so the
 * caller does not widen its search after an ambiguity — two projects differing
 * only in case is a real answer, not a miss. `slug` is accepted alongside `name`
 * because that is what the extension's host aliases are built from.
 */
function pick(projects: Project[], owner: string, name: string, ref: string): Project | undefined {
  const exact = projects.filter((p) => p.owner?.username === owner && (p.name === name || p.slug === name));
  if (exact.length === 1) {
    return exact[0];
  }

  const loose = projects.filter(
    (p) => same(p.owner?.username, owner) && (same(p.name, name) || same(p.slug, name)),
  );
  if (loose.length === 1) {
    return loose[0];
  }
  if (loose.length > 1) {
    throw new CaiRequestError(
      `"${ref}" matched ${loose.length} projects: ${loose.map((p) => p.id ?? "?").join(", ")}`,
    );
  }
  return undefined;
}

function same(a: string | undefined, b: string): boolean {
  return a !== undefined && a.toLowerCase() === b.toLowerCase();
}
