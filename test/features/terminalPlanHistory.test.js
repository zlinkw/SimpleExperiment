const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const Queue = require('../../dist/features/DistributedPlanQueue.js');
const Planner = require('../../dist/features/PlanStopClear.js');
const source = fs.readFileSync(path.join(__dirname, '../../src/extension/legacy.ts'), 'utf8');
const tree = ts.createSourceFile('provider.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'RealtimeTunnelPanelProvider');
const methods = ['stopAndClearPlanFromUi', 'clearEndedPlanHistoryFromUi'];
const code = ts.transpileModule(`class Host { ${cls.members.filter(n => methods.includes(n.name?.getText(tree))).map(n => n.getText(tree)).join('\n')} }; Host;`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

function fixture(kind = 'completed') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'simple-history-only-'));
  const artifact = path.join(root, 'checkpoint.fixture');
  fs.writeFileSync(artifact, Buffer.from('preserve original checkpoint and metrics bytes'));
  const selected = kind === 'completed' ? 'experiments/plans/comparison/concatenation.yaml'
    : 'experiments/plans/quality_composition/all_low_quality_min_integer_gap/late_fusion_pad.yaml';
  let saved = Queue.emptyDistributedQueue();
  if (kind === 'completed') {
    for (const workflow of ['distributed-plan-old-1', 'distributed-plan-old-2']) {
      saved = Queue.enqueuePlan(saved, { planFile: selected, revision: 'old-revision', codeFingerprint: 'old-code',
        projectId: Queue.canonicalProjectId(root), jobs: [42, 43, 44].map((seed, index) => ({ index, case: 'bus', seed,
          outputDir: `work_dirs/concat/job-${index}` })) }, workflow);
      const plan = saved.plans.at(-1);
      delete plan.resultPathPolicy;
      for (const job of plan.jobs) Object.assign(job, { status: 'completed', trustedTerminalStatus: 'completed', attempt: 1,
        outputDir: job.outputDir + '/attempts/' + workflow,
        workerId: 'nwpu2', commandId: workflow + '-' + job.index, runKey: workflow + '-' + job.index, finishedAt: '2026-09-26T00:00:00Z' });
    }
  }
  saved = Queue.enqueuePlan(saved, { planFile: 'experiments/plans/comparison_tuning/concatenation.yaml',
    revision: 'keep-revision', codeFingerprint: 'keep-code', jobs: [{ index: 0, case: 'keep', seed: 42, outputDir: 'work_dirs/keep' }] }, 'unrelated');
  let operations = kind === 'completed' ? {} : {
    'validate-plan-failed': { operationId: 'validate-plan-failed', type: 'validate-plan', status: 'failed',
      payload: { planFile: selected, action: 'validate-plan', workerId: 'nwpu2' },
      message: 'RESULT_PATH_INCOMPATIBLE: UNVERIFIED operation_manifest' },
  };
  operations.foreign = { operationId: 'foreign', type: 'validate-plan', status: 'failed',
    planFile: 'experiments/plans/other/late_fusion_pad.yaml' };
  const state = new Map(), notices = [], calls = [];
  const sandbox = { ...Planner, DistributedPlanQueue: Queue, PlanStopClear_1: Planner,
    workspaceRoot: () => root, stringField: (row, key) => String(row?.[key] || ''),
    operationTerminal: row => ['failed', 'completed', 'cancelled'].includes(String(row?.status || row?.payload?.status)),
    errorMessage: error => error.message, uniqueStrings: values => [...new Set(values)],
    normalizePlanSelectionKey: value => String(value).replaceAll('\\', '/'),
    keys: { executionHistoryHiddenOperationIds: 'hidden', executionHistoryCutoffs: 'cutoffs' },
    vscode: { window: { showWarningMessage: async (text, _options, ...actions) => {
      notices.push(text); await host.onConfirm?.(notices.length);
      return host.choices?.length ? host.choices.shift() : actions[0];
    }, showInformationMessage() {} } },
  };
  const Host = vm.runInNewContext(code, sandbox);
  const host = new Host();
  Object.assign(host, {
    projectContextGeneration: 1, distributedQueueGeneration: 0, distributedPlanStopEpoch: 0,
    distributedLaunchInFlight: new Set(), localOperations: operations, planStopClearByFile: {},
    context: { workspaceState: { get: (key, fallback) => state.get(key) ?? fallback,
      update: async (key, value) => { state.set(key, value); } } },
    loadDistributedQueue: async () => structuredClone(saved),
    saveDistributedQueue: async (_root, value) => { saved = structuredClone(value); },
    buildPlanRuntimeEvidenceState: () => ({ operations }), isRealtimeMode: () => true,
    recoverPlanOperationsForStopClear: async () => { calls.push('recover'); return { recovered: [], conflicts: [], failures: [], realtime: true, workersChecked: 1 }; },
    runOperationWorkerId: row => row.workerId || 'nwpu2',
    client: { getWorkerTasks: async worker => { calls.push('read:' + worker); return { tasks: host.remoteTasks || [] }; },
      killTmuxWindow: async () => assert.fail('history-only cleanup killed tmux') },
    stopExperimentRouted: async () => assert.fail('history-only cleanup stopped a Scheduler'),
    stopDistributedJobForClear: async () => assert.fail('history-only cleanup stopped a job'),
    revokePlanSubmissions() {}, planStopClearWaitMs: () => 1000,
    boundedPromise: async work => work(), markLocalOperationsDirty() {}, postState() {},
    retireLocalOperationState: async ids => { calls.push('retire:' + ids.join(',')); for (const id of ids) delete operations[id]; },
    publishPlanStopClear(file, input) { this.planStopClearByFile[file] = Planner.planStopClearFeedback({ planFile: file, ...input }); },
    finishPlanStopClear(file, input) { this.publishPlanStopClear(file, input); return Planner.planStopClearUiResult(this.planStopClearByFile[file]); },
  });
  return { host, selected, state, notices, calls, artifact, queue: () => saved, operations,
    run: () => host.stopAndClearPlanFromUi({ planFile: selected, clearMode:'history' }) };
}

