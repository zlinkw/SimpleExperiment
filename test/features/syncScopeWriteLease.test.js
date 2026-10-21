"use strict";
/**
 * 真实「项目同步范围与状态」面板写回调租约回归。
 *
 * 取证根因：configureCodeSyncIncludes 是查看入口（读配置 + 开面板），但它交给文件树的每个真正写回调
 * （本机/Worker 两页的保存、移除、从全部 Worker 移除、保留版本、批量同步、批量删除、合并最新版）
 * 过去完全不持宿主写租约：窗口内 syncScopeMutationInFlight/planSyncInFlight/codeSyncInFlight 看不到
 * 别的窗口，本机保存还在「磁盘展开 → config.update」这段异步区间之前才检查忙态，检查会过期。
 * 结果是别的窗口正在 publishGithub 时，本窗口仍能把配置/磁盘/远端写进去。
 *
 * 本文件不用正则冒充行为：从 dist 取真实 configureCodeSyncIncludes + withSyncScopeWriteLease +
 * withHostOperationLease 方法体，用 mock openSyncScopeTree 捕获真实回调，并把 provider 的
 * hostOperationLease 换成**生产同款** HostOperationLeaseManager（extension/legacy.ts:936 用的就是它，
 * 继承 ResourceOperationLeaseManager，真写租约记录、真资源冲突、真冲突错误）。另一窗口用第二个
 * manager 持 publishGithub 模拟。Worker 传输、索引读取、目录展开都是计数替身，
 * 因此「被拒的写没有副作用」是可证明的，而不是靠断言消息文本。零网络、零真实服务器。
 *
 * 另一条同等重要的边界：写回调闭包里的 root/config/targets 是打开面板那一刻捕获的，而租约上下文来自
 * 「当前」工作区。若期间切换工作区、重载项目上下文或换了连接，继续写入就等于用新项目的写锁去保护旧项目
 * 的配置/磁盘/远端副作用。包装因此复用既有 captureProjectContext/projectContextIsCurrent 先核身份，
 * 不一致时在取租约之前抛出，测试断言此时连磁盘展开都没进入、且一条租约都不登记。
 *
 * 样本目录（os.tmpdir()/sync-scope-write-lease-*）刻意保留、不做物理删除：项目删除约束要求先核验安全根
 * 与直接父目录，测试无权自行清掉可复核证据。
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const dist = fs.readFileSync(path.join(__dirname, "../../dist/extension/legacy.js"), "utf8");
const { HostOperationLeaseManager } = require("../../dist/core/HostOperationLease.legacy.js");

const ROOT = "C:/fixture/simple-cluster";
const LEASE_CONTEXT = { workspaceUri: "file:///" + ROOT, hostProjectPath: ROOT };
// 两个 manager 必须落在不同的归属槽：windowId 不取 `主机名:本机PID:` 前缀，归属哈希才会按整个 windowId 区分；
// processId 用本进程真实 PID，另一窗口的锁才会被判定为“进程仍在”，冲突才是真冲突而不是过期回收。
const VIEWER_WINDOW = "fixture-viewer:1:11111111-0000";
const UPLOAD_WINDOW = "fixture-upload:1:22222222-0000";
const TRANSFER_INPUT = { pluginId: "simple-local.simple-sftp", workspaceUri: LEASE_CONTEXT.workspaceUri,
    hostProjectPath: LEASE_CONTEXT.hostProjectPath, actionType: "publishGithub", actionLabel: "上传到 Git 并同步代码到 Worker" };

function sliceMethod(startNeedle, endNeedle) {
    const start = dist.indexOf(startNeedle);
    const end = dist.indexOf(endNeedle, start + startNeedle.length);
    assert.ok(start >= 0 && end > start, "compiled method not found: " + startNeedle);
    return dist.slice(start, end);
}

// configureCodeSyncIncludes 与 withSyncScopeWriteLease 相邻，一起取出，保证测的是真实包装。
const panelMethods = sliceMethod("async configureCodeSyncIncludes() {", "async configureServerSyncScope() {");
const leaseMethods = sliceMethod("async withHostOperationLease(actionType, actionLabel, operation, options = {}) {",
    "async ensureRealtimeConnected(");
// 身份门控复用既有 captureProjectContext/projectContextIsCurrent，所以这两个方法也取真实实现，不用替身。
const contextMethods = sliceMethod("captureProjectContext() {", "async openWorkspaceFileForProjectContext(");
assert.ok(panelMethods.includes("async withSyncScopeWriteLease(scopeIdentity, actionLabel, operation) {"),
    "the panel and its shared write-lease wrapper must be extracted together");
assert.ok(contextMethods.includes("projectContextIsCurrent(context) {"),
    "the real project-context identity helpers must be part of the tested slice");

const OTHER_ROOT = "C:/fixture/other-project";

function makeHarness(options = {}) {
    // 样本目录保留不清理：项目删除约束要求先核验安全根与直接父目录，测试不得自行物理删除证据目录。
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sync-scope-write-lease-"));
    const state = { root: ROOT };
    const leasePath = path.join(scratch, "host-operation-lease.json");
    const savedScope = options.savedScope === undefined ? ["src/**", "configs/app.yaml"] : options.savedScope;
    const configUpdates = [];
    const effects = { write: [], information: [], conflicts: [] };
    const gate = { block: Promise.resolve(), release: () => undefined, entered: settled() };
    const captured = { roots: [], panels: 0 };
    const counts = { expand: 0, collect: 0, walk: 0 };

    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        JSON, Math, Set, Map, WeakMap, Array, Object, String, Number, Promise, Error, Boolean, Date, RegExp, Symbol, Buffer,
        path, crypto: require("node:crypto"),
        require: (name) => name === "../updates/Bootstrap"
            ? { assertBusinessAllowed() {}, getUpdater: () => undefined }
            : require(name),
        HostOperationLease_1: require("../../dist/core/HostOperationLease.legacy.js"),
        currentHostOperationLeaseContext: () => ({ workspaceUri: "file:///" + state.root, hostProjectPath: state.root }),
        errorMessage: (error) => String(error && error.message ? error.message : error),
        workspaceRoot: () => state.root,
        ProjectMirror_1: { normalizeMirrorScopePaths: (values) => [...new Set((Array.isArray(values) ? values : [])
            .map(value => String(value).replace(/\\/g, "/")).filter(Boolean))].sort() },
        AutomaticScopeContent_1: { AutomaticScopeContent: class { } },
        SyncScopeLocalIndex_1: { SyncScopeLocalIndexReader: class { list() { return { entries: [] }; } read() { } dispose() { } } },
        SyncScopeAgentIndex_1: { SyncScopeAgentIndexReader: class { list() { return { entries: [] }; } inventory() { return { files: [] }; } dispose() { } } },
        SyncScopeTree_1: {
            openSyncScopeTree: (_title, roots) => {
                captured.roots = roots;
                captured.panels += 1;
                return { webview: { postMessage: () => true }, onDidDispose: () => undefined, dispose: () => undefined };
            },
        },
        walkCodeFiles: async () => { counts.walk += 1; return ["README.md", "src/main.py"]; },
        expandSelectedLocalScope: async (_root, paths) => {
            counts.expand += 1;
            gate.entered.resolve();
            await gate.block;
            return [...paths].sort();
        },
        collectExplicitCodeFiles: async () => { counts.collect += 1; return undefined; },
        vscode: {
            workspace: {
                get workspaceFolders() { return [{ uri: { fsPath: state.root, toString: () => "file:///" + state.root } }]; },
                getConfiguration: (_section, scope) => ({
                    get(key, fallback) {
                        if (key === "codeSync.scopePaths") return Array.isArray(savedScope) ? [...savedScope] : savedScope;
                        if (key === "serverSync.paths") return ["."];
                        return fallback === undefined ? [] : fallback;
                    },
                    update(key, value, target) { configUpdates.push({ root: scope?.fsPath || state.root, key, value, target }); return Promise.resolve(); },
                }),
            },
            window: {
                showInformationMessage: (message) => { effects.information.push(String(message)); return Promise.resolve(undefined); },
                showWarningMessage: () => Promise.resolve(undefined),
                showErrorMessage: (message) => { effects.conflicts.push(String(message)); return Promise.resolve(undefined); },
            },
            ConfigurationTarget: { WorkspaceFolder: 3 },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(`class Provider {\n${panelMethods}\n${contextMethods}\n${leaseMethods}\n}\nthis.Provider = Provider;`, sandbox);

    // heartbeatMs=0：不装心跳定时器，单文件必须在 20 秒内自然退出。
    const viewer = new HostOperationLeaseManager({ leasePath, windowId: VIEWER_WINDOW, processId: process.pid, heartbeatMs: 0, ttlMs: 60_000 });
    const otherWindow = new HostOperationLeaseManager({ leasePath, windowId: UPLOAD_WINDOW, processId: process.pid, heartbeatMs: 0, ttlMs: 60_000 });

    const provider = new sandbox.Provider();
    Object.assign(provider, {
        hostOperationLease: viewer,
        syncScopeMutationInFlight: false, planSyncInFlight: false, codeSyncInFlight: false,
        client: {},
        projectContextGeneration: 0,
        projectContextAbortController: new AbortController(),
        workerCodeSyncTargets: () => [{ id: "worker-a" }],
        enabledWorkerConfigs: () => [{ id: "worker-a" }],
        sftpServerOptions: () => ({ remotePath: "/srv/fixture" }),
        projectFileObservationIndex: () => ({ subscribe: () => () => undefined }),
        listSyncScopeUnion: async () => ({ entries: [] }),
        refreshSyncScopeStatus: async () => ({ entries: [] }),
        refreshSyncScopeMetadata: async () => ({ entries: [] }),
        removeSyncScopePath: async (_root, _targets, relative) => effects.write.push(["removeSyncScopePath", relative]),
        removeSyncScopePathFromAllWorkers: async (_root, _targets, relative) => effects.write.push(["removeSyncScopePathFromAllWorkers", relative]),
        retainSyncScopeVersion: async (_root, _targets, relative) => effects.write.push(["retainSyncScopeVersion", relative]),
        runSyncScopeTreeBatch: async (_root, _targets, _localOnly, action) => effects.write.push(["runSyncScopeTreeBatch", action]),
        mergeLatestWorkerVersions: async (_root, _targets, _selected, relative) => effects.write.push(["mergeLatestWorkerVersions", relative]),
    });

    const counters = () => ({
        writes: effects.write.length, configUpdates: configUpdates.length, information: effects.information.length,
        // “零副作用”必须连只读的展开/收集也算进去：被拒的写根本不该进入展开阶段。
        expand: counts.expand, collect: counts.collect, walk: counts.walk,
    });
    return {
        provider, viewer, otherWindow, captured, configUpdates, effects, counters,
        holdExpansion() { let release; gate.block = new Promise(resolve => { release = resolve; }); gate.release = release; gate.entered = deferred(); },
        expansionEntered: () => gate.entered.promise,
        releaseExpansion() { gate.release(); },
        async open() {
            await provider.configureCodeSyncIncludes();
            assert.equal(captured.roots.length, 2, "the panel must hand the tree both tabs");
            return Object.fromEntries(captured.roots.map(row => [row.id, row]));
        },
        /** 真实租约记录（跨窗口可见的活动锁），不是自造状态。 */
        async holders() { return (await viewer.inspect()).records.map(row => ({ pluginId: row.pluginId, windowId: row.windowId, actionType: row.actionType, hostProjectPath: row.hostProjectPath })); },
        /** 只释放内存态；scratch 目录与其中的租约样本按取证约束保留，不做物理删除。 */
        dispose() { provider.syncScopeMutationInFlight = false; },
        scratch,
        switchWorkspace(nextRoot) { state.root = nextRoot; },
        /** 生产里切工作区/重载项目走 resetProjectContextInMemory：递增代次并换掉 AbortController。 */
        resetProjectContext() { provider.projectContextGeneration += 1; provider.projectContextAbortController = new AbortController(); },
        setClient(client) { provider.client = client; },
    };
}

