const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const { readSource } = require("../_helpers/sourceReader");

/**
 * 运行进度里停在“执行结果待确认”（outcome_pending）的旧短操作记录必须能按既有清除入口本机隐藏，
 * 而任何运行中、排队中或结果未知的长任务一律不能被同一个入口隐藏。
 * fixture 只保留状态与类型组合，不含任何真实机器、项目、Worker 或 operationId。
 */

const extensionSource = readSource("src/extension.ts");
const panelSource = readSource("src/ui/PanelHtml.ts");
const runOperationsSource = readSource("src/features/RunOperations.ts");

const runOperations = ts.transpileModule(runOperationsSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const runOperationsModule = { exports: {} };
vm.runInNewContext(runOperations, { module: runOperationsModule, exports: runOperationsModule.exports, require });
const RunOperations = runOperationsModule.exports;

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `missing source slice: ${startMarker}`);
  return source.slice(start, end);
}

function extensionHost(rows, choices = [], onConfirm) {
  const method = sliceBetween(extensionSource, "    async clearOperationHistoryFromUi(message) {", "\n    async stopAllPlansFromUi()");
  const statusHelpers = sliceBetween(extensionSource, "function operationStatusOf(value) {", "\nfunction planValidationFromResult(");
  const tokenHelper = sliceBetween(extensionSource, "function operationStatusToken(value) {", "\nfunction extractPlans(");
  const code = ts.transpileModule(
    `${tokenHelper}\n${statusHelpers}\nclass Host { ${method} };\nHost;`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const state = new Map();
  const notices = [];
  let posted = 0;
  const sandbox = {
    RunOperations_1: RunOperations,
    workspaceRoot: () => "/workspace/fixture-project",
    uniqueStrings: (values) => [...new Set(values.filter(Boolean))],
    stringArrayField: (row, key) => (Array.isArray(row?.[key]) ? row[key].map(String) : []),
    stringField: (row, key) => String(row?.[key] || ""),
    keys: { executionHistoryHiddenOperationIds: "hidden", executionHistoryCutoffs: "cutoffs" },
    vscode: {
      window: {
        showWarningMessage: async (text, _options, ...actions) => {
          notices.push(text);
          if (onConfirm) await onConfirm();
          return choices.length ? choices.shift() : actions[0];
        },
        showInformationMessage: async () => undefined,
      },
    },
  };
  const Host = vm.runInNewContext(code, sandbox);
  const host = new Host();
  Object.assign(host, {
    context: { workspaceState: { get: (key, fallback) => state.get(key) ?? fallback, update: async (key, value) => { state.set(key, value); } } },
    buildPlanRuntimeEvidenceState: () => ({ operations: rows }),
    postState: () => { posted += 1; },
  });
  return { host, notices, state, posts: () => posted };
}

const PENDING_VALIDATE = {
  operationId: "validate-plan-fixture-1",
  type: "validate-plan",
  status: "outcome_pending",
  outcomePending: true,
  terminal: false,
  planFile: "experiments/plans/fixture/selected.yaml",
  startedAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:01:30Z",
  message: "Worker Agent fixture 本轮尚未返回终态；原操作保留，刷新状态将按原 operationId 核对。",
};

const PENDING_REBUILD = {
  operationId: "distributed-merge-fixture-1",
  type: "rebuild-distributed-results",
  status: "outcome_pending",
  outcomePending: true,
  startedAt: "2026-01-02T00:00:00Z",
};

const COMPLETED_VALIDATE = {
  operationId: "validate-plan-fixture-2",
  type: "validate-plan",
  status: "completed",
  planFile: "experiments/plans/fixture/other.yaml",
};

test("outcome-pending validate-plan leftover can be hidden from local run progress", async () => {
  const rows = { [PENDING_VALIDATE.operationId]: { ...PENDING_VALIDATE } };
  const host = extensionHost(rows);
  await host.host.clearOperationHistoryFromUi({ operationId: PENDING_VALIDATE.operationId });
  assert.deepEqual(host.state.get("hidden"), [PENDING_VALIDATE.operationId]);
  assert.equal(host.posts(), 1);
  assert.match(host.notices[0], /执行结果待确认/);
  assert.match(host.notices[0], /不代表远端已结束/);
  assert.match(host.notices[0], /远端审计、日志及产物均保留/);
});

test("outcome-pending result rebuild without PLAN path is hideable and cancelled confirm writes nothing", async () => {
  const rows = { [PENDING_REBUILD.operationId]: { ...PENDING_REBUILD } };
  const accepted = extensionHost(rows);
  await accepted.host.clearOperationHistoryFromUi({ operationIds: [PENDING_REBUILD.operationId] });
  assert.deepEqual(accepted.state.get("hidden"), [PENDING_REBUILD.operationId]);

  const declined = extensionHost(rows, ["取消"]);
  await declined.host.clearOperationHistoryFromUi({ operationIds: [PENDING_REBUILD.operationId] });
  assert.equal(declined.state.get("hidden"), undefined);
  assert.equal(declined.posts(), 0);
});

test("legacy record missing the status field but flagged outcomePending is still hideable", async () => {
  const row = { operationId: "legacy-no-status", type: "validate-plan", outcomePending: true, planFile: "experiments/plans/fixture/other.yaml" };
  const host = extensionHost({ [row.operationId]: row });
  await host.host.clearOperationHistoryFromUi({ operationId: row.operationId });
  assert.deepEqual(host.state.get("hidden"), [row.operationId]);
});

test("ended records keep the original hideable behaviour and wording", async () => {
  const host = extensionHost({ [COMPLETED_VALIDATE.operationId]: { ...COMPLETED_VALIDATE } });
  await host.host.clearOperationHistoryFromUi({ operationId: COMPLETED_VALIDATE.operationId });
  assert.deepEqual(host.state.get("hidden"), [COMPLETED_VALIDATE.operationId]);
  assert.match(host.notices[0], /已结束操作记录/);
  assert.doesNotMatch(host.notices[0], /执行结果待确认/);
});

test("status flipping to running or queued during the confirm modal never writes the hidden list", async () => {
  for (const flip of [
    { status: "running", outcomePending: true },
    { status: "queued", outcomePending: true },
    { status: "running", outcomePending: false },
  ]) {
    const rows = { [PENDING_VALIDATE.operationId]: { ...PENDING_VALIDATE } };
    const host = extensionHost(rows, [], async () => { Object.assign(rows[PENDING_VALIDATE.operationId], flip); });
    await assert.rejects(() => host.host.clearOperationHistoryFromUi({ operationId: PENDING_VALIDATE.operationId }),
      /确认期间已变为运行中或已变化，本机隐藏未写入/);
    assert.equal(host.state.get("hidden"), undefined, `${JSON.stringify(flip)} must not be written to the hidden list`);
    assert.equal(host.posts(), 0, `${JSON.stringify(flip)} must not refresh the panel after a refused batch`);
  }
});

test("batch is refused as a whole when one selected record turns active during the modal", async () => {
  const rows = {
    [PENDING_VALIDATE.operationId]: { ...PENDING_VALIDATE },
    [COMPLETED_VALIDATE.operationId]: { ...COMPLETED_VALIDATE },
  };
  const host = extensionHost(rows, [], async () => { Object.assign(rows[COMPLETED_VALIDATE.operationId], { status: "running" }); });
  await assert.rejects(() => host.host.clearOperationHistoryFromUi({ operationIds: [PENDING_VALIDATE.operationId, COMPLETED_VALIDATE.operationId] }),
    /确认期间已变为运行中或已变化，本机隐藏未写入/);
  assert.equal(host.state.get("hidden"), undefined);
});

test("unknown-outcome run-plan and live evidence records stay uncleared", async () => {
  const rows = {
    "run-plan-unknown": { operationId: "run-plan-unknown", type: "run-plan", status: "outcome_pending", outcomePending: true, planFile: "experiments/plans/fixture/selected.yaml" },
    "reproduce-unknown": { operationId: "reproduce-unknown", type: "reproduce-plan", outcomePending: true, planFile: "experiments/plans/fixture/selected.yaml" },
    "validate-live": { operationId: "validate-live", type: "validate-plan", status: "outcome_pending", reconcileEvidenceActive: true },
    "validate-running": { operationId: "validate-running", type: "validate-plan", status: "running" },
    "validate-queued": { operationId: "validate-queued", type: "validate-plan" },
  };
  for (const id of Object.keys(rows)) {
    const host = extensionHost(structuredClone(rows));
    await assert.rejects(() => host.host.clearOperationHistoryFromUi({ operationId: id }), /仍在运行，请刷新状态后重新选择/);
    assert.equal(host.state.get("hidden"), undefined, `${id} must not be written to the hidden list`);
    assert.equal(host.notices.length, 0, `${id} must not reach confirmation`);
  }
});

test("predicate refuses long-running plan operations and active remote evidence", () => {
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan", status: "outcome_pending", outcomePending: true }), true);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "rebuild-distributed-results", state: "OUTCOME_PENDING" }), true);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan", outcomePending: true }), true);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "run-plan", status: "outcome_pending", outcomePending: true }), false);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "reproduce-plan", outcomePending: true }), false);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan", status: "outcome_pending", reconcileEvidenceActive: true }), false);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan", status: "running" }), false);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan" }), false);
  assert.equal(RunOperations.isOutcomePendingHistoryRecord(undefined), false);
});

