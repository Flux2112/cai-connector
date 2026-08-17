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

import { resolveProject, type Project } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { projectArg } from "../../lib/flags";

export default class ProjectsGet extends BaseCommand<typeof ProjectsGet> {
  static description = "Show one project, addressed by owner/name or by id.";

  static examples = [
    "<%= config.bin %> projects get hanke/analysis",
    "<%= config.bin %> projects get qg5i-ewyq-bi4h-5kii",
  ];

  static args = { project: projectArg };

  public async run(): Promise<Project> {
    const project = await resolveProject(this.client(), this.args.project);
    return this.emit(project, [
      { header: "id", get: (p) => p.id },
      { header: "owner", get: (p) => p.owner?.username },
      { header: "name", get: (p) => p.name },
      { header: "visibility", get: (p) => p.visibility },
    ]);
  }
}
