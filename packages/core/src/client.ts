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

import { CaiRequestError } from "./errors";
import { createDefaultFetch, request } from "./http";
import {
  DEFAULT_TIMEOUT_MS,
  DEFAULT_USER_AGENT,
  type ClientOptions,
  type HttpMethod,
  type OpFor,
  type OptionalIfEmpty,
  type PathsWith,
  type RawRequestOptions,
  type RequestOptions,
  type ResolvedConfig,
  type ResponseOf,
} from "./types";

/** One method's typed signature, resolved against the generated `paths`. */
type Verb<M extends HttpMethod> = <P extends PathsWith<M>>(
  path: P,
  ...args: OptionalIfEmpty<RequestOptions<OpFor<P, M>>>
) => Promise<ResponseOf<OpFor<P, M>>>;

export type CaiClient = {
  readonly baseUrl: string;
  get: Verb<"get">;
  post: Verb<"post">;
  put: Verb<"put">;
  patch: Verb<"patch">;
  /**
   * Present because `core` is a client for the whole API, not a policy layer.
   * The safe-writes rule is enforced by the CLI's command surface — no `cai`
   * verb reaches a destructive path — exactly as the extension's safety rule
   * is enforced by never passing `cdswctl`'s blanket `/a` flag.
   */
  delete: Verb<"delete">;
  /** Escape hatch for paths the spec does not describe. Untyped on purpose. */
  raw(method: string, path: string, options?: RawRequestOptions): Promise<unknown>;
};

function resolve(options: ClientOptions): ResolvedConfig {
  if (!options.apiKey) {
    throw new CaiRequestError("apiKey is required");
  }
  return {
    baseUrl: options.baseUrl.replace(/\/+$/, ""),
    apiKey: options.apiKey,
    fetch: options.fetch ?? createDefaultFetch(),
    log: options.log,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
  };
}

/**
 * Build a client for one Cloudera AI instance.
 *
 * `fetch` and `log` are injected rather than reached for, which is what makes
 * the whole package testable against a local `http.createServer` stub and
 * keeps its runtime dependency count at zero.
 */
export function createClient(options: ClientOptions): CaiClient {
  const cfg = resolve(options);

  const verb =
    (method: HttpMethod) =>
    (path: string, opts?: RawRequestOptions): Promise<unknown> =>
      request(cfg, method, path, opts);

  return {
    baseUrl: cfg.baseUrl,
    get: verb("get") as Verb<"get">,
    post: verb("post") as Verb<"post">,
    put: verb("put") as Verb<"put">,
    patch: verb("patch") as Verb<"patch">,
    delete: verb("delete") as Verb<"delete">,
    raw: (method, path, opts) => request(cfg, method, path, opts),
  };
}
