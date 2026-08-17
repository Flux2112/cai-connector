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

import { CaiApiError, CaiRequestError, CaiTransportError, describeApiError } from "./errors";
import { redact, truncate } from "./redact";
import { buildPath, buildQuery, joinUrl } from "./url";
import type { FetchInit, FetchLike, RawRequestOptions, ResolvedConfig } from "./types";

/** How much of an error body reaches a message or a log line. */
const BODY_LIMIT = 2000;

/**
 * The single cast between the global `fetch` and this package's own transport
 * type. Keeping it here means nothing else has to care whether the runtime
 * spells a response header bag one way or another.
 */
export function createDefaultFetch(): FetchLike {
  const global = globalThis as { fetch?: (url: string, init: unknown) => Promise<unknown> };
  if (typeof global.fetch !== "function") {
    throw new CaiRequestError("global fetch is unavailable; pass a fetch implementation to createClient");
  }
  const impl = global.fetch.bind(globalThis);
  return async (url, init) => (await impl(url, init)) as Awaited<ReturnType<FetchLike>>;
}

function buildInit(cfg: ResolvedConfig, method: string, options: RawRequestOptions): FetchInit {
  const headers: Record<string, string> = {
    accept: "application/json",
    "user-agent": cfg.userAgent,
    ...options.headers,
    /* Last, so a caller-supplied header cannot displace the credential. */
    authorization: `Bearer ${cfg.apiKey}`,
  };

  const init: FetchInit = { method: method.toUpperCase(), headers };

  if (options.body !== undefined) {
    headers["content-type"] = "application/json";
    init.body = JSON.stringify(options.body);
  }

  /* A caller-supplied signal opts out of the default timeout rather than
   * racing it: combining the two needs AbortSignal.any, which is newer than
   * the Node floor this package targets. */
  if (options.signal) {
    init.signal = options.signal;
  } else if (cfg.timeoutMs > 0) {
    init.signal = AbortSignal.timeout(cfg.timeoutMs);
  }

  return init;
}

function parseBody(text: string): unknown {
  if (text.trim() === "") {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * One request. Everything typed lives above this; this function is deliberately
 * untyped in its options so there is exactly one place that talks to the wire.
 */
export async function request(
  cfg: ResolvedConfig,
  method: string,
  template: string,
  options: RawRequestOptions = {},
): Promise<unknown> {
  const url = joinUrl(cfg.baseUrl, buildPath(template, options.path)) + buildQuery(options.query);
  const init = buildInit(cfg, method, options);
  const label = `${init.method} ${url}`;
  const started = Date.now();

  const log = (line: string) => {
    /* The key is passed explicitly *and* the Bearer form is caught by redact,
     * so neither a slip in the message nor an echoed header can leak it. */
    cfg.log?.(redact(line, cfg.apiKey));
  };

  let res;
  try {
    res = await cfg.fetch(url, init);
  } catch (err) {
    log(`${label} failed after ${Date.now() - started}ms: ${String(err)}`);
    throw new CaiTransportError(init.method, url, err);
  }

  const text = await res.text();
  log(`${label} -> ${res.status} in ${Date.now() - started}ms`);

  if (!res.ok) {
    const body = redact(truncate(text, BODY_LIMIT), cfg.apiKey);
    const { code, detail } = describeApiError(parseBody(text));
    log(`${label} error body: ${body}`);
    throw new CaiApiError({ status: res.status, method: init.method, url, body, code, detail });
  }

  return parseBody(text);
}
