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

// 0.5.416 配套（se-stage-block-visibility-release）：「释放旧文件占用」专用受控链。
// 从编译产物切出真实 releaseJobStageBlockSlotsFromUi 方法，在 vm 沙箱里由产品代码驱动全部分支；
// 只 mock 宿主表面（能力读取、cleanup RPC、确认框、重试入口），断言全部走真实方法逻辑。
const STAGE_ID = "a".repeat(64), STAGE_GEN = "c".repeat(64), STAGE_INCOMING = "b".repeat(64);
const STAGE_RELATIVE = ".staged-slots/" + STAGE_ID + "/slot-0";
const STAGE_ABSOLUTE = "/safe/project/" + STAGE_RELATIVE;
function releaseFixture(options = {}) {
  const { capabilityReady = true, warningChoice, liveCandidates, deleteState = "accepted", statusStates, releaseCandidate = true,
    ageMs = 172800000 } = options;
  const cleanupCalls = [], warnings = [], errorLog = [], syncRetries = [], patches = [];
  const queueJob = { index: 0, commandId: "command0", artifactStageBlock: { schemaVersion: 1, code: "TRANSFER_STAGE_PENDING",
    destination: { id: "b", profile: "work", host: "nwpu3.invalid" }, scope: "job-artifacts-scope", lane: 0, identity: STAGE_ID,
    incomingGeneration: STAGE_INCOMING,
    slots: [{ slot: "slot-0", path: STAGE_RELATIVE, generation: STAGE_GEN, status: "committed", createdAt: 1, terminalAt: 2, updatedAt: 3,
      timeSource: "journal-terminalAt", ageMs, locked: false, protectedReason: null },
      { slot: "slot-1", path: ".staged-slots/" + STAGE_ID + "/slot-1", generation: "d".repeat(64), status: "running", createdAt: 4,
        terminalAt: 0, updatedAt: 5, timeSource: null, ageMs: null, locked: true, protectedReason: "lock-held" }],
    releaseCandidate } };
  const capabilities = { methods: ["files.cleanup.stagedSlots", "files.cleanup.preview", "files.cleanup.execute"],
    methodOptions: { "files.cleanup.stagedSlots": { expiredCommittedReclaim: 1, structuredBlockEvidence: 1, releaseConfirmationCount: 1 },
      "sync.serverToServerFpsync": { claimScopedExpiredReclaim: 1, stageBlockEvidence: 1 },
      "files.cleanup.preview": { backgroundIsolatedDelete: 1 }, "files.cleanup.execute": { isolationCompletionReceipt: 1 } } };
  const sandbox = { workspaceRoot: () => "C:/project", crypto: require("node:crypto"),
    JobArtifactSyncIdentity_1: require("../../dist/features/JobArtifactSyncIdentity.js"),
    vscode: { window: { showWarningMessage: async (...args) => { warnings.push(args); return warningChoice; } } } };
  vm.createContext(sandbox);
  const start = source.indexOf("async releaseJobStageBlockSlotsFromUi(");
  // 终点落在下一成员声明之前的真实边界（release 方法闭合大括号处截断）：
  // 直接用声明名做终点会把 "private async " 残段留在对象字面量尾部，切片自身即非法语法。
  const nextMember = source.indexOf("async syncCompletedPlanArtifacts(context)", start);
  const end = nextMember > start ? source.lastIndexOf("}", nextMember) + 1 : nextMember;
  assert.ok(start >= 0 && end > start, "compiled release method slice");
  vm.runInContext(`this.methods = { ${source.slice(start, end).replace(/}\r?\n {4}(?=(?:async )?[a-zA-Z_$][\w$]*\()/g, "},\n    ")} };`, sandbox);
  let stagedSlotsReads = 0;
  const host = { ...sandbox.methods, client: {}, projectContextGeneration: 1,
    readSimpleSftpCapabilities: async () => { if (!capabilityReady) throw new Error("SimpleSFTP 不支持 files.cleanup.stagedSlots。"); return capabilities; },
    recordActionError: row => errorLog.push(row),
    loadDistributedQueue: async () => ({ plans: [{ id: "plan", jobs: [queueJob] }] }),
    patchDistributedJob: async (...args) => patches.push(args),
    workerCodeSyncTargets: () => [{ id: "b", host: "nwpu3.invalid", port: 22, user: "u", remotePath: "/safe/project" }],
    sftpServerOptions: row => ({ id: row.id, host: row.host, user: row.user, port: row.port, remotePath: row.remotePath }),
    artifactSyncFromUi: async message => { syncRetries.push(message); return { status: "completed", message: "产物增量同步：1 个 job 已一致" }; },
    postState() {},
    simpleSftpApiCall: async (method, params) => {
      cleanupCalls.push({ method, params });
      if (method === "files.cleanup.stagedSlots") {
        stagedSlotsReads += 1;
        if (stagedSlotsReads === 1) return { candidates: liveCandidates === undefined
          ? [{ relativePath: STAGE_RELATIVE, type: "directory", status: "committed", generation: STAGE_GEN, locked: false, releaseCandidate: true, ageMs, protectedReason: null }]
          : liveCandidates };
        return { candidates: [] }; // 删除后的最终只读复核：原槽已退出盘点。
      }
      if (method === "files.cleanup.preview") return { token: "tok-1", digest: "dig-1",
        targets: [{ relativePath: params.targets[0].relativePath, destination: params.targets[0].destination, absolutePath: STAGE_ABSOLUTE, missing: false }] };
      if (method === "files.cleanup.status") return { states: statusStates || { 0: "completed" } };
      if (method === "files.cleanup.isolatedMaintenanceDelete") return { state: deleteState };
      return {};
    } };
  return { host, cleanupCalls, warnings, errorLog, syncRetries, patches,
    run: () => host.releaseJobStageBlockSlotsFromUi({ planId: "plan", jobIndex: 0, commandId: "command0" }) };
}

