const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('rerun selection requires verified completion as well as execution exit', () => {
  const source = fs.readFileSync(require.resolve('../../src/extension/PlanRunHost.ts'), 'utf8');
  const start = source.indexOf('    const completed = new Set<number>();');
  const end = source.indexOf('    const key = runReplacementKey', start);
  const script = ts.transpileModule('(function(body,jobs){' + source.slice(start, end) + ';return [...completed];})',
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const select = vm.runInNewContext(script, { observationMatches: () => true, taskLifecycle: observation => observation.state });
  const job = { index: 0, case: 'a', seed: 1, output_dir: 'work/a', result_csv: 'tmp/a.csv' };
  const observation = { state: { status: 'completed', execution: 'exited', completionState: 'unverified' } };
  const task = { commandId: 'c', projectId: 'p', outputDir: job.output_dir, collectionResultCsv: job.result_csv, case: job.case, seed: job.seed, observation };
  const run = () => Array.from(select({ workerSubmissionSnapshots: [{ workerId: 'w', tasks: [task] }] }, [job]));
  assert.deepEqual(run(), []);
  observation.state.completionState = 'verified';
  assert.deepEqual(run(), [0]);
});
