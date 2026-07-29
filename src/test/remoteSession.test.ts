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
import {
  aliasForRemoteAuthority, commonWorkspaceAuthority, isRecordInRemoteWorkspace,
} from "../remoteSession";
import { SessionRecord } from "../types";

function record(hostAlias?: string): SessionRecord {
  return {
    id: "session-1",
    projectName: "owner/project",
    runtimeId: 1,
    addonId: null,
    cpus: 2,
    memoryGb: 4,
    gpus: 0,
    status: "active",
    hostAlias,
    startedAt: "2026-07-29T00:00:00.000Z",
  };
}

test("recognizes only managed Remote-SSH aliases", () => {
  assert.strictEqual(aliasForRemoteAuthority("ssh-remote+cml-project"), "cml-project");
  assert.strictEqual(aliasForRemoteAuthority("ssh-remote+cml-project-2"), "cml-project-2");
  assert.strictEqual(aliasForRemoteAuthority("ssh-remote+other-host"), undefined);
  assert.strictEqual(aliasForRemoteAuthority("dev-container+container"), undefined);
});

test("matches the current remote workspace to exactly one session record", () => {
  assert.strictEqual(isRecordInRemoteWorkspace(record("cml-project"), "ssh-remote+cml-project"), true);
  assert.strictEqual(isRecordInRemoteWorkspace(record("cml-other"), "ssh-remote+cml-project"), false);
  assert.strictEqual(isRecordInRemoteWorkspace(record(), "ssh-remote+cml"), true);
});

test("declines to identify a current session from mixed workspace authorities", () => {
  assert.strictEqual(commonWorkspaceAuthority(["ssh-remote+cml-project"]), "ssh-remote+cml-project");
  assert.strictEqual(commonWorkspaceAuthority(["ssh-remote+cml-project", "ssh-remote+cml-project"]), "ssh-remote+cml-project");
  assert.strictEqual(commonWorkspaceAuthority(["ssh-remote+cml-project", "" ]), undefined);
  assert.strictEqual(commonWorkspaceAuthority([], "ssh-remote+cml-project"), "ssh-remote+cml-project");
});