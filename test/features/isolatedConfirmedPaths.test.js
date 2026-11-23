const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function source(file) { return fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8'); }
function cut(text, a, b) { const i = text.indexOf(a), j = text.indexOf(b, i); assert.ok(i >= 0 && j > i); return text.slice(i, j); }
function compile(text) { return ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText; }
const original = 'a'.repeat(48), review = 'b'.repeat(48), another = 'c'.repeat(48);
const node = { id: 'worker', kind: 'remote', root: '/project', host: 'host', port: 22, user: 'user' };
const target = { node, path: 'clean/item', type: 'directory', backendToken: 'token', backendDigest: 'digest', rootIdentity: { inode: '1' } };

test('isolated reservations survive stale snapshot and reject concurrent requests', async () => {
  const text = source('extension/legacy.ts');
  const helpers = cut(text, 'function normalizeLocalOperationsState(', 'function normalizeLocalPlanMetadataState(');
  const methods = cut(text, '    async withLocalOperationsLease(', '    async clearCacheFromUi(');
  let disk = null, chain = Promise.resolve(), valid = true, inject;
  const fakeFs = { async readFile() { if (disk === null) throw Object.assign(Error('missing'), { code: 'ENOENT' }); return disk; }, async mkdir() {} };
  const box = { fs: fakeFs, path, process, samePath: (a,b) => a === b, PROJECT_LOCAL_OPERATIONS_PATH: 'state.json', Date, Object, Error,
    async atomicWriteText(_file, data, options) { if (inject) { const fn = inject; inject = undefined; fn(); } await options.beforeRename(); disk = data; } };
  vm.createContext(box);
  vm.runInContext(compile(helpers + '\nclass Host {\n' + methods + '\n}\nthis.Host=Host; this.writeState=writeProjectLocalOperationsState;'), box);
  function host() { const h = new box.Host(); h.hostOperationLease = { async acquire() { const prior = chain; let release; chain = new Promise(r => release = r); await prior;
    return { async assertHeld() { if (!valid) throw Error('lease lost'); }, async release() { release(); } }; } }; return h; }
  const a = host(), b = host(), root = '/fixture';
  const entry = { originalId: original, reviewId: review, settled: false, open: true, uncertain: false, targets: [target, { ...target, backendToken: 'second' }],
    groups: [{ token: 'token', state: 'unsent' }, { token: 'second', state: 'unsent' }] };
  const results = await Promise.allSettled([a.isolatedDeleteState(root, 'reserve', entry), b.isolatedDeleteState(root, 'reserve', { ...entry, reviewId: another })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  await b.withLocalOperationsLease(root, lease => box.writeState(root, { stale: { status: 'running' } }, () => lease.assertHeld()));
  assert.equal((await host().isolatedDeleteState(root, 'get', { originalId: original })).reviewId, review);
  await b.cacheCleanupState(root, 'reserve', [{ operationId: 'cache', root, workerId: 'worker', paths: ['tmp/a'], settled: false }]);
  assert.equal((await host().isolatedDeleteState(root, 'get', { originalId: original })).reviewId, review);
  await assert.rejects(b.isolatedDeleteState(root, 'reserve', { ...entry, originalId: another, reviewId: another }), /原删除请求/);
  const saved = disk;
  inject = () => { valid = false; };
  await assert.rejects(a.isolatedDeleteState(root, 'close', entry), /lease lost/);
  assert.equal(disk, saved);
  valid = true;
  await a.isolatedDeleteState(root, 'admit', { ...entry, token: 'token', operationId: 'op' });
  await a.isolatedDeleteState(root, 'close', entry);
  await assert.rejects(a.isolatedDeleteState(root, 'settle', entry), /ISOLATED_DELETE_QUERY_REQUIRED/);
  await assert.rejects(a.isolatedDeleteState(root, 'admit', { ...entry, token: 'second', operationId: 'op-2' }), /IDENTITY_CHANGED/);
  await host().isolatedDeleteState(root, 'ack', { ...entry, token: 'token', operationId: 'op' });
  await a.isolatedDeleteState(root, 'settle', entry);
  assert.deepEqual(JSON.parse(disk).pendingIsolatedDeletes[original], { originalId: original, reviewId: review, settled: true });
  assert.equal(JSON.parse(disk).pendingCacheCleanups.cache.operationId, 'cache');
  disk = '{'; await assert.rejects(a.isolatedDeleteState(root, 'reserve', entry));
});

test('old queue changes do not replace frozen isolation identity', async () => {
  const file = source('features/PlanIsolatedReview.ts');
  const digest = value => JSON.stringify(value);
  let batch = { projectRoot: '/project', canonicalProjectId: 'project-id', plans: [{ planFile: 'p.yaml', cleanup: [{ cleanupOperationId: original,
    targets: [{ nodeId: 'worker', host: 'host', sourceRelativePath: 'out/item', isolationRelativePath: 'clean/item', archiveBatch: '' }] }] }] };
  const operation = { id: original, state: 'partial', continuedBy: 'historic', preview: { action: 'isolate', scope: { planFile: 'p.yaml' }, rows: [{ disposition: 'isolate', node,
    type: 'directory', relativePath: 'out/item', destination: 'clean/item', archiveBatch: '' }] }, targets: {} };
  const module = { exports: {} };
  vm.runInNewContext(compile(file), { module, exports: module.exports, require(id) {
    if (id === './DistributedPlanQueue') return { canonicalProjectId: () => 'project-id' };
    if (id === './PlanCleanup') return { cleanupDigest: digest, cleanupRelative: value => value };
    if (id === './PlanIsolatedBatchLedger') return { loadIsolatedBatchLedger: async () => [batch] };
    return require(id);
  } });
  const resolve = module.exports.resolveIsolatedBatchReview;
  assert.ok(await resolve('ledger', '/project', original, { plans: [] }, async () => operation));
  operation.preview.rows[0].destination = 'clean/other';
  await assert.rejects(resolve('ledger', '/project', original, { plans: [] }, async () => operation), /TARGET_CHANGED/);
  operation.preview.rows[0].destination = 'clean/item'; batch.projectRoot = '/other';
  await assert.rejects(resolve('ledger', '/project', original, { plans: [] }, async () => operation), /IDENTITY_CHANGED/);
  batch.projectRoot = '/project'; operation.preview.rows[0].type = 'unknown';
  await assert.rejects(resolve('ledger', '/project', original, { plans: [] }, async () => operation), /UNVERIFIED/);
});

test('unknown send keeps its original reservation and cannot be sent from another host', async () => {
  const file = source('extension/PlanCleanupHost.ts');
  const method = cut(file, '  async execute(id: string) {', '  private isolatedReviewContext()');
  const digest = value => JSON.stringify(value);
  const box = { cleanupDigest: digest, cleanupError: code => { throw Error(code); }, Set, Error };
  vm.createContext(box); vm.runInContext(compile('class Host {\n' + method + '\n}\nthis.Host = Host;'), box);
  let pending, sends = 0;
  const state = async (_root, mode, entry, check) => {
    if (mode === 'get') return pending;
    if (mode === 'reserve') { if (pending && !pending.settled) throw Error('ISOLATED_DELETE_QUERY_REQUIRED'); await check(); pending = structuredClone(entry); return; }
    if (mode === 'admit' || mode === 'ack') { const group = pending.groups.find(g => g.token === entry.token); group.state = mode === 'admit' ? 'admitted' : 'ended'; group.operationId = entry.operationId; return; }
    if (mode === 'close') { pending.open = false; pending.uncertain = Boolean(entry.uncertain); return; }
    if (mode === 'settle') { pending = { originalId: entry.originalId, reviewId: entry.reviewId, settled: true }; return; }
    throw Error('unexpected mode');
  };
  const row = { ...target, disposition: 'delete', relativePath: target.path };
  const operation = { id: review, state: 'ready', preview: { registeredIsolationOperationId: original, rows: [row] } };
  function host(id, result) {
    const h = new box.Host(); h.root = '/fixture'; h.host = { isolatedDeleteState: state };
    h.ensureOperationRecordsMigrated = h.assertIsolatedReview = h.isolatedReviewEvent = h.verifyIsolatedAbsence = async () => {};
    h.assertWorkspace = () => {}; h.currentNode = () => node;
    h.service = { registeredIsolationSource: async () => original, status: async () => ({ ...operation, id }), assertNoPriorUnsettledIsolation: async () => {},
      async execute(_id, callbacks) { const snapshot = { token: 'token', digest: 'digest', rootIdentity: { inode: '1' }, operationId: 'op' };
        if (result === 'live') { await callbacks.alreadyRunning('token', snapshot); return { ...operation, state: 'running', executionRequestedAt: 'earlier' }; }
        await callbacks.before('token', snapshot); sends++; if (result === 'ack') await callbacks.acknowledged('token', snapshot, { receipt: { operationId: 'op', action: 'delete-fast', phase: 'completed' } });
        if (result === 'invalid') await callbacks.acknowledged('token', snapshot, { status: 'unknown' }); return { ...operation, state: 'partial' }; } };
    return h;
  }
  await host(review, 'unknown').execute(review);
  assert.equal(sends, 1); assert.equal(pending.settled, false); assert.equal(pending.reviewId, review);
  await assert.rejects(host(another, 'ack').execute(another), /ISOLATED_DELETE_QUERY_REQUIRED/);
  assert.equal(sends, 1);
  pending = undefined;
  await host(review, 'ack').execute(review);
  assert.equal(pending.settled, true); assert.equal(sends, 2);
  pending = undefined;
  await host(review, 'live').execute(review);
  assert.equal(pending.settled, false); assert.equal(sends, 2);
  pending = undefined;
  await host(review, 'invalid').execute(review);
  assert.equal(pending.settled, false); assert.equal(sends, 3);
});

test('isolated preview checks live executor and root before exposing frozen target', async () => {
  const file = source('features/PlanCleanup.ts');
  const method = cut(file, '  async isolatedDeletePreview(', '\n}');
  const digest = value => JSON.stringify(value), calls = [];
  const box = { cleanupDigest: digest, cleanupError: code => { throw Object.assign(Error(code), { code }); }, clone: x => structuredClone(x), path,
    randomBytes: () => ({ toString: () => review }), Date, Set, Map };
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + method + '\n}\nthis.Service = Service;'), box);
  const originalRow = { id: 'one', node, relativePath: 'out/item', destination: 'clean/item', type: 'directory', disposition: 'isolate', evidence: [], rootIdentity: { inode: '1' } };
  const originalOp = { state: 'partial', preview: { action: 'isolate', scope: {}, rows: [originalRow] }, targets: {} };
  let running = false, rootChanged = false;
  const service = new box.Service(); service.previews = new Map(); service.busy = new Set(); service.status = async () => originalOp;
  service.assertNoPriorUnsettledIsolation = async () => {};
  service.ports = { async sftp(method, args) { calls.push([method, args]);
    if (method === 'files.cleanup.inspect') return { ok: true, executorsChecked: true, executors: running ? [{}] : [], rootIdentity: { inode: rootChanged ? '2' : '1' } };
    assert.equal(method, 'files.cleanup.preview'); assert.equal(args.authorizationMode, 'confirmed_paths');
    return { token: 'backend', digest: 'digest', rootIdentity: { inode: '1' }, safety: { registeredIsolationDeletion: 1, subtreeSingleWriter: 1 },
      targets: [{ missing: false, fingerprint: 'frozen' }] };
  } };
  const preview = await service.isolatedDeletePreview(original);
  assert.equal(preview.rows[0].relativePath, 'clean/item'); assert.equal(preview.confirmations, 0);
  running = true; await assert.rejects(service.isolatedDeletePreview(original), /ISOLATED_EXECUTOR_UNVERIFIED/);
  running = false; rootChanged = true; await assert.rejects(service.isolatedDeletePreview(original), /ISOLATED_ROOT_IDENTITY_CHANGED/);
  assert.equal(calls.filter(([method]) => method === 'files.cleanup.preview').length, 1);
  assert.equal(calls.some(([method]) => method === 'files.cleanup.execute'), false);
});

test('lost send reply remains unknown even when the target later looks absent', async () => {
  const file = source('features/PlanCleanup.ts');
  const methods = cut(file, '  private async executeConfirmedFastBatches(', '  async list()');
  const box = { cleanupError: code => { throw Error(code); }, setTimeout, Date, Map, Set, Error, clone: x => structuredClone(x) };
  const pendingMethod = cut(file, '  private async isolatedDeletePending(', '  private newObservationRound(');
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + pendingMethod + methods + '\n}\nthis.Service = Service;'), box);
  const service = new box.Service(), calls = []; let sent = 0, acknowledged = 0;
  service.busy = new Set(); service.cancelled = new Set(); service.preflightConfirmed = async () => {};
  service.save = async () => {}; service.applyBatchObservations = () => {};
  service.observeManaged = async operation => ({ ...operation, state: 'completed' });
  service.ports = { pendingIsolationDelete: async () => true, updateIndexes: async () => { throw Error('must not index unknown'); },
    async sftp(method) { calls.push(method); if (method === 'files.cleanup.execute') throw Error('reply lost'); return { batchExecuting: false }; } };
  const row = { id: 'row', backendToken: 'backend', backendDigest: 'digest', backendIndex: 0, type: 'file' };
  const operation = { id: review, state: 'ready', preview: { action: 'delete', registeredIsolationOperationId: original,
    confirmations: 2, scope: { authorizationMode: 'confirmed_paths' }, rows: [row] }, targets: { row: { state: 'pending' } }, pendingNodes: [] };
  const result = await service.executeManaged(operation, { before: async () => { sent++; }, acknowledged: async () => { acknowledged++; }, alreadyRunning: async () => {} });
  assert.equal(result.state, 'partial'); assert.match(result.error, /结束状态尚未确认/);
  assert.equal(sent, 1); assert.equal(acknowledged, 0);
  assert.equal(calls.filter(method => method === 'files.cleanup.execute').length, 1);
});