test("explicit active status or unknown type outranks a stale outcomePending flag", () => {
  for (const status of ["running", "queued", "pending", "accepted", "submitted", "starting", "dispatching", "in_progress", "progress", "cancelling", "scheduled", "waiting"]) {
    assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "validate-plan", status, outcomePending: true }), false, `${status} must outrank the flag`);
    assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type: "rebuild-distributed-results", status, outcomePending: true }), false, `${status} must outrank the flag for rebuild rows`);
  }
  for (const type of ["", "run-plan", "reproduce-plan", "sync-artifacts", "archive-worker-artifacts", "parse-results", "unknown-future-action"]) {
    assert.equal(RunOperations.isOutcomePendingHistoryRecord({ type, status: "outcome_pending", outcomePending: true }), false, `${type || "<missing>"} is not a proven window-free short operation`);
  }
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ status: "outcome_pending", outcomePending: true }), false, "row without a type fails closed");
  assert.equal(RunOperations.isOutcomePendingHistoryRecord({ action: "validate-plan", status: "outcome_pending" }), true, "legacy action field carries the same whitelisted type");
});

// ---- panel side: the row must stop masquerading as active progress and must render the clear entry ----

const panelHelpers = sliceBetween(panelSource, "    function operationIsActive(status) {", "\n    function operationSucceeded(row) {");
const panelTokens = sliceBetween(panelSource, "    const OPERATION_ACTIVE_MATCH_TOKENS", "\n    const OPERATION_INFRASTRUCTURE_PATTERN");
const panelCaches = "\nvar executionHistoryRowsCacheState = null;\nvar executionHistoryRowsCacheValue = [];\n";
const rowsForState = sliceBetween(panelSource, "    function operationRowsForState(state) {", "\n    function operationRowsForInput(input) {");
const rowVisible = sliceBetween(panelSource, "    function executionHistoryRowVisible(state, row, planFile, active) {", "\n    function operationRowsForInput(input) {");
const historyHead = sliceBetween(panelSource, "     function renderOperationItem(row, historyActions) {", "\n      const planFile = firstPathLike(");