test('expired terminal Worker snapshots permit explicit local history removal without stopping windows or touching artifacts', async () => {
  const f = fixture();
  const result = await f.run();
  assert.equal(result.status, 'completed', result.message);
  assert.equal(f.queue().plans.length, 1);
  assert.equal(f.queue().plans[0].id, 'unrelated');
  assert.equal(f.queue().clearedJobs.length, 6);
  assert.ok(f.queue().clearedJobs.every(row => row.clearMode === 'terminal_history' && row.remoteClosureConfirmed === false));
  assert.equal(result.planStopClear.closedTmux, 0);
  assert.match(f.notices.join('\n'), /本机.*历史|已结束记录/);
  assert.match(result.message, /未.*关闭|保留.*窗口/);
  assert.equal(fs.readFileSync(f.artifact, 'utf8'), 'preserve original checkpoint and metrics bytes');
});

test('failed validation with no generated jobs clears by exact full PLAN path without Worker recovery or a stop command', async () => {
  const f = fixture('validation');
  const result = await f.run();
  assert.equal(result.status, 'completed', result.message);
  assert.deepEqual(f.calls, ['retire:validate-plan-failed']);
  assert.ok(f.state.get('hidden').includes('validate-plan-failed'));
  assert.ok(!f.state.get('hidden').includes('foreign'));
  assert.equal(f.operations['validate-plan-failed'], undefined);
  assert.equal(f.operations.foreign.status, 'failed');
  assert.equal(f.queue().plans[0].id, 'unrelated');
});

test('both cancellations, a project switch and in-flight startup keep all records', async () => {
  for (const mode of ['first', 'second', 'project', 'inflight']) {
    const f = fixture();
    const before = JSON.stringify(f.queue());
    if (mode === 'first') f.host.choices = [null];
    if (mode === 'second') f.host.choices = ['继续清除本机历史', null];
    if (mode === 'project') f.host.onConfirm = () => { f.host.projectContextGeneration += 1; };
    if (mode === 'inflight') f.host.distributedLaunchInFlight.add(Queue.distributedJobControlKey(f.queue().plans[0], f.queue().plans[0].jobs[0]));
    const result = await f.run();
    assert.notEqual(result.status, 'completed', mode);
    assert.equal(JSON.stringify(f.queue()), before, mode);
    assert.equal(f.state.has('hidden'), false);
  }
});

