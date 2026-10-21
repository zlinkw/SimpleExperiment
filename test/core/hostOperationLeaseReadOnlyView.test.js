const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os"), crypto = require("node:crypto");
require("../_helpers/registerTsRequire");
const core = require("../../src/core/HostOperationLease.legacy.ts");
const { HostOperationLeaseManager, HostOperationLeaseConflictError } = core;

/**
 * 并发 UI 阻断取证（用户 2026-10-21 11:30:59 / 11:31:05 / 11:31:12 本机面板，三次同类）：
 * <项目>/ui/action_errors.json 记录 command=configureCodeSyncIncludes，
 * message=「目标资源正在由另一个操作修改。持有插件：<本插件> 持有窗口：<窗口标签>:<PID>:<uuid>
 *   当前动作：publishGithub …」，
 * operationOutcome={"code":"RESOURCE_CONFLICT","category":"conflict","retryable":true,"certainty":"not_started"}。
 * 即“先点上传到 Git 并同步到 Worker，再点项目同步范围”被独占宿主租约弹回，
 * 而“项目同步范围”此时只是只读查看：读配置、开面板，不写任何目标。
 *
 * 根因不在租约管理器：生产用的 HostOperationLeaseManager（extension/legacy.ts:936，继承
 * ResourceOperationLeaseManager）早就支持声明式只读（ResourceOperationLease.ts:230）；
 * 缺的是调用方从来没把 readOnly 传下去。因此本文件卡的是“声明只读真的不占写槽、
 * 也不碰别人的记录”，而写入语义必须照旧互斥。
 * LegacyHostOperationLeaseManager 现在只服务升级门（UpdateGate），本切片刻意不去动它，
 * 免得给升级闸门开一个只读旁路。
 *
 * 同进程里两个 manager 实例模拟两个 VS Code 窗口：windowId 不取 `主机名:本机PID:` 前缀才会
 * 落到不同归属槽；processId 用真实 PID，另一窗口的锁才会被判定为“进程仍在”，
 * 冲突才是真冲突而不是过期回收。
 */

const PROJECT = "/srv/project-fixture";
const TRANSFER_WINDOW = "fixture-transfer:1:aaaaaaaa-0000";
const VIEWER_WINDOW = "fixture-viewer:1:bbbbbbbb-0000";
const THIRD_WINDOW = "fixture-third:1:cccccccc-0000";
const base = actionType => ({ pluginId: "simple-local.simple-experiment", workspaceUri: "file://" + PROJECT, hostProjectPath: PROJECT,
  actionType, actionLabel: actionType === "publishGithub" ? "上传到 Git 并同步代码到 Worker" : actionType });
const readOnlyView = actionType => ({ ...base(actionType), readOnly: true });

function manager(leasePath, windowId) {
  // heartbeatMs=0：不装心跳定时器（单文件 20 秒内必须自然退出）。
  return new HostOperationLeaseManager({ leasePath, windowId, processId: process.pid, heartbeatMs: 0, ttlMs: 60_000 });
}

async function context() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "host-lease-read-only-"));
  const leasePath = path.join(root, "host-operation-lease.json");
  const directory = leasePath + ".resources-v2";
  const transfer = manager(leasePath, TRANSFER_WINDOW);
  const viewer = manager(leasePath, VIEWER_WINDOW);
  /** 归属槽里的真实活动租约，不靠猜自定义文件名。 */
  const holders = async () => (await viewer.inspect()).records
    .map(row => ({ pluginId: row.pluginId, windowId: row.windowId, actionType: row.actionType, leaseId: row.leaseId }))
    .sort((a, b) => a.windowId.localeCompare(b.windowId));
  /** 只读入口必须一个字节都不动：按内容哈希比较整个归属目录。 */
  const fingerprint = async () => {
    let names;
    try { names = (await fs.readdir(directory)).sort(); } catch (error) { if (error.code === "ENOENT") return []; throw error; }
    return Promise.all(names.map(async name => name + ":" + crypto.createHash("sha256")
      .update(await fs.readFile(path.join(directory, name))).digest("hex")));
  };
  return { root, leasePath, directory, transfer, viewer, holders, fingerprint };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

/** Hold the exclusive transfer lease until the returned release() is called. */
function holdTransfer(managerInstance) {
  const gate = deferred();
  let acquired = false;
  const running = managerInstance.run(base("publishGithub"), async () => { acquired = true; await gate.promise; return "transfer-finished"; });
  return { running, release: gate.resolve, held: () => acquired };
}

async function waitUntil(predicate, limit = 200) {
  // 真实租约文件走 fs 线程池；setImmediate 快循会饥饿其完成回调，这里用短定时器让事件循环走到 poll 阶段。
  // 最多 200 * 5ms = 1 秒，结束后无遗留定时器，不会挂住单文件 20 秒限制。
  for (let used = 0; used < limit; used += 1) { if (await predicate()) return true; await new Promise(done => setTimeout(done, 5)); }
  return predicate();
}

