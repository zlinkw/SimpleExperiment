const { test, assert, path, spawnSync, run } = require("./formalJobPreflightFailure.support.cjs");

test('real inactivity, repeated phase heartbeats and decreasing counters reject before training', () => {
  for (const variant of ['stall', 'heartbeat', 'decreasing']) {
    const result = run(variant);
    assert.equal(result.receipt.neverStarted, true);
    assert.match(result.receipt.error || result.receipt.message, /无真实进展/);
    assert.ok(result.elapsedVirtualSeconds < 90);
  }
});
