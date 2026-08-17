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

import * as fs from "node:fs";
import * as path from "node:path";

import { Args, Flags } from "@oclif/core";
import { downloadFile, resolveProject } from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { CaiCliError, EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";

type Downloaded = { project: string; path: string; bytes: number; output: string };

export default class FilesGet extends BaseCommand<typeof FilesGet> {
  static description =
    "Download one project file. Writes the bytes to stdout unless --output names a file.";

  static examples = [
    "<%= config.bin %> files get hanke/analysis README.md",
    "<%= config.bin %> files get hanke/analysis data/model.pkl -o model.pkl",
  ];

  static args = {
    project: projectArg,
    path: Args.string({ description: "File to download, relative to the project root.", required: true }),
  };

  static flags = {
    output: Flags.string({
      char: "o",
      description: "Write to this file instead of stdout. Directories are created as needed.",
    }),
  };

  public async run(): Promise<Downloaded | undefined> {
    /* Binary on stdout and JSON on stdout cannot both be right. Rather than
     * silently base64 the payload, say so and let the caller pick. */
    if (this.jsonEnabled() && !this.flags.output) {
      throw new CaiCliError("--json needs --output: a file's bytes cannot be part of a JSON document", EXIT.USAGE);
    }

    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const bytes = await downloadFile(client, project.id as string, this.args.path);

    if (!this.flags.output) {
      if (process.stdout.isTTY) {
        this.warn("writing file bytes to a terminal; use --output to save it instead");
      }
      process.stdout.write(bytes);
      return undefined;
    }

    const target = path.resolve(this.flags.output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);

    return this.emit<Downloaded>(
      { project: project.id as string, path: this.args.path, bytes: bytes.byteLength, output: target },
      [
        { header: "path", get: (d) => d.path },
        { header: "bytes", get: (d) => d.bytes },
        { header: "output", get: (d) => d.output },
      ],
    );
  }
}
