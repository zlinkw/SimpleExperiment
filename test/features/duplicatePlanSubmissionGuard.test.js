const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

function samePlanSelection(left, right) {
  const key = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const a = key(left);
  const b = key(right);
  return Boolean(a && b && (a === b || a.split("/").pop() === b.split("/").pop()));
}

function loadExtensionGuard() {
  const sandbox = {
    ACTIVE_PLAN_RUN_EVIDENCE_VARIANT_CACHE_LIMIT: 3,
    ACTIVE_PLAN_RUN_STATUSES: new Set(["accepted", "submitted", "queued", "pending", "running", "testing", "progress", "in_progress", "operation_started", "started"]),
    EMPTY_ACTIVE_PLAN_RUN_EVIDENCE_STATE: Object.freeze({}),
    EMPTY_ACTIVE_PLAN_RUN_OPERATIONS: Object.freeze({}),
    EMPTY_PLAN_ARCHIVE_SCHEDULER_ROWS: Object.freeze([]),
    activePlanRunEvidenceCache: new WeakMap(),
    payloadReads: 0,
    normalizePlanSelectionKey: (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, ""),
    operationResultPlanFile: (row) => String((row || {}).planFile || (row || {}).plan || ""),
    samePlanSelection,
    operationStatusToken: (value) => String(value || "").trim().toLowerCase(),
    operationStatusOf: (row) => String((row || {}).status || (row || {}).state || (row || {}).type || ""),
    remoteResultOperationPayloads: (row) => {
      sandbox.payloadReads += 1;
      return [row || {}, (row || {}).payload || {}, (row || {}).latestEvent || {}, ((row || {}).latestEvent || {}).payload || {}];
    },
    flattenPlanArchiveSchedulerRows: (rows) => Array.isArray(rows) ? rows.flatMap((row) => {
      const out = [];
      for (const [key, status] of [["running_experiments", "running"], ["testing_experiments", "testing"], ["queued_experiments", "queued"], ["pending_experiments", "pending"], ["completed_experiments", "completed"]]) {
        for (const child of Array.isArray((row || {})[key]) ? row[key] : []) out.push({ ...child, status, planFile: child.planFile || row.planFile });
      }
      return out.length ? out : [row];
    }) : [],
    planArchiveSchedulerRowsForState: (state) => sandbox.flattenPlanArchiveSchedulerRows((state || {}).schedulerStates || []),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(extension, "activePlanRunEvidence")}\nthis.guard = activePlanRunEvidence;`, sandbox);
  sandbox.guard.cache = sandbox.activePlanRunEvidenceCache;
  sandbox.guard.sandbox = sandbox;
  return sandbox.guard;
}

function loadPanelGuard() {
  const sandbox = {
    normalizePlanSelectionKey: (value) => String(value || "").replace(/\\/g, "/"),
    samePlanSelection,
    operationRowsForState: (state) => state.operations || [],
    schedulerRowsForState: (state) => state.schedulerStates || [],
    PLAN_ACTIVE_STATUSES: new Set(["accepted", "submitted", "queued", "pending", "running", "testing", "progress", "in_progress", "operation_started", "started"]),
    PLAN_RUN_OPERATION_TYPES: new Set(["run-plan", "reproduce-plan"]),
    planActiveRunEvidenceCacheState: null,
    planActiveRunEvidenceCache: new Map(),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(panel, "planActiveRunEvidence")}\nthis.guard = planActiveRunEvidence;`, sandbox);
  return sandbox.guard;
}