test('recheck settles only the same backend receipt and keeps unknown on failed query', async () => {
  const file = source('extension/PlanCleanupHost.ts');
  const method = cut(file, '  async recheckIsolatedDelete(', '  async isolatedReviewEvent(');
  const digest = value => JSON.stringify(value); let response, settled = 0;
  const pending = { originalId: original, reviewId: review, settled: false, open: false, uncertain: false,
    targets: [target, { ...target, backendToken: 'never-sent' }], groups: [{ token: 'token', state: 'admitted', operationId: 'op' }, { token: 'never-sent', state: 'unsent' }] };
  const box = { cleanupDigest: digest, cleanupError: code => { throw Error(code); },
    guardCleanupSftpCall: async () => { if (response instanceof Error) throw response; return response; } };
  vm.createContext(box); vm.runInContext(compile('class Host {\n' + method + '\n}\nthis.Host = Host;'), box);
  const host = new box.Host(); host.root = '/fixture'; host.assertWorkspace = () => {}; host.currentNode = () => node;
  host.host = { isolatedDeleteState: async (_root, mode) => { if (mode === 'get') return pending; if (mode === 'settle') settled++; } };
  pending.open = true; await assert.rejects(host.recheckIsolatedDelete(original), /ISOLATED_DELETE_QUERY_REQUIRED/); assert.equal(settled, 0); pending.open = false;
  response = Error('offline'); await assert.rejects(host.recheckIsolatedDelete(original), /offline/); assert.equal(settled, 0);
  response = { token: 'token', digest: 'digest', operationId: 'op', rootIdentity: { inode: '1' }, batchExecuting: false };
  await assert.rejects(host.recheckIsolatedDelete(original), /ISOLATED_DELETE_QUERY_REQUIRED/); assert.equal(settled, 0);
  response.batchReceipt = { operationId: 'other', action: 'delete-fast', phase: 'completed' };
  await assert.rejects(host.recheckIsolatedDelete(original), /ISOLATED_DELETE_QUERY_REQUIRED/); assert.equal(settled, 0);
  response.batchReceipt.operationId = 'op'; await host.recheckIsolatedDelete(original); assert.equal(settled, 1);
  host.currentNode = () => ({ ...node, root: '/other' });
  await assert.rejects(host.recheckIsolatedDelete(original), /SERVER_IDENTITY_CHANGED/); assert.equal(settled, 1);
});

