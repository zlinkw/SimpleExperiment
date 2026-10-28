const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');

async function acquireBuildLock(root, batchId) {
  root = fs.realpathSync(root);
  const identity = process.platform === 'win32' ? root.toLowerCase() : root;
  const directory = path.join(root, 'simple_cluster', 'locks', 'simple-experiment', 'test-workflow');
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(path.join(directory, 'batch.lock')))
    throw new Error('LEGACY_BUILD_LOCK: retained batch.lock requires ownership inspection; no automatic removal');
  const port = 49152 + crypto.createHash('sha256').update(identity).digest().readUInt32BE(0) % 16384;
  const server = net.createServer(socket => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
  });
  server.unref();
  const file = path.join(directory, 'process-owner.json');
  try {
    if (fs.existsSync(file)) {
      const previous = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (previous.status !== 'released' || previous.root !== root)
        throw new Error('BUILD_LOCK_UNSETTLED: previous child tree not confirmed; record retained');
    }
    const owner = { schemaVersion: 1, root, batchId, nonce: crypto.randomUUID(), pid: process.pid, status: 'active' };
    const publish = value => fs.writeFileSync(file, JSON.stringify(value), { encoding: 'utf8', mode: 0o600 });
    publish(owner);
    return { release(confirmed) {
      if (!confirmed) { server.close(); return false; }
      try {
        const current = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (current.nonce !== owner.nonce) throw new Error('BUILD_LOCK_OWNER_CHANGED');
        publish({ ...owner, status: 'released' });
        return true;
      } finally { server.close(); }
    } };
  } catch (error) { server.close(); throw error; }
}
module.exports = { acquireBuildLock };
