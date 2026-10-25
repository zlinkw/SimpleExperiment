const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const OperationOutcome_1 = require("../../dist/core/OperationOutcome.js");
const source = fs.readFileSync(require.resolve("../../dist/extension/legacy.js"), "utf8");
function method(first, next) {
  const start = source.indexOf(first), end = source.indexOf(next, start);
  assert.ok(start >= 0 && end > start, first);
  return source.slice(start, end).replace(/}\r?\n {4}(?=(?:async )?[a-zA-Z_$][\w$]*\()/g, "},\n    ");
}

function fixture({ errorChoice, finishChoice } = {}) {
  const alerts = [], warnings = [], statuses = [], terminal = [], progress = [], information = [], logCalls = [], facts = [], openedPanels = [];
  const sandbox = {
    workspaceRoot: () => "C:/project",
    OperationOutcome_1,
    PLAN_SUBMISSION_COMMANDS: new Set(["runPlan"]),
    actionCommandMap: { runPlan: "plan/run" },
    localCommandReleasesAfterTrigger: () => false,
    hostOperationLeaseActionLabel: command => command,
    errorMessage: error => error.message, compactSensitiveText: text => text,
    isUiCommandRemotePending: () => false, isUiCommandCancelled: error => error.name === "UiCommandCancelled",
    // r49 迁类：runActionCommandCore/distributedCodeVersionHold 的编译切片经 UiCommandCancelled_1
    // 命名空间引用共享取消类；沙箱按 core 同一构造语义供给，分支一旦执行不再 ReferenceError。
    UiCommandCancelled_1: { UiCommandCancelled: class UiCommandCancelled extends Error {
      constructor(message = "操作已取消。", code = "USER_CANCELLED") { super(message); this.name = "UiCommandCancelled"; this.code = code; } } },
    actionErrorSuggestion: () => "inspect",
    // r4 (task ui-plan-gpu-progress-20261024 返修): the four artifact-sync commands now run
    // their per-operation Notification through the real withUiCommandStatus funnel, so this
    // fixture supplies the same lifecycle dependencies planOperationNoticeLifecycle uses —
    // real methods below, mock host surfaces only. Failure/partial/cancelled semantics
    // asserted here are unchanged.
    stringField: (record, key) => String((record && record[key]) || ""),
    OPERATION_NOTICE_TITLES: {
      retryJobArtifactSync: "重试产物同步", refreshJobArtifacts: "刷新产物状态",
      syncPendingPlanArtifacts: "同步待同步产物", syncAllResultArtifacts: "同步全部结果文件",
    },
    vscode: {
      ProgressLocation: { Notification: 15 },
      window: {
        // r42: Native showErrorMessage resolves the clicked button item (undefined on dismiss);
        // 记录调用后返回 errorChoice，被测 callback 仍由产品真实 .then 分支驱动。
        showErrorMessage: async (...args) => { alerts.push(args); return errorChoice; }, showWarningMessage: async (...args) => { warnings.push(args); return finishChoice; }, showInformationMessage: (...args) => information.push(args),
        withProgress: (_options, callback) => Promise.resolve(callback({ report() {} })).catch(() => undefined),
        createOutputChannel: () => ({ appendLine() {}, show() {}, dispose() {} }),
      },
    },
  };
  vm.createContext(sandbox);
  const helperStart = source.indexOf("function resultSyncCommandOutcome(");
  assert.ok(helperStart >= 0, "compiled collector outcome helper");
  vm.runInContext(source.slice(helperStart, source.indexOf("function resultMetricMergeScopePaths(", helperStart)), sandbox);
  vm.runInContext(`this.methods = { ${[
    method("async withUiCommandStatus(", "uiCommandWatchdogMs("),
    method("\n    operationNoticeKey(message)", "\n    submissionNoticeTone(message, result)"),
    method("async runActionCommandCore(", "async runPlanPreflight("),
    method("\n    assertPlanSubmissionNotDuringResultSync(", "\n    async finishDistributedPlanSubmission("),
    method("async finishDistributedPlanSubmission(", "async activeDeferredForSubmission("),
    method("async distributedCodeVersionHold(", "legacySourceFreezeWorkerNames("),
    method("\n    finishOperationProgressNotice(", " submissionNoticeTone("),
  ].join(",")} };`, sandbox);
  const host = {
    ...sandbox.methods, localOperations: {}, manualResultSyncCounts: new Map(),
    operationNoticeSessions: new Map(), context: { subscriptions: [] },
    postUiCommandStatus(_id, status, command, message, extra) { statuses.push(status); terminal.push({ status, command, message, ...extra }); },
    planSubmissionOperationId: () => "op", submissionStillCurrent: () => true,
    finishPlanSubmissionProgress(_message, status, detail) { progress.push({ status, detail }); },
    postState() {}, recordActionError() {}, queuePlanArtifactSyncStatusCheck() {},
    beginSimpleSftpCapabilityLaunch() {}, legacySourceFreezeWorkerNames() { return []; },
    // r42: 最小可观察日志宿主——仅计数真实产品 .then 分支的调用，不伪造被测 callback。
    showOperationLogFromUi() { logCalls.push(1); },
    // r47 A：finishOperationProgressNotice 的被测宿主——完整日志通道与面板导航均为真实方法调用点。
    logOperationFact(line) { facts.push(line); }, openPanelAt(panel) { openedPanels.push(panel); },
  };
  return { host, alerts, warnings, statuses, terminal, progress, information, logCalls, facts, openedPanels };
}