test('status, command identity or new same-path workflow changing after confirmation invalidate the frozen selection', async () => {
  for (const mode of ['status', 'command', 'new-workflow']) {
    const f = fixture();
    let changed;
    f.host.onConfirm = number => {
      if (number !== 2) return;
      const q = f.queue();
      if (mode === 'status') q.plans[0].jobs[0].status = 'running';
      if (mode === 'command') q.plans[0].jobs[0].commandId = 'another-original-command';
      if (mode === 'new-workflow') q.plans.push({ ...structuredClone(q.plans[0]), id: 'new-workflow' });
      changed = JSON.stringify(q);
    };
    const result = await f.run();
    assert.equal(result.status, 'failed', mode);
    assert.equal(result.planStopClear.phase, 'history-changed', mode);
    assert.equal(JSON.stringify(f.queue()), changed, mode);
    assert.equal(f.state.has('hidden'), false);
  }
});

test('positive live activity blocks hiding; offline Workers allow only explicitly local history removal', async () => {
  const active = fixture();
  const original = JSON.stringify(active.queue());
  active.host.remoteTasks = [{ commandId: active.queue().plans[0].jobs[0].commandId, status: 'running' }];
  const blocked = await active.run();
  assert.equal(blocked.planStopClear.phase, 'history-active');
  assert.equal(JSON.stringify(active.queue()), original);
  const offline = fixture();
  offline.host.client.getWorkerTasks = async () => { throw new Error('offline'); };
  const done = await offline.run();
  assert.equal(done.status, 'completed');
  assert.match(done.message, /状态未核实/);
  assert.ok(offline.queue().clearedJobs.every(row => row.remoteClosureConfirmed === false));
});

test('clear markers suppress late terminal history but never suppress a fresh active receipt or its later completion', async () => {
  const f = fixture();
  await f.run();
  const q = f.queue();
  const before = JSON.stringify(q);
  const entry = q.clearedJobs[0];
  const task = { ...entry, status: 'completed', durableAccepted: true, enqueuedAt: new Date().toISOString(),
    planJobCount: 3, fullPlanJobCount: 3, mode: 'train_test', executionMode: 'train_test' };
  const snapshot = status => ({ workerId: entry.workerId, generatedAt: new Date().toISOString(), fetchedAt: new Date().toISOString(),
    capabilities: { durablePlanQueue: true, schemaVersion: 1 }, tasks: [{ ...task, status }] });
  const hidden = Queue.mergeDurableWorkerSnapshots(q, [snapshot('completed')], entry.projectId);
  assert.equal(hidden.plans.some(row => row.id === entry.workflowId), false);
  const active = Queue.mergeDurableWorkerSnapshots(q, [snapshot('running')], entry.projectId);
  assert.equal(active.plans.find(row => row.id === entry.workflowId).jobs[0].status, 'running');
  assert.ok(active.clearedJobs.find(row => row.commandId === entry.commandId).activeReceiptObservedAt);
  const completed = Queue.mergeDurableWorkerSnapshots(active, [snapshot('completed')], entry.projectId);
  assert.equal(completed.plans.find(row => row.id === entry.workflowId).jobs[0].status, 'completed');
  assert.equal(JSON.stringify(q), before, 'recovery mutated original history audit');
});

test('active validation and unknown/active jobs cannot be classified as terminal history', () => {
  for (const status of ['running', 'unknown', 'queued', 'dispatching']) {
    assert.equal(Planner.terminalPlanHistorySelection({ check: { type: 'validate-plan', operationId: 'check',
      status, planFile: 'plans/a.yaml' } }, [], 'plans/a.yaml', row => row.status === 'failed'), undefined);
    assert.equal(Planner.terminalPlanHistorySelection({}, [{ kind: 'job', planId: 'p', jobKey: 'k',
      status, active: true }], 'plans/a.yaml', row => row.status === 'failed'), undefined);
  }
});
