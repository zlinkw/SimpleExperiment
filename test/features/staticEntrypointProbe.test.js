const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
require('../_helpers/registerTsRequire');
const { staticEntrypointProbe: probe } = require('../../src/features/StaticEntrypointProbe.ts');

test('static entry probe keeps parameter failures, shares requests, and invalidates edited bytes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'simple-entry-probe-'));
  const file = path.join(root, 'train.py');
  await fs.writeFile(file, 'import argparse\n# --config output_dir\nraise RuntimeError("must not execute")\n', 'utf8');
  const command = 'python train.py --config {config} --output-dir {output_dir}';
  const reports = await Promise.all([probe(root, command), probe(root, command)]);
  assert.ok(reports.every(report => report.ok));
  assert.equal((await probe(root, command)).reused, true);
  assert.equal((await probe(root, 'python train.py --config {config}')).ok, false);
  await fs.writeFile(file, 'import argparse\n# --config\n', 'utf8');
  assert.equal((await probe(root, command)).reused, false);
  assert.equal((await probe(root, 'python train.py --config {config}')).ok, true);
  assert.equal((await probe(root, 'python missing.py')).ok, false);
  assert.equal((await probe(root, 'python -u -B missing.py')).ok, false);
  assert.equal((await probe(root, 'python -u train.py --config {config}')).ok, true);
  assert.equal((await probe(root, 'python ../train.py')).ok, false);
  assert.equal((await probe(root, '')).ok, false);
  // Preserve fixture bytes; no unconfirmed recursive fixture deletion.
});
