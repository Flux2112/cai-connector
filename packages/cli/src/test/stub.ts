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

import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import type { AddressInfo } from "node:net";

export type StubRequest = { method: string; url: string; authorization?: string };

export type StubReply = { status?: number; json?: unknown; bytes?: Uint8Array };

export type Stub = {
  url: string;
  requests: StubRequest[];
  close(): Promise<void>;
};

/**
 * A real HTTP server, as core's own tests use, so a command exercises the
 * genuine transport rather than a mocked client. The CLI keeps its own copy
 * because core does not publish its test helpers.
 */
export async function startStub(reply: (req: StubRequest) => StubReply): Promise<Stub> {
  const requests: StubRequest[] = [];
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const recorded: StubRequest = {
        method: req.method ?? "",
        url: req.url ?? "",
        authorization: req.headers.authorization,
      };
      requests.push(recorded);
      const answer = reply(recorded);
      if (answer.bytes) {
        res.writeHead(answer.status ?? 200, { "content-type": "application/octet-stream" });
        res.end(Buffer.from(answer.bytes));
        return;
      }
      res.writeHead(answer.status ?? 200, { "content-type": "application/json" });
      res.end(answer.json === undefined ? "" : JSON.stringify(answer.json));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export type CommandResult = { stdout: string; stderr: string; exitCode: number };

/** Variables that would otherwise let the developer's own machine answer for
 *  the test — the credentials the CLI is designed to find without being told. */
const AMBIENT = ["CML_API_KEY", "CAI_URL", "CML_URL", "XDG_CONFIG_HOME"] as const;

/**
 * Run the real binary in a child process.
 *
 * In-process execution was tried first and abandoned: capturing output means
 * replacing `process.stdout.write`, and `node --test`'s own reporter writes
 * there too, so a whole file's results vanished into the capture buffer. A child
 * process also makes the exit code a genuine observation rather than a reading
 * of `process.exitCode`, and the exit code is part of this CLI's contract.
 *
 * The ambient environment is stripped rather than inherited: anyone running
 * these tests on a machine that uses the CLI has `CML_API_KEY` set, which would
 * silently satisfy the very resolution some of the tests are checking. The
 * config directory is pointed at an empty temporary path for the same reason.
 */
export async function runCommand(argv: string[], env: Record<string, string> = {}): Promise<CommandResult> {
  const pkgRoot = path.resolve(__dirname, "..", "..");
  const bin = path.join(pkgRoot, "bin", "run.js");
  const emptyConfig = fs.mkdtempSync(path.join(os.tmpdir(), "cai-cli-env-"));

  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  for (const name of AMBIENT) {
    delete childEnv[name];
  }
  childEnv[process.platform === "win32" ? "APPDATA" : "XDG_CONFIG_HOME"] = emptyConfig;
  Object.assign(childEnv, env);

  return new Promise<CommandResult>((resolve) => {
    execFile(
      process.execPath,
      [bin, ...argv],
      { env: childEnv, cwd: pkgRoot, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const code = err && typeof (err as { code?: unknown }).code === "number" ? (err as { code: number }).code : 0;
        resolve({ stdout, stderr, exitCode: code });
      },
    );
  });
}

/**
 * Pull the error report out of stderr.
 *
 * stderr also carries oclif's own warnings — the `--api-key` notice, for one —
 * so the report is located by its leading key rather than by assuming it is
 * everything that was written.
 */
export function parseReport(stderr: string): { error: string; code: number; status?: number; apiCode?: number } {
  const start = stderr.lastIndexOf('{\n  "error"');
  if (start < 0) {
    throw new Error(`no error report found in stderr: ${stderr}`);
  }
  return JSON.parse(stderr.slice(start));
}
