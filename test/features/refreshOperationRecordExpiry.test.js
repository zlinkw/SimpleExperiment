"use strict";

/**
 * 刷新运行状态“原操作尚未核实”永久告警的回归（用户真实场景的去标识版本）。
 *
 * 机制（代码事实）：Agent 端 api_operation 对该 operationId 已无任何事件时，
 * operation_summary_from_events(operation_id, []) 返回零事件摘要，HTTP 层固定
 * send_json(result, status=200 if result.get("eventCount") else 404)；传输层再把非 2xx 抛成
 * “Worker Agent HTTP 404: <原文>”。旧实现用裸 catch 把这份权威回答与“隧道根本没问到”混为一谈，
 * 于是短操作每轮刷新都报“部分未知：… 尚未核实”，永不收口。
 *
 * 本测试刻意把“不像权威回答”的响应全部当作未知：普通 404 文案、HTML 404、缺字段 JSON、
 * operationId 不一致、零事件但 events 缺失、message 非空、状态非 unknown、retired、截断 JSON、
 * 以及大 catch 里后续 API 抛的 404。去重只在身份与既有 fail-closed 短操作分类都仍成立时生效。
 * 全部用真实编译方法 + 真实分类器，只替换网络层；零网络、零真实服务器、不改真实状态文件。
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const dist = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
const runtime = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.legacy.ts"), "utf8");

function between(start, end) {
  const from = dist.indexOf(start);
  assert.ok(from >= 0, "compiled method missing: " + start);
  const to = dist.indexOf(end, from);
  assert.ok(to > from, "compiled method end missing: " + end);
  return dist.slice(from, to);
}

function topLevel(needle) {
  const from = dist.indexOf(needle);
  assert.ok(from >= 0, "compiled declaration missing: " + needle);
  const body = dist.slice(from);
  const stop = body.slice(needle.length).search(/\n(?:function |const |class |let )/);
  assert.ok(stop > 0, "compiled declaration end missing: " + needle);
  return body.slice(0, needle.length + stop);
}

function topLevelIfPresent(needle) {
  return dist.includes(needle) ? topLevel(needle) : "";
}

function objectLiteral(needle) {
  const from = dist.indexOf(needle);
  assert.ok(from >= 0, "compiled literal missing: " + needle);
  const body = dist.slice(from);
  const stop = body.indexOf("\n};");
  assert.ok(stop > 0, "compiled literal end missing: " + needle);
  return body.slice(0, stop + 3);
}

const methods = [
  between("async refreshPendingWorkerOperations() {", "async manualSnapshot() {"),
  between("async refreshOperationStatus(opId, action, workerId, probeAttempt = 0", "clearOperationWatchdog(opId) {"),
  between("async manualSnapshot() {", "async manualGpuSnapshot() {"),
].join("\n");

const topLevelDecls = [
  topLevel("const OPERATION_TERMINAL_STATUSES"),
  topLevel("const LONG_RUNNING_OPERATION_ACTIONS"),
  objectLiteral("const planSubmitProgress = {"),
  topLevelIfPresent("function operationNoRecordResponseFromError"),
  // 旧实现（被评审的上一版）用的是宽松 404 helper；红基线里也要注入，
  // 这样红/绿差异落在行为断言上，而不是切片注入错误。
  topLevelIfPresent("function operationRemoteRecordDefinitivelyAbsent"),
  topLevelIfPresent("function operationExpiryDedupeStillApplies"),
  topLevel("function operationStatusOf"),
  topLevel("function operationTerminal(value)"),
  topLevel("function operationTerminalStatus"),
  topLevel("function operationStatusToken"),
  topLevel("function resultStatus"),
  topLevel("function stringFromRecord"),
  topLevel("function planCheckAccepted"),
  topLevel("function errorMessage"),
].join("\n");

const WORKER = "worker-fixture-a";
const OTHER_WORKER = "worker-fixture-b";
const PLAN = "experiments/plans/fixture-comparison.yaml";
const OP_ID = "validate-plan-1760000000000-abcd12";

// 替身必须来自真实运行时源码，避免手抄漂移。
const summaryBlock = runtime.slice(runtime.indexOf("def operation_summary_from_events"), runtime.indexOf("def api_operation("));
const schemaVersion = Number((runtime.match(/SCHEMA_VERSION = (\d+)/) || [])[1]);
const summaryKeys = [...summaryBlock.matchAll(/^\s{8}"([A-Za-z]+)":/gm)].map((m) => m[1]);
test("替身契约与真实 Agent 零事件摘要一致（不靠手抄）", () => {
  assert.ok(summaryBlock.includes('"eventCount": len(events)'), "summary must still expose eventCount");
  assert.ok(runtime.includes("send_json(result, status=200 if result.get(\"eventCount\") else 404)"), "404 rule changed");
  assert.ok(runtime.includes('result["events"] = events[-50:]'), "api_operation must still attach events slice");
  const terminalTuple = (runtime.match(/def operation_terminal\(status\):\s*return status in \(([^)]*)\)/) || [])[1] || "";
  assert.ok(!terminalTuple.includes('"unknown"'), "unknown must stay non-terminal");
  assert.ok(Number.isFinite(schemaVersion), "runtime SCHEMA_VERSION must be parsed");
  assert.ok(summaryKeys.includes("operationId") && summaryKeys.includes("eventCount"), "summary keys must be readable");
});

function agentBody(overrides) {
  const body = {
    schemaVersion,
    operationId: OP_ID,
    opId: OP_ID,
    status: "unknown",
    terminal: false,
    message: "",
    eventCount: 0,
    startedAt: "",
    updatedAt: "",
    latestType: "",
    latestEvent: {},
    payload: {},
    events: [],
  };
  for (const key of Object.keys(overrides || {})) {
    const value = overrides[key];
    if (value === undefined) delete body[key];
    else body[key] = value;
  }
  return JSON.stringify(body);
}

// 真实 Agent 零事件响应：operationId 精确匹配 + eventCount=0 + events=[] + status=unknown。
const AGENT_NO_RECORD = () => { throw new Error("Worker Agent HTTP 404: " + agentBody()); };

test("权威无记录替身的字段集必须是真实摘要字段（防止 fixture 比生产契约更松）", () => {
  const keys = Object.keys(JSON.parse(agentBody()));
  for (const key of keys) {
    if (key === "events") continue;
    assert.ok(summaryKeys.includes(key), "fixture key not produced by operation_summary_from_events: " + key);
  }
});

function pendingRow(overrides) {
  return Object.assign({
    operationId: OP_ID, opId: OP_ID, type: "validate-plan", action: "validate-plan", workerId: WORKER,
    planFile: PLAN, status: "outcome_pending", outcomePending: true, terminal: false, eventCount: 2,
    events: [{ seq: 1, event: "operation_started" }, { seq: 2, event: "operation_progress", status: "running" }],
    latestEvent: { seq: 2, event: "operation_progress", status: "running" },
    payload: { planFile: PLAN, workerId: WORKER, operationId: OP_ID, planSha256: "fixture-sha" },
    startedAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:05.000Z",
    message: "Worker Agent " + WORKER + " 本轮尚未返回终态；原操作保留，刷新状态将按原 operationId 核对。",
  }, overrides || {});
}

function markedRow(overrides) {
  return pendingRow(Object.assign({
    outcomePending: false, remoteRecordExpired: true,
    remoteRecordExpiredOperationId: OP_ID, remoteRecordExpiredWorkerId: WORKER, remoteRecordExpiredType: "validate-plan",
    message: "Worker " + WORKER + " 本次按原 operationId " + OP_ID + " 未找到该原操作记录，结果仍无法核实。",
  }, overrides || {}));
}

function harness(options) {
  const settings = options || {};
  const notices = { warnings: [], informations: [] };
  const calls = { operationQueries: 0 };
  const client = {
    getWorkerOperation: async (workerId, operationId) => {
      calls.operationQueries += 1;
      return settings.answer(workerId, operationId);
    },
    getOperation: async (operationId) => {
      calls.operationQueries += 1;
      return settings.answer("", operationId);
    },
    getGpu: async () => ({}),
  };
  const sandbox = {
    console, require, path,
    crypto: require("node:crypto"),
    RunOperations_1: require("../../dist/features/RunOperations.js"),
    workspaceRoot: () => "C:/fixture/simple-cluster",
    workerTaskSnapshotHasRunningScheduler: () => false,
    vscode: { window: {
      showWarningMessage: async (text) => { notices.warnings.push(text); },
      showInformationMessage: async (text) => { notices.informations.push(text); },
    } },
  };
  vm.createContext(sandbox);
  vm.runInContext(topLevelDecls + "\nclass Provider {\n" + methods + "\n}\nthis.Provider = Provider;\nthis.noRecordCheck = typeof operationNoRecordResponseFromError === \"function\" ? operationNoRecordResponseFromError : null;", sandbox);
  const provider = new sandbox.Provider();
  Object.assign(provider, {
    projectContextGeneration: 0, client,
    localOperations: Object.assign({}, settings.operations || {}),
    taskLifecycleProtocol: 2, lastSnapshotAt: "", lastError: "", operationStatusProbeMaxAttempts: 3,
    postState() {}, markLocalOperationsDirty() {}, clearOperationStatusProbe() {}, clearOperationWatchdog() {},
    scheduleOperationStatusProbe() {},
    shouldRetryOperationStatusProbe() { return settings.retryProbe === true; },
    async reconcileSingleRunOperationEvidence() {
      if (settings.reconcileThrows) throw new Error(settings.reconcileThrows);
      return { terminal: false, dead: false };
    },
    async clearOfflineImport() {}, async refreshLocalPlanMetadata() {}, async tickDistributedQueue() {},
    recordActionError() {}, effectiveConnectionMode() { return "realtime"; },
    workerActionTargets() { return settings.workers || [{ id: WORKER }, { id: OTHER_WORKER }]; },
    async readWorkerTaskSnapshot(workerId) {
      if (settings.failingWorker && workerId === settings.failingWorker)
        throw new Error("Worker Agent request failed: " + workerId + " forward 41981 closed");
      return { tasks: [{ kind: "scheduler", state: "idle" }], queryComplete: true };
    },
  });
  return { provider, notices, calls, noRecordCheck: sandbox.noRecordCheck };
}

test("用户精确场景：Worker 本次无该记录时收口为无法核实，且不再每轮重复告警", async () => {
  const run = harness({ answer: AGENT_NO_RECORD });
  run.provider.localOperations[OP_ID] = pendingRow();
  await run.provider.manualSnapshot();
  const first = run.notices.warnings[run.notices.warnings.length - 1] || "";
  assert.match(first, /结果仍无法核实/, "must state the fact: " + first);
  assert.match(first, /未视为完成或失败/, "must not pretend a terminal outcome: " + first);
  assert.ok(!first.includes("已不再保留"), "must not claim historical expiry it cannot prove: " + first);
  assert.ok(!first.includes("尚未核实"), "the resolved fact must not stay as 尚未核实: " + first);
  const row = run.provider.localOperations[OP_ID];
  assert.equal(row.remoteRecordExpired, true);
  assert.equal(row.outcomePending, false);
  assert.equal(row.status, "outcome_pending", "status stays truthful: never completed, never failed");
  assert.equal(row.terminal, false);
  assert.ok(row.message.includes("本次按原 operationId"), "record wording must be this-run scoped: " + row.message);
  assert.ok(row.message.includes("请按原 operationId 重新核对"), "must prefer re-checking the same id: " + row.message);
  assert.ok(!row.message.includes("如仍需确认，请重新执行"), "must not push the user to re-run the operation");
  assert.equal(row.remoteRecordExpiredOperationId, OP_ID);
  assert.equal(row.remoteRecordExpiredWorkerId, WORKER);
  assert.equal(row.remoteRecordExpiredType, "validate-plan");
  assert.equal(row.payload.planSha256, "fixture-sha", "artefact attribution must survive untouched");
  const queries = run.calls.operationQueries;
  assert.ok(queries >= 1, "the first refresh must really ask once");
  run.notices.warnings.length = 0;
  await run.provider.manualSnapshot();
  assert.equal(run.notices.warnings.length, 0, "second refresh must not repeat the warning");
  const info = run.notices.informations[run.notices.informations.length - 1] || "";
  assert.ok(info.includes("已查询 2/2 台 Worker"), "success notice stays intact: " + info);
  assert.ok(!info.includes("无法核实") && !info.includes("尚未核实"), "no contamination of the success notice: " + info);
  assert.equal(run.calls.operationQueries, queries, "no repeated query while identity is unchanged");
});

test("身份不变才去重：换 Worker、改类型、新活动证据、长任务都必须撤销旧标记真实重查", async () => {
  const shapes = [
    { label: "worker 变了", patch: { workerId: OTHER_WORKER } },
    { label: "type 变了", patch: { type: "rebuild-distributed-results", action: "rebuild-distributed-results" } },
    { label: "出现 running 活动状态", patch: { status: "running", message: "Worker Agent 报告任务仍在执行" } },
    { label: "仍有远端活动证据", patch: { reconcileEvidenceActive: true } },
    { label: "升级成长任务", patch: { type: "run-plan", action: "run-plan", remoteRecordExpiredType: "run-plan" } },
    { label: "缺少当次查询身份", patch: { remoteRecordExpiredOperationId: undefined } },
  ];
  for (const shape of shapes) {
    const run = harness({ answer: AGENT_NO_RECORD, operations: { [OP_ID]: markedRow(shape.patch) } });
    await run.provider.manualSnapshot();
    assert.ok(run.calls.operationQueries >= 1, shape.label + " must really re-query: " + JSON.stringify(run.calls));
    const row = run.provider.localOperations[OP_ID];
    const warning = run.notices.warnings[run.notices.warnings.length - 1] || "";
    if (shape.label === "worker 变了") {
      // 旧身份先被撤销并真实重查，再按这次查询拿到的新身份重建结论。
      assert.ok(warning.includes("无法核实"), shape.label + " keeps reporting the fact: " + warning);
      assert.equal(row.remoteRecordExpiredWorkerId, OTHER_WORKER, shape.label + " must rebind the marker to the new identity");
      assert.notEqual(row.remoteRecordExpiredWorkerId, WORKER, shape.label + ": the stale identity must not survive");
    }
    else {
      assert.ok(warning.includes("尚未核实") || warning.includes("无法核实"), shape.label + " must stay visible: " + warning);
    }
  }
  // 对照：只有身份与分类都没变的行才允许去重——这一轮一次都不该再问。
  const quiet = harness({ answer: AGENT_NO_RECORD, operations: { [OP_ID]: markedRow() } });
  await quiet.provider.manualSnapshot();
  assert.equal(quiet.calls.operationQueries, 0, "identity unchanged: the settled row must not be re-asked");
  assert.equal(quiet.notices.warnings.length, 0, "identity unchanged: no repeated warning");
});

test("不像权威回答的 404 一律保持未知", async () => {
  const cases = [
    ["纯文本 404", "Worker Agent HTTP 404: Not Found"],
    ["HTML 404", "Worker Agent HTTP 404: <html><head><title>404 Not Found</title></head></html>"],
    ["缺字段 JSON", 'Worker Agent HTTP 404: {"detail":"Not Found"}'],
    ["operationId 不一致", "Worker Agent HTTP 404: " + agentBody({ operationId: "validate-plan-9999999999999-zzzzzz" })],
    ["opId 不一致", "Worker Agent HTTP 404: " + agentBody({ opId: "validate-plan-9999999999999-yyyyyy" })],
    ["截断 JSON", "Worker Agent HTTP 404: " + agentBody().slice(0, 40)],
    ["events 字段缺失", "Worker Agent HTTP 404: " + agentBody({ events: undefined })],
    ["eventCount 非 0", "Worker Agent HTTP 404: " + agentBody({ eventCount: 1 })],
    ["message 非空", "Worker Agent HTTP 404: " + agentBody({ message: "operation not found" })],
    ["状态不是 unknown", "Worker Agent HTTP 404: " + agentBody({ status: "running" })],
    ["terminal 不是 false", "Worker Agent HTTP 404: " + agentBody({ terminal: true })],
    ["retired 摘要", "Worker Agent HTTP 404: " + agentBody({ stateRetired: true, eventCount: 1 })],
    ["缺 schemaVersion", "Worker Agent HTTP 404: " + agentBody({ schemaVersion: undefined })],
    ["别的层改写过的 404 文案", "tunnel 502 -> Worker Agent HTTP 404: " + agentBody()],
    ["非 404 状态码", "Worker Agent HTTP 503: " + agentBody()],
  ];
  for (const [label, message] of cases) {
    const run = harness({ answer: () => { throw new Error(message); } });
    run.provider.localOperations[OP_ID] = pendingRow();
    await run.provider.manualSnapshot();
    const warning = run.notices.warnings[run.notices.warnings.length - 1] || "";
    assert.ok(warning.includes("尚未核实"), label + " must stay unknown: " + warning);
    const row = run.provider.localOperations[OP_ID];
    assert.notEqual(row.remoteRecordExpired, true, label + " must not mark the row");
    assert.equal(row.outcomePending, true, label + " must keep waiting for a real outcome");
    assert.equal(row.message, pendingRow().message, label + " must not rewrite the record");
  }
});

test("只有本次 operation 查询能判定：后续步骤抛同样 404 也不得收口", async () => {
  const run = harness({
    retryProbe: true,
    reconcileThrows: "Worker Agent HTTP 404: " + agentBody(),
    answer: async () => ({ operationId: OP_ID, status: "running", terminal: false, eventCount: 2 }),
    operations: { [OP_ID]: pendingRow() },
  });
  await run.provider.refreshOperationStatus(OP_ID, "validate-plan", WORKER, 0, run.client, false);
  const row = run.provider.localOperations[OP_ID];
  assert.notEqual(row.remoteRecordExpired, true, "an error from a later API call must never mark the row");
  assert.equal(row.status, "running", "the row keeps the real answer of this lookup");
  const contrast = harness({
    answer: () => { throw new Error("Worker Agent HTTP 404: " + agentBody()); },
    operations: { [OP_ID]: pendingRow() },
  });
  await contrast.provider.refreshOperationStatus(OP_ID, "validate-plan", WORKER, 0, contrast.client, true);
  assert.equal(contrast.provider.localOperations[OP_ID].remoteRecordExpired, true,
    "the very same body raised by the operation lookup itself is authoritative");
});

test("长任务与非白名单 type 即使拿到权威无记录也不收口", async () => {
  for (const shape of [
    { type: "run-plan", action: "run-plan", commandId: "cmd-fixture-1" },
    { type: "future-unknown-action", action: "future-unknown-action" },
  ]) {
    const run = harness({ answer: AGENT_NO_RECORD });
    run.provider.localOperations[OP_ID] = pendingRow(shape);
    await run.provider.manualSnapshot();
    const warning = run.notices.warnings[run.notices.warnings.length - 1] || "";
    assert.ok(warning.includes("尚未核实"), shape.type + " must keep the unknown warning: " + warning);
    assert.notEqual(run.provider.localOperations[OP_ID].remoteRecordExpired, true, shape.type + " must never be marked");
  }
});

test("隧道或 5xx 等“根本没问到”仍算未知", async () => {
  for (const message of [
    "Worker Agent HTTP 502: bad gateway",
    "Worker Agent request failed: socket hang up",
    "Worker Agent HTTP 403: forbidden",
    "30 秒无有效响应，执行结果待确认。实时连接会自动重试；请刷新运行状态核对，勿重复执行。",
  ]) {
    const run = harness({ answer: () => { throw new Error(message); } });
    run.provider.localOperations[OP_ID] = pendingRow();
    await run.provider.manualSnapshot();
    const warning = run.notices.warnings[run.notices.warnings.length - 1] || "";
    assert.ok(warning.includes("尚未核实"), message + " must stay unknown: " + warning);
    assert.notEqual(run.provider.localOperations[OP_ID].remoteRecordExpired, true, message + " must not mark");
  }
});

test("旧行已收口不污染本轮，同时部分 Worker 失败仍明确未知", async () => {
  const otherId = "rebuild-distributed-results-1760000000099-efgh34";
  const run = harness({
    answer: async (workerId, operationId) => (operationId === otherId
      ? { operationId, status: "completed", terminal: true, eventCount: 3, finishedAt: "2026-01-01T00:09:00.000Z" }
      : AGENT_NO_RECORD()),
    operations: {
      [OP_ID]: markedRow(),
      [otherId]: pendingRow({ operationId: otherId, opId: otherId, type: "rebuild-distributed-results", action: "rebuild-distributed-results" }),
    },
  });
  await run.provider.manualSnapshot();
  assert.equal(run.notices.warnings.length, 0, "one resolved operation must not be a warning");
  const info = run.notices.informations[run.notices.informations.length - 1] || "";
  assert.ok(info.includes("核对 1 项原操作"), "resolved count must stay exact: " + info);
  assert.ok(!info.includes("无法核实"), "settled row stays quiet: " + info);
  assert.equal(run.provider.localOperations[otherId].status, "completed");
  assert.equal(run.provider.localOperations[OP_ID].remoteRecordExpired, true, "settled row is left as it is");

  const partial = harness({ answer: AGENT_NO_RECORD, failingWorker: OTHER_WORKER });
  partial.provider.localOperations[OP_ID] = pendingRow();
  await partial.provider.manualSnapshot();
  const fact = partial.notices.warnings[partial.notices.warnings.length - 1] || "";
  assert.ok(fact.includes("结果仍无法核实"), "first fact is stated: " + fact);
  const again = harness({ answer: AGENT_NO_RECORD, failingWorker: OTHER_WORKER, operations: { [OP_ID]: markedRow() } });
  await again.provider.manualSnapshot();
  const stillUnknown = again.notices.warnings[again.notices.warnings.length - 1] || "";
  assert.ok(stillUnknown.includes("部分未知"), "a failing Worker must still be reported: " + stillUnknown);
  assert.ok(stillUnknown.includes(OTHER_WORKER), "the failing Worker must be named: " + stillUnknown);
  assert.ok(stillUnknown.includes("1/2 台 Worker"), "partial coverage stays visible: " + stillUnknown);
});

// 2026-10-21 单次只读取证（jqg_zlk 既有本机转发 127.0.0.1:18769，GET /api/operations/<原ID>，
// HTTP 404 application/json 266B）拿到的真实响应原文，字段一字不改，仅把 operationId/opId 换成夹具 ID。
const CAPTURED_NO_RECORD_FIELDS = [
  ["schemaVersion", 1],
  ["status", "unknown"],
  ["terminal", false],
  ["message", ""],
  ["eventCount", 0],
  ["startedAt", ""],
  ["updatedAt", ""],
  ["latestType", ""],
  ["latestEvent", {}],
  ["payload", {}],
  ["events", []],
];
const capturedBody = (operationId) => JSON.stringify(Object.assign({
  schemaVersion: 1, operationId, opId: operationId, status: "unknown", terminal: false, message: "",
  eventCount: 0, startedAt: "", updatedAt: "", latestType: "", latestEvent: {}, payload: {}, events: [],
}));

test("真实取证响应被权威无记录判定接受，且换 ID 仍拒绝", async () => {
  const run = harness({ answer: AGENT_NO_RECORD });
  assert.equal(typeof run.noRecordCheck, "function", "the gate must be extractable");
  const ours = new Error("Worker Agent HTTP 404: " + capturedBody(OP_ID));
  assert.equal(run.noRecordCheck(ours, OP_ID), true, "the captured real response shape must be authoritative");
  const otherId = "validate-plan-1792350478087-n2wigt";
  assert.equal(run.noRecordCheck(new Error("Worker Agent HTTP 404: " + capturedBody(otherId)), OP_ID), false,
    "an authoritative body for a different operationId must never mark this row");
  // 真实字段集必须与替身一致，避免 fixture 比生产响应更松或更紧。
  const capturedKeys = Object.keys(JSON.parse(capturedBody(OP_ID)));
  const fixtureKeys = Object.keys(JSON.parse(agentBody()));
  assert.deepEqual(capturedKeys.slice().sort(), fixtureKeys.slice().sort(), "captured fields must equal the fixture fields");
  for (const [key, value] of CAPTURED_NO_RECORD_FIELDS)
    assert.deepEqual(JSON.parse(capturedBody(OP_ID))[key], value, "captured field drifted: " + key);
  // 端到端：真实形状经传输层原文进入后确实收口，且仍是非终态。
  run.provider.localOperations[OP_ID] = pendingRow();
  await run.provider.refreshOperationStatus(OP_ID, "validate-plan", WORKER, 0, run.client, true);
  const row = run.provider.localOperations[OP_ID];
  assert.equal(row.remoteRecordExpired, true, "the captured response must close the loop");
  assert.equal(row.status, "outcome_pending", "still no fake terminal outcome");
  assert.equal(row.terminal, false);
});

test("显式单条核对可在远端恢复记录时作废本次结论", async () => {
  const run = harness({
    answer: async () => ({ operationId: OP_ID, status: "completed", terminal: true, eventCount: 4, finishedAt: "2026-01-01T00:20:00.000Z" }),
    operations: { [OP_ID]: markedRow() },
  });
  await run.provider.refreshOperationStatus(OP_ID, "validate-plan", WORKER, 0, run.client, false);
  const row = run.provider.localOperations[OP_ID];
  assert.equal(row.status, "completed", "a real Worker answer wins over the earlier conclusion");
  assert.equal(row.terminal, true);
  assert.notEqual(row.remoteRecordExpired, true, "explicit re-check must clear the marker when the record is back");
});
