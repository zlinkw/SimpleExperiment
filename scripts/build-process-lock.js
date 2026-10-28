const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawn } = require('node:child_process');

async function holdProcessLock(identity) {
  const digest = crypto.createHash('sha256').update(identity).digest();
  if (process.platform !== 'win32') {
    const server = net.createServer(socket => socket.destroy());
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen({ host: '127.0.0.1', port: 49152 + digest.readUInt32BE(0) % 16384, exclusive: true }, resolve);
    });
    server.unref();
    return () => new Promise(resolve => server.close(resolve));
  }
  // OS mutexes avoid Windows reserved port ranges. The helper owns the mutex on
  // one synchronous thread until its parent closes stdin; no file deletion.
  const name = 'Global\\SimpleExperimentBuild-' + digest.toString('hex');
  const script = `$m=[Threading.Mutex]::new($false,'${name}'); $owned=$false; try { try { $owned=$m.WaitOne(0) } catch [Threading.AbandonedMutexException] { $owned=$true }; if (-not $owned) { [Console]::Out.WriteLine('BUILD_LOCK_BUSY'); exit 3 }; [Console]::Out.WriteLine('READY'); [Console]::Out.Flush(); [Console]::In.ReadLine() | Out-Null } finally { if ($owned) { $m.ReleaseMutex() }; $m.Dispose() }`;
  const child = spawn('pwsh.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  const closed = new Promise(resolve => child.once('close', resolve));
  child.stderr.resume();
  child.stdin.on('error', () => undefined);
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => { child.stdin.end(); reject(new Error('BUILD_LOCK_HELPER_TIMEOUT')); }, 10000);
      const finish = error => { clearTimeout(timer); error ? reject(error) : resolve(); };
      let output = '';
      child.stdout.on('data', data => { output = (output + data.toString('utf8')).slice(-1024); if (output.includes('READY')) finish(); else if (output.includes('BUILD_LOCK_BUSY')) finish(new Error('BUILD_LOCK_BUSY')); });
      child.once('error', finish);
      child.once('close', code => finish(new Error('BUILD_LOCK_HELPER_EXIT_' + code)));
    });
  } catch (error) { child.stdin.end(); await closed; throw error; }
  return async () => { child.stdin.end(); await closed; };
}


async function acquireBuildLock(root, batchId) {
  root = fs.realpathSync(root);
  const identity = process.platform === 'win32' ? root.toLowerCase() : root;
  const directory = path.join(root, 'simple_cluster', 'locks', 'simple-experiment', 'test-workflow');
  let parent = root;
  for (const leaf of ['simple_cluster', 'locks', 'simple-experiment', 'test-workflow']) {
    parent = path.join(parent, leaf);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent);
    const info = fs.lstatSync(parent);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('BUILD_LOCK_PATH_UNSAFE');
  }
  if (fs.existsSync(path.join(directory, 'batch.lock')))
    throw new Error('LEGACY_BUILD_LOCK: retained batch.lock requires ownership inspection; no automatic removal');
  const close = await holdProcessLock(identity);
  const file = path.join(directory, 'process-owner.json');
  try {
    if (fs.existsSync(file)) {
      const info = fs.lstatSync(file);
      if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1) throw new Error('BUILD_LOCK_PATH_UNSAFE');
      const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (previous.status !== 'released' || previous.root !== root)
        throw new Error('BUILD_LOCK_UNSETTLED: previous child tree not confirmed; record retained');
    }
    const owner = { schemaVersion: 1, root, batchId, nonce: crypto.randomUUID(), pid: process.pid, status: 'active' };
    const publish = value => {
      const fd = fs.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | (fs.constants.O_NOFOLLOW || 0), 0o600);
      try {
        const opened = fs.fstatSync(fd), current = fs.lstatSync(file);
        if (!opened.isFile() || opened.nlink > 1 || current.isSymbolicLink() || opened.dev !== current.dev || opened.ino !== current.ino)
          throw new Error('BUILD_LOCK_PATH_UNSAFE');
        fs.ftruncateSync(fd, 0);
        fs.writeFileSync(fd, JSON.stringify(value), 'utf8');
        fs.fsyncSync(fd);
      } finally { fs.closeSync(fd); }
    };
    publish(owner);
    return { async release(confirmed) {
      if (!confirmed) { await close(); return false; }
      try {
        const current = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (current.nonce !== owner.nonce) throw new Error('BUILD_LOCK_OWNER_CHANGED');
        publish({ ...owner, status: 'released' });
        return true;
      } finally { await close(); }
    } };
  } catch (error) { await close(); throw error; }
}
module.exports = { acquireBuildLock };