function deferred() {
    const box = {};
    box.promise = new Promise((resolve) => { box.resolve = resolve; });
    return box;
}
function settled() { const box = deferred(); box.resolve(); return box; }

/** 面板交给文件树的全部真正写回调（含两个页签），参数按 UI 真实调用形态。 */
function writeCallbacks(tabs) {
    return [
        ["local.save", () => tabs.local.save(["src/main.py"], [])],
        ["local.remove", () => tabs.local.remove("src/main.py", "worker-a", false, () => undefined)],
        ["local.removeAllWorkers", () => tabs.local.removeAllWorkers("src/main.py", false, () => undefined)],
        ["local.retain", () => tabs.local.retain("src/main.py", "worker-a", false, () => undefined)],
        ["local.batch sync", () => tabs.local.batch("sync", ["src"], [], () => undefined, [])],
        ["local.batch delete", () => tabs.local.batch("delete", ["src"], [], () => undefined, [])],
        ["workers.save", () => tabs.workers.save(["project/src"])],
        ["workers.remove", () => tabs.workers.remove("src/main.py", "worker-a", false, () => undefined)],
        ["workers.removeAllWorkers", () => tabs.workers.removeAllWorkers("src/main.py", false, () => undefined)],
        ["workers.retain", () => tabs.workers.retain("src/main.py", "worker-a", false, () => undefined)],
        ["workers.mergeLatest", () => tabs.workers.mergeLatest("src", () => undefined)],
        ["workers.batch sync", () => tabs.workers.batch("sync", ["src"], [], () => undefined, [])],
        ["workers.batch delete", () => tabs.workers.batch("delete", ["src"], [], () => undefined, [])],
    ];
}

