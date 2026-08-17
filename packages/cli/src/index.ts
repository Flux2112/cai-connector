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

/*
 * The package entry point exists for `oclif`'s own tooling and for anyone
 * importing the pure helpers; the CLI itself is reached through bin/run.js,
 * which hands control to @oclif/core's command discovery.
 */

export { run } from "@oclif/core";

export { BaseCommand } from "./baseCommand";
export {
  configDir,
  resolveConfig,
  saveCredentials,
  CREDENTIALS_FILE,
  type Credentials,
  type Resolution,
  type Source,
} from "./lib/config";
export { CaiCliError, EXIT, reportError, type ErrorReport } from "./lib/exit";
export { humanSize, table, type Column } from "./lib/output";
export { assertReadOnly } from "./lib/readonly";
export { joinWorkloads, type WorkloadRow } from "./lib/workloads";
