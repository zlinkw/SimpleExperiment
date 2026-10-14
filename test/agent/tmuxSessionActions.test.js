const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const linux = p => '/mnt/' + p[0].toLowerCase() + p.slice(2).replace(/\\/g, '/');
test('real isolated tmux closes sessions, preserves an idle terminal when clearing and binds live native tasks', () => {
  const script = path.resolve(__dirname, 'tmuxSessionActions.fixture.py');
  const runtime = path.resolve(__dirname, '../../dist/runtime/cluster_agent.py');
  const args = process.platform === 'win32' ? ['--distribution', process.env.SIMPLE_TEST_WSL_DISTRO || 'Ubuntu-Codex', '--exec', 'python3', linux(script), linux(runtime)] : [script, runtime];
  const result = spawnSync(process.platform === 'win32' ? 'wsl.exe' : 'python3', args, { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /ok: real session actions/);
});