async function assertRefusedWithZeroSideEffects(harness, run, label) {
    const before = harness.counters();
    const error = await run().then(() => null, reason => reason);
    assert.ok(error, `${label} must be refused while another window writes`);
    assert.equal(error.code, "RESOURCE_CONFLICT", `${label} must be refused by the real host lease`);
    assert.equal(error.current?.pluginId, "simple-local.simple-sftp", `${label} refusal must name the holding plugin`);
    assert.equal(error.current?.actionType, "publishGithub", `${label} refusal must name the holding action`);
    assert.equal(error.current?.windowId, UPLOAD_WINDOW, `${label} refusal must name the holding window`);
    assert.deepEqual(harness.counters(), before, `${label} must not touch configuration, local disk or Workers when refused`);
}

test("另一窗口发布期间仍可打开并浏览同步范围，持有者记录不被查看动作改动", async () => {
    const harness = makeHarness();
    const releaseGate = deferred();
    let held = false;
    const transfer = harness.otherWindow.run(TRANSFER_INPUT, async () => { held = true; await releaseGate.promise; return "transfer-finished"; });
    try {
        const acquired = await waitFor(() => held);
        assert.ok(acquired, "另一窗口必须真的持有宿主写租约");
        assert.equal(harness.provider.syncScopeMutationInFlight, false, "查看窗口自身三个忙态都是 false");
        assert.equal(harness.provider.planSyncInFlight, false);
        assert.equal(harness.provider.codeSyncInFlight, false);
        const tabs = await harness.open();
        assert.deepEqual(await tabs.local.list("src", new AbortController().signal), { entries: [] });
        assert.deepEqual(await tabs.workers.list("src", new AbortController().signal), { entries: [] });
        assert.equal(harness.counters().configUpdates, 0, "浏览不得写工作区配置");
        assert.deepEqual(await harness.holders(), [{ pluginId: "simple-local.simple-sftp", windowId: UPLOAD_WINDOW, actionType: "publishGithub", hostProjectPath: ROOT }],
            "只读查看不得新增、续租或解除任何租约记录");
        assert.equal(harness.effects.conflicts.length, 0, "只读查看不得再弹资源占用");
    }
    finally { releaseGate.resolve(); await transfer; harness.dispose(); }
});