function panelHost(rows, extra = {}) {
  const sandbox = {
    escAttr: (value) => String(value),
    esc: (value) => String(value),
    selectedOperationHistoryIds: new Set(),
    operationRowsForInput: (input) => (Array.isArray(input) ? input : []),
    normalizePlanSelectionKey: (value) => String(value).replaceAll("\\", "/"),
  };
  Object.assign(sandbox, extra);
  vm.createContext(sandbox);
  vm.runInContext([panelTokens, panelCaches, panelHelpers, rowsForState, rowVisible].join("\n")
    + "\nthis.operationRowsForState = operationRowsForState;", sandbox);
  vm.runInContext(`this.historyEntry = function (row, historyActions) { ${historyHead
    .replace("     function renderOperationItem(row, historyActions) {", "")
    .replace(/\n\s*const historyMarker[\s\S]*$/, "")}\nreturn { historySelectable, historyCheckbox, historyButton, historyId }; };`, sandbox);
  return { rowsForState: (state) => sandbox.operationRowsForState(state), historyEntry: (row, actions = true) => sandbox.historyEntry(row, actions) };
}

function normalizePending(row) {
  return {
    operationId: row.operationId, type: row.type, status: row.status, outcomePending: row.outcomePending,
    planFile: row.planFile || "", startedAt: row.startedAt || "", reconcileEvidenceActive: row.reconcileEvidenceActive,
  };
}

test("outcome-pending leftover obeys hidden selection and history cutoffs", () => {
  const panel = panelHost([PENDING_VALIDATE].map(normalizePending));
  const hiddenId = { operations: [normalizePending(PENDING_VALIDATE)], executionHistoryHiddenOperationIds: [PENDING_VALIDATE.operationId], executionHistoryCutoffs: {} };
  assert.deepEqual(panel.rowsForState(hiddenId).map((row) => row.operationId), [], "hidden leftover must disappear from run progress");
  const cutoff = {
    operations: [normalizePending(PENDING_VALIDATE)], executionHistoryHiddenOperationIds: [],
    executionHistoryCutoffs: { "experiments/plans/fixture/selected.yaml": new Date(Date.now() + 60_000).toISOString() },
  };
  assert.deepEqual(panel.rowsForState(cutoff).map((row) => row.operationId), [], "cleared Plan history cutoff must hide the leftover");
  assert.deepEqual(panel.rowsForState({ operations: [normalizePending(PENDING_VALIDATE)] }).map((row) => row.operationId),
    [PENDING_VALIDATE.operationId], "without any clear action the record is still shown");
});

