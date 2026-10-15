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

test('rerun selection uses pulled lifecycle evidence rather than cached Worker status or a copied complete result', () => {
  const text = fs.readFileSync(path.join(__dirname, '../../src/extension/PlanRunHost.ts'), 'utf8');
  const start = text.indexOf('    const completed = new Set<number>();'), end = text.indexOf('    const nodes =', start);
  const ts=require('typescript'), lifecycle=require('../../src/features/TaskLifecycle.ts');
  const select=vm.runInNewContext(ts.transpileModule('(function(body,jobs){'+text.slice(start,end)+';return [...completed];})',
    {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,lifecycle);
  const job={index:0,case:'a',seed:42,output_dir:'work/a',result_csv:'tmp/a.csv'};
  const observation={lifecycleProtocol:2,commandId:'c',projectId:'p',workerId:'w',tmux:{dead:true,exitCode:null},
    result:{runId:'c',status:'completed',present:true,verified:true}};
  const task={commandId:'c',projectId:'p',outputDir:job.output_dir,collectionResultCsv:job.result_csv,case:'a',seed:42,status:'failed',observation};
  const snapshot={workerId:'w',tasks:[task],declaredResults:[]};
  const run=()=>Array.from(select({workerSubmissionSnapshots:[snapshot]},[job]));
  assert.deepEqual(run(),[0]);
  snapshot.declaredResults=[{...job,outputDir:job.output_dir,collectionResultCsv:job.result_csv,runId:'c',completed:true}];
  observation.tmux.exitCode=7;assert.deepEqual(run(),[]);
  observation.tmux.dead=false;observation.tmux.exitCode=null;assert.deepEqual(run(),[]);
  observation.tmux.dead=true;observation.queryError='offline';assert.deepEqual(run(),[]);
  delete observation.queryError;delete observation.tmux;assert.deepEqual(run(),[0]);
  snapshot.declaredResults=[];observation.result.runId='old';task.status='completed';assert.deepEqual(run(),[]);
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