test("replaced result requests finish silently while ordinary cancellations stay visible", async () => {
  for (const replaced of [true, false]) {
    const f = fixture();
    await f.host.withUiCommandStatus("click", "rebuildProjectResultTables", {}, async () => {
      const error = new Error(replaced ? "旧请求已被重新执行替代，保留已有产物。" : "用户取消同步。");
      error.name = "UiCommandCancelled";
      throw error;
    });
    assert.equal(f.statuses.at(-1), "cancelled");
    assert.equal(f.information.length, replaced ? 0 : 1);
    assert.equal(f.alerts.length, 0);
  }
});

test("legacy result-sync submission guard leaves active mirrors and UI untouched", async () => {
  const f = fixture();
  const sync = Promise.resolve("still syncing");
  f.host.distributedPostprocessPromise = sync;
  f.host.assertPlanSubmissionNotDuringResultSync({});
  assert.equal(f.host.distributedPostprocessPromise, sync);
  assert.equal(f.alerts.length, 0);
  assert.equal(f.progress.length, 0);
});

test("memory-only result reads do not reserve a global PLAN submission scope", async () => {
  const f = fixture();
  const client = {};
  f.host.client = client;
  let release;
  const download = f.host.withManualResultSync(() => new Promise(resolve => { release = resolve; }));
  f.host.assertPlanSubmissionNotDuringResultSync({});
  assert.equal(f.host.client, client);
  assert.equal(f.host.manualResultSyncCounts.size, 0);
  assert.equal(f.alerts.length, 0);
  release();
  await download;
  assert.equal(f.host.manualResultSyncCounts.size, 0);
  await assert.rejects(f.host.withManualResultSync(async () => { throw new Error("sync failed"); }), /sync failed/);
  assert.equal(f.host.manualResultSyncCounts.size, 0);
});

for (const command of ["syncPendingPlanArtifacts", "rebuildProjectResultTables", "syncAllResultArtifacts"]) {
  test(`${command} keeps verified results and reports partial collection without a second modal`, async () => {
    const f = fixture();
    await f.host.withUiCommandStatus("click", command, {}, async () => ({
      discovered: 2, included: ["a"], skipped: ["b: content missing"], missing: [], notificationShown: true,
    }));
    assert.equal(f.alerts.length, 0);
    assert.equal(f.warnings.length, 0, "the collector already displayed its warning");
    assert.equal(f.statuses.at(-1), "completed");
    assert.equal(f.terminal.at(-1).resultSync.outcome, "partial");
    assert.equal(f.terminal.at(-1).resultSync.included, 1);
    assert.equal(f.terminal.at(-1).resultSync.skipped, 1);
    assert.match(f.terminal.at(-1).message, /content missing/);
  });

  test(`${command} does not label rejected identity or hash checks successful when nothing is published`, async () => {
    for (const notificationShown of [false, true]) {
      const f = fixture();
      await f.host.withUiCommandStatus("click", command, {}, async () => ({
        discovered: 1, included: [], skipped: ["seed mismatch / SHA256 mismatch"], missing: [], notificationShown,
      }));
      assert.equal(f.statuses.at(-1), "failed");
      assert.equal(f.terminal.at(-1).resultSync.outcome, "failed");
      assert.equal(f.alerts.length, 0);
      assert.equal(f.warnings.length, notificationShown ? 0 : 1);
      assert.match(f.terminal.at(-1).message, /SHA256 mismatch/);
    }
  });

  test(`${command} distinguishes pending-only and preview-only results from formal publication`, async () => {
    for (const preview of [false, true]) {
      const f = fixture();
      await f.host.withUiCommandStatus("click", command, {}, async () => ({
        discovered: 1, included: [], skipped: [], missing: preview ? ["incomplete seeds"] : [],
        pending: preview ? [] : ["no completed jobs"], previews: preview ? ["run-b preview"] : [], notificationShown: true,
      }));
      assert.equal(f.statuses.at(-1), "completed");
      assert.equal(f.terminal.at(-1).resultSync.included, 0);
      assert.equal(f.terminal.at(-1).resultSync.outcome, preview ? "partial" : "pending");
      assert.equal(f.terminal.at(-1).resultSync.previews, preview ? 1 : 0);
      if (preview) assert.match(f.terminal.at(-1).message, /仅更新未完成运行预览，正式结果未更新/);
      assert.equal(f.alerts.length, 0);
    }
  });
}

