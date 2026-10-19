const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const main = require('../../dist/core/HostOperationLease');
// 跨平台等价夹具：simple-sftp 是主仓的兄弟仓库；固定 ../../../ 层级只在主 checkout 成立，
// 独立 worktree lane 中层级更深。按祖先链发现兄弟 simple-sftp，主 checkout 解析结果与原
// 路径完全一致，可用 SIMPLE_SFTP_REPO 显式覆盖。
function siblingSimpleSftpRoot(){
  if (process.env.SIMPLE_SFTP_REPO) return process.env.SIMPLE_SFTP_REPO;
  let dir = __dirname;
  for (let depth = 0; depth < 10; depth += 1) {
    if (fsExistsSync(path.join(dir, 'simple-sftp', 'host-operation-lease.js'))) return path.join(dir, 'simple-sftp');
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('sibling simple-sftp repository with host-operation-lease.js not found');
}
const fsExistsSync = require('node:fs').existsSync;
const sftp = require(path.resolve(siblingSimpleSftpRoot(), 'host-operation-lease'));

test('both plugins retain atomic admission through Windows sharing violations', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'resource-compat-evidence-'));
  const leasePath = path.join(directory, 'lease.json');
  const originalRename = fs.rename;
  let denied = 0;
  fs.rename = async (from, to) => {
    if (to.startsWith(leasePath) && denied < 3) {
      denied++;
      throw Object.assign(new Error('simulated sharing violation'), { code: 'EACCES' });
    }
    return originalRename(from, to);
  };
  const input = { pluginId: 'test', workspaceUri: directory, hostProjectPath: directory, actionType: 'write',
    resources: [{ server: 'worker:22', project: '/project', target: '/project/result.csv' }] };
  const managers = [main, sftp, main, sftp].map((module, index) => new module.HostOperationLeaseManager({
    leasePath, windowId: 'window-' + index, heartbeatMs: 0,
  }));
  const stop = new AbortController();
  const deadline = setTimeout(() => stop.abort(new Error('admission did not settle')), 5000);
  const acquired = [];
  try {
    const results = await Promise.allSettled(managers.map(manager => manager.acquire({ ...input, signal: stop.signal }).then(handle => {
      acquired.push(handle); return handle;
    })));
    assert.equal(denied, 3);
    assert.equal(results.filter(row => row.status === 'fulfilled').length, 1);
    for (const row of results.filter(row => row.status === 'rejected')) assert.equal(row.reason.code, 'RESOURCE_CONFLICT');
    const independent = await managers[1].acquire({ ...input, resources: [{ server: 'other:22', project: '/project', target: '/project/result.csv' }] });
    acquired.push(independent);
    await Promise.all(acquired.map(handle => handle.assertHeld()));
  } finally {
    clearTimeout(deadline);
    await Promise.all(acquired.map(handle => handle.release()));
    fs.rename = originalRename;
  }
});
