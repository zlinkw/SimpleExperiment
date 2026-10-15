const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
require('../_helpers/registerTsRequire');
const { WorkerPreparation } = require('../../src/features/WorkerPreparation.ts');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
function method(name, globals = {}) {
  const tree = ts.createSourceFile('legacy.ts', source, ts.ScriptTarget.Latest, true);
  let found; const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) found = node; else ts.forEachChild(node, visit); }; visit(tree);
  assert.ok(found, name);
  const code = ts.transpileModule('class Host {' + found.getText(tree) + '} globalThis.Host = Host;', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { ...globals, setTimeout, clearTimeout, AbortSignal, console }; vm.runInNewContext(code, sandbox); return sandbox.Host.prototype[name];
}
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
test('actual submission enqueues after first prepared server, while a slow server keeps preparing', async () => {
  const slow = deferred(), first = deferred(), enqueued = deferred(), body = {}, stages = [], root = 'fixture'; let tick = 0, preparations = 0, submissions = 0;
  const globals = { WorkerPreparation, workspaceRoot: () => root, WorkflowBinding: { bindWorkflowWorkspace: () => ({}), assertWorkflowWorkspace() {} },
    PlanRunHost: class { async save() {} }, stringField: () => '', errorMessage: e => e.message,
    DistributedPlanQueue: { distributedSubmissionProgress: () => ({ status: 'succeeded' }) } };
  const host = { localOperations: { op: {} }, distributedSubmissionEpochs: new Map(), planSubmissionOperationId: () => 'op', submissionStillCurrent: () => true,
    distributedCodeVersionHold: async () => undefined, waitForPlanSubmission: async (_m, work) => work(), recordPlanSubmissionTiming() {},
    localDistributedCodeFingerprint: async () => 'fp', enabledWorkerConfigs: () => [{ id: 'fast' }, { id: 'slow' }],
    ensureCodeReadyForRun: async (_c, _b, _report, ready) => {
      preparations++;
      host.lastCodeSyncState = { fingerprint: 'fp', workerVersions: { fast: { fingerprint: 'fp' } } }; ready('fast'); first.resolve();
      await slow.promise; host.lastCodeSyncState.workerVersions.slow = { fingerprint: 'fp' }; ready('slow');
    }, stampWorkerPoolManualTarget: (b, id) => b.schedulerOwnerWorkerId = id,
    planValidationCacheKey: () => 'check', planSchedulerWorkerId: b => b.schedulerOwnerWorkerId,
    runPlanPreflight: async () => ({ validation: { jobs: [] } }), assertPlanSubmissionWorkers: async () => {},
    confirmDistributedPlanExistingOutputs: async () => {}, assertExecutionCondaEnvReady() {}, workerActionTargets: () => [],
    enqueueDistributedPlan: async b => { b.submissionWorkflowId = 'run' + (++submissions); enqueued.resolve(); return { enqueued: true }; },
    tickDistributedQueue: async () => { tick++; }, reportPlanStage: (_m, text) => stages.push(text),
    finishPlanSubmissionProgress: (_m, state) => assert.equal(state, 'succeeded'), recordActionError() {} };
  const work = method('finishDistributedPlanSubmission', globals).call(host, 'runPlan', {}, {}, body);
  await first.promise; await enqueued.promise;
  assert.equal(host.workerPreparation.preparation.settled, false); assert.equal(body.schedulerOwnerWorkerId, 'fast');
  await work; assert.equal(body.workerPreparationPendingLocal, true);
  await method('finishDistributedPlanSubmission', globals).call(host, 'runPlan', {}, {}, {});
  assert.equal(preparations, 1); assert.equal(submissions, 2);
  slow.resolve(); await body.awaitWorkerPreparationLocal(); assert.ok(tick > 0); assert.equal(host.workerPreparation, undefined);
});
test('later failure preserves ready servers; destructive replacement still waits for every server', async () => {
  const slow = deferred(); let calls = 0;
  const p = new WorkerPreparation(async ready => { ready('fast'); ready('fast'); await slow.promise; throw Error('slow unavailable'); }, () => calls++);
  assert.equal(await p.first(), 'fast'); assert.equal(p.settled, false); assert.equal(calls, 1);
  const all = p.all(); slow.resolve(); await assert.rejects(all, /slow unavailable/); assert.deepEqual([...p.ready], ['fast']);
  const failed = new WorkerPreparation(async () => { throw Error('none ready'); }); await assert.rejects(failed.first(), /none ready/);
});
test('401 during activation rereads discovery once, before any RPC; persistent failure is bounded', async () => {
  let reads = 0, gets = 0; const auth = [];
  const globals = { path, process: { env: { APPDATA: 'fixture' } }, os: { homedir: () => '' }, URL,
    fs: { readFile: async () => JSON.stringify({ baseUrl: 'http://127.0.0.1:3456', token: String(++reads) }) },
    fetch: async (_url, options) => { auth.push(options.headers.Authorization); return ++gets === 1 ? { status: 401, ok: false }
      : { ok: true, json: async () => ({ methods: ['files.cleanup.inspect'] }) }; } };
  const capability = method('simpleSftpCapability', globals); await capability.call({}, 'files.cleanup.inspect');
  assert.deepEqual(auth, ['Bearer 1', 'Bearer 2']); assert.equal(reads, 2);
  globals.fetch = async () => ({ status: 401, ok: false }); reads = 0;
  await assert.rejects(method('simpleSftpCapability', globals).call({}, 'files.cleanup.inspect'), /HTTP 401/); assert.equal(reads, 2);
});

