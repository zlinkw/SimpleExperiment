// Drives the production runSyncScopeTreeBatch body itself (extracted from src/extension/legacy.ts,
// same loader pattern as syncScopeDeletionRefresh.test.js) with real expandSyncScopeBatchSelection,
// previewConfirmedScopeDeletion and completeConfirmedScopeDeletion. Only UI dialogs, the extension
// host plumbing and trivial metadata classifiers are injected; no parallel re-implementation of the
// orchestration exists in this file.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
require('../_helpers/registerTsRequire');
const { expandSyncScopeBatchSelection } = require('../../src/features/SyncScopeBatch.ts');
const { previewConfirmedScopeDeletion, completeConfirmedScopeDeletion } = require('../../src/features/SyncScopeDelete.ts');

const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
function method(name, globals) {
  const ast = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.ES2022, true);
  let member; function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name) member = node; ts.forEachChild(node, visit); } visit(ast);
  assert.ok(member, name);
  return vm.runInNewContext(ts.transpileModule('class Host{' + member.getText(ast) + '};Host.prototype.' + name,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals);
}

const clone = value => JSON.parse(JSON.stringify(value));
const FAST = { confirmedPathDeletion: 1, entryIdentityBind: 1, batchedFastDelete: 1, directoryTreeIsolateDelete: 1, isolationRenameNoReplace: 1, fastDeleteBatchLimit: 5000 };
const err = (code, message) => Object.assign(new Error(message || code), { apiData: { code } });
const isoName = relativePath => '__iso_' + relativePath.replace(/[^\w]/g, '_');
const SENTENCE = '我确认所列路径正确、文件未被占用，并同意永久删除';

function makeEngine({ present = new Set(), dirs = new Set(), residue = new Set(), failExecuteOnce = false } = {}) {
  const calls = [], rows = new Map(), peak = { preview: 0 }; let inflight = 0, counter = 0;
  const rpc = async (method, params) => {
    calls.push({ method, params: clone(params) });
    if (method === 'files.cleanup.preview') {
      peak.preview = Math.max(peak.preview, ++inflight);
      try {
        if (params.authorizationMode !== 'confirmed_paths' || params.action !== 'delete') throw err('INVALID_ACTION');
        if (!Array.isArray(params.targets) || !params.targets.length || params.targets.length > 5000) throw err('INVALID_REQUEST');
        const root = String(params.node.root).replace(/\/$/, '');
        const targets = params.targets.map((target, index) => {
          const absolutePath = root + '/' + target.relativePath;
          if (!present.has(target.relativePath)) return { ...target, absolutePath, missing: true };
          const row = { ...target, absolutePath, device: 42, inode: 100 + index, fingerprint: 'fp-' + target.relativePath };
          if (dirs.has(target.relativePath)) return { ...row, isolationName: isoName(target.relativePath), isolationAbsolutePath: root + '/' + isoName(target.relativePath) };
          return row;
        });
        const row = { token: 'tok' + (++counter), digest: 'd' + counter, safety: clone(FAST), rootIdentity: { path: params.node.root }, targets, confirmations: 0, node: params.node };
        rows.set(row.token, row); return clone(row);
      } finally { inflight--; }
    }
    const row = rows.get(params.token); if (!row) throw err('UNKNOWN_TOKEN');
    if (method === 'files.cleanup.status') {
      const observations = row.targets.map(target => present.has(target.relativePath) ? { state: 'pending' }
        : residue.has(target.relativePath) ? { state: 'unknown', isolationStatus: 'present' } : { state: 'completed', status: 'gone' });
      return clone({ token: row.token, digest: row.digest, rootIdentity: row.rootIdentity, targets: row.targets, confirmations: row.confirmations, observations, states: observations.map(row2 => row2.state), batchExecuting: false });
    }
    if (method === 'files.cleanup.confirm') {
      if (params.confirm !== true || params.digest !== row.digest || params.phase !== row.confirmations + 1
        || JSON.stringify(params.exactTargets) !== JSON.stringify(row.targets.filter(target => !target.missing).map(target => target.absolutePath))) throw err('CONFIRM_REQUIRED');
      row.confirmations = params.phase; return { ok: true };
    }
    if (method === 'files.cleanup.execute') {
      if (row.confirmations < 2 || params.digest !== row.digest || !Number.isInteger(params.index) || !row.targets[params.index] || row.targets[params.index].missing) throw err('NOT_AN_EXECUTABLE_TARGET');
      row.targets.forEach(target => { if (!target.missing) present.delete(target.relativePath); });
      if (failExecuteOnce) throw new Error('response lost');
      return { ok: true };
    }
    if (['files.cleanup.check', 'files.cleanup.verify', 'files.cleanup.inspect', 'files.cleanup.settle'].includes(method))
      throw new Error('legacy per-file RPC must not touch the fast chain: ' + method);
    throw new Error('unexpected method ' + method);
  };
  const countOf = suffix => calls.filter(call => call.method.endsWith(suffix)).length;
  return { rpc, calls, present, countOf, peak };
}

