const test = require('node:test');
const assert = require('node:assert/strict');
require('../_helpers/registerTsRequire');
const { ResultCollectionHost } = require('../../src/extension/ResultCollectionHost.ts');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture() {
  const host = { client: {}, captureProjectContext: () => ({ root: '/project', generation: 1 }),
    projectContextIsCurrent: context => context.root === '/project' && context.generation === 1,
    effectiveTrafficPolicy: () => ({ displayAutoRefresh: true }) };
  const service = new ResultCollectionHost(host), calls = [];
  service.collect = async () => { const item = deferred(); calls.push(item); return item.promise; };
  return { service, calls };
}

test('same project can resume before the cancelled automatic subscriber settles', async () => {
  const f = fixture(), first = f.service.refreshAutomatic();
  f.service.suspendAutomatic();
  const resumed = f.service.refreshAutomatic();
  assert.notEqual(resumed, first); assert.equal(f.calls.length, 1);
  assert.equal(await first, undefined);
  const report = { current: true, tag: 'resumed' }; f.calls[0].resolve(report);
  assert.equal(await resumed, report); assert.equal(f.calls.length, 1);
});

test('resuming automatic refresh keeps a still-active manual subscriber', async () => {
  const f = fixture(), manual = f.service.update(), first = f.service.refreshAutomatic();
  f.service.suspendAutomatic(); const resumed = f.service.refreshAutomatic();
  assert.notEqual(resumed, first); assert.equal(await first, undefined); assert.equal(f.calls.length, 1);
  const report = { current: true, tag: 'shared' }; f.calls[0].resolve(report);
  assert.equal(await manual, report); assert.equal(await resumed, report); assert.equal(f.calls.length, 1);
});

test('after the last subscriber cancels a new automatic read waits for old settlement', async () => {
  const f = fixture(), first = f.service.refreshAutomatic(); f.service.suspendAutomatic();
  assert.equal(await first, undefined);
  const resumed = f.service.refreshAutomatic(); assert.equal(f.calls.length, 1);
  f.calls[0].resolve({ current: false, tag: 'old' }); await new Promise(setImmediate);
  assert.equal(f.calls.length, 2);
  const report = { current: true, tag: 'new' }; f.calls[1].resolve(report);
  assert.equal(await resumed, report); assert.equal(f.calls.length, 2);
});