test("genuinely running records are never hidden by cutoffs or stale hidden ids", () => {
  const running = { operationId: "run-plan-live", type: "run-plan", status: "running", planFile: "experiments/plans/fixture/other.yaml", startedAt: "2026-01-03T00:00:00Z", reconcileEvidenceActive: true };
  const unknownRun = { operationId: "run-plan-unknown", type: "run-plan", status: "outcome_pending", outcomePending: true, planFile: "experiments/plans/fixture/other.yaml", startedAt: "2026-01-03T00:00:00Z" };
  const flippedValidate = { ...PENDING_VALIDATE, status: "running", startedAt: "2026-01-03T00:00:00Z" };
  const panel = panelHost([running, unknownRun, flippedValidate].map(normalizePending));
  const state = {
    operations: [running, unknownRun, flippedValidate].map(normalizePending),
    executionHistoryHiddenOperationIds: [running.operationId, unknownRun.operationId, flippedValidate.operationId],
    executionHistoryCutoffs: { all: new Date(Date.now() + 60_000).toISOString() },
  };
  assert.deepEqual(panel.rowsForState(state).map((row) => row.operationId).sort(),
    [running.operationId, unknownRun.operationId, flippedValidate.operationId].sort(),
    "running, unknown-outcome run-plan and a leftover that turned running again stay visible");
});

test("ended records stay visible until cleared and hide through the same entry", () => {
  const panel = panelHost([COMPLETED_VALIDATE].map(normalizePending));
  assert.deepEqual(panel.rowsForState({ operations: [normalizePending(COMPLETED_VALIDATE)] }).map((row) => row.operationId),
    [COMPLETED_VALIDATE.operationId]);
  const cleared = panel.rowsForState({ operations: [normalizePending(COMPLETED_VALIDATE)],
    executionHistoryHiddenOperationIds: [COMPLETED_VALIDATE.operationId], executionHistoryCutoffs: {} });
  assert.deepEqual(cleared.map((row) => row.operationId), [], "normal completed record keeps the existing clear behaviour");
});

test("outcome-pending leftover renders the existing clear entry, running records do not", () => {
  const panel = panelHost([]);
  const leftover = panel.historyEntry(normalizePending(PENDING_VALIDATE));
  assert.equal(leftover.historySelectable, true);
  assert.match(leftover.historyButton, new RegExp(`data-command="clearOperations" data-operation-id="${PENDING_VALIDATE.operationId}"`));
  assert.match(leftover.historyCheckbox, new RegExp(`data-operation-history-select="${PENDING_VALIDATE.operationId}"`));
  assert.match(leftover.historyButton, /结果待确认的旧记录/);
  assert.match(leftover.historyButton, /本机隐藏不代表远端已结束/);
  assert.doesNotMatch(leftover.historyButton, /已结束操作/, "a leftover record must not be described as ended");
  const ended = panel.historyEntry({ operationId: "validate-plan-fixture-3", type: "validate-plan", status: "completed", planFile: "plans/a.yaml" });
  assert.match(ended.historyButton, /仅从本机面板隐藏这条已结束操作/, "ended records keep the original button wording");
  assert.doesNotMatch(ended.historyButton, /结果待确认/);
  const running = panel.historyEntry({ operationId: "run-plan-live", type: "run-plan", status: "running", planFile: "plans/a.yaml" });
  assert.equal(running.historySelectable, false);
  assert.equal(running.historyButton, "");
  const unknownRun = panel.historyEntry({ operationId: "run-plan-unknown", type: "run-plan", status: "outcome_pending", outcomePending: true, planFile: "plans/a.yaml" });
  assert.equal(unknownRun.historySelectable, false, "unknown-outcome run-plan must not offer a clear entry");
  const evidence = panel.historyEntry({ operationId: "validate-live", type: "validate-plan", status: "outcome_pending", reconcileEvidenceActive: true });
  assert.equal(evidence.historySelectable, false, "active remote evidence must not offer a clear entry");
  for (const status of ["running", "queued", "pending", "starting", "dispatching"]) {
    assert.equal(panel.historyEntry({ operationId: "flipped", type: "validate-plan", status, outcomePending: true }).historySelectable, false,
      `${status} must not offer a clear entry even with a stale outcomePending flag`);
  }
  assert.equal(panel.historyEntry({ operationId: "unknown-type", status: "outcome_pending", outcomePending: true }).historySelectable, false,
    "row without a whitelisted short-operation type fails closed in the panel too");
});