test("发布持有租约时，同步范围每一个真正写回调都按真实持有者拒绝且零副作用", async () => {
    const harness = makeHarness();
    const releaseGate = deferred();
    let held = false;
    const transfer = harness.otherWindow.run(TRANSFER_INPUT, async () => { held = true; await releaseGate.promise; return "transfer-finished"; });
    try {
        assert.ok(await waitFor(() => held), "另一窗口必须真的持有宿主写租约");
        const tabs = await harness.open();
        for (const [label, run] of writeCallbacks(tabs))
            await assertRefusedWithZeroSideEffects(harness, run, label);
        assert.deepEqual(await harness.holders(), [{ pluginId: "simple-local.simple-sftp", windowId: UPLOAD_WINDOW, actionType: "publishGithub", hostProjectPath: ROOT }],
            "被拒的写不得改写或解除别人的租约记录");
        assert.match(harness.effects.conflicts.join("\n"), /simple-sftp/, "拒绝必须把真实持有者告诉用户");
        assert.deepEqual(harness.effects.write, [], "远端/本地写替身一次都没被调用");
    }
    finally { releaseGate.resolve(); await transfer; harness.dispose(); }
});

test("本机保存从磁盘展开之前就占住写槽，直到配置写入完成才交还", async () => {
    const harness = makeHarness();
    try {
        const tabs = await harness.open();
        harness.holdExpansion();
        const saving = tabs.local.save(["src/main.py"], []);
        await harness.expansionEntered();
        assert.equal(harness.configUpdates.length, 0, "仍卡在配置写入之前的磁盘展开阶段");
        assert.ok(await waitFor(async () => (await harness.holders()).some(row => row.actionType === "editSyncScope")),
            "保存必须在展开期间就已经持有宿主写租约");
        const blocked = await harness.otherWindow.run(TRANSFER_INPUT, async () => "started").then(() => null, reason => reason);
        assert.equal(blocked?.code, "RESOURCE_CONFLICT", "展开与配置写入之间这段异步区间不允许别的窗口进入同一项目");
        assert.equal(blocked?.current?.actionType, "editSyncScope", "冲突必须说出真实持有动作");
        harness.releaseExpansion();
        await saving;
        assert.equal(harness.configUpdates.length, 1, "展开完成后必须真正写入配置");
        // root 字段是替身特意记录的写入作用域：证明配置确实落在面板打开时绑定的那个工作区文件夹上。
        assert.deepEqual(harness.configUpdates[0], { root: ROOT, key: "codeSync.scopePaths", value: ["src/main.py"], target: 3 });
        assert.deepEqual(await harness.holders(), [], "保存结束后租约记录必须清空");
        assert.equal(await harness.otherWindow.run(TRANSFER_INPUT, async () => "started"), "started",
            "保存结束后别的窗口应立刻能继续");
    }
    finally { harness.dispose(); }
});

