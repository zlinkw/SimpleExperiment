// 双真实进程锁回归子进程（非测试本体，由 planIsolatedBatchLedger.test.js fork）。
// stale-reader 模式在「观察到过期锁 → rename 回收」之间外部暂停，模拟慢/暂停的旧回收者；
// 恢复后必须 CAS 复核失败并还原新活锁，绝不能在持锁者之前进入临界区。
const fs = require('node:fs'), fsp = fs.promises;
const [distFile, file, mode, eventsFile] = process.argv.slice(2);
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
if (mode === 'contender') {
  // r28-U1（主控批准）：只观测真实 fsp.open 对活锁的 EEXIST——首次命中发一次 contended 事件后原样 rethrow，
  // 生产锁等待逻辑（20ms 重试/600ms 上限）原样继续；不伪造 EEXIST，不干预任何期限。
  const open = fsp.open.bind(fsp); let announced = false;
  fsp.open = async (a, b, ...rest) => {
    try { return await open(a, b, ...rest); }
    catch (e) {
      if (!announced && e && e.code === 'EEXIST' && String(a) === file + '.lock') { announced = true; process.send({ event: 'contended', pid: process.pid }); }
      throw e;
    }
  };
}
const ledger = require(distFile);
if (mode === 'boom') {
  // r28-U1 反例夹具：子进程即时报告真实错误——helper 必须即时拒绝 pending wait 并附诊断，而非伪装 3000ms 超时。
  process.send({ event: 'error', message: 'fixture-boom' });
  process.exitCode = 1;
  process.disconnect();
} else (async () => {
  await ledger.withIsolatedBatchLedger(file, async () => {
    // 锁内物理事件账本（2026-10-23 等强串行证明返修）：ENTER/LEAVE 均在生产锁持有期内
    // 由持锁进程自身追加 —— 锁保证任意时刻只有一个写者，文件行序即真实临界区串行序，
    // 零时间容差、不依赖父进程观测时刻；LEAVE 在回调返回（释放锁）之前写入。
    if (eventsFile) fs.appendFileSync(eventsFile, 'ENTER ' + process.pid + '\n');
    process.send({ event: 'entered', pid: process.pid, enteredAt: Date.now() });
    await gate('release');
    if (eventsFile) fs.appendFileSync(eventsFile, 'LEAVE ' + process.pid + '\n');
  });
  process.send({ event: 'done', pid: process.pid });
  process.disconnect();
})().catch(e => { process.send({ event: 'error', message: String((e && e.message) || e) }); process.exitCode = 1; process.disconnect(); });
