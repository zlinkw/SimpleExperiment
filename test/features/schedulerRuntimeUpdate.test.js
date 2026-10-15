const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('Agent update replaces the independent controller while preserving running and queued windows; new H20 jobs share six slots', async () => {
  const messages = await require('../_helpers/manualLaunchMessage')({ gpuMemoryRatioEnabled: true, gpuMemoryPerJobGb: 22,
    gpuMemoryReserveGb: 0, gpuMemoryTolerancePercent: 3, gpuMemoryMaxJobsPerGpu: 0 });
  assert.equal(messages[0].options.gpuMemoryPerJobGb, 22);
  assert.equal(messages[0].options.gpuMemoryRatioEnabled, true);
  const linux = p => '/mnt/' + p[0].toLowerCase() + p.slice(2).replace(/\\/g, '/');
  const fixture = path.resolve(__dirname, 'schedulerRuntimeUpdate.fixture.py');
  const runtime = path.resolve(__dirname, '../../dist/runtime/cluster_agent.py');
  const args = process.platform === 'win32'
    ? ['--distribution', process.env.SIMPLE_TEST_WSL_DISTRO || 'Ubuntu-Codex', '--exec', 'python3', linux(fixture), linux(runtime)]
    : [fixture, runtime];
  const result = spawnSync(process.platform === 'win32' ? 'wsl.exe' : 'python3', args,
    { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, preservedTasks: 2, sharedJobs: 6, queuedJobs: 1, idempotent: true });
});

test('Agent boot reconciles Scheduler before serving and deployment verifies its actual identity', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../../src/clusterAgentRuntime.legacy.ts'), 'utf8');
  const serve = source.slice(source.indexOf('def serve_http(args):'), source.indexOf('def add_state_args'));
  assert.match(serve, /task_update_scheduler_runtime\(root,/);
  assert.ok(serve.indexOf('task_update_scheduler_runtime') < serve.indexOf('server.serve_forever()'));
  assert.match(source, /"schedulerRuntime": task_scheduler_runtime_report\(root/);
  const host = fs.readFileSync(path.resolve(__dirname, '../../src/extension/legacy.ts'), 'utf8');
  assert.match(host, /SCHEDULER_RUNTIME_UNVERIFIED/);
});
