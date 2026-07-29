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

import * as crypto from "crypto";
import * as vscode from "vscode";

function nonce(): string {
  return crypto.randomBytes(16).toString("base64");
}

/**
 * Static shell for the session form. Every value the user sees is filled in by
 * media/sessionForm.js from the `init` message, so no untrusted string is ever
 * interpolated into this markup.
 */
export function renderSessionFormHtml(webview: vscode.Webview, mediaRoot: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "sessionForm.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, "sessionForm.css"));
  const scriptNonce = nonce();
  const csp = [
    "default-src 'none'",
    `style-src ${webview.cspSource}`,
    `script-src 'nonce-${scriptNonce}'`,
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy" content="${csp.join("; ")};" />
  <link rel="stylesheet" href="${styleUri.toString()}" />
  <title>New session</title>
</head>
<body>
  <main class="shell" id="formView">
    <h1 id="formTitle">New session</h1>
    <p class="subhead" id="subhead"></p>

    <div class="banner" id="banner" hidden>
      <span class="glyph" aria-hidden="true">!</span>
      <div class="body">
        <ul id="bannerList"></ul>
        <div class="actions">
          <button type="button" class="btn-link" id="bannerRetry">Try again</button>
          <button type="button" class="btn-link" id="bannerOutput">Show output</button>
        </div>
      </div>
    </div>

    <section class="group" id="recallGroup" hidden>
      <div class="group-head">
        <span class="group-title">Start from a previous session</span>
        <span class="group-aside">Click to fill the form</span>
      </div>
      <div class="recall" id="recallList"></div>
    </section>

    <section class="group">
      <div class="group-head"><span class="group-title">Project</span></div>
      <div class="field">
        <label for="project">Project name</label>
        <input type="text" id="project" list="projectList" autocomplete="off" spellcheck="false"
               aria-describedby="projectHint" />
        <datalist id="projectList"></datalist>
        <span class="hint" id="projectHint"></span>
      </div>
    </section>

    <section class="group">
      <div class="group-head">
        <span class="group-title">Runtime</span>
        <span class="group-aside" id="runtimeCount"></span>
      </div>

      <div class="triple">
        <div class="field">
          <label for="editor">Editor</label>
          <select id="editor"></select>
        </div>
        <div class="field">
          <label for="kernel">Kernel</label>
          <select id="kernel"></select>
        </div>
        <div class="field">
          <label for="edition">Edition</label>
          <select id="edition"></select>
        </div>
      </div>

      <div class="resolved" id="resolved">
        <span class="title" id="resolvedTitle"></span>
        <span class="image" id="resolvedImage"></span>
      </div>

      <div class="browse-all">
        <button type="button" class="btn-link" id="browseToggle" aria-expanded="false">Browse all runtimes</button>
        <button type="button" class="btn-link" id="refreshRuntimes">Refresh from CML</button>
        <div id="browsePanel" hidden>
          <div class="field" style="margin-top:8px">
            <label for="runtimeSearch" class="hint">Filter by any words</label>
            <input type="text" id="runtimeSearch" placeholder="jupyter 3.11" autocomplete="off" spellcheck="false" />
          </div>
          <div class="runtime-list" id="runtimeList" role="listbox" aria-label="All runtimes"></div>
        </div>
      </div>

      <div class="field" style="margin-top:16px">
        <label for="addon">Runtime addon</label>
        <select id="addon"></select>
      </div>
    </section>

    <section class="group">
      <div class="group-head">
        <span class="group-title">Resources</span>
        <span class="group-aside">Fractional CPU allowed, for example 0.5</span>
      </div>

      <div class="resources">
        <fieldset>
          <legend>CPUs</legend>
          <div class="chips" id="cpuChips" role="group" aria-label="CPU profiles"></div>
          <input type="number" id="cpus" min="0.25" step="0.25" inputmode="decimal" aria-describedby="cpuMsg" />
          <span class="msg" id="cpuMsg"></span>
        </fieldset>

        <fieldset>
          <legend>Memory <span class="unit">(GB)</span></legend>
          <div class="chips" id="memChips" role="group" aria-label="Memory profiles"></div>
          <input type="number" id="mem" min="0.5" step="0.5" inputmode="decimal" aria-describedby="memMsg" />
          <span class="msg" id="memMsg"></span>
        </fieldset>

        <fieldset>
          <legend>GPUs</legend>
          <div class="chips" id="gpuChips" role="group" aria-label="GPU count"></div>
          <input type="number" id="gpus" min="0" step="1" inputmode="numeric" aria-describedby="gpuMsg" />
          <span class="msg" id="gpuMsg"></span>
        </fieldset>
      </div>

      <label class="checkbox-row" id="saveDefaultsRow">
        <input type="checkbox" id="saveDefaults" />
        Use these resources as my defaults for new sessions
      </label>
    </section>
  </main>

  <div class="footer" id="formFooter">
    <div class="footer-inner">
      <div class="cmd" id="cmdPreview" aria-live="polite" aria-label="Command preview"></div>
      <div class="actions-row">
        <button type="button" class="btn btn-primary" id="submitBtn">Create session</button>
        <button type="button" class="btn btn-secondary" id="cancelBtn">Cancel</button>
        <span class="spacer"></span>
        <span class="kbd-note" id="kbdNote"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> to create</span>
      </div>
    </div>
  </div>

  <main class="progress" id="progressView" hidden>
    <h1 id="progressTitle"></h1>
    <p class="subhead" id="progressSubhead"></p>

    <ol class="steps" id="steps" aria-live="polite"></ol>

    <div class="budget" id="budget">
      <div class="budget-meta">
        <span id="budgetTotal"></span>
        <span id="budgetLeft"></span>
      </div>
      <div class="track"><div class="fill" id="budgetFill"></div></div>
    </div>

    <div class="banner" id="progressFailed" hidden>
      <span class="glyph" aria-hidden="true">!</span>
      <div class="body"><span id="progressFailedText"></span></div>
    </div>

    <div class="progress-actions">
      <button type="button" class="btn btn-secondary" id="progressCancel">Close</button>
      <button type="button" class="btn-link" id="progressOutput">Show output</button>
    </div>
  </main>

  <script nonce="${scriptNonce}" src="${scriptUri.toString()}"></script>
</body>
</html>`;
}