test('actual confirmation requires the same selected paths in two ordered phases', async () => {
  const file = source('features/PlanCleanup.ts');
  const method = cut(file, '  async confirm(params:', '  private async revalidate(');
  let disk;
  const box = { cleanupError: code => { throw Error(code); }, cleanupDigest: x => JSON.stringify(x), clone: x => structuredClone(x), Date, Map, Set, Object,
    fs: { async readFile() { if (!disk) throw Object.assign(Error('missing'), { code: 'ENOENT' }); return JSON.stringify(disk); } } };
  const pendingMethod = cut(source('features/PlanCleanup.ts'), '  private async isolatedDeletePending(', '  private newObservationRound(');
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + method + pendingMethod + '\n}\nthis.Service=Service;'), box);
  const service = new box.Service(), calls = [];
  const row = { id: 'row', disposition: 'delete', node, absolutePath: '/project/clean/item', backendToken: 'backend', backendDigest: 'digest' };
  const preview = { token: review, digest: 'frozen', action: 'delete', rows: [row], scope: {}, blockers: [], confirmations: 0, expiresAt: Date.now()+60000 };
  service.previews = new Map([[review, preview]]); service.file = () => 'memory'; service.assertAllowed = () => {}; service.revalidate = async () => {};
  service.save = async operation => { disk = structuredClone(operation); }; service.ports = { async sftp(method, args) {
    calls.push([method, args]); return method === 'files.cleanup.status' ? { token: 'backend', targets: [{ absolutePath: row.absolutePath }] } : {};
  } };
  const params = { token: review, digest: 'frozen', confirm: true, exactTargets: ['worker:/project/clean/item'] };
  await assert.rejects(service.confirm({ ...params, phase: 2 }), /CONFIRM_REQUIRED/);
  await assert.rejects(service.confirm({ ...params, phase: 1, exactTargets: ['worker:/project/other'] }), /CONFIRM_REQUIRED/);
  await service.confirm({ ...params, phase: 1 }); await service.confirm({ ...params, phase: 2 });
  assert.deepEqual(calls.filter(([method]) => method === 'files.cleanup.confirm').map(([, args]) => args.phase), [1, 2]);
  assert.equal(calls.some(([method]) => method === 'files.cleanup.execute'), false);
});

