const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..", "..");
const dist = fs.readFileSync(path.join(root, "dist/extension/legacy.js"), "utf8");

function sliceBetween(startMarker, endMarker) {
  const start = dist.indexOf(startMarker);
  assert.ok(start >= 0, startMarker);
  const end = dist.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, endMarker);
  return dist.slice(start, end);
}

function asFunction(text, signature, replacement) {
  return text.replace(/^ {4}/gm, "").replace(signature, replacement);
}

const constants = [
  sliceBetween("const uiActionCommands = new Set([", "const SAFE_WEBVIEW_COMMANDS = new Set(["),
  sliceBetween("const SAFE_WEBVIEW_COMMANDS = new Set([", "const API_INTERNAL_COMMANDS"),
  sliceBetween("const COMMANDS_WITHOUT_UI_STATUS = new Set(", "const LOCAL_COMMAND_RELEASES_AFTER_TRIGGER"),
  sliceBetween("const LOCAL_COMMAND_RELEASES_AFTER_TRIGGER = new Set(", "const DEBUG_MODE_BLOCKED_UI_COMMANDS"),
  sliceBetween("const DEBUG_MODE_BLOCKED_UI_COMMANDS = new Set([", "const UI_LAYOUT_SECTION_KEYS"),
  sliceBetween("const actionCommandMap = {", "const directWorkerActionMap"),
  sliceBetween("const hostOperationUiCommands = new Set([", "function hostOperationLeaseActionForUiCommand"),
  sliceBetween("const HOST_OPERATION_LEASE_ACTION_LABELS = Object.freeze({", "function hostOperationLeaseActionLabel"),
  sliceBetween("const BOOLEAN_TRUE_TEXTS = new Set(", "function booleanField"),
  sliceBetween("const PLAN_PREFLIGHT_COMMANDS = new Set(", "const PLAN_SUBMISSION_COMMANDS"),
  sliceBetween("const PLAN_SUBMISSION_COMMANDS = new Set(", "const PLAN_SCHEDULER_COMMANDS"),
].join("\n");

const helpers = [
  ["function getSafeCommand(message)", "const hostOperationUiCommands"],
  ["function hostOperationLeaseActionForUiCommand(command)", "const HOST_OPERATION_LEASE_ACTION_LABELS"],
  ["function hostOperationLeaseActionLabel(command)", "function commandNeedsUiStatus"],
  ["function commandNeedsUiStatus(command)", "function localCommandReleasesAfterTrigger"],
  ["function localCommandReleasesAfterTrigger(command)", "function normalizeUiLayout"],
  ["function stringField(message, key)", "function workerTaskSnapshotPayload"],
  ["function booleanField(message, key)", "function adapterRuleResultCandidates"],
  ["function debugModeBlockedUiCommand(command)", "function mergeRemotePathConfirmations"],
  ["function actionErrorSuggestion(message)", "function normalizeUiActionError"],
  ["function errorMessage(error)", "function xshellLoginCommandUpdateLabel"],
  ["function isUiCommandCancelled(error)", "function isUiCommandRemotePending"],
  ["function isUiCommandRemotePending(error)", "async function confirmUiCommand"],
].map(([startMarker, endMarker]) => sliceBetween(startMarker, endMarker)).join("\n");

const handleMessage = asFunction(
  sliceBetween("    async handleMessage(message)", "    async handleMessageCore("),
  "async handleMessage(",
  "async function handleMessage(",
);
const handleMessageCore = asFunction(
  sliceBetween("    async handleMessageCore(", "    async withUiCommandStatus("),
  "async handleMessageCore(",
  "async function handleMessageCore(",
);
const withUiCommandStatus = asFunction(
  sliceBetween("    async withUiCommandStatus(", "    notifyLocalActionStarted("),
  "async withUiCommandStatus(",
  "async function withUiCommandStatus(",
)
  .replace("\nuiCommandWatchdogMs(", "\nfunction uiCommandWatchdogMs(")
  .replace("\npostUiCommandStatus(", "\nfunction postUiCommandStatus(");

assert.match(handleMessageCore, /case "webviewReady"/);
assert.match(handleMessageCore, /case "reloadPanel"/);
assert.match(handleMessageCore, /case "webviewBootstrapError"/);
assert.match(handleMessageCore, /case "stopAndClearPlan"/);
assert.match(handleMessageCore, /case "configureSessions"/);
assert.ok(handleMessageCore.length > 8000, "handleMessageCore must stay complete");

