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
import { test } from "node:test";
import { untrackedEndpointPids } from "../endpointManager";
import { SessionRecord } from "../types";

function record(id: string, endpointPid: number): SessionRecord {
  return {
    id,
    projectName: "owner/project",
    runtimeId: 249,
    addonId: 49,
    cpus: 2,
    memoryGb: 4,
    gpus: 0,
    status: "starting",
    endpointStatus: "running",
    cmlStatus: "unknown",
    endpointPid,
    startedAt: "2026-07-29T15:00:00.000Z",
  };
}

test("keeps an endpoint recorded while a cleanup sweep was in flight", () => {
  const firstSnapshot = [20428];
  const secondProcessScan = [...firstSnapshot, 6156];
  const historyNow = [record("existing", 20428), record("newly-created", 6156)];

  assert.deepStrictEqual(untrackedEndpointPids(secondProcessScan, historyNow), []);
});