const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
for (const mode of ['timeout', 'cancel']) test('a real stalled login shell is killed and reaped with its child: ' + mode, () => {
  const fixture = path.join(__dirname, 'executionShellReap.fixture.py');
  const mounted = fixture.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => '/mnt/' + drive.toLowerCase());
  const args = process.platform === 'win32' ? ['--distribution', process.env.SIMPLE_TEST_WSL_DISTRO || 'Ubuntu-Codex',
    '--exec', '/usr/bin/python3', '-B', mounted, mode] : ['-B', fixture, mode];
  const proc = spawnSync(process.platform === 'win32' ? 'wsl.exe' : 'python3', args,
    { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout || String(proc.error));
  assert.equal(JSON.parse(proc.stdout.trim()).childReaped, true);
});
