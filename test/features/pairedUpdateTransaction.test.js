const test = require('node:test');
const assert = require('node:assert/strict');
const { UpdateTransaction } = require('../../dist/updates/UpdateTransaction');

function setup(options = {}) {
  const events = [], versions = { sftp: '1.0.0', experiment: '1.0.0', ...options.versions };
  const components = ['sftp', 'experiment'].map(id => ({ id, latestVersion: '1.1.0', vsix: { digest: 'sha256:' + 'a'.repeat(64) } }));
  let journal = options.journal;
  const io = {
    readJournal: () => journal, saveJournal: async value => { journal = structuredClone(value); events.push('save:' + value.status); },
    currentVersion: id => versions[id], beginGate: async () => events.push('gate'),
    waitForTransfers: async () => { events.push('wait'); await options.wait?.(); }, endGate: async () => events.push('ungate'),
    prepare: async item => { events.push('download:' + item.id); if (options.downloadFailure === item.id) throw Error('hash mismatch'); return item.id; },
    verify: async file => events.push('verify:' + file),
    install: async file => { events.push('install:' + file); if (options.installFailure === file) throw Error('install failed'); versions[file] = '1.1.0'; },
    reload: async () => { events.push('reload'); if (options.reloadFailure) throw Error('reload failed'); },
  };
  return { engine: new UpdateTransaction(io), events, components, journal: () => journal };
}

test('drains local operations and verifies every package before SFTP then Experiment installation', async () => {
  const f = setup(); await f.engine.install(f.components);
  assert.ok(f.events.indexOf('gate') < f.events.indexOf('wait'));
  assert.ok(f.events.indexOf('download:experiment') < f.events.indexOf('install:sftp'));
  assert.ok(f.events.indexOf('install:sftp') < f.events.indexOf('install:experiment'));
  assert.ok(f.events.indexOf('install:experiment') < f.events.indexOf('reload'));
  assert.equal(f.journal().status, 'reload_required'); assert.ok(!f.events.includes('ungate'));
});
test('verification failure installs nothing and releases admission', async () => {
  const f = setup({ downloadFailure: 'experiment' }); await assert.rejects(f.engine.install(f.components), /hash mismatch/);
  assert.ok(!f.events.some(e => e.startsWith('install:'))); assert.ok(f.events.includes('ungate'));
});
test('partial installation is durable and retry reconciles actual installed versions', async () => {
  const first = setup({ installFailure: 'experiment' }); await assert.rejects(first.engine.install(first.components), /install failed/);
  assert.deepEqual(first.journal().completed, ['sftp']); assert.ok(!first.events.includes('ungate'));
  const retry = setup({ journal: first.journal(), versions: { sftp: '1.1.0' } }); await retry.engine.install(retry.components);
  assert.ok(!retry.events.includes('download:sftp')); assert.deepEqual(retry.journal().completed, ['sftp', 'experiment']);
  const stale = setup({ journal: first.journal() }); await stale.engine.install(stale.components);
  assert.ok(stale.events.includes('install:sftp'), 'persisted receipt alone cannot hide a missing installation');
});
test('double clicks share a transaction; equal/newer versions never install', async () => {
  let release; const wait = new Promise(resolve => { release = resolve; }); const f = setup({ wait: () => wait });
  const a = f.engine.install(f.components), b = f.engine.install(f.components); assert.equal(a, b);
  release(); await a; assert.equal(f.events.filter(e => e.startsWith('install:')).length, 2);
  const current = setup({ versions: { sftp: '2.0.0', experiment: '1.1.0' } }); await current.engine.install(current.components);
  assert.equal(current.events.length, 0);
});
test('partial retry failure and reload failure keep admission closed', async () => {
  const first = setup({ installFailure: 'experiment' }); await assert.rejects(first.engine.install(first.components));
  const retry = setup({ journal: first.journal(), versions: { sftp: '1.1.0' }, downloadFailure: 'experiment' });
  await assert.rejects(retry.engine.install(retry.components)); assert.ok(!retry.events.includes('ungate'));
  const reload = setup({ reloadFailure: true }); await assert.rejects(reload.engine.install(reload.components));
  assert.ok(!reload.events.includes('ungate')); assert.deepEqual(reload.journal().completed, ['sftp', 'experiment']);
});
test('installer failure before its receipt stays gated and retains an uncertain install marker', async () => {
  const f = setup({ installFailure: 'sftp' }); await assert.rejects(f.engine.install(f.components));
  assert.equal(f.journal().installationRequested, true); assert.deepEqual(f.journal().completed, []); assert.ok(!f.events.includes('ungate'));
  const retry = setup({ journal: f.journal(), downloadFailure: 'sftp' }); await assert.rejects(retry.engine.install(retry.components));
  assert.ok(!retry.events.includes('ungate'));
});
// F15（plan r13 §5）：宿主journal为 status=failed、completed=[experiment]（磁盘405元数据自动判完成）、
// 等待传输阶段抛"本地传输租约损坏"。修复语义：重试仅补SFTP；任何失败都不回滚已确认组件、不重复安装、不换批。
test('F15 wait-stage failure keeps installed Experiment, retry only backfills SFTP without rollback or re-install', async () => {
  const first = setup({ versions: { experiment: '1.1.0' }, wait: () => { throw Error('本地传输租约损坏，已阻止安装。'); } });
  await assert.rejects(first.engine.install(first.components), /本地传输租约损坏/);
  assert.deepEqual(first.journal().completed, ['experiment']); assert.equal(first.journal().status, 'failed');
  assert.ok(!first.events.some(e => e.startsWith('install:')), '等待阶段失败不得开始任何安装，更不得回滚已装组件');
  assert.ok(first.events.includes('ungate'), '未请求安装的失败必须释放准入，不能锁死后续补装');
  const retry = setup({ journal: first.journal(), versions: { experiment: '1.1.0' } });
  await retry.engine.install(retry.components);
  assert.ok(!retry.events.includes('download:experiment') && !retry.events.includes('install:experiment'), '已装Experiment不得重复下载或安装');
  assert.ok(retry.events.includes('install:sftp')); assert.deepEqual(retry.journal().completed, ['experiment', 'sftp']);
});
test('F15 retry download failure retains journal without rollback and a mismatched batch is refused', async () => {
  const first = setup({ versions: { experiment: '1.1.0' }, wait: () => { throw Error('本地传输租约损坏，已阻止安装。'); } });
  await assert.rejects(first.engine.install(first.components));
  const retry = setup({ journal: first.journal(), versions: { experiment: '1.1.0' }, downloadFailure: 'sftp' });
  await assert.rejects(retry.engine.install(retry.components), /hash mismatch/);
  assert.deepEqual(retry.journal().completed, ['experiment']); assert.equal(retry.journal().installationRequested, false);
  assert.ok(!retry.events.some(e => e.startsWith('install:')) && !retry.events.includes('ungate'), '补装批次中途失败保持准入关闭且不动已完成组件');
  const swapped = setup({ journal: first.journal(), versions: { experiment: '1.1.0' } });
  await assert.rejects(swapped.engine.install(swapped.components.map(c => ({ ...c, latestVersion: '1.2.0' }))), /不能替换已确认的更新批次/);
  assert.equal(swapped.events.length, 0, '指纹不符的更新必须在任何下载/安装/放行之前被拒绝');
});
