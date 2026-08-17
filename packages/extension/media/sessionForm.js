/*
 * Copyright (C) 2026 Marvin Hanke
 * Licensed under the GNU General Public License v3.0 or later.
 *
 * Webview script for the session form. Plain ES2020 — this file is not
 * compiled, bundled or type-checked, so it stays dependency-free and small.
 *
 * The validation here exists for instant feedback only. The extension host
 * re-validates every submission in sessionFormModel.ts and is the authority.
 */

(function () {
  "use strict";

  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);

  /** @type {any} */
  let init = null;
  let runtimes = [];
  let selectedRuntimeId = null;
  let submitting = false;
  let ticker = null;
  let waitStartedAt = 0;

  const STEPS = [
    { key: "stopping-previous", running: "Stopping the previous session", done: "Stopped the previous session", optional: true },
    { key: "spawned", running: "Starting cdswctl", done: "Launched cdswctl" },
    { key: "session-created", running: "Asking CML for a session", done: "CML created the session" },
    { key: "endpoint-ready", running: "Waiting for the SSH endpoint", done: "SSH endpoint is ready" },
    { key: "ssh-config", running: "Updating ~/.ssh/config", done: "Wrote the cml host into ~/.ssh/config" },
    { key: "opening-window", running: "Opening the remote window", done: "Opened the remote window" },
  ];
  const seen = new Map();
  let failedAt = null;

  // ---------- shared with resourceInput.ts: 0,5 must mean one half ----------
  function parseNumeric(raw) {
    const text = String(raw).trim().replace(",", ".");
    if (!/^\d*\.?\d+$/.test(text)) {
      return NaN;
    }
    return Number(text);
  }

  function setMsg(el, input, issue) {
    el.textContent = "";
    el.className = "msg";
    input.setAttribute("aria-invalid", String(Boolean(issue) && issue.severity === "error"));
    if (!issue) {
      return;
    }
    const glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.setAttribute("aria-hidden", "true");
    glyph.textContent = issue.severity === "error" ? "✕" : "!";
    el.appendChild(glyph);
    el.appendChild(document.createTextNode(issue.message));
    el.classList.add(issue.severity === "error" ? "error" : "warn");
  }

  function cpuIssue(value) {
    const n = parseNumeric(value);
    if (Number.isNaN(n)) {
      return { severity: "error", message: "Enter a number, such as 0.5 or 2." };
    }
    if (n <= 0) {
      return { severity: "error", message: "Use more than 0 CPUs." };
    }
    if (init.cpuProfiles.length > 0 && !init.cpuProfiles.includes(n)) {
      return { severity: "warning", message: "No CPU profile of this size is deployed — CML may reject the session." };
    }
    return null;
  }

  function memIssue(value) {
    const n = parseNumeric(value);
    return Number.isNaN(n) || n <= 0
      ? { severity: "error", message: "Enter memory in GB, such as 8." }
      : null;
  }

  function gpuIssue(value) {
    const n = parseNumeric(value);
    return Number.isNaN(n) || !Number.isInteger(n)
      ? { severity: "error", message: "Use a whole number of GPUs — 0 if you don't need one." }
      : null;
  }

  // ---------- runtime navigation ----------
  function uniq(values) {
    return Array.from(new Set(values));
  }

  function selectedRuntime() {
    return runtimes.find((r) => r.id === selectedRuntimeId) || null;
  }

  function matching(editor, kernel, edition) {
    return runtimes.filter(
      (r) =>
        (editor === undefined || r.editor === editor) &&
        (kernel === undefined || r.kernel === kernel) &&
        (edition === undefined || r.edition === edition),
    );
  }

  function fillSelect(select, values, preferred) {
    select.textContent = "";
    for (const value of values) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    if (preferred !== undefined && values.includes(preferred)) {
      select.value = preferred;
    }
  }

  /** Rebuilds the kernel/edition options for the chosen editor, then resolves an id. */
  function cascade(preferKernel, preferEdition) {
    const editorSel = $("editor");
    const kernelSel = $("kernel");
    const editionSel = $("edition");

    fillSelect(editorSel, uniq(runtimes.map((r) => r.editor)), editorSel.value || undefined);
    fillSelect(
      kernelSel,
      uniq(matching(editorSel.value).map((r) => r.kernel)),
      preferKernel !== undefined ? preferKernel : kernelSel.value,
    );
    fillSelect(
      editionSel,
      uniq(matching(editorSel.value, kernelSel.value).map((r) => r.edition)),
      preferEdition !== undefined ? preferEdition : editionSel.value,
    );

    const candidates = matching(editorSel.value, kernelSel.value, editionSel.value);
    // Highest id is the newest build of that combination.
    selectedRuntimeId = candidates.length > 0 ? Math.max(...candidates.map((r) => r.id)) : null;
  }

  /** Points the three selects at an explicitly chosen runtime. */
  function selectRuntime(id) {
    const runtime = runtimes.find((r) => r.id === id);
    if (!runtime) {
      return;
    }
    $("editor").value = runtime.editor;
    cascade(runtime.kernel, runtime.edition);
    selectedRuntimeId = id;
  }

  function renderResolved() {
    const box = $("resolved");
    const runtime = selectedRuntime();
    if (!runtime) {
      box.classList.add("empty");
      $("resolvedTitle").textContent = "No runtime matches that combination";
      $("resolvedImage").textContent = "Pick a different kernel or edition.";
      return;
    }
    box.classList.remove("empty");
    const siblings = matching(runtime.editor, runtime.kernel, runtime.edition).length;
    const extra = siblings > 1 ? ` · newest of ${siblings} versions` : "";
    $("resolvedTitle").textContent =
      `Runtime ${runtime.id} · ${runtime.editor} / ${runtime.kernel} / ${runtime.edition} · ${runtime.shortVersion}${extra}`;
    $("resolvedImage").textContent = runtime.imageIdentifier;
  }

  function renderRuntimeList() {
    const terms = $("runtimeSearch").value.toLowerCase().split(/\s+/).filter(Boolean);
    const list = $("runtimeList");
    list.textContent = "";
    const shown = runtimes.filter((r) => {
      const hay = `${r.id} ${r.editor} ${r.kernel} ${r.edition} ${r.shortVersion} ${r.imageIdentifier}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });

    if (shown.length === 0) {
      const note = document.createElement("div");
      note.className = "empty-note";
      note.textContent = "No runtime matches those words.";
      list.appendChild(note);
      return;
    }

    for (const runtime of shown) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "runtime-row";
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(runtime.id === selectedRuntimeId));

      const rid = document.createElement("span");
      rid.className = "rid";
      rid.textContent = String(runtime.id);
      const name = document.createElement("span");
      name.textContent = `${runtime.editor} · ${runtime.kernel} · ${runtime.edition}`;
      const ver = document.createElement("span");
      ver.className = "ver";
      ver.textContent = runtime.shortVersion;

      row.append(rid, name, ver);
      row.addEventListener("click", () => {
        selectRuntime(runtime.id);
        render();
      });
      list.appendChild(row);
    }
  }

  function renderProjectHint() {
    const raw = $("project").value.trim();
    const hint = $("projectHint");
    hint.textContent = "";
    if (!raw) {
      hint.append(document.createTextNode("Enter the "));
      const path = document.createElement("code");
      path.textContent = "USER/PROJECT";
      hint.append(path, document.createTextNode(" path from the CML project URL, for example "));
      const example = document.createElement("code");
      example.textContent = "owner/my-project";
      hint.append(example, document.createTextNode(". Do not use the project display name."));
      appendProjectsLink(hint);
      return;
    }
    if (raw.includes("/")) {
      hint.append(document.createTextNode("Connecting to "));
      const code = document.createElement("code");
      code.textContent = raw;
      hint.append(code, document.createTextNode("."));
      appendProjectsLink(hint);
      return;
    }
    hint.append(document.createTextNode("Connecting to "));
    const code = document.createElement("code");
    code.textContent = `${init.username}/${raw}`;
    hint.append(code, document.createTextNode(" — your username is added automatically. Type "));
    const alt = document.createElement("code");
    alt.textContent = `owner/${raw}`;
    hint.append(alt, document.createTextNode(" for someone else's project."));
    appendProjectsLink(hint);
  }

  function appendProjectsLink(hint) {
    if (!init.projectsUrl) {
      return;
    }
    const link = document.createElement("a");
    link.href = init.projectsUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open CML projects";
    hint.append(document.createTextNode(" "), link);
  }

  function syncChips(groupId, input) {
    const value = parseNumeric(input.value);
    for (const chip of $(groupId).querySelectorAll(".chip")) {
      chip.setAttribute("aria-pressed", String(Number(chip.dataset.v) === value));
    }
  }

  function renderCmd() {
    const runtime = selectedRuntime();
    const raw = $("project").value.trim();
    const project = raw.includes("/") ? raw : `${init.username}/${raw || "project"}`;
    const preview = $("cmdPreview");
    preview.textContent = "";

    const prompt = document.createElement("span");
    prompt.className = "prompt";
    prompt.setAttribute("aria-hidden", "true");
    prompt.textContent = ">";
    preview.appendChild(prompt);

    const line = document.createElement("span");
    const push = (text, className) => {
      const span = document.createElement("span");
      if (className) {
        span.className = className;
      }
      span.textContent = text;
      line.appendChild(span);
    };
    const value = (text) => {
      const b = document.createElement("b");
      b.textContent = text;
      line.appendChild(b);
    };

    push("cdswctl ssh-endpoint ");
    push("-p", "flag");
    push(" ");
    value(project);
    push(" ");
    push("-r", "flag");
    push(" ");
    value(runtime ? String(runtime.id) : "?");
    push(" ");
    push("-c", "flag");
    push(" ");
    value($("cpus").value.trim() || "?");
    push(" ");
    push("-m", "flag");
    push(" ");
    value($("mem").value.trim() || "?");
    push(" ");
    push("-g", "flag");
    push(" ");
    value($("gpus").value.trim() || "0");
    if ($("addon").value !== "0") {
      push(" ");
      push("--addons=", "flag");
      value($("addon").value);
    }
    preview.appendChild(line);
  }

  function render() {
    renderResolved();
    renderRuntimeList();
    renderProjectHint();

    const cpu = cpuIssue($("cpus").value);
    const mem = memIssue($("mem").value);
    const gpu = gpuIssue($("gpus").value);
    setMsg($("cpuMsg"), $("cpus"), cpu);
    setMsg($("memMsg"), $("mem"), mem);
    setMsg($("gpuMsg"), $("gpus"), gpu);

    syncChips("cpuChips", $("cpus"));
    syncChips("memChips", $("mem"));
    syncChips("gpuChips", $("gpus"));

    const blocked =
      submitting ||
      !$("project").value.trim() ||
      !selectedRuntime() ||
      [cpu, mem, gpu].some((issue) => issue && issue.severity === "error");
    $("submitBtn").disabled = blocked;
    renderCmd();
  }

  // ---------- chips ----------
  function buildChips(groupId, values, input) {
    const group = $(groupId);
    group.textContent = "";
    for (const value of values) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.v = String(value);
      chip.textContent = String(value);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        input.value = String(value);
        render();
      });
      group.appendChild(chip);
    }
  }

  // ---------- recall cards ----------
  function relativeTime(iso) {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) {
      return "";
    }
    const mins = Math.round((Date.now() - then) / 60000);
    if (mins < 1) {
      return "just now";
    }
    if (mins < 60) {
      return `${mins} min ago`;
    }
    const hours = Math.round(mins / 60);
    if (hours < 24) {
      return `${hours} h ago`;
    }
    const days = Math.round(hours / 24);
    return days === 1 ? "yesterday" : `${days} days ago`;
  }

  function buildRecents() {
    const list = $("recallList");
    list.textContent = "";
    if (init.recents.length === 0) {
      $("recallGroup").hidden = true;
      return;
    }
    $("recallGroup").hidden = false;

    for (const recent of init.recents) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "recall-card";
      card.dataset.status = recent.status;

      const stripe = document.createElement("span");
      stripe.className = "stripe";
      stripe.setAttribute("aria-hidden", "true");

      const middle = document.createElement("span");
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = recent.projectName;
      const meta = document.createElement("span");
      meta.className = "meta";
      const bits = [recent.runtimeLabel, `${recent.cpus} CPU`, `${recent.memoryGb} GB`];
      if (recent.gpus > 0) {
        bits.push(`${recent.gpus} GPU`);
      }
      if (recent.addonLabel) {
        bits.push(recent.addonLabel);
      }
      meta.textContent = bits.join(" · ");
      middle.append(name, meta);

      const right = document.createElement("span");
      right.className = "right";
      const pill = document.createElement("span");
      // "error" means the local endpoint and the CML session disagree — most
      // often a session still running on CML with no tunnel left.
      const pillText = {
        active: "running",
        starting: "starting",
        error: "needs cleanup",
        inactive: "stopped",
      };
      const isActive = recent.status === "active" || recent.status === "starting";
      pill.className = `pill ${isActive ? "active" : "idle"}`;
      pill.textContent = pillText[recent.status] || "stopped";
      right.appendChild(pill);
      const when = document.createElement("span");
      when.textContent = isActive && recent.port ? `port ${recent.port}` : relativeTime(recent.startedAt);
      right.appendChild(when);

      card.append(stripe, middle, right);
      card.addEventListener("click", () => {
        $("project").value = recent.projectName;
        if (recent.runtimeId != null && runtimes.some((r) => r.id === recent.runtimeId)) {
          selectRuntime(recent.runtimeId);
        }
        $("addon").value = recent.addonId != null ? String(recent.addonId) : "0";
        $("cpus").value = String(recent.cpus);
        $("mem").value = String(recent.memoryGb);
        $("gpus").value = String(recent.gpus);
        render();
        $("project").focus();
      });
      list.appendChild(card);
    }
  }

  // ---------- progress ----------
  function renderSteps() {
    const list = $("steps");
    list.textContent = "";
    const visible = STEPS.filter((s) => !s.optional || seen.has(s.key));
    const firstPending = visible.findIndex((s) => !seen.has(s.key));

    visible.forEach((step, index) => {
      const li = document.createElement("li");
      const done = seen.has(step.key);
      const isRunning = !done && index === firstPending;
      const isFailed = failedAt !== null && isRunning;
      li.dataset.state = isFailed ? "failed" : done ? "done" : isRunning ? "running" : "pending";

      const glyph = document.createElement("span");
      glyph.className = "glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = isFailed ? "✕" : done ? "✓" : isRunning ? "▪" : "▫";

      const body = document.createElement("span");
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = done ? step.done : step.running;
      body.appendChild(label);

      const detailText = isFailed ? failedAt : seen.get(step.key);
      if (detailText) {
        const detail = document.createElement("span");
        detail.className = "detail";
        detail.textContent = detailText;
        body.appendChild(detail);
      }

      const at = document.createElement("span");
      at.className = "at";
      at.id = isRunning ? "elapsed" : "";
      at.textContent = done ? formatMs(seen.get(`${step.key}:ms`)) : "";

      li.append(glyph, body, at);
      list.appendChild(li);
    });
  }

  function formatMs(ms) {
    if (typeof ms !== "number") {
      return "";
    }
    const total = Math.round(ms / 1000);
    return `0:${String(total).padStart(2, "0")}`;
  }

  function startTicker() {
    stopTicker();
    ticker = setInterval(() => {
      const elapsed = Date.now() - waitStartedAt;
      const remaining = Math.max(0, init.readyTimeoutMs - elapsed);
      const el = document.getElementById("elapsed");
      if (el) {
        el.textContent = formatMs(elapsed);
      }
      $("budgetLeft").textContent = `${Math.ceil(remaining / 1000)}s left`;
      $("budgetFill").style.width = `${Math.min(100, (elapsed / init.readyTimeoutMs) * 100)}%`;
      if (remaining === 0) {
        stopTicker();
      }
    }, 1000);
  }

  function stopTicker() {
    if (ticker !== null) {
      clearInterval(ticker);
      ticker = null;
    }
  }

  function showProgress(summary) {
    $("formView").hidden = true;
    $("formFooter").hidden = true;
    $("progressView").hidden = false;
    $("progressTitle").textContent = `Starting session in ${summary.project}`;
    $("progressSubhead").textContent = summary.detail;
    if (waitStartedAt === 0) {
      waitStartedAt = Date.now();
      $("budgetTotal").textContent = `Gives up after ${Math.round(init.readyTimeoutMs / 1000)} seconds`;
      startTicker();
    }
    renderSteps();
  }

  function showBanner(messages) {
    const banner = $("banner");
    const list = $("bannerList");
    list.textContent = "";
    if (!messages || messages.length === 0) {
      banner.hidden = true;
      return;
    }
    for (const message of messages) {
      const li = document.createElement("li");
      li.textContent = message;
      list.appendChild(li);
    }
    banner.hidden = false;
  }

  function showApiKeyPrompt(message) {
    $("formView").hidden = true;
    $("formFooter").hidden = true;
    $("progressView").hidden = true;
    $("apiKeyView").hidden = false;
    $("apiKeyMsg").textContent = message || "";
    $("apiKeyMsg").className = message ? "msg error" : "msg";
    $("apiKey").value = "";
    $("apiKeySubmit").disabled = false;
    $("apiKeySubmit").textContent = "Continue";
    $("apiKey").focus();
  }

  function submitApiKey() {
    const apiKey = $("apiKey").value.trim();
    if (!apiKey) {
      showApiKeyPrompt("Enter your CML API key.");
      return;
    }
    $("apiKeySubmit").disabled = true;
    $("apiKeySubmit").textContent = "Connecting…";
    vscode.postMessage({ type: "submitApiKey", apiKey });
    // The extension host receives a structured clone; keep no key in the page.
    $("apiKey").value = "";
  }

  function submit() {
    if ($("submitBtn").disabled) {
      return;
    }
    submitting = true;
    $("submitBtn").disabled = true;
    $("submitBtn").textContent = init.mode === "edit" ? "Saving…" : "Creating…";
    vscode.postMessage({
      type: "submit",
      payload: {
        project: $("project").value,
        runtimeId: selectedRuntimeId,
        addonId: $("addon").value,
        cpus: $("cpus").value,
        memoryGb: $("mem").value,
        gpus: $("gpus").value,
        saveAsDefaults: $("saveDefaults").checked,
      },
    });
  }

  function resetSubmit() {
    submitting = false;
    $("submitBtn").textContent = init.mode === "edit" ? "Save" : "Create session";
    render();
  }

  /**
   * Swaps in a freshly fetched runtime list without touching anything the user
   * has already typed. Keeps the current selection when it still exists.
   */
  function applyRuntimes(nextRuntimes, fromCache) {
    const previous = selectedRuntimeId;
    runtimes = nextRuntimes.slice();
    init.runtimes = runtimes;
    init.runtimesFromCache = fromCache;
    renderRuntimeCount();
    cascade();
    if (previous != null && runtimes.some((r) => r.id === previous)) {
      selectRuntime(previous);
    }
    render();
  }

  function renderRuntimeCount() {
    $("runtimeCount").textContent =
      `${runtimes.length} runtime${runtimes.length === 1 ? "" : "s"} available` +
      (init.latestRuntimesOnly ? " · newest versions only" : "") +
      (init.runtimesFromCache ? " · from cache" : "");
  }

  // ---------- wiring ----------
  function applyInit(next) {
    init = next;
    runtimes = init.runtimes.slice();

    $("formTitle").textContent = init.mode === "edit" ? "Edit saved session" : "New session";
    $("submitBtn").textContent = init.mode === "edit" ? "Save" : "Create session";
    $("kbdNote").lastChild.textContent = init.mode === "edit" ? " to save" : " to create";
    $("saveDefaultsRow").hidden = init.mode === "edit";
    $("subhead").textContent =
      init.mode === "edit"
        ? "Changes apply the next time this session is created."
        : `Signed in as ${init.username}.`;
    renderRuntimeCount();

    const projectList = $("projectList");
    projectList.textContent = "";
    for (const name of Array.from(new Set(init.recents.map((r) => r.projectName)))) {
      const option = document.createElement("option");
      option.value = name;
      projectList.appendChild(option);
    }

    const addonSel = $("addon");
    addonSel.textContent = "";
    const none = document.createElement("option");
    none.value = "0";
    none.textContent = "None";
    addonSel.appendChild(none);
    for (const addon of init.addons) {
      const option = document.createElement("option");
      option.value = String(addon.id);
      option.textContent = addon.displayName;
      addonSel.appendChild(option);
    }

    buildChips("cpuChips", init.cpuProfiles, $("cpus"));
    buildChips("memChips", init.memoryProfiles, $("mem"));
    buildChips("gpuChips", [0, 1, 2], $("gpus"));

    $("project").value = init.prefill.project;
    $("cpus").value = String(init.prefill.cpus);
    $("mem").value = String(init.prefill.memoryGb);
    $("gpus").value = String(init.prefill.gpus);
    $("addon").value = init.prefill.addonId != null ? String(init.prefill.addonId) : "0";
    if (addonSel.value === "" ) {
      addonSel.value = "0";
    }

    cascade();
    if (init.prefill.runtimeId != null && runtimes.some((r) => r.id === init.prefill.runtimeId)) {
      selectRuntime(init.prefill.runtimeId);
    }

    buildRecents();
    $("recallGroup").hidden = init.mode === "edit" || init.recents.length === 0;
    render();
    if (!init.prefill.project) {
      $("project").focus();
    }
  }

  window.addEventListener("message", (event) => {
    const message = event.data;
    switch (message.type) {
      case "init":
        applyInit(message.init);
        break;
      case "runtimes":
        applyRuntimes(message.runtimes, message.fromCache);
        showBanner(null);
        break;
      case "banner":
        showBanner(message.message ? [message.message] : null);
        break;
      case "requestApiKey":
        showApiKeyPrompt(null);
        break;
      case "apiKeyError":
        showApiKeyPrompt(message.message);
        break;
      case "invalid":
        showBanner(message.errors);
        resetSubmit();
        break;
      case "progress":
        seen.set(message.step, message.detail || "");
        seen.set(`${message.step}:ms`, message.elapsedMs);
        showProgress(message.summary);
        break;
      case "failed":
        // Force the progress view even if no step ever arrived, so a failure
        // can never leave the form stuck behind a disabled button.
        $("formView").hidden = true;
        $("formFooter").hidden = true;
        $("progressView").hidden = false;
        failedAt = message.message;
        stopTicker();
        renderSteps();
        $("progressFailed").hidden = false;
        $("progressFailedText").textContent = message.message;
        $("budget").hidden = true;
        break;
      default:
        break;
    }
  });

  for (const id of ["editor", "kernel"]) {
    $(id).addEventListener("change", () => {
      cascade();
      render();
    });
  }
  $("edition").addEventListener("change", () => {
    cascade($("kernel").value, $("edition").value);
    render();
  });
  $("addon").addEventListener("change", render);
  $("project").addEventListener("input", render);
  $("runtimeSearch").addEventListener("input", renderRuntimeList);

  for (const id of ["cpus", "mem", "gpus"]) {
    const input = $(id);
    input.addEventListener("input", render);
    // Show the user what their comma became, rather than silently reinterpreting it.
    input.addEventListener("blur", () => {
      const parsed = parseNumeric(input.value);
      if (!Number.isNaN(parsed)) {
        input.value = String(parsed);
      }
      render();
    });
  }

  $("browseToggle").addEventListener("click", () => {
    const panel = $("browsePanel");
    const opening = panel.hidden;
    panel.hidden = !opening;
    $("browseToggle").setAttribute("aria-expanded", String(opening));
    $("browseToggle").textContent = opening ? "Hide the full list" : "Browse all runtimes";
    if (opening) {
      $("runtimeSearch").focus();
    }
  });

  $("submitBtn").addEventListener("click", submit);
  $("cancelBtn").addEventListener("click", () => vscode.postMessage({ type: "cancel" }));
  $("apiKeySubmit").addEventListener("click", submitApiKey);
  $("apiKeyCancel").addEventListener("click", () => vscode.postMessage({ type: "cancel" }));
  $("apiKey").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      submitApiKey();
    }
  });
  $("progressCancel").addEventListener("click", () => vscode.postMessage({ type: "cancel" }));
  for (const id of ["bannerOutput", "progressOutput"]) {
    $(id).addEventListener("click", () => vscode.postMessage({ type: "showOutput" }));
  }
  $("bannerRetry").addEventListener("click", () => vscode.postMessage({ type: "refreshRuntimes" }));
  $("refreshRuntimes").addEventListener("click", () => vscode.postMessage({ type: "refreshRuntimes" }));

  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });

  vscode.postMessage({ type: "ready" });
})();