test("空闲窗口能保存两个范围，取消或失败的写会立即交还写槽", async () => {
    const harness = makeHarness();
    try {
        const tabs = await harness.open();
        await tabs.local.save(["src/main.py", "configs/app.yaml"], []);
        assert.deepEqual(harness.configUpdates.map(row => [row.key, row.value]),
            [["codeSync.scopePaths", ["configs/app.yaml", "src/main.py"]]]);
        await tabs.workers.save(["project/src", "project/src"]);
        assert.deepEqual(harness.configUpdates.map(row => row.key), ["codeSync.scopePaths", "serverSync.paths"]);
        assert.deepEqual(harness.configUpdates[1].value, ["project/src"]);
        assert.equal(harness.effects.information.length, 2, "两次成功保存都要给用户回执");
        assert.deepEqual(await harness.holders(), [], "两次成功保存都必须释放自己的租约");

        const failingWrites = [
            ["removeSyncScopePath", () => tabs.local.remove("src", "worker-a", false, () => undefined)],
            ["runSyncScopeTreeBatch", () => tabs.local.batch("delete", ["src"], [], () => undefined, [])],
        ];
        for (const [method, run] of failingWrites) {
            harness.provider[method] = async () => { throw new Error("第二次确认已取消"); };
            await assert.rejects(run(), /第二次确认已取消/, `${method} 自身的失败（含删除二次确认取消）必须原样上抛`);
            assert.equal(await harness.otherWindow.run(TRANSFER_INPUT, async () => "started"), "started",
                `${method} 失败或取消后必须释放写槽`);
        }
        assert.equal(harness.configUpdates.length, 2, "失败的写不得额外写配置");
        // 删除二次确认与远端安全守卫仍在内层方法里：包装只加租约，不改变传给它的 action 与参数。
        harness.provider.runSyncScopeTreeBatch = async (_root, _targets, localOnly, action) => { harness.effects.write.push(["runSyncScopeTreeBatch", action, localOnly]); };
        await tabs.local.batch("delete", ["src"], [], () => undefined, []);
        assert.deepEqual(harness.effects.write.at(-1), ["runSyncScopeTreeBatch", "delete", true],
            "批量删除必须仍以 delete + 本机页参数进入原有守卫流程");
    }
    finally { harness.dispose(); }
});