test('runtime reads overlap synchronization but readiness waits for both; workspace changes never release a target', async () => {
  const version = deferred(), syncStarted = deferred(); const ready = [];
  const host = { prepareSftpTargets: async () => {}, projectContextIsCurrent: () => true,
    assertPlanTopologyReady: () => ({mode:'worker_pool'}), planSchedulerWorkerId: () => 'fast',
    workerCodeSyncTargets: () => [{id:'fast'}, {id:'slow'}],
    ensureRemoteAgentVersionConsistent: () => version.promise,
    syncCodeTargets: async (targets, scope, options) => {
      assert.equal(scope, 'run'); assert.equal(targets.length, 2); assert.equal(options.hashCompare, true);
      syncStarted.resolve(); await options.onTargetReady('fast'); return targets;
    } };
  const run = method('ensureCodeReadyForRun', {uniqueStrings: rows => [...new Set(rows)], UiCommandCancelled: Error});
  const work = run.call(host, {root:'fixture'}, [], () => {}, id => ready.push(id));
  await syncStarted.promise; assert.deepEqual(ready, []);
  version.resolve(); await work; assert.deepEqual(ready, ['fast']);
  host.projectContextIsCurrent = () => false;
  await assert.rejects(run.call(host, {root:'changed'}, [], () => {}, id => ready.push(id)), /工作区已切换/);
  assert.deepEqual(ready, ['fast']);
});

test('both cleanup paths forward the configured prefix without changing target authorization or caller input', async () => {
  const calls=[];
  const run=method('simpleSftpApiCall',{assertRetryRequestCurrent(){},
    vscode:{workspace:{getConfiguration:()=>({get:()=> 'global'})}},
    AgentTmuxPolicy_1:require('../../src/tunnel/AgentTmuxPolicy.ts'),
    callSftpWithProgress:async(name,params,capability)=>{await capability(name);calls.push({name,params});return {ok:true};}});
  const host={setupConfig:{sessionPrefix:'Research'},simpleSftpCapability:async()=>({})};
  const input={token:'original',index:0,confirm:false};
  for(const name of ['files.cleanup.preview','files.cleanup.execute','files.cleanup.check'])await run.call(host,name,input);
  assert.equal(calls[0].params.tmuxSessionPrefix,'research'); assert.equal(calls[1].params.tmuxSessionPrefix,'research');
  assert.equal(calls[2].params,input); assert.equal(input.tmuxSessionPrefix,undefined);
  assert.equal(calls[1].params.confirm,false);assert.equal(calls[1].params.token,'original');
});
