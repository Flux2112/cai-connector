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

/**
 * Every message built here is already redacted by the caller — nothing in this
 * module ever sees the API key, and nothing added to it may start doing so.
 */

/** Base for everything this package throws, so consumers can catch one type. */
export class CaiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Bad arguments — a missing path parameter, an unusable base URL. Thrown
 *  before anything reaches the network. */
export class CaiRequestError extends CaiError {}

/** The request never produced an HTTP response: DNS, TLS, proxy, timeout.
 *  Distinct from CaiApiError on purpose. A failed *listing* must leave state
 *  untouched rather than be read as "the thing is gone" — the same rule that
 *  makes `listEndpointProcesses` return null instead of an empty array. */
export class CaiTransportError extends CaiError {
  readonly method: string;
  readonly url: string;
  /** Declared here rather than relying on `Error.cause`, which is ES2022 and
   *  this package targets ES2020. */
  readonly cause: unknown;
  /** The system-level reason, when one can be found: `ENOTFOUND`,
   *  `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, and so on. See {@link causeCode}. */
  readonly code?: string;

  constructor(method: string, url: string, cause: unknown) {
    const code = causeCode(cause);
    super(`${method} ${url} failed: ${String(cause)}${code ? ` (${code})` : ""}`);
    this.method = method;
    this.url = url;
    this.cause = cause;
    this.code = code;
  }
}

/**
 * The system-level code buried under a `fetch` rejection.
 *
 * `String(err)` on one of those is `TypeError: fetch failed` and nothing else —
 * the same sentence for a DNS failure, a refused connection and an untrusted
 * certificate. The reason undici actually has sits on a nested `cause`, so this
 * walks the chain (bounded, since a cycle is possible) and returns the first
 * `code` it finds. Diagnosing a transport failure without it means guessing.
 */
export function causeCode(cause: unknown): string | undefined {
  let current = cause;
  for (let depth = 0; depth < 5 && current !== null && typeof current === "object"; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && code) {
      return code;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Cloudera AI answered with a non-2xx status. */
export class CaiApiError extends CaiError {
  readonly status: number;
  readonly method: string;
  readonly url: string;
  /** `code` from the API's `runtimeError` envelope, when it sent one. */
  readonly code?: number;
  /** The response body, truncated and redacted, for diagnostics. */
  readonly body: string;

  constructor(args: { status: number; method: string; url: string; body: string; code?: number; detail?: string }) {
    const detail = args.detail ? `: ${args.detail}` : "";
    super(`${args.method} ${args.url} -> ${args.status}${detail}`);
    this.status = args.status;
    this.method = args.method;
    this.url = args.url;
    this.code = args.code;
    this.body = args.body;
  }

  /** 401/403. Worth distinguishing because the fix is "re-enter your key". */
  get isAuthFailure(): boolean {
    return this.status === 401 || this.status === 403;
  }
}

/**
 * The API's error envelope (`runtimeError` in the spec). Every field is
 * optional there, so treat all of it as untrusted.
 */
export function describeApiError(parsed: unknown): { code?: number; detail?: string } {
  if (typeof parsed !== "object" || parsed === null) {
    return {};
  }
  const body = parsed as { message?: unknown; error?: unknown; code?: unknown };
  const detail = [body.message, body.error].find((v) => typeof v === "string" && v.length > 0);
  return {
    code: typeof body.code === "number" ? body.code : undefined,
    detail: typeof detail === "string" ? detail : undefined,
  };
}