test('older locally persisted unknown request is discovered without replay', async () => {
  const method = cut(source('features/PlanCleanup.ts'), '  async assertNoPriorUnsettledIsolation(', '  async history(');
  let stored = { preview: { registeredIsolationOperationId: original }, executionRequestedAt: 'sent', state: 'partial' };
  const box = { path, cleanupError: code => { throw Error(code); }, fs: { readdir: async () => [review + '.json'], readFile: async () => JSON.stringify(stored) } };
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + method + '\n}\nthis.Service=Service;'), box);
  const service = new box.Service(); service.ports = { storageRoot: '/memory' };
  await assert.rejects(service.assertNoPriorUnsettledIsolation(original, another), /ISOLATED_DELETE_QUERY_REQUIRED/);
  stored.preview.registeredIsolationOperationId = another;
  await service.assertNoPriorUnsettledIsolation(original, another);
});

test('first observation of an old request without a pointer preserves unknown and paths', async () => {
  const method = cut(source('features/PlanCleanup.ts'), '  async status(id:', '  private newObservationRound(');
  const old = { id: review, state: 'partial', executionRequestedAt: 'sent', preview: { action: 'delete', registeredIsolationOperationId: original,
    scope: { observationMode: 'managed_tmux' }, rows: [{ id: 'row', relativePath: 'clean/item' }] }, targets: { row: { state: 'pending' } } };
  let disk = JSON.stringify(old), stored;
  const box = { fs: { readFile: async () => disk }, clone: x => structuredClone(x), cleanupError: code => { throw Error(code); }, Map, Set, Error };
  const pendingMethod = cut(source('features/PlanCleanup.ts'), '  private async isolatedDeletePending(', '  private newObservationRound(');
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + method + pendingMethod + '\n}\nthis.Service=Service;'), box);
  const service = new box.Service(); service.file = () => '/memory'; service.busy = new Set(); service.observing = new Map();
  service.newObservationRound = () => ({}); service.observeDeletion = async op => ({ ...op, state: 'completed' });
  service.ports = { updateIndexes: async () => { throw Error('must not finalize'); } };
  service.save = async op => { stored = structuredClone(op); disk = JSON.stringify(stored); };
  const result = await service.status(review);
  assert.equal(result.state, 'partial'); assert.equal(stored.executionRequestedAt, 'sent');
  assert.equal(stored.preview.rows[0].relativePath, 'clean/item');
});