function fixture({ entries, targets = [{ id: 'w1' }], engine, picked, confirmed = true }) {
  const confirmations = [], holdsWrites = [], localRemovals = [], reports = [];
  const host = {
    syncScopeMutationInFlight: false, planSyncInFlight: false, codeSyncInFlight: false,
    createSyncScopeBatchIndex(root, scopeTargets, localOnly, report) {
      return { list: async parent => entries.filter(entry => entry.path.startsWith(parent === '.' ? '' : parent + '/')
          && (parent === '.' ? !entry.path.includes('/') : !entry.path.slice(parent.length + 1).includes('/'))), dispose() {} };
    },
    sftpServerOptions: () => ({ host: 'h', user: 'u', port: 22, remotePath: '/project' }),
    simpleSftpApiCall: async (method, params) => engine.rpc(method, params),
    updateSyncScopeHolds: async (root, mutate) => { const holds = {}; mutate(holds); holdsWrites.push(holds); },
    removeSyncScopeCopies: async (root, scopeTargets, relative, endpoints, directory) => { localRemovals.push({ relative, endpoints, directory }); },
  };
  const vscode = {
    window: { showQuickPick: async options => picked === undefined ? null : (typeof picked === 'function' ? picked(options) : options.find(row => row.label === picked)) },
    workspace: { getConfiguration: () => ({ get: () => [] }) }, Uri: { file: () => ({ fsPath: 'fixture' }) },
  };
  const globals = { vscode, path, console, Date, JSON, Object, Array, Number, String, Boolean, Set, Map,
    expandSyncScopeBatchSelection, previewConfirmedScopeDeletion, completeConfirmedScopeDeletion,
    isLocalCodeOwnedPath: () => false, errorMessage: error => String(error?.message || error),
    confirmSyncScopePaths: async (title, note, paths, finalLabel) => { confirmations.push({ title, note, paths, finalLabel }); return confirmed; } };
  const run = method('runSyncScopeTreeBatch', globals);
  const invoke = (action, selected, localOnly = false) => run.call(host, 'C:/project', targets, localOnly, action, selected, [], stage => reports.push(stage), []);
  return { host, engine, confirmations, holdsWrites, localRemovals, reports, invoke };
}
const plain = value => value === false ? value : JSON.parse(JSON.stringify(value));
const fileEntry = (relative, ...locations) => ({ name: relative.split('/').pop(), path: relative, directory: false, locations });
const dirEntry = (relative, ...locations) => ({ name: relative.split('/').pop(), path: relative, directory: true, locations });

test('the production tree batch deletes a mixed local and remote selection with batched remote RPCs', async () => {
  const entries = [dirEntry('work_dirs/job', 'local', 'w1'), fileEntry('work_dirs/f1.csv', 'w1'), fileEntry('work_dirs/f2.csv', 'w1'), fileEntry('scratch/g1.csv', 'local')];
  const engine = makeEngine({ present: new Set(['work_dirs/job', 'work_dirs/f1.csv', 'work_dirs/f2.csv']), dirs: new Set(['work_dirs/job']) });
  const f = fixture({ entries, engine, picked: '本机及所有已连接 Worker' });
  const result = plain(await f.invoke('delete', ['work_dirs/job', 'work_dirs/f1.csv', 'work_dirs/f2.csv', 'scratch/g1.csv'], true));
  assert.deepEqual(result.errors, []);
  assert.deepEqual([...result.completed].sort(), ['scratch/g1.csv', 'work_dirs/f1.csv', 'work_dirs/f2.csv', 'work_dirs/job']);
  // One bounded preview per endpoint, never per file; the local-only file never reaches the backend.
  assert.equal(engine.countOf('.preview'), 1);
  assert.deepEqual(engine.calls.filter(call => call.method.endsWith('.preview'))[0].params.targets.map(row => row.relativePath).sort(), ['work_dirs/f1.csv', 'work_dirs/f2.csv', 'work_dirs/job']);
  assert.deepEqual(engine.calls.filter(call => call.method.endsWith('.preview'))[0].params.node.root, '/project');
  // Two exact confirmations then exactly one execute for the frozen batch; the batched query settles it.
  assert.deepEqual(engine.calls.filter(call => call.method.endsWith('.confirm')).map(call => call.params.phase), [1, 2]);
  assert.equal(engine.countOf('.execute'), 1);
  // Local copies go through the existing local remover once per item, without extra RPCs.
  assert.deepEqual(f.localRemovals.map(row => row.relative).sort(), ['scratch/g1.csv', 'work_dirs/job']);
  assert.equal(f.holdsWrites.length, 1, 'holds saved once for the whole batch');
  // The confirmation page received the frozen original-to-isolation mapping and the exact sentence.
  assert.equal(f.confirmations.length, 1);
  const shown = f.confirmations[0];
  assert.equal(shown.finalLabel, SENTENCE);
  assert.ok(shown.note.includes(SENTENCE));
  assert.ok(shown.paths.some(row => row.path === '/project/work_dirs/job' && row.isolation === '/project/' + isoName('work_dirs/job')));
  assert.ok(shown.paths.some(row => row.path === path.resolve('C:/project', 'work_dirs', 'job') && row.isolation === undefined), 'the local copy shows its own path without isolation');
  assert.equal(engine.peak.preview, 1, 'read-only previews stay serial');
});