const factory = new Function(`
  ${constants}
  ${helpers}
  const vscode = { window: { showInformationMessage() {}, showWarningMessage() { return Promise.resolve(); }, showErrorMessage() { return Promise.resolve(); } } };
  ${handleMessage}
  ${handleMessageCore}
  ${withUiCommandStatus}
  return { handleMessage, handleMessageCore, withUiCommandStatus, uiCommandWatchdogMs, postUiCommandStatus };
`);
const api = factory();

function createHost(overrides = {}) {
  const calls = {
    lease: [],
    statuses: [],
    errors: [],
    states: [],
    flushes: 0,
    watchdogs: 0,
    reloads: 0,
    actions: [],
    stopClear: [],
    visibility: [],
    rendered: [],
    performance: [],
    lifecycleFailures: [],
  };
  const host = {
    view: { webview: { postMessage(payload) { calls.statuses.push(payload); return Promise.resolve(true); } } },
    webviewReady: false,
    panelDocumentGeneration: 4,
    panelLifecycleState: "ready",
    statePostRetryCount: 3,
    statePostRetryTimer: { id: "retry" },
    panelReadyWatchdogTimer: { id: "watchdog" },
    pendingPanelNavigation: { section: "overview", anchor: "overview" },
    localPlanMetadata: { plans: [] },
    calls,
    clearTimeout(timer) {
      if (timer && timer.id === "watchdog") calls.watchdogs += 1;
    },
    flushPendingPanelNavigation() {
      calls.flushes += 1;
      return Promise.resolve(true);
    },
    clearPanelReadyWatchdog() {
      this.clearTimeout(this.panelReadyWatchdogTimer);
      this.panelReadyWatchdogTimer = undefined;
    },
    transitionPanelLifecycle(next) { this.panelLifecycleState = next; return true; },
    schedulePanelHeartbeat() { calls.heartbeats = (calls.heartbeats || 0) + 1; },
    postState(immediate = false) { calls.states.push(immediate); },
    extensionRuntimeVersionState() { return { reloadRequired: false }; },
    isCurrentPanelDocumentMessage(message, command) { return command === "webviewReady" || Number(message?.documentGeneration) === this.panelDocumentGeneration; },
    handlePanelWebviewVisibility(message) { calls.visibility.push(message); },
    handlePanelStateRenderedAck(message) { calls.rendered.push(message); },
    recordPanelRenderPerformance(message) { calls.performance.push(message); },
    recordPanelLifecycleDiagnostic(reason) { calls.lifecycleFailures.push(reason); },
    refreshPptAutomationReadiness() { return Promise.resolve(); },
    recordActionError(error) { calls.errors.push(error); },
    showPanelRecovery(message) { calls.recovery = message; },
    reloadPanelHtml() { calls.reloads += 1; },
    withHostOperationLease(actionType, actionLabel, operation) {
      calls.lease.push({ actionType, actionLabel });
      return operation();
    },
    finishPlanSubmissionProgress() {},
    runActionCommand(command) {
      calls.actions.push(command);
      return Promise.resolve();
    },
    stopAndClearPlanFromUi(message) {
      calls.stopClear.push(message);
      return Promise.resolve(overrides.stopResult);
    },
    handleMessageCore: api.handleMessageCore,
    withUiCommandStatus: api.withUiCommandStatus,
    uiCommandWatchdogMs: api.uiCommandWatchdogMs,
    postUiCommandStatus: api.postUiCommandStatus,
    ...overrides,
  };
  return host;
}

test("webviewReady without clientActionId completes the real handshake", async () => {
  const host = createHost();
  await api.handleMessage.call(host, { command: "webviewReady", documentGeneration: 4 });
  assert.equal(host.webviewReady, true);
  assert.equal(host.calls.flushes, 1);
  assert.equal(host.calls.watchdogs, 1);
  assert.equal(host.panelReadyWatchdogTimer, undefined);
  assert.equal(host.statePostRetryCount, 0);
  assert.equal(host.statePostRetryTimer, undefined);
  assert.deepEqual(host.calls.states, [true]);
  assert.deepEqual(host.calls.lease, []);
  assert.deepEqual(host.calls.statuses, []);
});

test("webviewVisibility without clientActionId reaches the generation-scoped host handler", async () => {
  const host = createHost();
  await api.handleMessage.call(host, { command: "webviewVisibility", documentGeneration: 4, hidden: true });
  assert.deepEqual(host.calls.visibility, [{ command: "webviewVisibility", documentGeneration: 4, hidden: true }]);
  assert.deepEqual(host.calls.lease, []);
  assert.deepEqual(host.calls.statuses, []);
});

