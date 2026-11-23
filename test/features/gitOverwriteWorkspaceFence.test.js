const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const read = file => fs.readFileSync(path.join(__dirname, '../../src', file), 'utf8');
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

test('review stops before confirmation if the project changes while reading status', async () => {
  let receive; const calls = [], root = '/project-a', messages = [];
  const vscode = { ViewColumn: { Active: 1 }, workspace: { workspaceFolders: [{ uri: { fsPath: root } }] }, window: { createWebviewPanel: () => ({
    webview: { onDidReceiveMessage: fn => { receive = fn; return { dispose() {} }; }, postMessage: async value => messages.push(value) }, onDidDispose() {} }) } };
  const preview = { root, branch: 'main', upstream: 'remote', target: 'sha', writes: [], deletes: [], indexChanges: [], cleanup: { token: 'token', digest: 'digest' } };
  const module = { exports: {} };
  vm.runInNewContext(compile(read('extension/GitOverwriteReview.ts')), { module, exports: module.exports, require(name) {
    if (name === 'vscode') return vscode;
    if (name === '../project/GitOverwrite') return { previewGitOverwrite: async () => preview, assertGitOverwriteCurrent: async () => {}, executeGitOverwrite: async () => calls.push('execute') };
    if (name === '../core/UiCommandCancelled') return { UiCommandCancelled: class extends Error {} };
    return require(name);
  } });
  const pending = module.exports.reviewGitOverwrite(root, async method => { calls.push(method); vscode.workspace.workspaceFolders[0].uri.fsPath = '/project-b';
    return { token: 'token', digest: 'digest', confirmations: 0, targets: [] }; });
  await new Promise(setImmediate); await receive({ type: 'confirm', phase: 1 });
  await assert.rejects(pending, /WORKSPACE_CHANGED/);
  assert.deepEqual(calls, ['files.cleanup.status']); assert.equal(messages.at(-1).type, 'error');
});

test('workspace change stops later Git or deletion effects at the next boundary', async () => {
  const text = read('project/GitOverwrite.ts'), start = text.indexOf('export async function executeGitOverwrite(');
  assert.ok(start >= 0); const source = text.slice(start).replace('export async function', 'async function');
  const calls = []; let current = true;
  const box = { assertGitOverwriteCurrent: async () => {}, git: async (_root, args) => { calls.push(args[0]); current = false; },
    fs: { async lstat() { throw Error('unexpected'); } }, path, runGitBinary: async () => ({ code: 0 }), Error };
  vm.createContext(box); vm.runInContext(compile(source + '\nthis.execute=executeGitOverwrite;'), box);
  const check = () => { if (!current) throw Error('WORKSPACE_CHANGED'); };
  await assert.rejects(box.execute({ root: '/a', target: 'sha', writes: ['x'], deletes: [], branch: 'main', head: 'old' }, async () => {}, undefined, check), /WORKSPACE_CHANGED/);
  assert.deepEqual(calls, ['read-tree']);
  current = true; calls.length = 0;
  const preview = { root: '/a', target: 'sha', writes: [], deletes: ['x'], branch: 'main', head: 'old', cleanup: { token: 't', digest: 'd' } };
  await assert.rejects(box.execute(preview, async method => { calls.push(method); current = false; return { token: 't', digest: 'd', confirmations: 2 }; }, undefined, check), /WORKSPACE_CHANGED/);
  assert.deepEqual(calls, ['files.cleanup.status']);
});

test('preview checks workspace before fetch after repository discovery', async () => {
  const module = { exports: {} }, fakeFs = { realpath: async value => value };
  vm.runInNewContext(compile(read('project/GitOverwrite.ts')), { module, exports: module.exports, process, Buffer, require(name) {
    if (name === 'node:fs/promises') return fakeFs;
    if (name === './BranchHeadBinding') return { runGitBinary: async () => { throw Error('unexpected'); }, parseLsTreeZ: () => new Map() };
    return require(name);
  } });
  let current = true, switchOnDiscovery = true, cleanups = 0; const calls = [];
  const run = async args => { calls.push(args[0]); if (args[0] === 'rev-parse' && args[1] === '--show-toplevel') {
    if (switchOnDiscovery) current = false; return { code: 0, stdout: '/a', stderr: '' }; }
    return { code: 0, stdout: '', stderr: '' }; };
  const check = () => { if (!current) throw Error('WORKSPACE_CHANGED'); };
  await assert.rejects(module.exports.previewGitOverwrite('/a', async () => { cleanups++; }, run, check), /WORKSPACE_CHANGED/);
  assert.deepEqual(calls, ['rev-parse']); assert.equal(cleanups, 0);
  current = true; switchOnDiscovery = false; calls.length = 0;
  await module.exports.previewGitOverwrite('/a', async () => { cleanups++; }, run, check);
  assert.equal(calls.filter(command => command === 'fetch').length, 1); assert.equal(cleanups, 0);
});
