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

import { CaiApiError, CaiRequestError, CaiTransportError } from "@defysoftware/cai-core";

/**
 * Exit codes, stable by contract.
 *
 * An agent branches on these, so they are part of the CLI's interface and may
 * not be renumbered. The split that matters most is TRANSPORT versus API: no
 * answer at all is not the same as a negative answer, the same distinction core
 * draws between `CaiTransportError` and `CaiApiError`, and the same reason the
 * extension's `listEndpointProcesses` returns `null` rather than `[]`.
 */
export const EXIT = {
  OK: 0,
  /** Anything unanticipated. A bug, until shown otherwise. */
  INTERNAL: 1,
  /** Bad flags or arguments. oclif's own parse errors also land here. */
  USAGE: 2,
  /** No instance URL or no API key could be resolved. */
  CONFIG: 3,
  /** The instance rejected the credential: 401 or 403. */
  AUTH: 4,
  /** The instance answered, with a failure. */
  API: 5,
  /** No answer at all — DNS, TLS, connection refused, timeout. */
  TRANSPORT: 6,
  /** The request never left: a value failed validation before the wire. */
  REQUEST: 7,
  /**
   * The command worked; the *workload* it was waiting for did not succeed.
   *
   * A job run that failed, was stopped, timed out on the cluster, or was still
   * running when `--wait` gave up. Separate from API because nothing went wrong
   * with the call — a caller that treated this as a request failure would retry
   * and start the job a second time.
   */
  WORKLOAD: 8,
} as const;

export type ErrorReport = {
  error: string;
  code: number;
  /** The API's own error code from its `runtimeError` envelope, if it sent one. */
  apiCode?: number;
  status?: number;
  /** The response body, already truncated and redacted by core. */
  body?: string;
  /** The system-level cause of a transport failure: `ENOTFOUND`, `ECONNREFUSED`, … */
  cause?: string;
  /** What to do about it, for the causes where the answer is always the same. */
  hint?: string;
};

/**
 * The fix for the transport failures that have exactly one cause.
 *
 * A certificate error against a corporate instance is not a bug to investigate:
 * the instance serves a leaf-only chain and Node, unlike a browser, will not go
 * and fetch the issuing intermediate. Every one of these costs somebody an hour
 * unless the message says so — the error itself only says "fetch failed".
 */
const TRANSPORT_HINTS: Record<string, string> = {
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:
    "the instance's certificate chain could not be verified. Point NODE_EXTRA_CA_CERTS at a PEM " +
    "holding the issuing intermediate CA as well as the root — a root-only file is not enough.",
  SELF_SIGNED_CERT_IN_CHAIN:
    "the chain ends in a certificate Node does not trust. Point NODE_EXTRA_CA_CERTS at your " +
    "organisation's CA bundle.",
  ENOTFOUND: "the host name did not resolve. Check --url, and whether you are on the right network or VPN.",
  ECONNREFUSED: "nothing accepted the connection. Check --url, including its port.",
  ETIMEDOUT: "the connection timed out, which usually means a proxy or firewall in the way rather than a slow instance.",
};

/** A failure the CLI raises itself, carrying the exit code it should produce. */
export class CaiCliError extends Error {
  readonly code: number;

  constructor(message: string, code: number = EXIT.INTERNAL) {
    super(message);
    this.name = "CaiCliError";
    this.code = code;
  }
}

/**
 * Map any thrown value onto a report and an exit code.
 *
 * Kept free of oclif and of any I/O so it can be unit-tested directly; the base
 * command does the printing.
 */
export function reportError(err: unknown): ErrorReport {
  if (err instanceof CaiApiError) {
    return {
      error: err.message,
      code: err.isAuthFailure ? EXIT.AUTH : EXIT.API,
      apiCode: err.code,
      status: err.status,
      body: err.body,
    };
  }
  if (err instanceof CaiTransportError) {
    return {
      error: err.message,
      code: EXIT.TRANSPORT,
      cause: err.code,
      hint: err.code === undefined ? undefined : TRANSPORT_HINTS[err.code],
    };
  }
  if (err instanceof CaiRequestError) {
    return { error: err.message, code: EXIT.REQUEST };
  }
  if (err instanceof CaiCliError) {
    return { error: err.message, code: err.code };
  }
  return { error: err instanceof Error ? err.message : String(err), code: EXIT.INTERNAL };
}
