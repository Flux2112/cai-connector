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
import {
  assertUploadPath,
  CaiApiError,
  listFiles,
  resolveProject,
  uploadFile,
  type CaiClient,
} from "@defysoftware/cai-core";

import { BaseCommand } from "../../baseCommand";
import { CaiCliError, EXIT } from "../../lib/exit";
import { projectArg } from "../../lib/flags";

type Uploaded = {
  project: string;
  /** The destination that was asked for. */
  path: string;
  bytes: number;
  /**
   * Where the file actually landed. Equal to `path` unless the destination was
   * occupied, in which case the instance keeps the old file and numbers this one.
   */
  stored: string;
};

export default class FilesPut extends BaseCommand<typeof FilesPut> {
  static description = [
    "Upload one file into a project.",
    "The API cannot replace a file: an upload onto an occupied path keeps the old file and stores this one beside it as name(1).ext.",
    "So an occupied destination is refused unless --force, and the name that was really created is reported as `stored`.",
  ].join(" ");

  static examples = [
    "<%= config.bin %> files put hanke/analysis ./train.py",
    "<%= config.bin %> files put hanke/analysis ./train.py src/train.py",
    "<%= config.bin %> files put hanke/analysis ./train.py src/train.py --force",
  ];

  static args = {
    project: projectArg,
    local: Args.string({ description: "Local file to upload.", required: true }),
    remote: Args.string({
      description: "Destination inside the project. Defaults to the local file's name in the project root.",
    }),
  };

  static flags = {
    force: Flags.boolean({
      description:
        "Upload even though the destination is occupied. The existing file stays; this one is stored under a numbered name.",
    }),
  };

  public async run(): Promise<Uploaded> {
    const local = path.resolve(this.args.local);
    if (!fs.existsSync(local) || !fs.statSync(local).isFile()) {
      throw new CaiCliError(`not a readable file: ${local}`, EXIT.USAGE);
    }

    /* Validated before the project lookup so a bad destination costs no calls,
     * and validated here as well as in core because the message a user sees
     * should name the argument they typed. */
    const remote = assertUploadPath(this.args.remote ?? path.basename(local));
    const directory = remote.includes("/") ? remote.slice(0, remote.lastIndexOf("/")) : ".";
    const name = remote.slice(remote.lastIndexOf("/") + 1);

    const client = this.client();
    const project = await resolveProject(client, this.args.project);
    const projectId = project.id as string;

    /* One listing before the upload, for the only question that matters: is
     * something already there? Verified live — the API answers 200 and quietly
     * stores a numbered copy instead of replacing, so without this check an agent
     * that re-uploads a file would go on reading the stale one indefinitely. */
    const before = await namesIn(client, projectId, directory);
    const occupied = before.has(name);
    if (occupied && !this.flags.force) {
      throw new CaiCliError(
        `${remote} already exists in ${this.args.project} and the API cannot replace it; ` +
          "pass --force to store this upload alongside it under a numbered name, or remove the file first",
        EXIT.USAGE,
      );
    }

    const bytes = fs.readFileSync(local);
    await uploadFile(client, projectId, remote, bytes);

    /* Only when the name was taken, and only because the response does not say
     * which name it chose. One new entry is the answer; anything else and the
     * requested path is the most honest thing to report. */
    let stored = remote;
    if (occupied) {
      const added = [...(await namesIn(client, projectId, directory))].filter((entry) => !before.has(entry));
      if (added.length === 1) {
        stored = directory === "." ? added[0] : `${directory}/${added[0]}`;
      }
    }

    return this.emit<Uploaded>({ project: projectId, path: remote, bytes: bytes.byteLength, stored }, [
      { header: "path", get: (u) => u.path },
      { header: "bytes", get: (u) => u.bytes },
      { header: "stored", get: (u) => u.stored },
    ]);
  }
}

/**
 * Every name in one project directory.
 *
 * Asks the directory rather than the file: a listing of a missing path is a 404,
 * which would have to be told apart from a real failure, while a listing of an
 * existing directory answers for every name in it at once. Entries come back as
 * basenames, so the comparison is against the last segment.
 */
async function namesIn(client: CaiClient, projectId: string, directory: string): Promise<Set<string>> {
  try {
    const entries = await listFiles(client, projectId, directory);
    return new Set(entries.map((entry) => entry.path).filter((p): p is string => typeof p === "string"));
  } catch (err) {
    /* A destination directory that does not exist yet holds nothing. Only that
     * case is swallowed: a 401 or a dead connection must still surface with its
     * own exit code rather than being read as "nothing there", which would turn a
     * credential problem into an upload attempt. */
    if (err instanceof CaiApiError && err.status === 404) {
      return new Set();
    }
    throw err;
  }
}