test("长传输不再弹回只读的项目同步范围查看", async () => {
  const c = await context();
  const held = holdTransfer(c.transfer);
  assert.ok(await waitUntil(held.held), "另一窗口必须真的持有宿主写租约");
  const before = await c.holders();
  assert.deepEqual(before.map(row => row.actionType), ["publishGithub"]);

  // 用户可见现象修复：查看入口在持有者存在时仍能打开，而不是弹“窗口被占用”。
  const opened = await c.viewer.run(readOnlyView("configureCodeSyncIncludes"), async () => "scope-panel-opened");
  assert.equal(opened, "scope-panel-opened");
  assert.deepEqual(await c.holders(), before, "只读查看不得替换、续租或解除别人的租约");

  held.release();
  assert.equal(await held.running, "transfer-finished");
  const follower = manager(c.leasePath, THIRD_WINDOW);
  assert.equal(await follower.run(base("distributeCodeToWorkers"), async () => "next-transfer"), "next-transfer",
    "释放后另一个写者必须能正常拿锁");
});

test("同一入口按写入语义调用时仍然冲突，并说出真实持有者", async () => {
  const c = await context();
  const held = holdTransfer(c.transfer);
  assert.ok(await waitUntil(held.held));
  // 真正的写入语义（例如面板里发起批量同步/删除）仍必须与传输互斥。
  const error = await c.viewer.run(base("configureCodeSyncIncludes"), async () => "must-not-run").then(() => null, reason => reason);
  assert.ok(error instanceof HostOperationLeaseConflictError, "第二个写者必须仍然冲突");
  assert.equal(error.code, "RESOURCE_CONFLICT");
  assert.equal(error.current.actionType, "publishGithub", "拒绝必须说出真实持有动作");
  assert.equal(error.current.windowId, TRANSFER_WINDOW, "拒绝必须说出真实持有窗口");
  assert.match(error.message, /上传到 Git 并同步代码到 Worker/u, "弹窗必须显示真正占用的动作");
  assert.equal(error.sideEffectStarted, false, "拒绝发生在任何副作用之前");
  held.release();
  assert.equal(await held.running, "transfer-finished");
});

test("只读查看不登记任何租约记录，也不会拖延后面的写者", async () => {
  const c = await context();
  assert.deepEqual(await c.fingerprint(), [], "前提：归属目录尚未创建");
  const opened = await c.viewer.run(readOnlyView("configureCodeSyncIncludes"), async () => "scope-panel-opened");
  assert.equal(opened, "scope-panel-opened");
  assert.deepEqual(await c.fingerprint(), [], "只读入口不得创建任何归属槽或租约记录");
  assert.deepEqual(await c.holders(), []);
  const written = await c.transfer.run(base("publishGithub"), async () => "transfer-finished");
  assert.equal(written, "transfer-finished", "查看不得延后或拒绝后面的写者");
});

test("取消只读查看不会改动持有者记录，也不会解除它的写槽", async () => {
  const c = await context();
  const held = holdTransfer(c.transfer);
  assert.ok(await waitUntil(held.held));
  const beforeFingerprint = await c.fingerprint();
  const beforeHolders = await c.holders();
  const cancelled = await c.viewer.run(readOnlyView("configureCodeSyncIncludes"), async () => { throw new Error("用户关闭了同步范围窗口"); })
    .then(() => null, reason => reason);
  assert.equal(cancelled.message, "用户关闭了同步范围窗口", "取消查看只保留自己的结果，不碰共享状态");
  assert.deepEqual(await c.fingerprint(), beforeFingerprint, "取消查看后持有者的归属记录必须逐字节一致");
  assert.deepEqual(await c.holders(), beforeHolders);
  const third = manager(c.leasePath, THIRD_WINDOW);
  const refused = await third.run(base("distributeCodeToWorkers"), async () => "must-not-run").then(() => null, reason => reason);
  assert.equal(refused?.code, "RESOURCE_CONFLICT");
  assert.equal(refused?.current.actionType, "publishGithub");
  held.release();
  assert.equal(await held.running, "transfer-finished");
});

