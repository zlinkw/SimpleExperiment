const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { acquireBuildLock } = require('../../scripts/build-process-lock');
const fixture = () => fs.mkdtempSync(path.join(os.tmpdir(), 'audit-build-lock-'));
test('same-root contention refuses; confirmed exit permits a later build without deletion', async () => {
  const root = fixture();
  const first = await acquireBuildLock(root, 'one');
  await assert.rejects(acquireBuildLock(root, 'two'), /EADDRINUSE/);
  assert.equal(first.release(true), true);
  await new Promise(resolve => setImmediate(resolve));
  const second = await acquireBuildLock(root, 'two');
  assert.equal(second.release(true), true);
});
test('unconfirmed child trees and legacy directory locks remain blocking', async () => {
  const root = fixture();
  const first = await acquireBuildLock(root, 'one');
  assert.equal(first.release(false), false);
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(acquireBuildLock(root, 'two'), /BUILD_LOCK_UNSETTLED/);
  const legacy = fixture();
  const dir = path.join(legacy, 'simple_cluster/locks/simple-experiment/test-workflow/batch.lock');
  fs.mkdirSync(dir, { recursive: true });
  await assert.rejects(acquireBuildLock(legacy, 'three'), /LEGACY_BUILD_LOCK/);
  assert.ok(fs.statSync(dir).isDirectory());
});
