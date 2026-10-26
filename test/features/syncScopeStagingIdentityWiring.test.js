// r112 参数捕获：保留/合并/批量/目录恢复/跨机对账四条共享链的 fpsync 调用必须携带
// syncScopeStagingIdentity 身份（同批重试逐字同代），杜绝回退共享 project-files scope＋随机新代
// （现场依据：nwpu3 d-47be3d71…=sha256(["project-files",0]) 与 lane1 d-008f3730… 被同一逻辑源
// 自家 committed 代占满，之后每发必 TRANSFER_STAGE_PENDING）。四个入口逐一钉住参数非空与复用。
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'),
  path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { syncScopeStagingIdentity } = require('../../src/features/JobArtifactSyncIdentity.ts');
const { safeSyncPath } = require('../../src/features/SyncResolution.ts');
const { scopeInventoryPathAllowed } = require('../../src/features/SyncScopeStatus.ts');
const { isUnderMachineStatePrefixes } = require('../../src/features/ProjectRootMap.ts');
const { planSyncScopeTransferGroups, batchSyncScopeInventoryPaths, scopeInventorySnapshot } = require('../../src/features/SyncScopeTransferBatch.ts');
const { normalizeMirrorScopePaths, filterInventoryByScope } = require('../../src/features/ProjectMirror.ts');
const { filterHeldFiles } = require('../../src/features/SyncResolution.ts');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
const methods = {};
(function visit(n) { if (ts.isMethodDeclaration(n) && ['retainSyncScopeVersion', 'transferSyncScopeBatch', 'reconcileChosenDirectories', 'reconcileProjectFilesAcrossWorkers'].includes(n.name.getText(ast))) methods[n.name.getText(ast)] = n; ts.forEachChild(n, visit); })(ast);
assert.deepEqual(Object.keys(methods).sort(), ['reconcileChosenDirectories', 'reconcileProjectFilesAcrossWorkers', 'retainSyncScopeVersion', 'transferSyncScopeBatch'], '四个漏传点方法必须都能从当前源码提取');

function host(name, h, extra) {
  h[name] = vm.runInNewContext(ts.transpileModule('class Host{' + methods[name].getText(ast) + '};Host.prototype.' + name,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText,
  Object.assign({
    vscode: { workspace: { getConfiguration: () => ({ get: (_k, f) => f }) }, Uri: { file: x => x },
      window: { showWarningMessage: (...a) => Promise.resolve(a.at(-1)) }, commands: { executeCommand: async () => ({ ok: true }) } },
    path, safeSyncPath, scopeInventoryPathAllowed, isUnderMachineStatePrefixes, syncScopeStagingIdentity,
    planSyncScopeTransferGroups, batchSyncScopeInventoryPaths, scopeInventorySnapshot,
    normalizeMirrorScopePaths, filterInventoryByScope, filterHeldFiles, SYNC_SCOPE_REVIEWED_STALE_FILE_LIMIT: 200,
    workerFpsyncTaskLabel: () => '', UiCommandCancelled: Error, isLocalCodeOwnedPath: () => false,
    loadSyncHolds: async () => ({}), collectLocalScopeInventory: async () => { throw Error('本用例来源必须是 Worker'); },
    mirrorChosenWorkerVersionToLocal: async () => { throw Error('本用例不镜像本机'); },
    deleteLocalSyncPath: () => { throw Error('本用例不删本机文件'); }, confirmSyncScopePaths: async () => true,
  }, extra));
  return h;
}
const SHA = { a: 'a'.repeat(64), b: 'b'.repeat(64), c: 'c'.repeat(64) };
const identity = p => ({ retentionKey: p.retentionKey, generation: p.generation });
const pinned = (p, scopePaths, manifest, label) => {
  assert.ok(p.retentionKey && /^[0-9a-f]{64}$/.test(p.generation), label + '：fpsync 必须携带非空 retentionKey/generation');
  assert.deepEqual(identity(p), syncScopeStagingIdentity(scopePaths, manifest), label + '：身份必须等于按本批冻结清单计算的纯函数结果');
};

function retainFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'se-retain-identity-'));
  const targets = [{ id: 'a', remotePath: '/p' }, { id: 'b', remotePath: '/p' }];
  const inventory = { a: { 'work_dirs/x.bin': { sha256: SHA.a, size: 3 } }, b: {} }, transfers = [];
  const h = host('retainSyncScopeVersion', {
    context: { globalStorageUri: { fsPath: root } }, syncScopeMutationInFlight: false,
    sftpServerOptions: row => row, assertSshTransportIdentities: async () => {}, updateSyncScopeHolds: async () => {},
    targetRootGuard: () => ({ prefixes: [], unknown: false }), localMachineStateGuard: () => ({ prefixes: [], unknown: false }),
    verifiedSftpProjectInventory: async ({ source }) => ({ files: structuredClone(inventory[source.id] || {}) }),
    simpleSftpApiCall: async (method, p) => { assert.equal(method, 'sync.serverToServerFpsync'); transfers.push(p);
      for (const file of p.relativePaths) inventory[p.destination.id][file] = structuredClone(inventory[p.source.id][file]); },
  });
  return { h, inventory, run: () => h.retainSyncScopeVersion(root, targets, 'work_dirs/x.bin', 'a', false, () => {}, true, ['b']), transfers };
}
test('retain lane (:11358 手动保留/合并扇出) sends the frozen-manifest identity and retries reuse it verbatim', async () => {
  const f = retainFixture();
  assert.equal(await f.run(), true); assert.equal(f.transfers.length, 1);
  pinned(f.transfers[0], ['work_dirs/x.bin'], { 'work_dirs/x.bin': SHA.a }, '保留');
  assert.equal(await f.run(), true);
  assert.deepEqual(identity(f.transfers[1]), identity(f.transfers[0]), '同一批第二次调用 retentionKey/generation 逐字相等（不再开新代）');
  const g = retainFixture(); g.inventory.a['work_dirs/x.bin'] = { sha256: SHA.c, size: 3 };
  assert.equal(await g.run(), true);
  assert.notEqual(g.transfers[0].generation, f.transfers[0].generation, '来源 SHA 变化必须开新代');
});

function batchFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'se-batch-identity-'));
  const targets = [{ id: 'a', remotePath: '/p' }, { id: 'b', remotePath: '/p' }];
  const files = { 'work_dirs/p/model.pth': { sha256: SHA.a, size: 3, modifiedAtMs: 1 }, 'tmp/a.json': { sha256: SHA.b, size: 2, modifiedAtMs: 1 } };
  const inventory = { a: structuredClone(files), b: {} }, transfers = [];
  const h = host('transferSyncScopeBatch', {
    context: { globalStorageUri: { fsPath: root } }, localMachineStateGuard: () => ({ prefixes: [], unknown: false }),
    sftpServerOptions: row => row, assertSshTransportIdentities: async () => {}, deleteSyncScopeRemoteCopy: async () => {},
    loadSyncScopeBatchSourceFiles: async () => structuredClone(inventory.a),
    readScopedProjectInventory: async server => structuredClone(inventory[server.id] || {}),
    simpleSftpApiCall: async (method, p) => { assert.equal(method, 'sync.serverToServerFpsync'); transfers.push(p);
      for (const file of p.relativePaths) inventory[p.destination.id][file] = structuredClone(inventory[p.source.id][file]); },
  });
  const work = [{ path: 'tmp/a.json', endpointId: 'a', directory: false }, { path: 'work_dirs/p/model.pth', endpointId: 'a', directory: false }];
  return { h, inventory, run: () => h.transferSyncScopeBatch(root, targets, structuredClone(work), ['b'], () => {}), transfers };
}
test('batch lane (:11080 批量保留文件版本) sends the identity and a same-input rerun reproduces it verbatim', async () => {
  const f = batchFixture(); await f.run(); assert.equal(f.transfers.length, 1);
  pinned(f.transfers[0], ['tmp/a.json', 'work_dirs/p/model.pth'], { 'tmp/a.json': SHA.b, 'work_dirs/p/model.pth': SHA.a }, '批量');
  const g = batchFixture(); await g.run();
  assert.deepEqual(identity(g.transfers[0]), identity(f.transfers[0]), '同输入跨实例逐字同代（同批重试复用己代）');
  const changed = batchFixture(); changed.inventory.a['tmp/a.json'].sha256 = SHA.c; await changed.run();
  assert.notEqual(changed.transfers[0].generation, f.transfers[0].generation, '清单变化必须开新代');
});

function directoryRestoreFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'se-direstore-identity-'));
  const targets = [{ id: 'a', remotePath: '/p' }, { id: 'b', remotePath: '/p' }];
  const holds = { 'work_dirs/keep': { status: 'resolved', directory: true, endpointId: 'a', fileHashes: { 'work_dirs/keep/m.pth': SHA.a } } };
  const inventories = { a: { 'work_dirs/keep/m.pth': { sha256: SHA.a } }, b: { 'work_dirs/keep/m.pth': { sha256: SHA.b } } }, transfers = [];
  const h = host('reconcileChosenDirectories', {
    context: { globalStorageUri: { fsPath: root } }, sftpServerOptions: row => row, assertSshTransportIdentities: async () => {},
    targetRootGuard: () => ({ prefixes: [], unknown: false }), deleteSyncScopeRemoteCopy: async () => {}, updateSyncScopeHolds: async () => {},
    verifiedSftpProjectInventory: async ({ source }) => ({ files: structuredClone(inventories[source.id] || {}) }),
    simpleSftpApiCall: async (method, p) => { assert.equal(method, 'sync.serverToServerFpsync'); transfers.push(p);
      for (const [file, info] of Object.entries(inventories[p.source.id])) if (file.startsWith(p.relativePath + '/')) inventories[p.destination.id][file] = structuredClone(info); },
  });
  return { run: () => h.reconcileChosenDirectories(root, targets, structuredClone(holds), structuredClone(inventories), ['.']), transfers };
}
test('directory-restore lane (:11436 恢复手动保留目录) sends the identity derived from the holds manifest', async () => {
  const f = directoryRestoreFixture(); await f.run(); assert.equal(f.transfers.length, 1);
  pinned(f.transfers[0], ['work_dirs/keep'], { 'work_dirs/keep/m.pth': SHA.a }, '目录恢复');
  const g = directoryRestoreFixture(); await g.run();
  assert.deepEqual(identity(g.transfers[0]), identity(f.transfers[0]), '同一 holds 记录重复恢复逐字同代');
});

function reconcileFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'se-reconcile-identity-'));
  const targets = [{ id: 'a', remotePath: '/p' }, { id: 'b', remotePath: '/p' }];
  const inventories = { a: { 'code/x.py': { sha256: SHA.a } }, b: {} }, transfers = []; let plans = 0;
  const h = host('reconcileProjectFilesAcrossWorkers', {
    context: { globalStorageUri: { fsPath: root } }, syncCodeTargets: async () => {}, captureProjectContext: () => ({}),
    workerCodeSyncTargets: () => targets, enabledWorkerConfigs: () => targets, loadPlanSyncLedger: async () => ({}),
    reconcileChosenDirectories: async () => {}, sftpServerOptions: row => row, assertSshTransportIdentities: async () => {},
    targetRootGuard: () => ({ prefixes: [], unknown: false }), withPluginStateFileLease: async (_r, _f, _k, _t, run) => run(),
    verifiedSftpProjectInventory: async ({ source }) => ({ files: structuredClone(inventories[source.id] || {}) }),
    simpleSftpApiCall: async (method, p) => { assert.equal(method, 'sync.serverToServerFpsync'); transfers.push(p);
      for (const file of p.relativePaths) inventories[p.destination.id][file] = structuredClone(inventories[p.source.id][file]); },
  }, {
    workspaceRoot: () => root, buildLocalCodeManifest: async () => ({}),
    planProjectMirror: () => (++plans === 1
      ? { copies: [{ sourceWorkerId: 'a', destinationWorkerId: 'b', path: 'code/x.py' }], fileCount: 1, conflicts: [], protectedDifferences: [] }
      : { copies: [], fileCount: 1, conflicts: [], protectedDifferences: [] }),
    PlanArtifactSync: { pendingPlanSyncs: () => [], projectMirrorStateStoragePath: () => path.join(root, 'mirror-state.json') },
    writeAtomicPluginStateJson: async () => {},
  });
  return { run: () => h.reconcileProjectFilesAcrossWorkers(root), transfers };
}
test('cross-worker reconcile lane (:22021 项目文件补齐) sends the identity from the verified source inventory', async () => {
  const f = reconcileFixture(); await f.run(); assert.equal(f.transfers.length, 1);
  pinned(f.transfers[0], ['code/x.py'], { 'code/x.py': { sha256: SHA.a } }, '跨机对账');
  const g = reconcileFixture(); await g.run();
  assert.deepEqual(identity(g.transfers[0]), identity(f.transfers[0]), '同输入对账逐字同代；完成后计划自然清空不再传输');
});
