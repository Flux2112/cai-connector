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
import { listFiles, resolveProject, ROOT, type FileInfo } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { projectArg } from "../../lib/flags";
import { humanSize } from "../../lib/output";

export default class FilesLs extends BaseCommand<typeof FilesLs> {
  static description =
    "List one directory of a project. Entries are names relative to the directory listed, not paths from the project root.";

  static examples = [
    "<%= config.bin %> files ls hanke/analysis --table",
    "<%= config.bin %> files ls hanke/analysis data/raw",
  ];

  static args = {
    project: projectArg,
    path: Args.string({ description: "Directory to list. Defaults to the project root." }),
  };

  public async run(): Promise<FileInfo[]> {
    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const files = await listFiles(client, project.id as string, this.args.path ?? ROOT);

    return this.emit(files, [
      { header: "name", get: (f) => f.path },
      { header: "type", get: (f) => (f.is_dir ? "dir" : "file") },
      { header: "size", get: (f) => (f.is_dir ? "" : humanSize(f.file_size)) },
    ]);
  }
}