test('real managed path settles when node changes before any send', async () => {
  const cleanup = cut(source('features/PlanCleanup.ts'), '  private async executeConfirmedFastBatches(', '  async list()');
  const hostMethod = cut(source('extension/PlanCleanupHost.ts'), '  async execute(id: string) {', '  private isolatedReviewContext()');
  const box = { cleanupError: code => { throw Error(code); }, cleanupDigest: x => JSON.stringify(x), clone: x => structuredClone(x), setTimeout, Date, Map, Set, Error };
  const pendingMethod = cut(source('features/PlanCleanup.ts'), '  private async isolatedDeletePending(', '  private newObservationRound(');
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + pendingMethod + cleanup + '\n}\nclass Host {\n' + hostMethod + '\n}\nthis.Service=Service;this.Host=Host;'), box);
  let pending, sends = 0;
  const row = { id: 'row', ...target, relativePath: target.path, disposition: 'delete', backendIndex: 0 };
  const op = { id: review, state: 'ready', preview: { registeredIsolationOperationId: original, action: 'delete', confirmations: 2,
    scope: { authorizationMode: 'confirmed_paths' }, rows: [row] }, targets: { row: { state: 'pending' } }, pendingNodes: [] };
  const service = new box.Service(); service.busy = new Set(); service.cancelled = new Set(); service.preflightConfirmed = async () => {};
  service.save = async () => {}; service.applyBatchObservations = () => {}; service.observeManaged = async operation => ({ ...operation, state: 'partial' });
  service.ports = { pendingIsolationDelete: async () => true, async sftp(method) { if (method === 'files.cleanup.execute') sends++;
    return { token: 'token', digest: 'digest', rootIdentity: { inode: '1' }, operationId: 'op', batchExecuting: false }; } };
  service.registeredIsolationSource = async () => original; service.status = async () => structuredClone(op); service.assertNoPriorUnsettledIsolation = async () => {};
  service.execute = async (_id, dispatch) => service.executeManaged(structuredClone(op), dispatch);
  const host = new box.Host(); host.root = '/fixture'; host.ensureOperationRecordsMigrated = host.assertIsolatedReview = host.isolatedReviewEvent = async () => {};
  let currentNode = { ...node, root: '/changed' }, changeDuringAdmission = false;
  host.assertWorkspace = () => {}; host.currentNode = () => currentNode; host.service = service;
  host.host = { isolatedDeleteState: async (_root, mode, entry, check) => { if (mode === 'get') return pending;
    if (mode === 'reserve') { await check(); pending = structuredClone(entry); } else if (mode === 'close') { pending.open = false; pending.uncertain = Boolean(entry.uncertain); }
    else if (mode === 'admit') { pending.groups[0].state = 'admitted'; if (changeDuringAdmission) currentNode = { ...node, root: '/changed' }; }
    else if (mode === 'unadmit') pending.groups[0].state = 'unsent';
    else if (mode === 'settle') pending = { originalId: original, reviewId: review, settled: true }; else throw Error('unexpected ' + mode); } };
  await host.execute(review); assert.equal(sends, 0); assert.equal(pending.settled, true);
  pending = undefined; currentNode = node; changeDuringAdmission = true;
  await host.execute(review); assert.equal(sends, 0); assert.equal(pending.settled, true);
});

