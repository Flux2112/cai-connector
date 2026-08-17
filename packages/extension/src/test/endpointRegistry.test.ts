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
import * as cp from "child_process";
import { test } from "node:test";
import {
  ActiveEndpoint,
  findEndpointByPid,
  forgetEndpoint,
  getEndpoint,
  killEndpoint,
  listEndpoints,
  registerEndpoint,
  setSessionId,
  surrenderEndpoint,
  trackedPids,
} from "../endpointRegistry";

function endpoint(id: string, pid?: number): ActiveEndpoint {
  return {
    id,
    process: { pid } as cp.ChildProcess,
    cdswctlPath: "C:/tools/cdswctl.exe",
    project: "owner/project",
    hostAlias: `cml-${id}`,
    surrendered: false,
  };
}

test("tracks parallel endpoints independently and only surrenders the requested tunnel", () => {
  const first = endpoint("endpoint-registry-first", 10101);
  const second = endpoint("endpoint-registry-second", 10102);
  const withoutPid = endpoint("endpoint-registry-without-pid");

  registerEndpoint(first);
  registerEndpoint(second);

  try {
    assert.deepStrictEqual(listEndpoints(), [first, second]);
    assert.deepStrictEqual(trackedPids(), [10101, 10102]);
    assert.strictEqual(findEndpointByPid(10102), second);
    assert.strictEqual(findEndpointByPid(undefined), undefined);

    setSessionId(first.id, "session-first");
    surrenderEndpoint(first.id);
    surrenderEndpoint("not-tracked");

    assert.strictEqual(getEndpoint(first.id)?.sessionId, "session-first");
    assert.strictEqual(getEndpoint(first.id)?.surrendered, true);
    assert.strictEqual(getEndpoint(second.id)?.sessionId, undefined);
    assert.strictEqual(getEndpoint(second.id)?.surrendered, false);

    forgetEndpoint(first.id);
    assert.deepStrictEqual(trackedPids(), [10102]);

    registerEndpoint(withoutPid);
    assert.strictEqual(killEndpoint(withoutPid.id), false);
    assert.strictEqual(getEndpoint(withoutPid.id), undefined);
  } finally {
    forgetEndpoint(first.id);
    forgetEndpoint(second.id);
    forgetEndpoint(withoutPid.id);
  }
});