test("同窗口忙态守卫仍然拒绝保存，且不再宣称它看不见的其他窗口", async () => {
    const harness = makeHarness();
    try {
        const tabs = await harness.open();
        harness.provider.planSyncInFlight = true;
        for (const save of [() => tabs.local.save(["src"], []), () => tabs.workers.save(["src"])]) {
            const error = await save().then(() => null, reason => reason);
            assert.ok(error, "本窗口传输进行中必须拒绝保存");
            assert.match(error.message, /本窗口/, "忙态守卫只能声明本窗口能证明的事实");
            assert.doesNotMatch(error.message, /其他窗口/, "守卫不得宣称它看不见的其他窗口");
        }
        assert.equal(harness.configUpdates.length, 0, "拒绝必须发生在任何配置写入之前");
        assert.deepEqual(harness.effects.write, []);
        assert.deepEqual(await harness.holders(), [], "忙态拒绝也必须释放本轮写槽");
    }
    finally { harness.dispose(); }
});

test("只读打开、展开、刷新、校验与取消都不会登记任何宿主写租约", async () => {
    const harness = makeHarness({ savedScope: undefined });
    try {
        const tabs = await harness.open();
        await tabs.local.list("", new AbortController().signal);
        await tabs.local.refresh(".", new AbortController().signal, () => undefined);
        await tabs.workers.summary("src", new AbortController().signal, () => undefined, () => undefined);
        for (const root of harness.captured.roots) root.watch?.(() => undefined)?.();
        tabs.local.dispose();
        assert.deepEqual(await harness.holders(), [], "打开、列目录、刷新、校验与取消都不得登记宿主写租约");
        assert.equal(harness.configUpdates.length, 0);
        assert.equal(harness.effects.write.length, 0);
    }
    finally { harness.dispose(); }
});

async function waitFor(predicate, limit = 200) {
    // 真实租约走 fs 线程池；setImmediate 快循会饥饿其完成回调，这里用短定时器让事件循环走到 poll 阶段。
    // 上限 200 * 5ms = 1 秒，结束后无遗留定时器，不会顶到单文件 20 秒上限。
    for (let used = 0; used < limit; used += 1) { if (await predicate()) return true; await new Promise(done => setTimeout(done, 5)); }
    return predicate();
}

