const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('real task shells ignore stale library proofs, preserve user libraries and avoid shared task journals', () => {
  const fixture = path.join(__dirname, 'nativeRunnerIsolation.fixture.py');
  const mounted = fixture.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, drive) => '/mnt/' + drive.toLowerCase());
  const args = process.platform === 'win32' ? ['--distribution', process.env.SIMPLE_TEST_WSL_DISTRO || 'Ubuntu-Codex',
    '--exec', '/usr/bin/python3', '-B', mounted] : ['-B', fixture];
  const proc = spawnSync(process.platform === 'win32' ? 'wsl.exe' : 'python3', args,
    { cwd: path.resolve(__dirname, '../..'), encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout || String(proc.error));
  const report = JSON.parse(proc.stdout.trim());
  assert.equal(report.launch, true); assert.equal(report.rawError, true); assert.equal(report.journalUntouched, true);
  assert.equal(report.concurrentWriters, 3);
});
