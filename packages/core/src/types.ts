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

import type { paths } from "./generated/schema";

export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_USER_AGENT = "cai-core";

/** Refuse to follow more page tokens than this; a server that keeps echoing
 *  the same token would otherwise spin forever. */
export const MAX_PAGES = 1000;

/** Placeholder shown in place of the API key in anything we log. */
export const REDACTED = "***";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

/* -------------------------------------------------------------------------
 * Transport
 *
 * Deliberately structural and minimal rather than the global `fetch` types:
 * the transport is injectable so the extension can pass a `node:https`-backed
 * implementation if corporate proxy handling ever demands it, and so tests can
 * pass a stub. Keeping our own shape means neither has to satisfy the whole
 * WHATWG surface. See createDefaultFetch for the one cast at the boundary.
 * ---------------------------------------------------------------------- */

export type FetchInit = {
  method: string;
  headers: Record<string, string>;
  /** Bytes rather than a string for the one multipart operation in the API:
   *  UTF-8 encoding an arbitrary file to build the body would corrupt it, the
   *  same way `text()` would corrupt a download. */
  body?: string | Uint8Array;
  signal?: AbortSignal;
};

/** A body sent verbatim under a content type of the caller's choosing. */
export type RawBody = {
  contentType: string;
  bytes: Uint8Array;
};

export type FetchResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
  /** Needed for file downloads: `text()` would UTF-8 decode a binary body
   *  and silently corrupt it. Only the download path calls this. */
  arrayBuffer(): Promise<ArrayBuffer>;
};

export type FetchLike = (url: string, init: FetchInit) => Promise<FetchResponse>;

/** Same dependency-injection discipline as the extension's `OutputChannel`
 *  parameter convention: logging is passed in, never a module global. */
export type LogLine = (line: string) => void;

export type ClientOptions = {
  /** Instance base URL, e.g. `https://ml.example.com`. Trailing slashes are trimmed. */
  baseUrl: string;
  apiKey: string;
  fetch?: FetchLike;
  log?: LogLine;
  /** Applied only when the caller passes no signal of its own. 0 disables it. */
  timeoutMs?: number;
  userAgent?: string;
};

/** Everything a request needs, with the client's own options already folded in. */
export type ResolvedConfig = {
  baseUrl: string;
  apiKey: string;
  fetch: FetchLike;
  log?: LogLine;
  timeoutMs: number;
  userAgent: string;
};

/** The untyped shape `request` works with; the typed façade casts into it. */
export type RawRequestOptions = {
  path?: Record<string, string | number>;
  query?: Record<string, unknown>;
  /** Serialized as JSON. Mutually exclusive with `rawBody`. */
  body?: unknown;
  /** Sent as-is. The only current use is the multipart file upload, whose body
   *  the generated types cannot describe. Mutually exclusive with `body`. */
  rawBody?: RawBody;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/* -------------------------------------------------------------------------
 * Typing the generated `paths` interface
 *
 * openapi-typescript emits an absent method as `get?: never` and a present one
 * as `get: operations["X"]`, and likewise `path?: never` versus a required
 * `path: {...}`. Both facts are what the helpers below key off.
 * ---------------------------------------------------------------------- */

/** The operation object for a path+method, or `never` if that method is absent. */
export type OpFor<P extends keyof paths, M extends HttpMethod> = M extends keyof paths[P]
  ? Exclude<paths[P][M], undefined>
  : never;

/** Every path that actually declares the given method. */
export type PathsWith<M extends HttpMethod> = {
  [P in keyof paths]: [OpFor<P, M>] extends [never] ? never : P;
}[keyof paths];

/*
 * Both slot types below are mapped types with key remapping rather than
 * `infer` conditionals, because a mapped type *preserves the optional
 * modifier*. That is the whole trick: `path: {...}` stays required, `query?:
 * {...}` stays optional and `path?: never` stays absent, with no need to
 * reconstruct which was which. Inferring the property type instead loses the
 * distinction — TS strips `undefined` off an optional property in `infer`
 * position, so every slot would come back looking required.
 */

type ParamSlots<Op> = Op extends { parameters: infer P }
  ? { [K in keyof P as K extends "path" | "query" ? K : never]: P[K] }
  : { path?: never; query?: never };

type BodySlot<Op> = {
  [K in keyof Op as K extends "requestBody" ? "body" : never]: NonNullable<Op[K]> extends {
    content: { "application/json": infer B };
  }
    ? B
    : never;
};

export type RequestOptions<Op> = ParamSlots<Op> &
  BodySlot<Op> & {
    headers?: Record<string, string>;
    signal?: AbortSignal;
  };

/** The 200 body, or `unknown` for operations that declare none. */
export type ResponseOf<Op> = Op extends { responses: infer R }
  ? R extends { 200: { content: { "application/json": infer T } } }
    ? T
    : unknown
  : unknown;

/** Lets the options argument be omitted entirely when nothing in it is required.
 *  `Partial<T> extends T` holds exactly when every property of T is optional. */
export type OptionalIfEmpty<T> = Partial<T> extends T ? [options?: T] : [options: T];
