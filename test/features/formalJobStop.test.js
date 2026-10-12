const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const Queue = require('../../dist/features/DistributedPlanQueue');

test('formal stop closes only original job panes, keeps failure files and serializes exact receipts into Host', async () => {
  const fixture = path.join(__dirname, 'formalJobStop.fixture.py');
  const mounted = fixture.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => '/mnt/' + drive.toLowerCase());
  const args = process.platform === 'win32' ? ['--distribution', process.env.SIMPLE_TEST_WSL_DISTRO || 'Ubuntu-Codex',
    '--exec', '/usr/bin/python3', '-B', mounted] : ['-B', fixture];
  const proc = spawnSync(process.platform === 'win32' ? 'wsl.exe' : 'python3', args,
    { cwd: path.join(__dirname, '../..'), encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout || String(proc.error));
  const report = JSON.parse(proc.stdout.trim());
  assert.equal(report.ok, true);
  assert.equal(report.reports.length, 4);
  const source = fs.readFileSync(path.join(__dirname, '../../dist/extension/legacy.js'), 'utf8');
  const start = source.indexOf('    async stopDistributedJobForClear(');
  const end = source.indexOf('    async stopAndClearPlanFromUi(', start);
  const context = vm.createContext({ DistributedPlanQueue: Queue, makeOpId: () => 'stop-host', workspaceRoot: () => 'D:/project' });
  vm.runInContext(`class Host { ${source.slice(start, end)} } this.Host = Host;`, context);
  for (const { task, request, result } of report.reports) {
    const job = { index: task.experimentIndex, case: task.case, seed: task.seed, attempt: 0, status: task.status,
      outputDir: task.outputDir, globalJobId: task.globalJobId, collectionResultCsv: task.collectionResultCsv,
      resultPathPolicy: 'declared', commandId: task.commandId, runKey: task.runKey, workerId: task.workerId, gpuId: task.gpuId };
    const plan = { id: task.workflowId, revision: task.planRevision, projectId: task.projectId, codeFingerprint: task.codeFingerprint,
      planFile: task.planFile, planJobCount: task.planJobCount, resultPathPolicy: 'declared', jobs: [job] };
    const host = new context.Host();
    host.refreshExactPaneStopCapability = async (_worker, formal) => { assert.equal(formal, true); return true; };
    host.withRemoteActionResource = async (_worker, _action, _request, action) => action();
    host.client = { getWorkerTasks: async () => ({ tasks: [task] }), postWorkerAction: async (_worker, _action, payload) => {
      for (const field of Object.keys(request).filter(key => !['action', 'commandId'].includes(key))) {
        assert.equal(payload[field], request[field], field);
      }
      assert.equal(Object.hasOwn(payload, 'attempt'), false);
      return result;
    } };
    assert.equal((await host.stopDistributedJobForClear(plan, job)).status, 'completed');
    const queue = { ...Queue.emptyDistributedQueue(), plans: [plan] };
    const cleared = Queue.removeConfirmedDistributedPlan(queue, plan.planFile,
      { projectId: plan.projectId, jobKeys: new Set([`${plan.id}\0${job.index}\0${job.attempt}`]), deferredIds: new Set() });
    assert.equal(cleared.plans.length, 0);
    const now = Date.now();
    const recovered = Queue.mergeDurableWorkerSnapshots(cleared, [{ workerId: task.workerId,
      capabilities: { durablePlanQueue: true, schemaVersion: 1 }, generatedAt: new Date(now).toISOString(),
      fetchedAt: new Date(now).toISOString(), tasks: [task] }], plan.projectId, now);
    assert.equal(recovered.plans.length, 0, 'confirmed original run stays cleared after refresh');
    for (const field of ['resultPathPolicy', 'globalJobId', 'collectionResultCsv', 'planRevision', 'commandId']) {
      assert.equal(Queue.stopIdentityMatchesJob(plan, job, { ...result.stoppedTasks[0], [field]: 'wrong' }), false, field);
    }
  }
});

test('fresh formal stop capability blocks an old Worker before sending a stop', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../dist/extension/legacy.js'), 'utf8');
  const start = source.indexOf('    async refreshExactPaneStopCapability(');
  const end = source.indexOf('    async stopAndClearPlanFromUi(', start);
  let endpoints = { 'stop-worker-task-exact-pane': true };
  const context = vm.createContext({ DistributedPlanQueue: Queue, makeOpId: () => 'stop-host', workspaceRoot: () => 'D:/project',
    XshellTunnelPortProbe_1: { probeWorkerTelemetryTunnel: async () => ({ status: 'ok', capabilities: { actionEndpoints: endpoints } }) } });
  vm.runInContext(`class Host { ${source.slice(start, end)} } this.Host = Host;`, context);
  const host = new context.Host();
  host.tunnelLaunchItems = () => [{ id: 'worker', role: 'worker', config: {} }];
  host.stampWorkerProbeGeneration = (_worker, probe) => probe;
  host.tunnelConfig = {};
  host.withRemoteActionResource = async () => { throw Error('must not send'); };
  const plan = { id: 'workflow', resultPathPolicy: 'declared' };
  const job = { workerId: 'worker', commandId: 'command', gpuId: '0' };
  await assert.rejects(host.stopDistributedJobForClear(plan, job), /stop-worker-task-formal-identity.*更新并重启/);
  endpoints = { ...endpoints, 'stop-worker-task-formal-identity': true };
  assert.equal(await host.refreshExactPaneStopCapability('worker', true), true);
});
