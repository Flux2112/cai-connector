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

import { REDACTED } from "./types";

/** Below this length a "secret" is more likely to be a substring of ordinary
 *  text than a credential, and blanking it would corrupt the log instead of
 *  protecting anything. */
const MIN_SECRET_LENGTH = 8;

/**
 * Blank every occurrence of each secret. Same `.split(x).join("***")` shape as
 * `auth.ts` in the extension: no regular expression, so nothing in the secret
 * can be interpreted as a pattern.
 *
 * Also catches the `Bearer <key>` form, so a header dump cannot leak a key that
 * the caller forgot to pass in.
 */
export function redact(text: string, ...secrets: (string | undefined)[]): string {
  let out = text;
  for (const secret of secrets) {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      continue;
    }
    out = out.split(secret).join(REDACTED);
  }
  return out.replace(/(bearer\s+)\S+/gi, `$1${REDACTED}`);
}

/** Truncate a response body before it reaches a log or an error message. */
export function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit)}… (${text.length} bytes)`;
}