test('lost first group and unsent second group recover without sending either again', async () => {
  const methods = cut(source('features/PlanCleanup.ts'), '  private async executeConfirmedFastBatches(', '  async list()');
  const recheck = cut(source('extension/PlanCleanupHost.ts'), '  async recheckIsolatedDelete(', '  async isolatedReviewEvent(');
  const box = { cleanupError: code => { throw Error(code); }, cleanupDigest: x => JSON.stringify(x), clone: x => structuredClone(x), setTimeout, Date, Map, Set, Error,
    guardCleanupSftpCall: async (_host, _root, _method, args) => ({ token: args.token, digest: 'digest', operationId: 'op-1',
      rootIdentity: { inode: '1' }, batchExecuting: false, batchReceipt: { operationId: 'op-1', action: 'delete-fast', phase: 'completed' } }) };
  const pendingMethod = cut(source('features/PlanCleanup.ts'), '  private async isolatedDeletePending(', '  private newObservationRound(');
  vm.createContext(box); vm.runInContext(compile('class Service {\n' + pendingMethod + methods + '\n}\nclass Host {\n' + recheck + '\n}\nthis.Service=Service;this.Host=Host;'), box);
  const pending = { originalId: original, reviewId: review, settled: false, open: true, uncertain: false, targets: [target, { ...target, backendToken: 'second' }],
    groups: [{ token: 'token', state: 'unsent' }, { token: 'second', state: 'unsent' }] };
  const calls = []; const service = new box.Service(); service.busy = new Set(); service.cancelled = new Set(); service.preflightConfirmed = async () => {};
  service.save = async () => {}; service.applyBatchObservations = () => {}; service.observeManaged = async op => op;
  service.ports = { pendingIsolationDelete: async () => true, async sftp(method, args) { calls.push([method, args.token]);
    if (args.token === 'second') throw Error('second status unavailable');
    if (method === 'files.cleanup.execute') throw Error('lost');
    return { token: 'token', digest: 'digest', rootIdentity: { inode: '1' }, operationId: 'op-1', batchExecuting: false };
  } };
  const rows = ['token','second'].map((backendToken, i) => ({ id: String(i), backendToken, backendDigest: 'digest', backendIndex: 0, type: 'file' }));
  const operation = { id: review, state: 'ready', preview: { action: 'delete', registeredIsolationOperationId: original, confirmations: 2,
    scope: { authorizationMode: 'confirmed_paths' }, rows }, targets: { '0': { state: 'pending' }, '1': { state: 'pending' } }, pendingNodes: [] };
  const dispatch = { async before(token, snapshot) { const group = pending.groups.find(g => g.token === token); assert.equal(pending.open, true); group.state = 'admitted'; group.operationId = snapshot.operationId; },
    async acknowledged() { throw Error('not expected'); }, async alreadyRunning() { throw Error('not expected'); } };
  await service.executeManaged(operation, dispatch); pending.open = false;
  assert.deepEqual(pending.groups.map(g => g.state), ['admitted','unsent']);
  assert.equal(calls.filter(([method]) => method === 'files.cleanup.execute').length, 1);
  let settled = false; const host = new box.Host(); host.root = '/fixture'; host.assertWorkspace = () => {}; host.currentNode = () => node;
  host.host = { async isolatedDeleteState(_root, mode, entry) { if (mode === 'get') return pending;
    if (mode === 'ack') { pending.groups.find(g => g.token === entry.token).state = 'ended'; return; }
    if (mode === 'settle') { assert.equal(pending.groups.some(g => g.state === 'admitted'), false); settled = true; } } };
  await host.recheckIsolatedDelete(original); assert.equal(settled, true);
  assert.equal(calls.filter(([method]) => method === 'files.cleanup.execute').length, 1);
});

