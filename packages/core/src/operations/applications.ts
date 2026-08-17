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
import { collect } from "../paginate";
import { searchFilter, type ListOptions, type Schemas } from "./common";

export type Application = Schemas["Application"];

export type ListApplicationsOptions = ListOptions & {
  /** One of `running`, `stopping`, `stopped`, `starting`, `failed`. */
  status?: string;
  /** The API's own sort syntax, e.g. `-updated_at,name`. */
  sort?: string;
};

/**
 * Applications, restartable and stoppable but never created or deleted here.
 *
 * `CreateApplication` and `DeleteApplication` exist in the API and are reachable
 * through `client.post`/`client.delete` — this package is a client for the whole
 * surface, not a policy layer. They are simply not wrapped, because no `cai`
 * command needs them and an unused wrapper is an invitation.
 */
export async function listApplications(
  client: CaiClient,
  projectId: string,
  options: ListApplicationsOptions = {},
): Promise<Application[]> {
  return collect<Application>(
    async (pageToken) => {
      const page = await client.get("/api/v2/projects/{project_id}/applications", {
        path: { project_id: projectId },
        query: {
          search_filter: searchFilter({ status: options.status }),
          sort: options.sort,
          page_size: options.pageSize,
          page_token: pageToken,
        },
      });
      return { items: page.applications, nextPageToken: page.next_page_token };
    },
    { limit: options.limit },
  );
}

export async function getApplication(
  client: CaiClient,
  projectId: string,
  applicationId: string,
): Promise<Application> {
  return client.get("/api/v2/projects/{project_id}/applications/{application_id}", {
    path: { project_id: projectId, application_id: applicationId },
  });
}

/** Restart one application. Starts a stopped one too — the spec describes this
 *  operation as "Start an application". */
export async function restartApplication(
  client: CaiClient,
  projectId: string,
  applicationId: string,
): Promise<Application> {
  return client.post("/api/v2/projects/{project_id}/applications/{application_id}:restart", {
    path: { project_id: projectId, application_id: applicationId },
  });
}

export async function stopApplication(
  client: CaiClient,
  projectId: string,
  applicationId: string,
): Promise<Application> {
  return client.post("/api/v2/projects/{project_id}/applications/{application_id}:stop", {
    path: { project_id: projectId, application_id: applicationId },
  });
}
