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

import * as assert from "assert";
import * as net from "net";
import { test } from "node:test";
import { ConnectParams } from "../types";
import { buildEndpointArgs, findAvailablePort } from "../utils";

const params: ConnectParams = {
  project: "owner/project",
  runtimeId: 249,
  addonId: 49,
  cpus: 2,
  memory: 4,
  gpus: 0,
  cdswctlPath: "C:\\Program Files\\CDSW\\cdswctl.exe",
  autoStopSessions: false,
};

test("passes the selected local port to cdswctl", () => {
  assert.deepStrictEqual(buildEndpointArgs(params, 6109), [
    "ssh-endpoint",
    "-p",
    "owner/project",
    "-r",
    "249",
    "-c",
    "2",
    "-m",
    "4",
    "-g",
    "0",
    "--addons=49",
    "--port",
    "6109",
  ]);
});

test("allocates a local port that can be bound", async () => {
  const port = await findAvailablePort();

  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, () => server.close((err) => (err ? reject(err) : resolve())));
  });
});