test('standalone real service honors actual completion receipt and keeps missing reply unknown', async () => {
  require('../_helpers/registerTsRequire');
  const { createRequire } = require('node:module');
  const localRequire = createRequire(path.join(__dirname, '../../src/features/PlanCleanup.ts'));
  for (const loseReply of [false, true]) {
    const files = new Map(), present = new Set(['clean/item']), calls = [];
    const fakeFs = { async readFile(file) { if (!files.has(file)) throw Object.assign(Error('missing'), { code: 'ENOENT' }); return files.get(file); },
      async readdir() { return [...files.keys()].map(file => path.basename(file)); }, async mkdir() {} };
    let backend, confirmation = 0;
    const root = '/fixture', local = { id: 'local', kind: 'local', root }, identity = { path: root, inode: '1' };
    const module = { exports: {} };
    const box = { module, exports: module.exports, Buffer, process, setTimeout, clearTimeout, AbortController, console,
      require(name) {
        if (name === 'node:fs/promises') return fakeFs;
        if (name === '../state/StateStore') return { atomicWriteText: async (file, text) => { files.set(file, text); } };
        if (name === './ObservationRound') return { createObservationRound: () => ({}), observeRound: async (_round, _node, targets) => ({ rootIdentity: identity,
          missingKeys: [], byKey: new Map(targets.map(t => [t.key, { status: present.has(t.relativePath) ? 'present' : 'gone',
            state: present.has(t.relativePath) ? 'pending' : 'completed', executorsChecked: true, executors: [] }])) }) };
        return localRequire(name);
      } };
    vm.runInNewContext(compile(source('features/PlanCleanup.ts')), box);
    const { PlanCleanup } = module.exports;
    const originalRow = { id: 'old', nodeId: 'local', node: local, relativePath: 'out/item', destination: 'clean/item', type: 'directory',
      disposition: 'isolate', evidence: [], rootIdentity: identity };
    const originalOp = { id: original, state: 'completed', preview: { token: original, action: 'isolate', scope: { planFile: 'p.yaml', nodes: [local] }, rows: [originalRow] },
      targets: { old: { state: 'completed' } }, pendingNodes: [] };
    files.set(path.join(root, original + '.json'), JSON.stringify(originalOp));
    const sftp = async (method, args) => { calls.push(method);
      if (method === 'files.cleanup.inspect') return { ok: true, rootIdentity: identity, executorsChecked: true, executors: [], target: { missing: false } };
      if (method === 'files.cleanup.preview') { backend = { token: review, digest: 'digest', operationId: 'op', rootIdentity: identity, confirmations: 0,
        targets: [{ relativePath: 'clean/item', absolutePath: path.join(root,'clean/item'), missing: false, fingerprint: 'fp' }], states: ['pending'] };
        return { ...backend, safety: { registeredIsolationDeletion: 1, subtreeSingleWriter: 1 } }; }
      if (method === 'files.cleanup.status') return { ...backend, batchExecuting: false, observations: [{ state: backend.states[0] }] };
      if (method === 'files.cleanup.confirm') { confirmation = args.phase; backend.confirmations = args.phase; return {}; }
      if (method === 'files.cleanup.execute') { present.delete('clean/item'); backend.states[0] = 'completed';
        if (loseReply) throw Error('reply lost'); return { receipt: { operationId: 'op', action: 'delete-fast', phase: 'completed' } }; }
      throw Error('unexpected ' + method);
    };
    const service = new PlanCleanup({ storageRoot: root, sftp, collect: async () => { throw Error('not used'); }, updateIndexes: async () => {}, restoreGate: async () => {} });
    const preview = await service.isolatedDeletePreview(original), exactTargets = ['local:'+path.join(root,'clean/item')];
    await service.confirm({ token: preview.token, digest: preview.digest, phase: 1, confirm: true, exactTargets });
    await service.confirm({ token: preview.token, digest: preview.digest, phase: 2, confirm: true, exactTargets });
    const result = await service.execute(preview.token);
    assert.equal(confirmation, 2); assert.equal(result.state, loseReply ? 'partial' : 'completed');
    assert.equal(calls.filter(method => method === 'files.cleanup.execute').length, 1);
    if (loseReply) { const again = await service.status(preview.token); assert.equal(again.state, 'partial');
      await assert.rejects(service.isolatedDeletePreview(original), error => error.apiData?.code === 'ISOLATED_DELETE_QUERY_REQUIRED'); }
  }
});