test("只读豁免只包含两个查看入口，同步范围写入口走统一个宿主写租约包装", async () => {
  const source = await fs.readFile(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
  const declared = /const READ_ONLY_HOST_LEASE_UI_COMMANDS = new Set\(\[([^\]]*)\]\)/.exec(source);
  assert.ok(declared, "只读豁免必须是一个显式字面量集合，不能是前缀或正则");
  const exempt = (declared[1].match(/"([^"]+)"/g) || []).map(row => row.replace(/"/g, ""));
  // configureServerSyncScope 本身零写：它只是 `await this.configureCodeSyncIncludes()`，
  // 面板内真正写回调已全部走写租约包装，所以两个查看入口都不应再挤占独占槽。
  assert.deepEqual(exempt, ["configureCodeSyncIncludes", "configureServerSyncScope"],
    "只允许两个同步范围查看入口被豁免，且必须逐个列出");
  for (const mutating of ["publishGithub", "syncGithub", "overwriteGithub", "uploadProjectToWorkers", "distributeCodeToWorkers", "deployLatestAgent",
    "configureDownloadScope", "runAllPlans", "stopAndClearPlan", "clearOperations", "cleanupPlan"])
    assert.ok(!exempt.includes(mutating), mutating + " 会写目标，必须继续持独占租约");
  assert.equal((source.match(/readOnly: readOnlyHostLeaseUiCommand\(command\)/g) || []).length, 2,
    "两个 webview 租约入口必须用同一套分类");
  assert.match(source, /readOnly: options\.readOnly === true,/, "provider 必须把只读意图传给真实租约管理器");

  // 行为回归在 test/features/syncScopeWriteLease.test.js；这里只卡住两个结构前提：
  // 1) 面板写回调必须走同一个包装，不能有人新增裸写入口；2) 包装的 actionType 不得命中
  //    withHostOperationLease 开头的传输类前缀免租名单，否则租约会被悄悄跳过。
  const panelBody = source.slice(source.indexOf("async configureCodeSyncIncludes() {"), source.indexOf("async configureServerSyncScope() {"));
  assert.equal((panelBody.match(/this\.withSyncScopeWriteLease\(/g) || []).length, 11,
    "两页的 save / remove / removeAllWorkers / retain / 批量同步 / 批量删除（含 mergeLatest）都必须取写租约");
  assert.match(panelBody, /async withSyncScopeWriteLease\(scopeIdentity, actionLabel, operation\) \{[\s\S]*this\.withHostOperationLease\("editSyncScope"/,
    "包装的 actionType 不得命中 withHostOperationLease 的传输类前缀免租名单");

  // 写回调闭包里的 root/config/targets 属于打开面板那一刻；包装必须复用既有 captureProjectContext/
  // projectContextIsCurrent 先核身份，并且是在取租约之前核，否则旧面板会用新项目的锁保护旧项目的写。
  assert.match(panelBody, /const scopeIdentity = \{ projectContext: this\.captureProjectContext\(\), client: scopeClient, root \};/,
    "打开面板时必须同时捕获项目上下文身份");
  const wrapper = panelBody.slice(panelBody.indexOf("async withSyncScopeWriteLease(scopeIdentity"));
  const guardAt = wrapper.indexOf("this.projectContextIsCurrent(scopeIdentity");
  const folderGuardAt = wrapper.indexOf("folders[0]?.uri?.fsPath !== scopeIdentity.root");
  const leaseAt = wrapper.indexOf("this.withHostOperationLease(\"editSyncScope\"");
  assert.ok(guardAt >= 0 && folderGuardAt >= 0 && leaseAt > guardAt && leaseAt > folderGuardAt,
    "身份核对必须发生在进入写租约之前，不一致时零副作用拒绝");

  // 保存范围会在本轮稍后阶段被重新读取，因此本窗口传输进行中必须拒绝，不能悄悄改变正在执行的文件集。
  const saveBlock = /save: \(paths, excluded = \[\]\) => this\.withSyncScopeWriteLease\([\s\S]{0,1600}?\n {12}\}\),/.exec(source);
  assert.ok(saveBlock, "本机范围保存必须在写租约包装内");
  assert.match(saveBlock[0], /this\.syncScopeMutationInFlight \|\| this\.planSyncInFlight \|\| this\.codeSyncInFlight/,
    "本窗口传输或文件树变更进行中必须拒绝保存");
  assert.ok(saveBlock[0].indexOf("syncScopeMutationInFlight") < saveBlock[0].indexOf("config.update(\"codeSync.scopePaths\""),
    "拒绝必须发生在任何配置写入之前");
  // Worker 页的保存过去连本窗忙态都没有，现在必须与本机页一致。
  const workersSave = /save: \(paths\) => this\.withSyncScopeWriteLease\(scopeIdentity, "保存 Worker 之间同步范围"[\s\S]{0,900}?\n {12}\}\),/.exec(source);
  assert.ok(workersSave, "Worker 之间的范围保存也必须落在写租约包装内");
  assert.match(workersSave[0], /this\.syncScopeMutationInFlight \|\| this\.planSyncInFlight \|\| this\.codeSyncInFlight/,
    "镜像范围保存也必须在本窗口传输进行中拒绝");
});
