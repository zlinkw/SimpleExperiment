// 双真实进程锁回归子进程（非测试本体，由 planIsolatedBatchLedger.test.js fork）。
// stale-reader 模式在「观察到过期锁 → rename 回收」之间外部暂停，模拟慢/暂停的旧回收者；
// 恢复后必须 CAS 复核失败并还原新活锁，绝不能在持锁者之前进入临界区。
const fs = require('node:fs'), fsp = fs.promises;
const [distFile, file, mode] = process.argv.slice(2);
const inbox = [], waiters = new Map();
process.on('message', m => { const r = waiters.get(m); if (r) { waiters.delete(m); r(); } else inbox.push(m); });
function gate(key) { const i = inbox.indexOf(key); if (i >= 0) { inbox.splice(i, 1); return Promise.resolve(); } return new Promise(r => waiters.set(key, r)); }
if (mode === 'stale-reader') {
  const rename = fsp.rename.bind(fsp); let paused = false;
  fsp.rename = async (a, b) => {
    if (!paused && a === file + '.lock' && String(b).includes('.stolen.')) { paused = true; process.send({ event: 'before-stale-rename' }); await gate('rename'); }
    return rename(a, b);
  };
}
const ledger = require(distFile);
(async () => {
  await ledger.withIsolatedBatchLedger(file, async () => {
    process.send({ event: 'entered', pid: process.pid, enteredAt: Date.now() });
    await gate('release');
  });
  process.send({ event: 'done', pid: process.pid });
  process.disconnect();
})().catch(e => { process.send({ event: 'error', message: String((e && e.message) || e) }); process.exitCode = 1; process.disconnect(); });