test("explicit render ACK is generation-scoped and sectionSlow stays performance telemetry", async () => {
  const stale = createHost();
  await api.handleMessage.call(stale, { command: "webviewStateRendered", documentGeneration: 3, seq: 8 });
  assert.deepEqual(stale.calls.rendered, []);

  const current = createHost();
  await api.handleMessage.call(current, { command: "webviewStateRendered", documentGeneration: 4, seq: 8, renderDurationMs: 42 });
  assert.deepEqual(current.calls.rendered, [{ command: "webviewStateRendered", documentGeneration: 4, seq: 8, renderDurationMs: 42 }]);
  assert.deepEqual(current.calls.lease, []);

  await api.handleMessage.call(current, {
    command: "webviewRenderError", documentGeneration: 4, performanceWarning: true,
    section: "execution", durationMs: 300, stateSeq: 8, operationCount: 12,
  });
  assert.equal(current.calls.performance.length, 1);
  assert.equal(current.calls.performance[0].section, "execution");
  assert.deepEqual(current.calls.lifecycleFailures, []);
  assert.deepEqual(current.calls.errors, []);
});

test("reloadPanel and webviewBootstrapError without clientActionId stay on the real handlers", async () => {
  const reloadHost = createHost();
  await api.handleMessage.call(reloadHost, { command: "reloadPanel" });
  assert.equal(reloadHost.calls.reloads, 1);
  assert.deepEqual(reloadHost.calls.lease, []);
  assert.deepEqual(reloadHost.calls.statuses, []);

  const errorHost = createHost();
  await api.handleMessage.call(errorHost, { command: "webviewBootstrapError", documentGeneration: 4, error: "script broke" });
  assert.equal(errorHost.lastError, "script broke");
  assert.equal(errorHost.calls.recovery, "script broke");
  assert.equal(errorHost.calls.errors[0].command, "webviewBootstrapError");
  assert.equal(errorHost.webviewReady, false);
});

test("unknown command does not enter a handler", async () => {
  const host = createHost();
  await api.handleMessage.call(host, { command: "notARealCommand" });
  assert.equal(host.calls.actions.length, 0);
  assert.equal(host.calls.reloads, 0);
  assert.equal(host.calls.stopClear.length, 0);
  assert.equal(host.calls.errors[0].command, "notARealCommand");
  assert.deepEqual(host.calls.states, [false]);
  assert.deepEqual(host.calls.statuses, []);
});

test("stopAndClearPlan with clientActionId keeps failed cancelled and completed outcomes", async () => {
  for (const status of ["failed", "cancelled", "completed"]) {
    const host = createHost({
      stopResult: { status, message: `${status} detail`, planStopClear: { planFile: "plans/a.yaml", outcome: status } },
    });
    await api.handleMessage.call(host, { command: "stopAndClearPlan", clientActionId: `act-${status}`, planFile: "plans/a.yaml" });
    assert.equal(host.calls.lease.length, 0);
    assert.equal(host.calls.stopClear.length, 1);
    const terminal = host.calls.statuses.at(-1);
    assert.equal(terminal.status, status);
    assert.equal(terminal.clientActionId, `act-${status}`);
    assert.equal(terminal.planStopClear.planFile, "plans/a.yaml");
    assert.equal(terminal.message, `${status} detail`);
  }
});

test("a legal lease command without clientActionId still acquires the host lease", async () => {
  const host = createHost();
  let configured = 0;
  host.configureXshellSavedSessions = () => { configured += 1; return Promise.resolve(); };
  await api.handleMessage.call(host, { command: "configureSessions" });
  assert.equal(configured, 1);
  assert.deepEqual(host.calls.lease, [{ actionType: "configureSessions", actionLabel: "配置 Xshell 会话" }]);
  assert.deepEqual(host.calls.statuses, []);
});

test("a legal lease command with clientActionId acquires the host lease once", async () => {
  const host = createHost();
  let configured = 0;
  host.configureXshellSavedSessions = () => { configured += 1; return Promise.resolve(); };
  await api.handleMessage.call(host, { command: "configureSessions", clientActionId: "act-lease" });
  assert.equal(configured, 1);
  assert.equal(host.calls.lease.length, 1);
  assert.deepEqual(host.calls.lease, [{ actionType: "configureSessions", actionLabel: "配置 Xshell 会话" }]);
  assert.equal(host.calls.statuses[0].status, "running");
  assert.equal(host.calls.statuses.at(-1).status, "completed");
  assert.equal(host.calls.statuses.at(-1).clientActionId, "act-lease");
});