function loadPlanRuntimeEvidenceCache() {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction(extension, "planRuntimeEvidenceCacheMatches")}\n${extractFunction(extension, "resolvePlanRuntimeEvidenceCache")}\nthis.resolveCache = resolvePlanRuntimeEvidenceCache;`, sandbox);
  return sandbox.resolveCache;
}

test("backend reuses Plan runtime evidence merge only for identical sources", () => {
  const resolveCache = loadPlanRuntimeEvidenceCache();
  const realtimeState = {};
  const snapshot = {};
  const offlineSnapshot = {};
  const localOperations = {};
  const input = {
    projectContextGeneration: 1,
    connectionMode: "xshell_tunnel_realtime",
    realtimeState,
    snapshot,
    offlineSnapshot,
    localOperations,
    localOperationsRevision: 3,
    schedulerProtectedKey: '["run-a"]',
  };
  let builds = 0;
  const build = () => ({ build: ++builds });
  const first = resolveCache(undefined, input, build);
  const reused = resolveCache(first, { ...input }, build);

  assert.strictEqual(reused, first);
  assert.strictEqual(reused.value, first.value);
  assert.equal(builds, 1);

  for (const [field, value] of [
    ["projectContextGeneration", 2],
    ["connectionMode", "offline_import"],
    ["realtimeState", {}],
    ["snapshot", {}],
    ["offlineSnapshot", {}],
    ["localOperations", {}],
    ["localOperationsRevision", 4],
    ["schedulerProtectedKey", '["run-b"]'],
  ]) {
    assert.notStrictEqual(resolveCache(first, { ...input, [field]: value }, build), first, field);
  }
  assert.equal(builds, 9);
  assert.match(extension, /private localOperationsRevision = 0/);
  assert.match(extension, /markLocalOperationsDirty\(\)\s*\{\s*this\.localOperationsDirty = true;\s*this\.localOperationsRevision \+= 1;/);
  assert.match(extension, /this\.planRuntimeEvidenceCache = resolvePlanRuntimeEvidenceCache/);
  assert.match(extension, /return this\.planRuntimeEvidenceCache\.value/);
});

test("backend blocks duplicate run operations and active scheduler tasks for the same Plan", () => {
  assert.match(extension, /private buildPlanRuntimeEvidenceState\(\)/);
  assert.match(extension, /private buildState\(\): WebviewClusterState \{[\s\S]{0,240}this\.buildPlanRuntimeEvidenceState\(\)/);
  assert.doesNotMatch(extension, /activePlanRunEvidence\(this\.buildState\(\)/);
  assert.doesNotMatch(extension, /currentPlanRevisionHasRunEvidence\(this\.buildState\(\)/);
  const guard = loadExtensionGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const empty = guard({ operations: {} }, planFile);
  assert.equal(empty.active, false);
  assert.equal(empty.operationCount, 0);
  assert.equal(empty.taskCount, 0);
  const operation = guard({ operations: { op: { type: "run-plan", status: "accepted", planFile } } }, planFile);
  assert.equal(operation.active, true);
  assert.equal(operation.operationCount, 1);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "completed", planFile } } }, planFile).active, false);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "running", planFile, schedulerFinished: true } } }, planFile).active, false);
  assert.equal(guard({ operations: { op: { type: "run-plan", status: "running", planFile: "other.yaml" } } }, planFile).active, false);
  const task = guard({ schedulerStates: [{ planFile, running_experiments: [{ id: "job-1" }] }] }, planFile);
  assert.equal(task.active, true);
  assert.equal(task.taskCount, 1);
});

test("backend protects active old revisions without misclassifying them as current", () => {
  const guard = loadExtensionGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev2", updatedAt: "2026-07-20T01:00:00.000Z" };
  const oldOperation = guard({ operations: { op: { type: "run-plan", status: "running", planFile, planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" } } }, planFile, plan);
  assert.equal(oldOperation.active, true);
  assert.equal(oldOperation.historicalOnly, true);
  assert.equal(oldOperation.currentOperationCount, 0);
  assert.equal(oldOperation.historicalOperationCount, 1);

  const oldTask = guard({ schedulerStates: [{ planFile, running_experiments: [{ id: "job-old", planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" }] }] }, planFile, plan);
  assert.equal(oldTask.active, true);
  assert.equal(oldTask.historicalOnly, true);
  assert.equal(oldTask.currentTaskCount, 0);

  const current = guard({ operations: { op: { type: "run-plan", status: "running", planFile, planRevision: "rev2" } } }, planFile, plan);
  assert.equal(current.active, true);
  assert.equal(current.historicalOnly, false);
  assert.equal(current.currentOperationCount, 1);
});

test("backend reuses bounded current Plan activity evidence and invalidates source replacements", () => {
  const guard = loadExtensionGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const state = {
    operations: { op: { type: "run-plan", status: "running", planFile } },
    schedulerStates: [],
  };
  const plan = { revision: "r1", updatedAt: "2026-07-30T00:00:00.000Z" };
  const first = guard(state, planFile, plan);
  const payloadReads = guard.sandbox.payloadReads;

  assert.strictEqual(guard(state, planFile, { ...plan }), first);
  assert.equal(guard.sandbox.payloadReads, payloadReads);

  const nextRevision = guard(state, planFile, { ...plan, revision: "r2" });
  assert.notStrictEqual(nextRevision, first);
  state.operations = { op: { type: "run-plan", status: "completed", planFile } };
  const operationRefresh = guard(state, planFile, { ...plan, revision: "r2" });
  assert.notStrictEqual(operationRefresh, nextRevision);
  assert.equal(operationRefresh.active, false);

  state.schedulerStates = [{ planFile, running_experiments: [{ id: "job-1", planRevision: "r2" }] }];
  const schedulerRefresh = guard(state, planFile, { ...plan, revision: "r2" });
  assert.notStrictEqual(schedulerRefresh, operationRefresh);
  assert.equal(schedulerRefresh.taskCount, 1);

  const oldest = guard(state, "plans/0.yaml", { revision: "r0" });
  for (let index = 1; index < 4; index += 1) guard(state, `plans/${index}.yaml`, { revision: `r${index}` });
  assert.equal(guard.cache.get(state).size, 3);
  assert.notStrictEqual(guard(state, "plans/0.yaml", { revision: "r0" }), oldest);
});

test("webview disables duplicate submission using the same Plan-scoped activity evidence", () => {
  const guard = loadPanelGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const state = { operations: [{ type: "reproduce-plan", status: "submitted", planFile }] };
  const first = guard(state, planFile);
  assert.equal(first.operationCount, 1);
  assert.equal(guard(state, planFile), first);
  assert.equal(guard({ schedulerStates: [{ status: "queued", planFile }] }, planFile).taskCount, 1);
  assert.equal(guard({ operations: [{ type: "run-plan", status: "completed", planFile }] }, planFile).active, false);
  const planActivity = extractFunction(panel, "planActiveRunEvidence");
  assert.match(planActivity, /planActiveRunEvidenceCache\.has\(cacheKey\)/);
  assert.match(planActivity, /for \(const row of operationRowsForState/);
  assert.match(planActivity, /for \(const row of schedulerRowsForState/);
  assert.doesNotMatch(planActivity, /\.filter\(/);
  assert.match(panel, /当前 Plan 已有 [\s\S]{0,160}不能重复提交/);
  assert.match(extension, /assertPlanNotAlreadyActive[\s\S]{0,2600}已阻止重复提交/);
});

test("webview explains old revision activity and opens all tasks", () => {
  const guard = loadPanelGuard();
  const planFile = "experiments/plans/smoke.yaml";
  const plan = { revision: "rev2", updatedAt: "2026-07-20T01:00:00.000Z" };
  const activity = guard({ schedulerStates: [{ planFile, status: "running", planRevision: "rev1", updatedAt: "2026-07-20T01:05:00.000Z" }] }, planFile, plan);
  assert.equal(activity.active, true);
  assert.equal(activity.historicalOnly, true);
  assert.equal(activity.currentTaskCount, 0);
  assert.match(panel, /旧 revision 的/);
  assert.match(panel, /查看全部任务/);
  assert.match(panel, /taskPlanScope === "all"/);
  assert.match(extension, /旧 Plan revision 仍有/);
  assert.match(extension, /next === "查看全部任务"/);
});
