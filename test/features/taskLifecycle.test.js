const test = require('node:test'), assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { taskLifecycle, observationMatches } = require('../../src/features/TaskLifecycle.ts');
const base = { lifecycleProtocol:2, commandId:'c', projectId:'p', workerId:'w', observedAt:new Date().toISOString() };
test('pull evidence advances without an acceptance event; ended shell is not success', () => {
  assert.equal(taskLifecycle({...base, tmux:{dead:false, phase:'queued'}}).status,'queued');
  assert.equal(taskLifecycle({...base, tmux:{dead:false, phase:'running'}}).status,'running');
  assert.equal(taskLifecycle({...base, tmux:{dead:true,exitCode:0}}).execution,'exited');
  assert.equal(taskLifecycle({...base, tmux:{dead:true,exitCode:0}}).status,'unknown');
  assert.equal(taskLifecycle({...base, tmux:{dead:true,exitCode:3}}).status,'failed');
});
test('closed window recovers from result; failures and foreign results are not hidden', () => {
  const result={runId:'c',status:'completed',present:true,verified:true};
  assert.equal(taskLifecycle({...base,result}).status,'completed');
  assert.equal(taskLifecycle({...base,result,tmux:{dead:true,exitCode:1}}).status,'failed');
  assert.equal(taskLifecycle({...base,result:{...result,runId:'old'}}).result,'conflict');
  assert.equal(taskLifecycle({...base,result:{...result,present:false}}).status,'unknown');
  assert.equal(taskLifecycle({...base,queryError:'offline',result}).execution,'unknown');
  assert.equal(taskLifecycle(base).status,'unknown');
});
test('live control matching ignores old revision but never another project or command', () => {
  assert.equal(observationMatches(base,base),true);
  assert.equal(observationMatches(base,{...base,projectId:'other'}),false);
  assert.equal(observationMatches(base,{...base,commandId:'other'}),false);
});
test('the real queue merge consumes pulled evidence without a durable receipt or a matching old revision', () => {
  const Q=require('../../src/features/DistributedPlanQueue.ts');
  const queue={schemaVersion:1,plans:[{id:'wf',projectId:'p',revision:'current',jobs:[{index:0,workerId:'w',commandId:'c',status:'dispatching'}]}]};
  const snapshot={workerId:'w',fetchedAt:base.observedAt,generatedAt:base.observedAt,capabilities:{taskLifecycle:2},
    tasks:[{commandId:'c',projectId:'p',planRevision:'old',observation:{...base,tmux:{dead:false,phase:'running'}}}]};
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'running');
  snapshot.tasks[0].observation.queryError='query failed';
  assert.equal(Q.mergeDurableWorkerSnapshots(queue,[snapshot],'p').plans[0].jobs[0].status,'unknown');
  assert.equal(queue.plans[0].jobs[0].status,'dispatching');
});