test("a result operation exception still fails visibly and is never converted into partial success", async () => {
  // r42: 失败反馈按用户 r40 要求为非 modal 原生错误通知 + "查看日志"按钮（legacy.ts
  // withUiCommandStatus catch→failed 分支），旧 modal:true 预期失效。两个必要选择 case
  // 在本测试内循环，完整保留失败可见性与终态语义断言。
  for (const errorChoice of ["查看日志", undefined]) {
    const f = fixture({ errorChoice });
    await f.host.withUiCommandStatus("click", "rebuildProjectResultTables", {}, async () => {
      throw new Error("publication transaction failed");
    });
    await new Promise(resolve => setImmediate(resolve)); // flush 产品通知按钮 .then
    assert.equal(f.statuses.at(-1), "failed");
    assert.equal(f.terminal.at(-1).status, "failed");
    assert.equal(f.terminal.at(-1).resultSync, undefined, "异常失败绝不被转成 partial 结果同步成功");
    assert.equal(f.alerts.length, 1, "恰好一条原生错误通知");
    assert.match(f.alerts[0][0], /publication transaction failed/, "完整异常原因进入原生错误通知");
    assert.match(f.terminal.at(-1).message, /publication transaction failed/, "终态记录保留完整异常原因");
    assert.deepEqual(f.alerts[0].slice(1), ["查看日志"], "唯一按钮为查看日志，无 modal/options 对象");
    assert.equal(f.warnings.length, 0);
    assert.equal(f.information.length, 0, "不增加重复 info/warning");
    assert.equal(f.logCalls.length, errorChoice === "查看日志" ? 1 : 0, "仅点击\"查看日志\"才实际调用日志宿主，dismiss 不调用");
  }
});

test("A cleared-selection wait closes its native progress session silently while ordinary cancellation keeps its warning feedback", async () => {
  for (const silent of [false, true]) {
    const f = fixture({ finishChoice: silent ? undefined : "查看日志" });
    let finished = 0;
    f.host.operationNoticeSessions.set("artifact-key", { title: "重试产物同步", reports: [], closed: false, finishResolve: () => { finished++; } });
    f.host.finishOperationProgressNotice("artifact-key", "cancelled", "所选任务已被本地清退或被新的运行替代，本次等待已结束。", silent ? { silent: true } : undefined);
    await new Promise(resolve => setImmediate(resolve)); // flush 按钮 .then
    assert.equal(finished, 1, "session 的 done 释放照旧（silent 不吞释放）");
    assert.equal(f.host.operationNoticeSessions.size, 0, "session 删除照旧");
    assert.ok(f.facts.some(line => /SimpleExperiment 重试产物同步：所选任务已被本地清退/.test(line)), "完整终态日志照旧");
    assert.equal(f.warnings.length, silent ? 0 : 1, "仅 A 身份失效清退静默收拢；普通取消的既有可见 warning 反馈保留");
    assert.equal(f.alerts.length, 0);
    assert.equal(f.information.length, 0);
    assert.equal(f.logCalls.length, silent ? 0 : 1, "非静默且点击\"查看日志\"仍真实调用日志宿主");
  }
});

test("a non-silent progress finish keeps the native button routing to the execution panel", async () => {
  const f = fixture({ finishChoice: "打开面板" });
  let finished = 0;
  f.host.operationNoticeSessions.set("k", { title: "t", reports: [], closed: false, finishResolve: () => { finished++; } });
  f.host.finishOperationProgressNotice("k", "cancelled", "普通取消原因。", undefined);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(finished, 1);
  assert.equal(f.warnings.length, 1);
  assert.deepEqual(f.openedPanels, ["execution"], "点击\"打开面板\"真实调用既有 execution 面板宿主（Job 行手动重新同步所在处）");
});

test("completed old-revision history and an artifact sync do not masquerade as a live training blocker", async () => {
  const f = fixture();
  f.host.distributedPostprocessPromise = Promise.resolve();
  f.host.loadDistributedQueue = async () => ({ plans: [{ codeFingerprint: "old", jobs: [{ status: "completed" }] }] });
  f.host.localDistributedCodeFingerprint = async () => { throw new Error("should not compare inactive code"); };
  assert.equal(await f.host.distributedCodeVersionHold({}), undefined);
});
