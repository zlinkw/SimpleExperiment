"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPanelHtml = renderPanelHtml;
function renderPanelHtml() {
    const nonce = String(Date.now());
    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZLK Cluster</title>
  <style>
    body { margin: 0; padding: 16px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); }
    h2 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
    h3 { margin: 18px 0 8px; font-size: 13px; font-weight: 600; }
    input, select { min-height: 26px; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); }
    input.wide { width: 100%; box-sizing: border-box; }
    .row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 8px; padding: 4px 0; }
    .label, .muted { color: var(--vscode-descriptionForeground); }
    .value, .pathCell { overflow-wrap: anywhere; }
    .toolbar, .actionGrid, .summaryLine { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
    button { color: var(--vscode-button-foreground); background: var(--vscode-button-background); border: 0; padding: 6px 9px; border-radius: 3px; cursor: pointer; }
    button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
    button:disabled { opacity: .45; cursor: not-allowed; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 10px; background: var(--vscode-textCodeBlock-background); border-radius: 4px; max-height: 240px; overflow: auto; }
    .cardGrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
    .card { padding: 10px; border: 1px solid var(--vscode-panel-border); border-radius: 4px; background: var(--vscode-editor-background); }
    .table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .table th, .table td { border-bottom: 1px solid var(--vscode-panel-border); padding: 4px 6px; text-align: left; vertical-align: top; }
    .selectedRow { outline: 1px solid var(--vscode-focusBorder); }
    .status-running, .status-testing, .status-queued { color: var(--vscode-testing-iconQueued); font-weight: 600; }
    .status-completed { color: var(--vscode-testing-iconPassed); }
    .status-failed { color: var(--vscode-testing-iconFailed); font-weight: 600; }
    .status-warning { color: var(--vscode-editorWarning-foreground); }
    .progressTrack { height: 6px; background: var(--vscode-editorWidget-background); border-radius: 3px; overflow: hidden; min-width: 70px; }
    .progressBar { height: 6px; background: var(--vscode-progressBar-background); }
    .pill { border: 1px solid var(--vscode-panel-border); border-radius: 4px; padding: 2px 6px; background: var(--vscode-editor-background); }
    .mini { padding: 3px 6px; font-size: 11px; }
  </style>
</head>
<body>
  <h2>MobaXterm 实时隧道</h2>
  <div id="renderError" class="status-failed"></div>
  <div id="summary"></div>
  <div class="toolbar">
    <button data-command="importServers">导入服务器</button>
    <button data-command="configure">配置</button>
    <button data-command="start">启动 MobaXterm</button>
    <button data-command="startAll">启动全部隧道</button>
    <button data-command="test">检测隧道</button>
    <button data-command="restart" class="secondary">重启实时流</button>
    <button data-command="pauseStream" class="secondary">暂停实时流</button>
    <button data-command="resumeStream" class="secondary">恢复实时流</button>
    <button data-command="pauseAll" class="secondary">暂停全部网络</button>
    <button data-command="resumeNetwork" class="secondary">恢复网络</button>
    <button data-command="snapshot" class="secondary">手动快照</button>
    <button data-command="manualGpuSnapshot" class="secondary">刷新 GPU</button>
    <button data-command="manualSchedulerSnapshot" class="secondary">刷新任务</button>
    <button data-command="manualTracesSnapshot" class="secondary">刷新记录</button>
    <button data-command="script" class="secondary">生成脚本</button>
    <button data-command="realCheck" class="secondary">真实对接检测</button>
    <button data-command="status" class="secondary">状态详情</button>
    <button data-command="offline" class="secondary">导入离线包</button>
  </div>

  <h3>计划</h3>
  <input id="planFileInput" class="wide" placeholder="experiments/plans/example.yaml">
  <div id="recentPlans"></div>

  <h3>实验操作</h3>
  <div id="experimentActions" class="actionGrid"></div>

  <h3>结果操作</h3>
  <div id="resultActions" class="actionGrid"></div>

  <h3>归档与删除</h3>
  <div id="artifactActions" class="actionGrid"></div>

  <h3>诊断与自检</h3>
  <div id="diagnosticActions" class="actionGrid"></div>

  <h3>GPU 状态</h3>
  <div id="gpuSummary"></div>
  <div id="gpuGrid" class="cardGrid"></div>

  <h3>任务运行状态</h3>
  <div id="taskSummary"></div>
  <div id="taskTable"></div>

  <h3>实验记录</h3>
  <div id="traceTable"></div>

  <h3>操作进度</h3>
  <div id="operationList"></div>

  <h3>结果摘要</h3>
  <div id="resultSummary"></div>

  <h3>远端文件</h3>
  <div id="remoteFileActions" class="actionGrid"></div>
  <div id="remoteFiles"></div>

  <h3>文件传输队列</h3>
  <div id="transferTable"></div>

  <h3>实时日志</h3>
  <select id="logRunKeySelect"></select>
  <pre id="liveLog">请选择一个运行中的实验</pre>

  <h3>能力状态</h3>
  <div id="capabilities"></div>

  <h3>错误</h3>
  <div id="actionErrors"></div>

  <h3>诊断</h3>
  <pre id="details">等待状态...</pre>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const el = (id) => document.getElementById(id);
    let lastState = {};
    const uiCapabilityMap = {
      validatePlan: ["endpoints.actions"],
      dryRunPlan: ["endpoints.actions"],
      runPlan: ["endpoints.actions"],
      stopExperiment: ["endpoints.actions"],
      retryExperiment: ["endpoints.actions"],
      reproducePlan: ["endpoints.actions"],
      parseResults: ["endpoints.actions"],
      refreshResults: ["endpoints.actions"],
      runQualityGate: ["endpoints.actions"],
      runStatistics: ["endpoints.actions"],
      exportPaperTable: ["endpoints.actions"],
      archiveArtifacts: ["endpoints.actions"],
      syncArtifacts: ["endpoints.actions"],
      completeThreeWay: ["endpoints.actions"],
      deleteArtifacts: ["endpoints.actions"],
      reconcileDeletions: ["endpoints.actions"],
      selfCheck: ["endpoints.actions"],
      createDebugBundle: ["endpoints.actions"],
      downloadDebugBundle: ["endpoints.fileDownload"],
      openAuditTail: ["endpoints.actions"],
      listRemoteFiles: ["endpoints.fileList"],
      downloadRemoteFile: ["endpoints.fileDownload"],
      uploadRemoteFile: ["endpoints.fileUploadChunk"]
    };
    document.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-command]");
      if (!button || button.disabled) return;
      const command = button.dataset.command;
      const payload = payloadFromButton(button);
      if (button.dataset.confirm === "true" && !confirm("确认执行 " + button.textContent.trim() + " ?")) return;
      if (button.dataset.danger === "true" && (!confirm("危险操作：确认继续？") || !confirm("再次确认删除？"))) return;
      vscode.postMessage(Object.assign({ command }, payload));
    });
    el("planFileInput").addEventListener("change", (event) => {
      vscode.postMessage({ command: "selectPlan", planFile: event.target.value });
    });
    el("logRunKeySelect").addEventListener("change", (event) => {
      vscode.postMessage({ command: "selectLogRunKey", runKey: event.target.value });
    });
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "state") return;
      lastState = event.data.state || {};
      render(lastState);
    });

    function render(state) {
      try {
        el("renderError").textContent = "";
        renderSummary(state);
        renderHubWorkerAndPorts(state);
        renderPlanSection(state);
        renderActionSections(state);
        renderGpuSection(state);
        renderTaskSection(state);
        renderTraceSection(state);
        renderOperationSection(state);
        renderResultSummary(state);
        renderRemoteFiles(state);
        renderFileTransferSection(state);
        renderLogSection(state);
        renderCapabilities(state);
        renderActionErrors(state);
        el("details").textContent = JSON.stringify(state.diagnostics || {}, null, 2);
        applyUiLayout(state);
        decorateCards();
        updateLayoutToggle();
      } catch (error) {
        el("renderError").textContent = "UI 渲染失败：" + (error && error.message ? error.message : String(error));
      }
    }

    function commandNeedsLoading(command) {
      return !["selectPlan", "selectExperiment", "selectLogRunKey", "openPlan", "status"].includes(String(command || ""));
    }

    function pendingKeyForButton(button, command, payload) {
      if (button && (button.dataset.contextAction === "true" || button.dataset.batchSelected === "true")) return pendingKeyForAction(command, payload || {});
      return button.dataset.pendingKey || pendingKeyForAction(command, payload || {});
    }

    function pendingKeyForAction(command, payload) {
      const parts = [command];
      ["runKey", "experimentId", "archiveKey", "endpointId", "remotePath", "file", "planFile", "batchSelected"].forEach((key) => {
        const value = payload && payload[key];
        if (value) parts.push(key + "=" + String(value));
      });
      return parts.join("|");
    }

    function commandActionName(command) {
      const map = {
        validatePlan: "validate-plan",
        dryRunPlan: "dry-run-plan",
        runPlan: "run-plan",
        stopExperiment: "stop-experiment",
        retryExperiment: "retry-experiment",
        reproducePlan: "reproduce-plan",
        parseResults: "parse-results",
        refreshResults: "refresh-results",
        archiveArtifacts: "archive-artifacts",
        syncArtifacts: "sync-artifacts",
        completeThreeWay: "complete-three-way",
        deleteArtifacts: "delete-artifacts",
        reconcileDeletions: "reconcile-deletions",
        selfCheck: "self-check",
        createDebugBundle: "create-debug-bundle"
      };
      return map[command] || command;
    }

    function operationIsActive(status) {
      const value = String(status || "").toLowerCase();
      return ["accepted", "submitted", "pending", "queued", "running", "in_progress", "started", "progress"].some((item) => value.includes(item));
    }

    function clearCompletedPendingButtons(state) {
      const activeActions = new Set(normalizeOperationRows((state || {}).operations || {})
        .filter((row) => operationIsActive(row.status))
        .map((row) => String(row.type || "")));
      const now = Date.now();
      Object.keys(pendingActions).forEach((key) => {
        const item = pendingActions[key] || {};
        const age = now - Number(item.startedAt || 0);
        const action = commandActionName(item.command);
        const active = activeActions.has(action) || activeActions.has(String(item.command || ""));
        if (age > 30000 || (!active && item.seenState && age > 1200)) {
          delete pendingActions[key];
          pendingButtonKeys.delete(key);
        } else {
          item.seenState = true;
        }
      });
      pendingButtonKeys = new Set(Object.keys(pendingActions));
    }

    function setButtonLoading(button, key) {
      if (!button) return;
      button.dataset.pendingKey = key;
      button.dataset.wasDisabled = button.disabled ? "1" : "0";
      button.disabled = true;
      button.classList.add("is-loading");
      button.setAttribute("aria-busy", "true");
      if (!button.querySelector(".loading-spinner")) {
        const spinner = document.createElement("span");
        spinner.className = "loading-spinner";
        spinner.setAttribute("aria-hidden", "true");
        button.prepend(spinner);
      }
    }

    function clearButtonLoading(button) {
      if (!button || !button.classList.contains("is-loading")) return;
      button.classList.remove("is-loading");
      button.removeAttribute("aria-busy");
      const spinner = button.querySelector(".loading-spinner");
      if (spinner) spinner.remove();
      if (button.dataset.wasDisabled !== "1") button.disabled = false;
      delete button.dataset.wasDisabled;
      delete button.dataset.pendingKey;
    }

    function applyPendingButtonStates() {
      document.querySelectorAll("button[data-command]").forEach((button) => {
        const key = button.dataset.pendingKey || pendingKeyForAction(button.dataset.command, payloadFromButton(button));
        const fallback = Object.keys(pendingActions).find((pendingKey) => (pendingActions[pendingKey] || {}).command === button.dataset.command && !button.dataset.runKey && !button.dataset.experimentId && !button.dataset.archiveKey);
        const pendingKey = pendingActions[key] ? key : fallback;
        if (pendingKey) setButtonLoading(button, pendingKey);
        else clearButtonLoading(button);
      });
    }

    function loadingPrefix(active) {
      return active ? '<span class="loading-spinner" aria-hidden="true"></span>' : "";
    }

    function applyUiLayout(state) {
      currentUiLayout = normalizeUiLayout((state && state.uiLayout) || currentUiLayout);
      const deck = el("cardDeck");
      const cards = Array.from(deck.querySelectorAll("[data-section]"));
      const byId = new Map(cards.map((card) => [card.dataset.section, card]));
      currentUiLayout.order.forEach((section) => {
        const card = byId.get(section);
        if (card) deck.appendChild(card);
      });
      cards.forEach((card) => {
        if (!currentUiLayout.order.includes(card.dataset.section)) deck.appendChild(card);
      });
      Array.from(deck.querySelectorAll("[data-section]")).forEach((card) => {
        const section = card.dataset.section;
        card.classList.toggle("is-collapsed", Boolean(currentUiLayout.collapsed[section]));
      });
    }

    function decorateCards() {
      document.querySelectorAll("[data-section]").forEach((card) => {
        const head = card.querySelector(".section-head");
        if (!head) return;
        let tools = head.querySelector(".cardTools");
        if (!tools) {
          tools = document.createElement("div");
          tools.className = "cardTools";
          head.appendChild(tools);
        }
        const section = card.dataset.section;
        const collapsed = card.classList.contains("is-collapsed");
        tools.innerHTML =
          '<span class="dragHandle" draggable="true" title="拖动卡片排序">拖动</span>' +
          '<button class="collapseBtn" type="button" data-collapse-section="' + escAttr(section) + '">' + (collapsed ? "展开" : "折叠") + '</button>';
        card.draggable = layoutEdit;
      });
    }

    function saveUiLayout() {
      currentUiLayout.order = Array.from(document.querySelectorAll("#cardDeck > [data-section]")).map((card) => card.dataset.section);
      currentUiLayout.collapsed = Object.assign({}, currentUiLayout.collapsed, collapseStateFromDom());
      vscode.postMessage({ command: "saveUiLayout", layout: currentUiLayout });
    }

    function collapseStateFromDom() {
      const out = {};
      document.querySelectorAll("#cardDeck > [data-section]").forEach((card) => {
        out[card.dataset.section] = card.classList.contains("is-collapsed");
      });
      return out;
    }

    function normalizeUiLayout(layout) {
      const defaults = ["overview", "gpu", "tasks", "plans", "results", "operations", "logs", "traces", "remoteFiles", "transfers", "servers", "diagnostics"];
      const incoming = Array.isArray(layout.order) ? layout.order.map(String) : [];
      const order = incoming.filter((item) => defaults.includes(item)).concat(defaults.filter((item) => !incoming.includes(item)));
      const collapsed = Object.assign({ servers: true }, layout.collapsed && typeof layout.collapsed === "object" ? layout.collapsed : {});
      return { order, collapsed, manual: Boolean(layout.manual) };
    }

    function updateLayoutToggle() {
      const button = el("layoutEditToggle");
      if (button) button.textContent = layoutEdit ? "完成布局" : "管理布局";
    }

    function renderSummary(state) {
      const health = state.health || {};
      const realtime = state.realtime || {};
      const setup = state.setup || {};
      const paused = state.diagnostics && state.diagnostics.requests && state.diagnostics.requests.paused;
      el("summary").innerHTML = [
        row("连接模式", labelStatus(state.connectionMode)),
        row("本地端点", state.localEndpoint || "-"),
        row("Hub", setup.hubHost || "-"),
        row("Agent 端口", setup.remoteAgentPort || "-"),
        row("隧道健康", labelStatus(health.state || "unknown"), health.state === "agent_ok" ? "status-completed" : "status-warning"),
        row("实时流", labelStatus(realtime.streamStatus || "disconnected")),
        row("最后 seq", realtime.lastSeq || 0),
        row("心跳", realtime.lastHeartbeatAt || "-"),
        row("已暂停", paused ? "是" : "否"),
        row("最后错误", state.lastError || "-")
      ].join("");
    }

    function renderHubWorkerAndPorts(state) {
      const hub = state.hubControlStatus || {};
      el("hubControlStatus").innerHTML = [
        row("endpointId", hub.endpointId || "hub"),
        row("local endpoint", hub.localEndpoint || "-"),
        row("health", hub.health || "-"),
        row("action API", hub.actionApi ? "enabled" : "disabled"),
        row("file API", hub.fileApi ? "enabled" : "disabled"),
        row("scheduler API", hub.schedulerApi ? "enabled" : "disabled"),
        row("result API", hub.resultApi ? "enabled" : "disabled"),
        row("last heartbeat", hub.lastHeartbeat || "-"),
        row("control actions", hub.controlActionsEnabled ? "enabled" : "disabled")
      ].join("");
      const workers = state.workerTelemetryStatus || [];
      el("workerTelemetryStatus").innerHTML = workers.length ? table(["workerId", "local endpoint", "GPU", "task telemetry", "event stream", "last heartbeat", "local port", "status"], workers.map((worker) => [
        esc(worker.workerId),
        esc(worker.localEndpoint),
        worker.gpuTelemetry ? "on" : "off",
        worker.workerTaskTelemetry ? "on" : "off",
        esc(worker.eventStream),
        esc(worker.lastHeartbeat || "-"),
        esc(worker.localPort),
        '<span class="' + statusClass(worker.status) + '">' + esc(worker.status) + '</span>'
      ])) : '<div class="muted">No Worker telemetry endpoints configured.</div>';
      const assignments = state.tunnelPortAssignments || [];
      el("tunnelPortAssignments").innerHTML = assignments.length ? table(["role", "endpointId", "localPort", "remotePort", "ssh alias", "enabled", "probe"], assignments.map((item) => [
        esc(item.role),
        esc(item.endpointId),
        esc(item.localForwardPort),
        esc(item.remoteServicePort),
        esc(item.sshConfigAlias || "-"),
        endpointEnabled(state, item.endpointId) ? "yes" : "no",
        probeStatus(state, item.endpointId)
      ])) : '<div class="muted">No port assignments.</div>';
      const conflicts = state.tunnelPortConflicts || [];
      el("tunnelPortConflicts").innerHTML = conflicts.length ? table(["endpointId", "requestedPort", "conflictType", "severity", "suggestion", "repair"], conflicts.map((item) => [
        esc(item.endpointId),
        esc(item.requestedPort),
        esc(item.conflictType),
        '<span class="' + statusClass(item.severity) + '">' + esc(item.severity) + '</span>',
        esc(item.suggestion),
        '<button class="mini" data-command="repairPorts">Repair</button>'
      ])) : '<div class="muted">No port conflicts.</div>';
    }

    function renderPlanSection(state) {
      if (document.activeElement !== el("planFileInput")) el("planFileInput").value = state.planFileInput || (state.selection && state.selection.selectedPlanId) || "";
      const plans = state.recentPlans || [];
      el("recentPlans").innerHTML = plans.length ? table(["plan", "suite", "status", "select"], plans.map((plan) => [
        esc(plan.planFile),
        esc(plan.suite),
        esc(plan.status),
        '<button class="mini" data-command="selectPlan" data-plan-file="' + escAttr(plan.planFile) + '" data-plan-id="' + escAttr(plan.planId || plan.planFile) + '">选择</button>'
      ])) : '<div class="muted">没有 plan 列表时可直接输入 planFile。</div>';
      ["validatePlan", "dryRunPlan", "runPlan"].forEach((command) => {
        document.querySelectorAll('[data-section="plans"] button[data-command="' + command + '"]').forEach((button) => {
          const reason = disableReason(state, command);
          button.disabled = Boolean(reason);
          button.title = reason || "";
        });
      });
    }

    function renderActionSections(state) {
      el("experimentActions").innerHTML = [
        actionButton("Validate Plan", "validatePlan"),
        actionButton("Dry-run Plan", "dryRunPlan"),
        actionButton("Run Plan", "runPlan", { confirm: true }),
        actionButton("Stop Selected Experiment", "stopExperiment", { confirm: true }),
        actionButton("Retry Failed Experiment", "retryExperiment", { confirm: true }),
        actionButton("Reproduce / Missing-only Rerun", "reproducePlan", { confirm: true })
      ].join("");
      el("resultActions").innerHTML = [
        actionButton("Parse Results", "parseResults"),
        actionButton("Refresh Results", "refreshResults"),
        actionButton("Run Quality Gate", "runQualityGate"),
        actionButton("Run Statistics", "runStatistics"),
        actionButton("Export Paper Table", "exportPaperTable")
      ].join("");
      el("artifactActions").innerHTML = [
        actionButton("Archive Selected", "archiveArtifacts", { confirm: true }),
        actionButton("Sync Artifacts", "syncArtifacts", { confirm: true }),
        actionButton("Complete Three-way", "completeThreeWay", { confirm: true }),
        actionButton("Delete Selected", "deleteArtifacts", { danger: true }),
        actionButton("Reconcile Deletions", "reconcileDeletions", { confirm: true })
      ].join("");
      el("diagnosticActions").innerHTML = [
        actionButton("Run Self-check", "selfCheck"),
        actionButton("Create Debug Bundle", "createDebugBundle"),
        actionButton("Download Debug Bundle", "downloadDebugBundle"),
        actionButton("Open Diagnostics", "status"),
        actionButton("Open Audit Tail", "openAuditTail")
      ].join("");
    }

    function renderGpuSection(state) {
      const servers = Object.entries(state.gpu || {}).map(([serverId, rows]) => normalizeServerGpu(serverId, rows));
      const gpuCount = servers.reduce((sum, server) => sum + server.gpuRows.length, 0);
      el("gpuSummary").innerHTML = servers.length
        ? '<div class="summaryLine"><span class="pill">服务器 ' + servers.length + '</span><span class="pill">GPU ' + gpuCount + '</span></div>'
        : '<div class="muted">暂无 GPU 数据。请确认 MobaXterm 隧道和 Hub Agent /api/events 或 /api/gpu 可用。</div>';
      el("gpuGrid").innerHTML = servers.map((server) => {
        const rows = server.gpuRows.length ? server.gpuRows.map((gpu) => (
          '<div class="card">' +
          '<b>GPU ' + esc(gpu.index) + '</b><br>' +
          '<span class="muted">' + esc(gpu.name) + '</span>' +
          row("显存", memoryText(gpu)) +
          progress(gpu.memoryPercent) +
          row("利用率", valuePercent(gpu.utilizationPercent)) +
          row("温度", gpu.temperature === "-" ? "-" : gpu.temperature + " C") +
          row("进程", gpu.processCount) +
          row("实验", gpu.runKey) +
          '</div>'
        )).join("") : '<div class="muted">该服务器暂无 GPU 行。</div>';
        return '<div class="card"><b>' + esc(server.serverId) + '</b> <span class="' + statusClass(server.status) + '">' + esc(server.status) + '</span><div class="muted">worker: ' + esc(server.workerId) + ' · 更新: ' + esc(server.updatedAt) + '</div>' + rows + '</div>';
      }).join("");
    }

    function renderTaskSection(state) {
      const selected = new Set(((state.selection || {}).selectedExperimentIds || []).map(String));
      const rows = normalizeSchedulerRows(state.schedulerStates || []);
      const counts = { queued: 0, running: 0, testing: 0, completed: 0, failed: 0, stopped: 0 };
      rows.forEach((row) => { if (counts[row.status] !== undefined) counts[row.status] += 1; });
      el("taskSummary").innerHTML = rows.length
        ? '<div class="summaryLine">' + Object.keys(counts).map((key) => '<span class="pill ' + statusClass(key) + '">' + key + ' ' + counts[key] + '</span>').join("") + '</div>'
        : '<div class="muted">暂无任务数据。请确认 Hub Agent /api/events 或 /api/scheduler 可用。</div>';
      el("taskTable").innerHTML = rows.length ? table(["选", "status", "plan", "experiment", "runKey", "worker", "gpuIds", "duration", "progress", "actions"], rows.map((row) => {
        const key = String(row.runKey || "");
        const actions = [
          ["Stop", "stopExperiment", ["running", "testing"].includes(row.status), true],
          ["Retry", "retryExperiment", ["failed", "stopped"].includes(row.status), true],
          ["Parse", "parseResults", true, false],
          ["Archive", "archiveArtifacts", ["completed", "failed"].includes(row.status), true],
          ["Delete", "deleteArtifacts", true, false, true],
          ["Open Log", "selectLogRunKey", Boolean(key), false]
        ].map((item) => rowActionButton(item[0], item[1], key, item[2], item[3], item[4])).join(" ");
        return [
          '<input type="checkbox" data-command="selectExperiment" data-run-key="' + escAttr(key) + '"' + (selected.has(key) ? " checked" : "") + '>',
          '<span class="' + statusClass(row.status) + '">' + esc(row.status) + '</span>',
          esc(row.plan),
          esc(row.experimentName),
          esc(row.runKey),
          esc(row.serverId),
          esc(arrayText(row.gpuIds)),
          esc(row.duration),
          esc(row.progress),
          actions
        ];
      })) : "";
      el("taskTable").querySelectorAll('input[type="checkbox"][data-command="selectExperiment"]').forEach((box) => {
        box.addEventListener("change", () => vscode.postMessage({ command: "selectExperiment", runKey: box.dataset.runKey, selected: box.checked }));
      });
    }

    function renderTraceSection(state) {
      const rows = normalizeExperimentTraceRows(state.experimentTraces || []);
      const archivedPlans = asArray((state.planArchive || {}).plans || []);
      const selected = traceSelectionSet((state && state.selection) || {});
      const selectedRow = rows.find((row) => traceRowSelected(row, selected)) || rows[0];
      el("traceTable").innerHTML = (rows.length ? '<div class="traceList">' + rows.map((row) => renderTraceCard(row, selected)).join("") + '</div>' : '<div class="muted">暂无实验记录。</div>') +
        (archivedPlans.length ? '<h3>已归档计划</h3><div class="traceList">' + archivedPlans.map(renderArchivedPlanCard).join("") + '</div>' : "");
      renderTraceDetailPane(selectedRow, rows.length);
    }

    function renderArchivedPlanCard(plan) {
      return '<div class="traceCard" data-anchor="' + escAttr(treeAnchorId("archived-plan", plan.archivedFile || plan.planFile || plan.name)) + '">' +
        '<div class="traceCardHead">' +
          '<div class="traceTitle"><span title="' + escAttr(plan.archivedFile || "") + '">' + esc(compactPath(plan.planFile || plan.file || plan.name || "-")) + '</span><span class="status-completed">archived</span></div>' +
          '<button class="mini secondary" data-command="openPlan" data-file="' + escAttr(plan.archivedFile || "") + '" title="打开已归档计划文件。">打开</button>' +
        '</div>' +
        '<div class="summaryLine"><span class="pill" title="' + escAttr(plan.originalFile || "") + '">原位置 ' + esc(compactPath(plan.originalFile || "-")) + '</span><span class="pill" title="' + escAttr(plan.archivedFile || "") + '">归档 ' + esc(compactPath(plan.archivedFile || "-")) + '</span></div>' +
      '</div>';
    }

    function renderTraceCard(row, selected) {
      const checked = traceRowSelected(row, selected);
      return '<div class="traceCard ' + (checked ? "selectedRow" : "") + '">' +
        '<div class="traceCardHead">' +
          '<div class="traceTitle"><span title="' + escAttr(row.id) + '">' + esc(compactIdentifier(row.id)) + '</span><span class="' + traceClass(row) + '">' + esc(row.status) + '</span><span class="pill">删除 ' + esc(row.deleteStatus) + '</span></div>' +
          '<button class="mini" data-command="selectExperiment" data-run-key="' + escAttr(row.id) + '" data-archive-key="' + escAttr(row.archiveKey || row.id) + '" title="选择该实验记录，并在右侧显示归档、删除、解析和路径详情。">详情</button>' +
        '</div>' +
        '<div class="traceMetaGrid">' +
          taskMetric("解析", row.resultStatus) +
          taskMetric("标签", row.tags || "-") +
          taskMetric("更新", row.updatedAt) +
        '</div>' +
        '<div class="summaryLine"><span class="pill" title="' + escAttr(row.artifactPath) + '">产物 ' + esc(compactPath(row.artifactPath)) + '</span><span class="pill" title="' + escAttr(row.resultPath) + '">结果 ' + esc(compactPath(row.resultPath)) + '</span></div>' +
      '</div>';
    }

    function renderTraceDetailPane(row, count) {
      const pane = el("traceDetailPane");
      if (!pane) return;
      if (!row) {
        pane.innerHTML = '<h3>记录详情</h3><div class="muted">暂无实验记录。完成任务、解析结果或归档后会显示详情。</div>';
        return;
      }
      pane.innerHTML =
        '<h3 title="选中实验记录的归档、删除、解析和路径详情。">记录详情</h3>' +
        '<div class="taskDetailMeta">' +
          taskDetailLine("记录数", esc(count || 0)) +
          taskDetailLine("实验", '<span title="' + escAttr(row.id) + '">' + esc(compactIdentifier(row.id)) + '</span>') +
          taskDetailLine("Worker", esc(workerName(row.workerId || "-"))) +
          taskDetailLine("归档", '<span class="' + traceClass(row) + '">' + esc(row.status) + '</span>') +
          taskDetailLine("删除", esc(row.deleteStatus)) +
          taskDetailLine("解析", esc(row.resultStatus)) +
          taskDetailLine("标签", esc(row.tags || "-")) +
          taskDetailLine("更新", esc(row.updatedAt)) +
        '</div>' +
        '<div class="taskActions">' +
          traceActionButton("解析", "parseResults", row) +
          traceActionButton("同步", "syncArtifacts", row, true) +
          traceActionButton("三方校验", "completeThreeWay", row, true) +
          traceActionButton("归档", "archiveArtifacts", row, true) +
          traceActionButton("删除", "deleteArtifacts", row, true, true) +
        '</div>' +
        renderTraceReadiness(row) +
        renderTraceTimeline(row) +
        '<div><b>产物路径</b><pre class="tracePath" title="' + escAttr(row.artifactPath) + '">' + esc(row.artifactPath || "-") + '</pre></div>' +
        '<div><b>结果路径</b><pre class="tracePath" title="' + escAttr(row.resultPath) + '">' + esc(row.resultPath || "-") + '</pre></div>';
    }

    function traceActionButton(label, command, row, confirmFlag, dangerFlag) {
      const runKey = usableTaskKey(row.id) ? row.id : "";
      const archiveKey = usableTaskKey(row.archiveKey) ? row.archiveKey : runKey;
      const context = { runKey, archiveKey, workerId: row.workerId };
      const reason = traceActionDisableReason(lastState, command, context);
      const pendingKey = pendingKeyForAction(command, { runKey, archiveKey, workerId: row.workerId });
      const pending = pendingButtonKeys.has(pendingKey);
      const titleText = reason || (pending ? "执行中，等待终态回传后会自动恢复。" : commandHelp(command));
      return '<button class="taskActionButton" data-command="' + escAttr(command) + '" data-pending-key="' + escAttr(pendingKey) + '" data-run-key="' + escAttr(runKey) + '" data-archive-key="' + escAttr(archiveKey) + '" data-worker-id="' + escAttr(row.workerId || "") + '"' + (confirmFlag ? ' data-confirm="true"' : "") + (dangerFlag ? ' data-danger="true"' : "") + ((reason || pending) ? " disabled" : "") + (titleText ? ' title="' + escAttr(titleText) + '" aria-label="' + escAttr(label + "：" + titleText) + '"' : "") + '>' + loadingPrefix(pending) + esc(label) + '</button>';
    }

    function traceActionDisableReason(state, command, context) {
      if (!context.runKey && !context.archiveKey) return "旧记录缺少可操作标识";
      const reason = disableReason(state, command, context);
      if (reason) return reason;
      if (["archiveArtifacts", "deleteArtifacts"].includes(command) && (!context.workerId || context.workerId === "-")) {
        return "缺少 Worker 标识，只能处理 Hub 索引；请优先在任务区选择带 Worker 的任务。";
      }
      return "";
    }

    function renderTraceReadiness(row) {
      const hasArchiveKey = usableTaskKey(row.archiveKey || row.id);
      const hasWorker = usableTaskKey(row.workerId);
      const hasArtifact = meaningfulValue(row.artifactPath);
      const hasResult = meaningfulValue(row.resultPath);
      const items = [
        ["归档标识", hasArchiveKey ? "已定位" : "缺失", hasArchiveKey, row.archiveKey || row.id || "旧记录缺少 archiveKey / runKey。"],
        ["Worker 直达", hasWorker ? workerName(row.workerId) : "缺失", hasWorker, hasWorker ? "删除和归档准备可直达 Worker Agent。" : "没有 Worker 标识时不会假装能删除 Worker 本机文件。"],
        ["产物路径", hasArtifact ? "已发现" : "缺失", hasArtifact, row.artifactPath || "没有产物路径，归档准备或删除可能只能处理索引。"],
        ["结果路径", hasResult ? "已发现" : "缺失", hasResult, row.resultPath || "没有结果路径，解析会尝试按 Hub 摘要或已选任务查找。"]
      ];
      return '<div class="traceReadinessGrid" title="记录操作检查：解释该实验记录能否解析、同步、归档或删除。">' + items.map((item) => {
        const ok = Boolean(item[2]);
        const tone = ok ? "good" : (String(item[1]).includes("缺失") ? "error" : "warn");
        return '<div class="traceReadinessItem ' + tone + '" title="' + escAttr(item[3]) + '"><span>' + esc(item[0]) + '</span><b>' + esc(item[1]) + '</b></div>';
      }).join("") + '</div>';
    }

    function renderTraceTimeline(row) {
      const events = [
        ["解析", row.resultStatus || "待解析", "解析结果应来自 CSV、JSON、summary.txt 或控制台输出。", traceTone(row.resultStatus)],
        ["归档", row.status || "待归档", "Hub 是归档索引与终态权威；Worker 负责本机归档准备。", traceTone(row.status)],
        ["删除", row.deleteStatus || "未删除", "删除成功前不隐藏记录；失败时保留 residue 和原因。", traceTone(row.deleteStatus)],
        ["更新", row.updatedAt || "-", "最近一次记录更新时间。", row.updatedAt && row.updatedAt !== "-" ? "good" : "warn"]
      ];
      return '<div class="traceTimeline" title="记录事件线：把解析、归档、删除和更新时间放在同一详情侧栏。">' +
        events.map((event) => traceTimelineItem(event[0], event[1], event[2], event[3])).join("") +
      '</div>';
    }

    function traceTimelineItem(title, status, detail, tone) {
      const cls = tone === "good" ? "good" : (tone === "error" ? "error" : (tone === "warn" ? "warn" : ""));
      return '<div class="traceTimelineItem ' + cls + '" title="' + escAttr(detail) + '"><b>' + esc(title) + ' · ' + esc(status || "-") + '</b><span>' + esc(detail) + '</span></div>';
    }

    function traceTone(value) {
      const text = String(value || "").toLowerCase();
      if (text.includes("complete") || text.includes("archiv") || text.includes("parsed") || text.includes("success") || text.includes("已")) return "good";
      if (text.includes("fail") || text.includes("error") || text.includes("residue") || text.includes("stalled")) return "error";
      if (!text || text === "-" || text.includes("待") || text.includes("missing")) return "warn";
      return "info";
    }

    function traceSelectionSet(selection) {
      return new Set([...(selection.selectedRunKeys || []), ...(selection.selectedArchiveKeys || []), selection.selectedRunKey].filter(Boolean).map(String));
    }

    function traceRowSelected(row, selected) {
      return [row.id, row.archiveKey].some((value) => selected.has(String(value || "")));
    }

    function renderOperationSection(state) {
      const rows = normalizeOperationRows(state.operations || {});
      el("operationList").innerHTML = rows.length ? table(["operationId", "type", "status", "progress", "message", "updatedAt", "error"], rows.map((row) => [
        esc(row.operationId),
        esc(row.type),
        '<span class="' + statusClass(row.status) + '">' + esc(row.status) + '</span>',
        esc(row.progress),
        esc(row.message || (row.status === "accepted" ? "等待 Hub Agent 回传进度" : "-")),
        esc(row.updatedAt),
        '<span class="status-failed">' + esc(row.error) + '</span>'
      ])) : '<div class="muted">暂无操作进度。</div>';
    }

    function renderResultSummary(state) {
      const summary = state.resultsSummary || {};
      el("resultSummary").innerHTML = [
        row("最近解析", pick(summary, ["lastParsedAt", "last_parsed_at"], "-")),
        row("parse_failed", pick(summary, ["parseFailed", "parse_failed"], "-")),
        row("quality warning", pick(summary, ["qualityWarnings", "quality_warnings"], "-")),
        row("statistics updated", pick(summary, ["statisticsUpdatedAt", "statistics_updated_at"], "-")),
        row("paper table", pick(summary, ["paperTablePath", "paper_table_path", "exportPath"], "-"))
      ].join("");
    }

    function renderRemoteFiles(state) {
      const remote = state.remoteFiles || {};
      el("remoteFileActions").innerHTML = [
        actionButton("List Remote Files", "listRemoteFiles"),
        actionButton("Download Selected File", "downloadRemoteFile"),
        actionButton("Upload File", "uploadRemoteFile"),
        actionButton("Refresh File Browser", "listRemoteFiles")
      ].join("");
      const current = remote.path || "zlk_cluster";
      const parent = parentPath(current);
      const entries = remote.entries || [];
      const rows = [
        ['<button class="mini" data-command="listRemoteFiles" data-remote-path="' + escAttr(parent) + '">..</button>', "directory", "", ""],
        ...entries.map((entry) => [
          '<button class="mini" data-command="' + (entry.type === "directory" ? "listRemoteFiles" : "selectRemoteFile") + '" data-remote-path="' + escAttr(entry.path) + '">' + esc(entry.name || entry.path) + '</button>',
          esc(entry.type),
          esc(entry.size || "-"),
          esc(entry.mtime || "-")
        ])
      ];
      el("remoteFiles").innerHTML = row("当前路径", current) + (remote.selectedRemoteFile ? row("已选文件", remote.selectedRemoteFile) : "") + (remote.error ? '<div class="status-failed">' + esc(remote.error) + '</div>' : "") + table(["name", "type", "size", "mtime"], rows);
    }

    function renderFileTransferSection(state) {
      const rows = normalizeFileTransferRows(state.fileTransfers || {});
      el("transferTable").innerHTML = rows.length ? table(["transferId", "direction", "remotePath", "localPath", "status", "bytes", "speed", "ETA", "error", "action"], rows.map((row) => [
        esc(row.transferId),
        esc(row.direction),
        '<span class="pathCell">' + esc(row.remotePath) + '</span>',
        '<span class="pathCell">' + esc(row.localPath) + '</span>',
        '<span class="' + statusClass(row.status) + '">' + esc(row.status) + '</span>',
        esc(row.transferredBytes) + " / " + esc(row.totalBytes),
        esc(row.speed),
        esc(row.eta),
        '<span class="status-failed">' + esc(row.error) + '</span>',
        '<span class="muted">cancel / retry</span>'
      ])) : '<div class="muted">当前没有传输任务</div>';
    }

    function renderLogSection(state) {
      const tasks = normalizeSchedulerRows(state.schedulerStates || []).filter((row) => ["running", "testing"].includes(row.status) && row.runKey && row.runKey !== "-");
      const selected = (state.selection && state.selection.selectedLogRunKey) || state.selectedLogRunKey || "";
      el("logRunKeySelect").innerHTML = '<option value="">选择运行中的实验</option>' + tasks.map((row) => {
        const runKey = String(row.runKey);
        return '<option value="' + escAttr(runKey) + '"' + (runKey === selected ? " selected" : "") + '>' + esc(row.experimentName + " · " + runKey) + '</option>';
      }).join("");
      const log = selected ? (state.logs || {})[selected] : undefined;
      const text = typeof log === "string" ? log : (log && (log.text || log.output || log.tail));
      el("liveLog").textContent = selected ? (text ? String(text) : "暂无日志数据") : "请选择一个运行中的实验";
    }

    function renderCapabilities(state) {
      const caps = state.capabilities || {};
      const endpoints = caps.endpoints || {};
      const fileCaps = state.fileCapabilities || {};
      el("capabilities").innerHTML = [
        row("actions", endpoints.actions ? "可用" : "需要升级 Hub Agent", endpoints.actions ? "status-completed" : "status-warning"),
        row("实时通道", endpoints.websocketEvents ? "WebSocket" : (endpoints.sseEvents ? "SSE" : "snapshot")),
        row("文件列表", hasCapability(state, "endpoints.fileList") ? "可用" : "需要升级 Hub Agent"),
        row("下载", hasCapability(state, "endpoints.fileDownload") ? "可用" : "需要升级 Hub Agent"),
        row("上传", hasCapability(state, "endpoints.fileUploadChunk") ? "可用" : "需要升级 Hub Agent")
      ].join("");
    }

    function renderActionErrors(state) {
      const rows = state.actionErrors || [];
      el("actionErrors").innerHTML = rows.length ? table(["time", "command", "message", "suggestion"], rows.map((row) => [
        esc(row.timestamp),
        esc(row.command),
        '<span class="status-failed">' + esc(row.message) + '</span>',
        esc(row.suggestion || (row.capabilityMissing ? "需要升级 Hub Agent: " + row.capabilityMissing.join(", ") : "-"))
      ])) : '<div class="muted">暂无错误。</div>';
    }

    function actionButton(label, command, options) {
      options = options || {};
      const reason = disableReason(lastState, command);
      const disabled = reason ? " disabled" : "";
      const title = reason ? ' title="' + escAttr(reason) + '"' : "";
      const confirmAttr = options.confirm ? ' data-confirm="true"' : "";
      const dangerAttr = options.danger ? ' data-danger="true"' : "";
      return '<button data-command="' + escAttr(command) + '"' + disabled + title + confirmAttr + dangerAttr + '>' + esc(label) + '</button>';
    }
    function rowActionButton(label, command, runKey, visible, confirmFlag, dangerFlag) {
      if (!visible) return "";
      const reason = disableReason(lastState, command);
      return '<button class="mini" data-command="' + escAttr(command) + '" data-run-key="' + escAttr(runKey) + '"' + (confirmFlag ? ' data-confirm="true"' : "") + (dangerFlag ? ' data-danger="true"' : "") + (reason ? ' disabled title="' + escAttr(reason) + '"' : "") + '>' + esc(label) + '</button>';
    }
    function disableReason(state, command) {
      const keys = uiCapabilityMap[command] || [];
      const missing = keys.filter((key) => !hasCapability(state, key));
      if (missing.length) return "需要升级 Hub Agent: " + missing.join(", ");
      const health = (state.health || {}).state;
      if (state.connectionMode !== "offline_import" && health && ["local_port_closed", "agent_unreachable", "not_configured"].includes(health)) return "tunnel 未连接";
      return "";
    }
    function hasCapability(state, key) {
      const caps = state.capabilities || {};
      const fileCaps = state.fileCapabilities || {};
      const endpoints = caps.endpoints || {};
      if (key === "endpoints.fileList") return Boolean(endpoints.fileList || fileCaps.supportsList);
      if (key === "endpoints.fileDownload") return Boolean(endpoints.fileDownload || fileCaps.supportsDownload);
      if (key === "endpoints.fileUploadChunk") return Boolean(endpoints.fileUploadChunk || fileCaps.supportsUploadChunk);
      if (key.startsWith("endpoints.")) return Boolean(endpoints[key.slice("endpoints.".length)]);
      return false;
    }
    function payloadFromButton(button) {
      const payload = {};
      payload.debugMode = runMode === "debug";
      if (button.dataset.planFile) payload.planFile = button.dataset.planFile;
      else if (el("planFileInput")) payload.planFile = el("planFileInput").value;
      if (button.dataset.planId) payload.planId = button.dataset.planId;
      if (button.dataset.runKey) payload.runKey = button.dataset.runKey;
      if (button.dataset.archiveKey) payload.archiveKey = button.dataset.archiveKey;
      if (button.dataset.remotePath) payload.remotePath = button.dataset.remotePath;
      if (button.dataset.command === "selectLogRunKey") payload.runKey = button.dataset.runKey;
      return payload;
    }

    function debugModeBlockedUiCommand(command) {
      return new Set(["runAllPlans", "archivePlan", "restoreArchivedPlan", "archiveArtifacts", "syncArtifacts", "completeThreeWay", "deleteArtifacts", "reconcileDeletions", "parseResults", "refreshResults", "runQualityGate", "runStatistics", "checkClaimEvidence", "exportPaperTable", "checkOutputContract", "parseCaseLevel", "runLeakageCheck", "runSubgroupAnalysis", "exportCaseAnalysis", "planCheckpointRetention", "inspectDataset", "createOfflineBundle", "exportPlottingContract", "plotResultsToPpt", "inferConfigFromRun", "recoverPlanFromRun", "diagnoseResultAnomaly", "compareWithBestConfig"]).has(String(command || ""));
    }

    function refreshRunModeUi() {
      document.body.classList.toggle("debug-run-mode", runMode === "debug");
      document.querySelectorAll("button[data-run-mode]").forEach((button) => {
        const active = (button.dataset.runMode === "debug") === (runMode === "debug");
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
      const note = el("runModeNote");
      if (note) note.textContent = runMode === "debug" ? "仅运行首个任务，实时日志与产物隔离；禁止归档、结果、统计、论文和 PPT" : "完整执行 Plan，结果进入正式闭环";
      const state = lastState || {};
      refreshPlanActionButtons(state, el("planQuickGrid"));
      refreshContextualActionButtons(state, el("workbenchInspector"));
      refreshContextualActionButtons(state, el("pinnedActionsHost"));
      renderSectionIfVisible(state, "overview", { force: true });
      renderSectionIfVisible(state, "tasks", { force: true });
      renderSectionIfVisible(state, "results", { force: true });
    }

    function normalizeServerGpu(serverId, rows) {
      const rawRows = Array.isArray(rows) ? rows : asArray(pick(rows, ["gpus", "gpu", "rows"], []));
      const gpuRows = rawRows.map(normalizeGpuRow);
      return {
        serverId,
        workerId: pick(rows, ["workerId", "worker_id", "worker"], serverId),
        gpuRows,
        status: String(pick(rows, ["status", "state"], gpuRows.length ? "online" : "stale")).toLowerCase(),
        updatedAt: pick(rows, ["updatedAt", "updated_at", "generatedAt", "generated_at", "timestamp"], "-")
      };
    }
    function normalizeGpuRow(row) {
      const memoryUsedMb = numberOrDash(pick(row, ["memoryUsedMb", "memory_used_mb", "memoryUsed", "used"], "-"));
      const memoryTotalMb = numberOrDash(pick(row, ["memoryTotalMb", "memory_total_mb", "memoryTotal", "total"], "-"));
      return {
        index: pick(row, ["index", "gpu_index"], pick(row, ["id", "gpuId", "gpu_id"], "-")),
        id: pick(row, ["id", "gpuId", "gpu_id", "uuid"], "-"),
        name: pick(row, ["name", "gpu_name", "model"], "-"),
        memoryUsedMb,
        memoryTotalMb,
        memoryPercent: percent(memoryUsedMb, memoryTotalMb),
        utilizationPercent: pick(row, ["utilization", "utilizationPercent", "gpu_util", "utilization_gpu"], "-"),
        temperature: pick(row, ["temperature", "temperatureGpu", "temperature_gpu", "temp"], "-"),
        processCount: asArray(pick(row, ["processes", "procs"], [])).length,
        runKey: pick(row, ["runKey", "run_key", "assignedExperiment", "assignedRunKey", "experiment", "experimentId"], "-")
      };
    }
    function normalizeSchedulerRows(rows) {
      return asArray(rows).flatMap(expandSchedulerRow).map(normalizeTaskRow).filter((row) => row.status !== "deleted").sort((a, b) => taskStatusRank(a.status) - taskStatusRank(b.status));
    }
    function expandSchedulerRow(row) {
      if (!row || typeof row !== "object") return [];
      const buckets = ["running_experiments", "testing_experiments", "queued_experiments", "pending_experiments", "completed_experiments", "failed_experiments", "stopped_experiments"];
      const expanded = buckets.flatMap((key) => asArray(row[key]).map((child) => Object.assign({}, child, { status: bucketStatus(key), plan: row.plan || row.planName || row.suite || row.file })));
      return expanded.length ? expanded : [row];
    }
    function normalizeTaskRow(row) {
      const startedAt = pick(row, ["startedAt", "started_at"], "");
      const updatedAt = pick(row, ["updatedAt", "updated_at", "finishedAt", "finished_at"], "");
      const status = String(pick(row, ["status", "state", "runStatus", "run_status"], "unknown")).toLowerCase();
      return {
        status,
        plan: pick(row, ["planName", "plan_name", "plan", "suite", "file"], "-"),
        experimentName: pick(row, ["experimentName", "experiment_name", "name", "case", "experiment"], "-"),
        runKey: pick(row, ["runKey", "run_key", "id", "experimentId", "global_job_id", "session"], "-"),
        serverId: pick(row, ["serverId", "workerId", "worker_id", "worker", "server", "worker_name"], "-"),
        gpuIds: pick(row, ["gpuIds", "gpu_ids", "gpuId", "gpu_id"], "-"),
        startedAt: startedAt || "-",
        updatedAt: updatedAt || "-",
        duration: formatDuration(startedAt, updatedAt),
        progress: pick(row, ["progress", "epoch", "step"], "-"),
        primaryMetric: pick(row, ["primaryMetric", "primary_metric", "metric", "score"], "-")
      };
    }
    function normalizeExperimentTraceRows(rows) {
      return asArray(rows).map((row) => ({
        id: pick(row, ["id", "experimentId", "experiment_id", "runKey", "run_key", "run_id", "global_job_id"], "-"),
        archiveKey: pick(row, ["archiveKey", "archive_key"], pick(row, ["id", "runKey", "run_key"], "-")),
        status: pick(row, ["status", "state", "archiveStatus", "archive_status", "artifact_state"], "-"),
        resultStatus: pick(row, ["resultStatus", "result_status", "parseStatus", "parse_status"], "-"),
        deleteStatus: pick(row, ["deleteStatus", "delete_status", "deleted", "residue"], "-"),
        tags: asArray(pick(row, ["tags"], [])).join(", "),
        updatedAt: pick(row, ["updatedAt", "updated_at", "synced_at", "finished_at"], "-"),
        artifactPath: pick(row, ["artifactPath", "artifact_path", "hub_job_dir", "worker_job_dir", "native_job_dir"], "-"),
        resultPath: pick(row, ["resultPath", "result_path", "results_csv"], "-")
      }));
    }
    function normalizeOperationRows(operations) {
      return objectRows(operations).map((row) => {
        const type = pick(row, ["type", "action"], "-");
        return {
          operationId: pick(row, ["operationId", "operation_id", "opId", "id"], "-"),
          type,
          status: pick(row, ["status", "state"], operationStatusFromType(type)),
          progress: pick(row, ["progress", "percent"], "-"),
          message: pick(row, ["message", "detail"], "-"),
          updatedAt: pick(row, ["updatedAt", "updated_at", "generatedAt", "startedAt"], "-"),
          error: pick(row, ["error", "lastError"], "-"),
          seq: Number(pick(row, ["seq"], 0))
        };
      }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || b.seq - a.seq).slice(0, 20);
    }
    function normalizeFileTransferRows(fileTransfers) {
      return objectRows(fileTransfers).map((row) => ({
        transferId: pick(row, ["transferId", "transfer_id", "id"], "-"),
        direction: pick(row, ["direction", "type"], "-"),
        remotePath: pick(row, ["remotePath", "remote_path", "path"], "-"),
        localPath: pick(row, ["localPath", "local_path"], "-"),
        status: pick(row, ["status", "state"], "-"),
        transferredBytes: pick(row, ["transferredBytes", "transferred_bytes", "receivedBytes", "sentBytes", "doneBytes"], 0),
        totalBytes: pick(row, ["totalBytes", "total_bytes", "size", "bytes"], 0),
        speed: pick(row, ["speed", "speedBytesPerSecond", "speed_bytes_per_second", "bytesPerSecond"], "-"),
        eta: pick(row, ["eta", "etaSeconds", "eta_seconds"], "-"),
        error: pick(row, ["error", "lastError"], "-")
      }));
    }

    function pick(obj, keys, fallback) {
      if (!obj || typeof obj !== "object") return fallback;
      for (const key of keys) {
        const value = obj[key];
        if (value !== undefined && value !== null && value !== "") return value;
      }
      return fallback;
    }
    function asArray(value) { return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.values(value)); }
    function objectRows(value) { return Array.isArray(value) ? value : (!value || typeof value !== "object" ? [] : Object.entries(value).map(([id, row]) => Object.assign({ id }, row || {}))); }
    function percent(used, total) {
      const a = Number(used), b = Number(total);
      return !Number.isFinite(a) || !Number.isFinite(b) || b <= 0 ? "-" : Math.round((a / b) * 1000) / 10;
    }
    function formatDuration(startedAt, updatedAt) {
      const start = Date.parse(String(startedAt || ""));
      const end = Date.parse(String(updatedAt || "")) || Date.now();
      if (!Number.isFinite(start)) return "-";
      const seconds = Math.max(0, Math.round((end - start) / 1000));
      const minutes = Math.floor(seconds / 60);
      return minutes ? String(minutes) + "m " + String(seconds % 60) + "s" : String(seconds) + "s";
    }
    function taskStatusRank(status) {
      const map = { running: 0, testing: 1, queued: 2, pending: 2, failed: 3, error: 3, stalled: 3, stopped: 3, cancelled: 3, completed: 4, done: 4, archived: 4, deleted: 4 };
      return map[taskStatusToken(status) || "unknown"] ?? 6;
    }
    function taskStatusToken(status) {
      const value = String(status || "").trim().toLowerCase();
      return value === "canceled" ? "cancelled" : value;
    }
    function taskFailureLikeStatus(status) {
      return ["failed", "error", "stalled", "stopped", "cancelled"].includes(taskStatusToken(status));
    }
    function taskTerminalStatus(status) {
      const value = taskStatusToken(status);
      return ["completed", "done", "archived", "deleted"].includes(value) || taskFailureLikeStatus(value);
    }
    function bucketStatus(key) { return key.replace("_experiments", "").replace("pending", "queued"); }
    function operationStatusFromType(type) {
      const text = String(type);
      if (text.includes("completed")) return "completed";
      if (text.includes("failed")) return "failed";
      if (text.includes("started") || text.includes("progress")) return "running";
      return "-";
    }
    function statusClass(status) {
      const value = taskStatusToken(status);
      if (taskFailureLikeStatus(value)) return "status-failed";
      if (value.includes("complete") || value === "done" || value === "online" || value === "ok") return "status-completed";
      if (value.includes("running")) return "status-running";
      if (value.includes("testing")) return "status-testing";
      if (value.includes("queue") || value.includes("pending") || value === "accepted") return "status-queued";
      if (value.includes("stale") || value.includes("degraded") || value.includes("warning")) return "status-warning";
      return "";
    }
    function traceClass(row) {
      const text = String(row.status) + " " + String(row.deleteStatus);
      return text.includes("failed") || text.includes("residue") ? "status-warning" : statusClass(row.status);
    }
    function table(headers, rows) {
      if (!rows.length) return "";
      return '<table class="table"><thead><tr>' + headers.map((h) => '<th>' + esc(h) + '</th>').join("") + '</tr></thead><tbody>' +
        rows.map((row) => '<tr>' + row.map((cell) => '<td>' + cell + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
    }
    function row(label, value, klass) { return '<div class="row"><div class="label">' + esc(label) + '</div><div class="value ' + (klass || "") + '">' + esc(value || "-") + '</div></div>'; }
    function progress(value) { const width = value === "-" ? 0 : Math.max(0, Math.min(100, Number(value))); return '<div class="progressTrack"><div class="progressBar" style="width:' + width + '%"></div></div>'; }
    function memoryText(gpu) { return String(gpu.memoryUsedMb) + " / " + String(gpu.memoryTotalMb) + " MB (" + valuePercent(gpu.memoryPercent) + ")"; }
    function valuePercent(value) { return value === "-" || value === undefined ? "-" : String(value) + "%"; }
    function arrayText(value) { return Array.isArray(value) ? value.join(", ") : value; }
    function numberOrDash(value) { const number = Number(value); return Number.isFinite(number) ? number : "-"; }
    function labelStatus(value) {
      const map = { mobaxterm_tunnel_realtime: "MobaXterm 实时隧道", offline_import: "离线导入", unknown: "未知", local_port_closed: "本地端口未打开", agent_unreachable: "Agent 不可达", agent_ok: "Agent 正常", file_api_unavailable: "文件 API 不可用", disconnected: "未连接", connecting: "连接中", websocket: "WebSocket", sse: "SSE", polling: "snapshot fallback", paused: "已暂停" };
      return map[value] || value;
    }
    function parentPath(value) {
      const parts = String(value || "zlk_cluster").replace(/\\\\/g, "/").split("/").filter(Boolean);
      if (parts.length <= 1) return parts[0] || "zlk_cluster";
      parts.pop();
      return parts.join("/");
    }
    function esc(value) { return String(value === undefined || value === null || value === "" ? "-" : value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch])); }
    function escAttr(value) { return esc(value).replace(/"/g, "&quot;"); }
  </script>
</body>
</html>`;
}
