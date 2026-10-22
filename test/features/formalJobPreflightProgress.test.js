const { test, assert, path, spawnSync, run } = require("./formalJobPreflightProgress.support.cjs");

test('real Worker startup accepts asset progress beyond the previous fixed ten-second budget', () => {
  const result = run('grow');
  assert.equal(result.receipt.durableAccepted, true, JSON.stringify(result));
  assert.ok(result.elapsedVirtualSeconds > 10);
  assert.ok(result.progressCount > 1);
  assert.equal(result.executionStarted, false);
});
