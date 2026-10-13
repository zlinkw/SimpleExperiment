const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { ResourceOperationLeaseManager } = require('../../dist/core/ResourceOperationLease');
const { UpdateGate } = require('../../dist/updates/UpdateGate');

test('update closes admission while existing Experiment transfers retain ownership and drain', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-update-gate-')), leasePath = path.join(root, 'lease.json');
  const manager = new ResourceOperationLeaseManager({ leasePath, windowId: os.hostname() + ':' + process.pid + ':test', ownerAlive: () => true });
  const input = { pluginId: 'simple-local.simple-experiment', workspaceUri: 'file://' + root, hostProjectPath: root, actionType: 'transfer' };
  const existing = await manager.acquire(input), gate = new UpdateGate(leasePath, () => true);
  try {
    await gate.begin(root); await existing.assertHeld(); await assert.rejects(manager.acquire(input), /全局锁/);
    let drained = false; const drain = gate.wait().then(() => { drained = true; });
    await new Promise(resolve => setTimeout(resolve, 25)); assert.equal(drained, false);
    await existing.release(); await drain; assert.equal(drained, true);
    await gate.end(); const next = await manager.acquire(input); await next.release();
  } finally { await existing.release(); await gate.end(); }
});
test('cancelling update wait does not cancel transfers and expired live receipts still block', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-update-wait-')), leasePath = path.join(root, 'lease.json'), directory = leasePath + '.resources-v2';
  fs.mkdirSync(directory); fs.writeFileSync(path.join(directory, 'a'.repeat(64) + '.json'), JSON.stringify({ schemaVersion: 2, processId: process.pid, leases: [{ expiresAt: '2000-01-01' }] }), 'utf8');
  const gate = new UpdateGate(leasePath, () => true), cancel = new AbortController();
  await gate.begin(root);
  try { const wait = gate.wait(cancel.signal); setTimeout(() => cancel.abort(Error('cancel')), 30); await assert.rejects(wait, /cancel/); assert.ok(fs.existsSync(path.join(directory, 'a'.repeat(64) + '.json'))); }
  finally { await gate.end(); }
});
