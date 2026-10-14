const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
require('../_helpers/registerTsRequire');
const {replacementLifecycleJob} = require('../../src/features/PlanOutputReplacement.ts');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
test('normal Windows run delegates to the same exact-target confirmation service as explicit retry and manual placement', async () => {
  const ts=require('typescript'), ast=ts.createSourceFile('legacy.ts',source,ts.ScriptTarget.Latest,true);let member;
  function visit(n){if(ts.isMethodDeclaration(n)&&n.name.getText(ast)==='confirmDeclaredPlanOutputs')member=n;ts.forEachChild(n,visit);}visit(ast);
  const calls=[],root='fixture';class PlanRunHost {constructor(h,r){assert.equal(r,root);} async replace(...args){calls.push(args);return 'continued';}}
  const method=vm.runInNewContext(ts.transpileModule('class Host {'+member.getText(ast)+'};Host.prototype.confirmDeclaredPlanOutputs',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{PlanRunHost,workspaceRoot:()=>root});
  const plan={},body={},validation={jobs:[]};assert.equal(await method.call({},plan,body,validation),'continued');assert.deepEqual(calls,[[plan,body,validation]]);
});
test('replacement fence persists before deletion and prevents re-mirroring after partial failure', async () => {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/PlanCleanupHost.ts'), 'utf8');
  const method = text.slice(text.indexOf('  async execute(id: string)'), text.indexOf('  open(file: string'));
  const ts = require('typescript');
  const compiled = ts.transpileModule('class Host {' + method + '}; Host;', {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const Host = vm.runInNewContext(compiled, { replacementLifecycleJob, cleanupError: code => { throw Error(code); } });
  const queue = { plans: [{ id: 'run', jobs: [{ index: 0, commandId: 'c', status: 'completed' }, { index: 1, commandId: 'other', status: 'completed' }] }] };
  let saved;
  const instance = new Host(); instance.root = 'fixture'; instance.drainReconnects = async () => {};
  instance.host = { loadDistributedQueue: async () => structuredClone(queue), saveDistributedQueue: async (_, data) => { saved = structuredClone(data); },
    withHostOperationLease: async (_, __, work) => work() };
  instance.service = { status: async () => ({ preview: { scope: { job: { purpose: 'replace_outputs', workflowId: 'run', index: 0, commandId: 'c' }, nodes: [{ id: 'w' }] } } }),
    history: async () => [], preflightConfirmed: async () => {}, execute: async () => { assert.ok(saved.plans[0].jobs[0].outputRetiredAt); throw Error('NETWORK_DISCONNECT'); } };
  await assert.rejects(instance.execute('op'), /NETWORK_DISCONNECT/);
  assert.equal(saved.plans[0].jobs[0].cleanup.operationId, 'op'); assert.equal(saved.plans[0].jobs[0].cleanup.state, 'partial');
  assert.deepEqual(saved.plans[0].jobs[1], queue.plans[0].jobs[1]); assert.equal(instance.executing, false);
});