test("release chain freezes the live candidate, shows one exact confirmation and only then isolates, proves receipts, deletes registered and retries just the original sync", async () => {
  const f = releaseFixture({ warningChoice: "确认释放此暂存槽" });
  const result = await f.run();
  assert.equal(result.status, "completed", result.message);
  assert.match(result.message, /已释放 nwpu3\.invalid 的旧暂存槽/);
  assert.deepEqual(f.cleanupCalls.map(row => row.method), ["files.cleanup.stagedSlots", "files.cleanup.preview", "files.cleanup.confirm",
    "files.cleanup.execute", "files.cleanup.status", "files.cleanup.isolatedMaintenanceDelete", "files.cleanup.stagedSlots"]);
  const preview = f.cleanupCalls[1].params;
  assert.equal(preview.action, "isolate");
  assert.equal(preview.authorizationSource, "single_confirmation_release", "授权来源=一次确认释放，绝不冒充自动过期策略或通用清理");
  assert.equal(preview.consumerRoot, "C:/project", "consumerRoot=本地消费项目，不是远端根");
  assert.equal(preview.targets.length, 1);
  assert.equal(preview.targets[0].relativePath, STAGE_RELATIVE);
  assert.match(preview.targets[0].archiveBatch, /^job-[a-f0-9]{48}$/);
  assert.equal(preview.targets[0].destination, "clean_dir/" + preview.targets[0].archiveBatch + "/" + STAGE_RELATIVE);
  // 一次确认：恰一个模态，展示的绝对/相对路径与 confirm exactTargets、执行绑定逐字一致；完整代随确认呈现。
  assert.equal(f.warnings.length, 1);
  const shown = String(f.warnings[0][0]);
  assert.match(shown, new RegExp("绝对路径：" + STAGE_ABSOLUTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(shown.includes(STAGE_RELATIVE) && shown.includes(STAGE_GEN), "UI 与后台使用同一完整路径/完整代");
  assert.match(shown, /主机 nwpu3\.invalid（profile work） · 范围 job-artifacts-scope · 通道 0/);
  assert.equal(f.warnings[0][1].modal, true);
  const confirm = f.cleanupCalls[2].params;
  // 夹具内产品在 vm 上下文执行，其容器对象原型属另一 realm；本套件用 assert/strict
  // （deepEqual 即 deepStrictEqual），跨 realm 同结构值判不等。真实扩展单 realm 运行，
  // 产品形态本身正确——在测试侧对同一字段集合做宿主 realm 归一化后仍逐字段严格比对，
  // 不放宽语义、不减字段（JSON 往返对全字段纯数据等价）。
  const normalize = value => JSON.parse(JSON.stringify(value));
  assert.deepEqual([confirm.token, confirm.digest, confirm.phase, confirm.confirm], ["tok-1", "dig-1", 1, true]);
  assert.deepEqual(normalize(confirm.exactTargets), [STAGE_ABSOLUTE], "确认绑定精确 token/digest/绝对路径");
  const execute = f.cleanupCalls[3].params;
  assert.equal(execute.token, "tok-1"); assert.equal(execute.index, 0);
  const deletion = f.cleanupCalls[5].params;
  assert.equal(deletion.token, "tok-1"); assert.equal(deletion.digest, "dig-1", "删除集合只从冻结 token/digest 派生");
  const deletionTargets = normalize(deletion.targets);
  assert.equal(deletionTargets.length, 1, "删除集合恰一个冻结目标");
  assert.equal(deletionTargets[0].index, 0);
  assert.equal(deletionTargets[0].relativePath, STAGE_RELATIVE);
  assert.equal(deletionTargets[0].destination, preview.targets[0].destination);
  assert.deepEqual(deletionTargets, [{ index: 0, relativePath: STAGE_RELATIVE, destination: preview.targets[0].destination }]);
  assert.deepEqual(normalize(f.syncRetries), [{ planId: "plan", jobIndex: 0, commandId: "command0" }], "成功后只重试这一条原同步");
  assert.deepEqual(f.patches, [], "释放链自身不改 Job/产物字段；完成状态由既有同步链管理");
});

test("a dismissed confirmation mutates nothing after the read-only preview and keeps partial plus the original error", async () => {
  const f = releaseFixture({ warningChoice: undefined });
  const result = await f.run();
  assert.equal(result.status, "cancelled");
  assert.match(result.message, /未执行任何修改/);
  assert.deepEqual(f.cleanupCalls.map(row => row.method), ["files.cleanup.stagedSlots", "files.cleanup.preview"], "取消后 confirm/execute/delete 零调用");
  assert.deepEqual(f.syncRetries, [], "取消释放不触发同步重试");
});

test("new SE plus old SFTP (live capabilities missing): release refuses before any cleanup call and never guesses a path", async () => {
  const f = releaseFixture({ capabilityReady: false });
  const result = await f.run();
  assert.equal(result.status, "failed");
  assert.match(result.message, /实时 capabilities|未声明完整的受控暂存槽释放能力/);
  assert.deepEqual(f.cleanupCalls, [], "旧 SFTP 下整个受控清理协议一次都不调用，更不会猜路径");
  assert.equal(f.errorLog.length, 1, "真实原因进既有操作日志/通知反馈");
});

test("a locked, mismatched or non-candidate live slot is protected: no preview freeze and no release entry", async () => {
  const locked = releaseFixture({ liveCandidates: [{ relativePath: STAGE_RELATIVE, status: "committed", generation: STAGE_GEN, locked: true, releaseCandidate: false, protectedReason: "lock-held" }] });
  assert.equal((await locked.run()).status, "failed");
  assert.deepEqual(locked.cleanupCalls.map(row => row.method), ["files.cleanup.stagedSlots"], "被占用=protected，不提供强制释放");
  const moved = releaseFixture({ liveCandidates: [{ relativePath: ".staged-slots/" + STAGE_ID + "/slot-9", status: "committed", generation: "e".repeat(64), locked: false, releaseCandidate: true }] });
  assert.equal((await moved.run()).status, "failed", "实时候选与冻结卡点路径/完整代不一致必须停");
  assert.equal(moved.cleanupCalls.length, 1);
  const notReleasable = releaseFixture({ releaseCandidate: false });
  assert.equal((await notReleasable.run()).status, "failed");
  assert.match((await notReleasable.run()).message, /当前卡点没有可释放候选（槽被占用、非终态或时间不明），未执行任何修改。/,
    "文案契约：产品原句逐字匹配，不缩短面向用户的提示");
  assert.deepEqual(notReleasable.cleanupCalls, [], "卡点无候选时连盘点都不发起");
});

test("unknown isolation receipt or refused registered delete stops without replay and keeps the real failure", async () => {
  const unknown = releaseFixture({ warningChoice: "确认释放此暂存槽", statusStates: { 0: "unknown" } });
  const unknownResult = await unknown.run();
  assert.equal(unknownResult.status, "failed");
  assert.match(unknownResult.message, /unknown/);
  assert.equal(unknown.cleanupCalls.filter(row => row.method === "files.cleanup.execute").length, 1, "隔离结果 unknown 后不得再次发送修改");
  assert.deepEqual(unknown.cleanupCalls.filter(row => row.method === "files.cleanup.isolatedMaintenanceDelete"), []);
  assert.deepEqual(unknown.syncRetries, []);
  assert.equal(unknown.errorLog.length, 1, "unknown 停止如实进入操作日志");
  const rejected = releaseFixture({ warningChoice: "确认释放此暂存槽", deleteState: "rejected" });
  assert.equal((await rejected.run()).status, "failed", "删除登记未接受=失败，不冒充成功");
  assert.deepEqual(rejected.syncRetries, [], "删除未成功不宣称释放完成，也不触发重试粉饰");
});

test("an under-one-day leaving candidate is released only through this one explicit confirmation", async () => {
  const f = releaseFixture({ warningChoice: "确认释放此暂存槽", ageMs: 3600000 });
  assert.equal((await f.run()).status, "completed", "未满 1 天的退出候选允许经用户一次确认提前释放（自动链仍不得动它）");
  assert.equal(f.warnings.length, 1, "提前释放同样只有一次确认");
  assert.match(String(f.warnings[0][0]), /已存在 1 小时/);
});
