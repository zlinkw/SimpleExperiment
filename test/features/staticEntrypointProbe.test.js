const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
require('../_helpers/registerTsRequire');
const { staticEntrypointProbe: probe } = require('../../src/features/StaticEntrypointProbe.ts');

test('static entry probe checks direct project scripts without interpreting their arguments', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'simple-entry-probe-'));
  const file = path.join(root, 'train.py');
  await fs.writeFile(file, 'import argparse\n# --config output_dir\nraise RuntimeError("must not execute")\n', 'utf8');
  const command = 'python train.py --config {config} --output-dir {output_dir}';
  const reports = await Promise.all([probe(root, command), probe(root, command)]);
  assert.ok(reports.every(report => report.ok));
  assert.equal((await probe(root, 'python train.py --config settings.yaml')).ok, true);
  await fs.writeFile(file, 'import argparse\n# --config\n', 'utf8');
  assert.equal((await probe(root, command)).ok, true);
  assert.equal((await probe(root, 'python missing.py')).ok, false);
  assert.equal((await probe(root, 'python -u -B missing.py')).ok, false);
  assert.equal((await probe(root, 'python -u train.py --config {config}')).ok, true);
  assert.equal((await probe(root, 'python ../train.py')).checked, false);
  assert.equal((await probe(root, 'python {matrix.script}')).checked, false);
  assert.equal((await probe(root, '')).ok, false);
  // Preserve fixture bytes; no unconfirmed recursive fixture deletion.
});

test('workflow readiness keeps infrastructure checks without a research output contract', () => {
  const {structuredMissingInventory} = require('../../src/features/ApiWorkflow.legacy.ts');
  const input={workspace:'project',setup:{workerTunnels:[{id:'w',workerHost:'server',workerUser:'user',agentProjectDir:'/project'}]},
    topology:{valid:true},simpleSftp:{ready:true},plan:{planFile:'plan.yaml'},
    project:{outputGateMissing:[{label:'old metrics'}]}};
  assert.deepEqual(structuredMissingInventory(input),[]);
  assert.ok(structuredMissingInventory({...input,setup:{workerTunnels:[]}}).some(row=>row.step==='select_servers'));
});

test('PLAN metadata retains its command and working directory for static checks', () => {
  const {parsePlanSummary} = require('../../src/features/PlanBuilder.legacy.ts');
  const value = parsePlanSummary('plan_id: p\nname: analysis\ncommand: python analyze.py --config settings.yaml\nworking_dir: scripts\noutput_dir: work/run\n');
  assert.equal(value.declaredCommand,'python analyze.py --config settings.yaml');
  assert.equal(value.workingDirectory,'scripts');
});
