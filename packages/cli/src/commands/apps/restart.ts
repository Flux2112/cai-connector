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

import { Args } from "@oclif/core";
import { resolveProject, restartApplication, type Application } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { projectArg } from "../../lib/flags";

export default class AppsRestart extends BaseCommand<typeof AppsRestart> {
  static description = "Restart one application. Starts it if it is stopped.";

  static examples = ["<%= config.bin %> apps restart hanke/analysis a1b2c3"];

  static args = {
    project: projectArg,
    app: Args.string({ description: "Application id.", required: true }),
  };

  public async run(): Promise<Application> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const app = await restartApplication(client, project.id as string, this.args.app);

    return this.emit(app, [
      { header: "id", get: (a) => a.id },
      { header: "name", get: (a) => a.name },
      { header: "status", get: (a) => a.status },
    ]);
  }
}
