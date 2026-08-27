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
 * How much of an `environment` blob the output may carry.
 *
 * CML injects its own variables into a project's environment — `CML_USER_PW`
 * and `IAM_PASSWORD` among them — so the blob on a job, a run or a project is
 * not only what its author set. Printing it by default put live credentials
 * into a terminal, its scrollback, an agent's context window and a saved
 * transcript at once, none of which the caller chose when they typed the
 * command. Hiding it is therefore the default, and the two ways back are
 * explicit.
 */
export type EnvMode = "hide" | "mask" | "reveal";

/** The one field name that carries the blob. Matched exactly (case-insensitively)
 *  so `environment_crn` and `environment_name`, which are not secrets, stay. */
const ENV_FIELD = "environment";

/** Same placeholder the extension and core use for a redacted secret. */
const MASKED = "***";

/** The way back, spelled once. A marker that names a flag which would not in
 *  fact show that particular value sends the reader one hop wrong. */
const SHOW_ENV = "pass --show-env";
const REVEAL = "pass --reveal";

/**
 * The variables CML injects that are credentials, named outright.
 *
 * The patterns below already catch both, so this list is not what makes today's
 * case work — it is the floor under it. The patterns are a judgement about what
 * a name looks like and may be narrowed; these two names are a fact about what
 * this platform puts in every project's environment, and must survive that.
 */
const CML_SECRETS = new Set(["CML_USER_PW", "IAM_PASSWORD", "CDSW_API_KEY", "CDSW_APIV2_KEY"]);

/** Names whose *value* is a secret whatever the rest of the name says. */
const SECRET_SUBSTRINGS = ["PASSWORD", "PASSWD", "PASSPHRASE", "SECRET", "CREDENTIAL"];

/**
 * Names that are a secret when they stand as a whole part.
 *
 * A part, not a substring: `TOKENIZER` and `PARTITION_KEY` are ordinary
 * variables, and masking them would cost the diagnostic value that `--show-env`
 * exists to preserve — the report that prompted all this turned on reading
 * `PYTHONPATH`. `PW` is the CML injection (`CML_USER_PW`); `PWD` is not here,
 * because it is far more often the working directory.
 */
const SECRET_SEGMENTS = new Set([
  "PW",
  "TOKEN",
  "TOKENS",
  "CREDS",
  /* The unspaced spellings, which have no case boundary to split on. */
  "APIKEY",
  "AUTHKEY",
  "PRIVATEKEY",
  "ACCESSKEY",
]);

/** A `KEY` part is only a secret when another part says which kind:
 *  `CDSW_APIV2_KEY` and `SSH_PRIVATE_KEY` are, `PARTITION_KEY` is not. */
const KEY_QUALIFIERS = /^(API|APIV\d+|ACCESS|PRIVATE|SIGNING|ENCRYPTION|AUTH)$/;

/**
 * A name split into its parts, `SCREAMING_SNAKE` and `camelCase` alike.
 *
 * Both spellings turn up in a real environment, and `apiToken` is exactly as
 * much of a credential as `API_TOKEN`. Splitting the case boundary first is what
 * lets the parts above stay parts rather than being widened to substrings, which
 * is what would drag `TOKENIZER` in with them.
 */
function nameParts(name: string): string[] {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase()
    .split(/[_\-.]+/)
    .filter(Boolean);
}

/** Whether a variable's value must be masked, judged from its name alone. */
export function isSecretName(name: string): boolean {
  const upper = name.toUpperCase();
  if (CML_SECRETS.has(upper)) {
    return true;
  }
  if (SECRET_SUBSTRINGS.some((needle) => upper.includes(needle))) {
    return true;
  }

  const parts = nameParts(name);
  if (parts.some((part) => SECRET_SEGMENTS.has(part))) {
    return true;
  }
  return (
    (parts.includes("KEY") || parts.includes("KEYS")) && parts.some((part) => KEY_QUALIFIERS.test(part))
  );
}

/** Which mode the two global flags ask for. `--reveal` wins, so a caller who
 *  passes both gets the louder of the two rather than the safer one they did
 *  not ask for. */
export function resolveEnvMode(flags: { "show-env"?: boolean; reveal?: boolean }): EnvMode {
  if (flags.reveal) return "reveal";
  return flags["show-env"] ? "mask" : "hide";
}

/**
 * Read the blob, which the API sends as a JSON *string* on a job, a run or a
 * project and as an object on a create request. Anything else — including a
 * string that does not parse — is `null`, and an unreadable blob is treated as
 * a secret rather than as safe.
 */
function envEntries(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * One `environment` value, reduced to what the mode allows.
 *
 * The marker names the flag rather than dropping the field silently: a reader
 * who never sees the key learns the field does not exist and stops looking for
 * the way to get it. The shape is preserved otherwise — a JSON string in is a
 * JSON string out — because a caller already parsing it should not have to
 * branch on our redaction.
 */
function sanitizeEnvironment(value: unknown, mode: EnvMode): unknown {
  if (value === undefined || value === null || value === "") {
    return value;
  }

  const entries = envEntries(value);
  if (!entries) {
    /* `--reveal` in both modes, and deliberately not `--show-env`: masking works
     * name by name, so a blob whose names cannot be read is one `--show-env`
     * would hide all over again. Naming it anyway would cost the reader a hop. */
    return `hidden (not a JSON object) — ${REVEAL}`;
  }

  const names = Object.keys(entries);
  if (names.length === 0) {
    return value;
  }

  if (mode === "hide") {
    return `${names.length} var${names.length === 1 ? "" : "s"} hidden — ${SHOW_ENV}`;
  }

  const masked: Record<string, unknown> = {};
  for (const name of names) {
    masked[name] = isSecretName(name) ? MASKED : entries[name];
  }
  return typeof value === "string" ? JSON.stringify(masked) : masked;
}

function walk(value: unknown, mode: EnvMode): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, mode));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = key.toLowerCase() === ENV_FIELD ? sanitizeEnvironment(item, mode) : walk(item, mode);
    }
    return out;
  }
  return value;
}

/**
 * Every `environment` anywhere in a result, reduced to what the mode allows.
 *
 * A walk rather than a per-command field list: the blob rides on jobs, runs,
 * projects and applications alike, and `cai raw` can surface any of them, so a
 * list would be one command behind the next place it appears. The input is left
 * untouched — the caller may still need the real values, as `jobs update` does
 * when it checks what the instance actually applied.
 */
export function sanitizeOutput<T>(data: T, mode: EnvMode): T {
  if (mode === "reveal") {
    return data;
  }
  return walk(data, mode) as T;
}