test('a remote selection over the public cap travels two bounded frozen batches with two executes', async () => {
  const total = 5200;
  const entries = Array.from({ length: total }, (_, index) => fileEntry('work_dirs/f' + index, 'w1'));
  const present = new Set(entries.map(entry => entry.path));
  const engine = makeEngine({ present });
  const f = fixture({ entries, engine, picked: 'w1' });
  const result = plain(await f.invoke('delete', entries.map(entry => entry.path)));
  assert.deepEqual(result.errors, []);
  assert.equal(result.completed.length, total);
  assert.equal(engine.countOf('.preview'), 2);
  assert.deepEqual(engine.calls.filter(call => call.method.endsWith('.preview')).map(call => call.params.targets.length), [5000, 200]);
  assert.equal(engine.countOf('.confirm'), 4, 'two confirmations per frozen batch');
  assert.equal(engine.countOf('.execute'), 2, 'one execute per frozen batch, never per file');
});

test('cancelling the second confirmation executes nothing at all', async () => {
  const entries = [fileEntry('work_dirs/f1.csv', 'w1')];
  const engine = makeEngine({ present: new Set(['work_dirs/f1.csv']) });
  const f = fixture({ entries, engine, picked: 'w1', confirmed: false });
  const result = await f.invoke('delete', ['work_dirs/f1.csv']);
  assert.equal(result, false);
  assert.equal(engine.countOf('.confirm'), 0);
  assert.equal(engine.countOf('.execute'), 0);
  assert.equal(f.localRemovals.length, 0);
  assert.equal(f.holdsWrites.length, 0, 'cancelling never writes the pause holds');
});

test('a lost execute response settles through the batched query with exactly one execute', async () => {
  const entries = [fileEntry('work_dirs/a.csv', 'w1'), fileEntry('work_dirs/b.csv', 'w1')];
  const engine = makeEngine({ present: new Set(['work_dirs/a.csv', 'work_dirs/b.csv']), failExecuteOnce: true });
  const f = fixture({ entries, engine, picked: 'w1' });
  const result = plain(await f.invoke('delete', ['work_dirs/a.csv', 'work_dirs/b.csv']));
  assert.deepEqual(result.errors, []);
  assert.deepEqual([...result.completed].sort(), ['work_dirs/a.csv', 'work_dirs/b.csv']);
  assert.equal(engine.countOf('.execute'), 1, 'the lost response never replays execute');
});

test('isolation residue reports the path honestly and never re-executes', async () => {
  const entries = [dirEntry('work_dirs/job', 'w1'), fileEntry('work_dirs/f1.csv', 'w1')];
  const engine = makeEngine({ present: new Set(['work_dirs/job', 'work_dirs/f1.csv']), dirs: new Set(['work_dirs/job']), residue: new Set(['work_dirs/job']) });
  const f = fixture({ entries, engine, picked: 'w1' });
  const result = plain(await f.invoke('delete', ['work_dirs/job', 'work_dirs/f1.csv']));
  assert.deepEqual(result.completed, ['work_dirs/f1.csv']);
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /^work_dirs\/job：/);
  assert.match(result.errors[0], /隔离名残留|未核实/);
  assert.match(result.errors[0], /不会自动重发|该路径自动同步仍暂停/);
  assert.equal(engine.countOf('.execute'), 1);
});
