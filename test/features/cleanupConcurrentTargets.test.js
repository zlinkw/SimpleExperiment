const test = require('node:test'), assert = require('node:assert/strict'), Module = require('node:module'), path = require('node:path'), fs = require('node:fs'), ts = require('typescript');
const root = path.resolve('fixture-root');
require('../_helpers/registerTsRequire');
const load = Module._load;
let PlanCleanupHost;
try {
  Module._load = function(name, ...rest) {
    if (name === 'vscode') return { workspace: { workspaceFolders: [{ uri: { fsPath: root } }] } };
    return load.call(this, name, ...rest);
  };
  ({ PlanCleanupHost } = require('../../src/extension/PlanCleanupHost.ts'));
} finally { Module._load = load; }

test('independent cleanup targets run concurrently and overlapping requests fail without a global lock', async () => {
  const host = new PlanCleanupHost({ distributedQueueTickPromise: new Promise(() => {}), context: { globalStorageUri: { fsPath: 'store' } },
    setupConfig: { workerTunnels: [] }, assertArtifactSyncPathsIdle() {} }, root);
  host.ensureOperationRecordsMigrated = async () => {};
  const node = { id: 'local', kind: 'local', root }, entered = [], resolvers = {}, signals = {};
  const started = Object.fromEntries(['a', 'b'].map(id => [id, new Promise(resolve => { signals[id] = resolve; })]));
  const paths = { a: 'work/a', b: 'work/b', overlap: 'work/a/nested' }, states = {};
  host.service = {
    registeredIsolationSource: async () => undefined,
    status: async id => ({ id, state: states[id] || 'ready', targets: {}, preview: { action: 'isolate', scope: { observationMode: 'managed_tmux' },
      rows: [{ node, relativePath: paths[id], destination: '', disposition: 'isolate' }] } }),
    execute: id => { entered.push(id); return new Promise((resolve, reject) => { resolvers[id] = { resolve, reject }; signals[id](); }); },
  };
  const first = host.execute('a');
  await started.a;
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  const tree = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  let method;
  function visit(node) { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === 'tickDistributedQueue') method = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(method);
  const code = ts.transpileModule('class Subject {' + method.getText(tree) + '}', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const tick = new Function('require', 'workspaceRoot', code + '; return Subject.prototype.tickDistributedQueue;')(
    () => ({ getUpdater: () => ({ blocked: false }) }), () => root);
  let tickEntered = false;
  await tick.call({ planCleanupHosts: new Map([[root, host]]), distributedQueueGeneration: 1,
    tickDistributedQueueCore: async () => { tickEntered = true; } });
  assert.equal(tickEntered, true);
  const second = host.execute('b');
  await started.b;
  assert.deepEqual(entered, ['a', 'b']);
  assert.throws(() => host.start('a'), /OPERATION_BUSY/);
  await assert.rejects(host.execute('a'), /OPERATION_BUSY/);
  await assert.rejects(host.execute('overlap'), /CLEANUP_TARGET_BUSY|路径正在处理/);
  assert.equal(host.conflictingPath(['work/a/child'], 'local'), 'local:work/a');
  assert.equal(host.conflictingPath(['work/other'], 'local'), undefined);
  resolvers.a.reject(Error('visible failure'));
  await assert.rejects(first, /visible failure/);
  assert.equal(host.conflictingPath(['work/a'], 'local'), 'local:work/a', 'unknown outcome keeps its exact path reserved');
  states.a = 'completed'; await host.status('a');
  assert.equal(host.conflictingPath(['work/a'], 'local'), undefined);
  resolvers.b.resolve({ id: 'b', state: 'completed' });
  assert.equal((await second).state, 'completed');
  assert.equal(host.conflictingPath(['work/b'], 'local'), undefined);
});