test("切换工作区、重载项目上下文或换连接后，旧面板每个写回调零副作用拒绝且不登记任何租约", async () => {
    const scenarios = [
        ["工作区换成别的项目", (harness) => harness.switchWorkspace(OTHER_ROOT)],
        ["同一目录但项目上下文已重载", (harness) => harness.resetProjectContext()],
        ["连接对象已更换", (harness) => harness.setClient({ id: "fixture-connection-b" })],
    ];
    for (const [name, change] of scenarios) {
        const harness = makeHarness();
        const tabs = await harness.open();
        change(harness);
        for (const [label, run] of writeCallbacks(tabs)) {
            const before = harness.counters();
            let failure;
            try {
                await run();
            }
            catch (error) {
                failure = error;
            }
            assert.ok(failure, `${label} must be refused after ${name}`);
            assert.match(String(failure.message), /工作区|项目上下文|连接|不一致/, `${label} refused for the wrong reason after ${name}: ` + String(failure.message));
            // 连只读的磁盘展开/收集都不许进入，更不能写配置或调用 Worker 方法。
            assert.deepEqual(harness.counters(), before, `${label} must have zero side effects after ${name}`);
            // 绝不允许用“当前项目”的锁去保护旧项目的写：拒绝时一条租约都不该出现。
            assert.deepEqual(await harness.holders(), [], `${label} must not register any lease after ${name}`);
        }
        harness.dispose();
    }
});

test("换工作区后重新打开面板写回调恢复正常，且配置写在新的工作区文件夹上（不是一律禁写）", async () => {
    const harness = makeHarness();
    await harness.open();
    harness.switchWorkspace(OTHER_ROOT);
    const fresh = await harness.open();
    await fresh.local.save(["src/main.py"], []);
    const last = harness.configUpdates[harness.configUpdates.length - 1];
    assert.equal(last.root, OTHER_ROOT, "reopen must bind the config write to the current workspace folder");
    assert.equal(last.key, "codeSync.scopePaths");
    assert.deepEqual(await harness.holders(), []);
    harness.dispose();
});

test("成功路径下真实嵌套可重入：外层宿主操作内的写回调不自冲突，也不提前交还外层写槽", async () => {
    const harness = makeHarness();
    const tabs = await harness.open();
    await harness.holdExpansion();
    let holdersDuringInner, configDuringInner;
    const inner = await harness.viewer.run({ pluginId: "simple-local.simple-sftp", workspaceUri: "file:///" + ROOT,
        hostProjectPath: ROOT, actionType: "distributeCodeToWorkers", actionLabel: "同步代码到 Worker" }, async () => {
        // 同一窗口已经持有项目级宿主写租约时再触发面板写回调：必须复用而不是自己跟自己冲突。
        const save = tabs.local.save(["src/main.py"], []);
        await harness.expansionEntered();
        holdersDuringInner = await harness.holders();
        configDuringInner = harness.counters().configUpdates;
        harness.releaseExpansion();
        await save;
        return { holdersAfterInnerWrite: await harness.holders(), counters: harness.counters() };
    });
    assert.deepEqual(holdersDuringInner, [{ pluginId: "simple-local.simple-sftp", windowId: VIEWER_WINDOW,
        actionType: "distributeCodeToWorkers", hostProjectPath: ROOT }], "内层写期间外层动作仍持有写槽");
    assert.equal(configDuringInner, 0, "配置只能在外层展开闸门打开之后写一次");
    assert.deepEqual(inner.holdersAfterInnerWrite, holdersDuringInner, "内层写结束不得把外层的写槽一起释放");
    assert.deepEqual(await harness.holders(), [], "外层宿主操作结束后才真正交还写槽");
    assert.deepEqual(harness.effects.conflicts, [], "同一窗口的嵌套写不得被误报成跨窗口冲突");
    assert.deepEqual(harness.effects.information, ["本机与服务器同步范围已保存：1 条路径。"], "内层写必须真的完成一次");
    assert.equal(inner.counters.writes, 0);
    assert.equal(inner.counters.configUpdates, 1);
    harness.dispose();
});
