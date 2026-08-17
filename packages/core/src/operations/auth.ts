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
import { CaiError } from "../errors";
import type { Schemas } from "./common";

export type KeyValidation = Schemas["ValidateAPIKeyResponse"];

/**
 * The only two audiences the instance accepts. "Application" is for app
 * tokens and answers 403 `audience mismatch` for an API key, so anything
 * calling this wants "API".
 */
export type KeyAudience = "API" | "Application";

/**
 * Check a key without touching any project data.
 *
 * The same key works for `cdswctl login` and for API v2 Bearer auth — verified
 * against a live instance — so there is one credential to store, not two.
 */
export async function validateKey(client: CaiClient, audience: KeyAudience = "API"): Promise<KeyValidation> {
  return client.post("/api/v2/auth/validate_key", { body: { audience } });
}

/**
 * The username the key belongs to.
 *
 * `valid` is optional in the spec, so an absent field is treated as failure
 * rather than as success — this is a credential check, and the safe reading of
 * "the server did not say yes" is no.
 */
export async function whoami(client: CaiClient): Promise<string> {
  const result = await validateKey(client, "API");
  if (result.valid !== true || !result.username) {
    throw new CaiError(`API key rejected: ${result.message ?? "no reason given"}`);
  }
  return result.username;
}
