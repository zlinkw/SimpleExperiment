const test = require('node:test');
const assert = require('node:assert/strict');
const { scopeResultSummary, scopeResultOperation } = require('../../dist/results/ResultOwnershipScope');
const plan = 'experiments/plans/official/same.yaml', foreign = 'experiments/plans/tuning/same.yaml';
test('Windows slash/case aliases retain an explicitly owned summary; same basename does not authorize another PLAN', () => {
  const summary = { planFile: (process.platform === 'win32' ? plan.toUpperCase() : plan).replaceAll('/', '\\'), rawResultCsvPath: 'tmp/result/current.csv', results: [{ seed: 42 }] };
  assert.equal(scopeResultSummary(summary, plan), summary);
  assert.equal(scopeResultSummary({ ...summary, planFile: foreign }, plan).results.length, 0);
  assert.equal(scopeResultSummary({ ...summary, plan_file: foreign }, plan).resultScopeSuppressed, true);
});
test('anonymous aggregate paths do not inherit a selected PLAN; only owned child records survive', () => {
  const summary = { rawResultCsvPath: 'tmp/result/mixed.csv', sources: ['mixed'], results: [{ planFile: plan, seed: 42 }, { seed: 43 }, { planFile: foreign, seed: 44 }] };
  const before = JSON.stringify(summary), out = scopeResultSummary(summary, plan);
  assert.equal(out.results.length, 1); assert.equal(out.results[0].seed, 42); assert.equal(out.rawResultCsvPath, undefined); assert.deepEqual(out.sources, []);
  assert.equal(JSON.stringify(summary), before);
});
test('foreign nested tables and contradictory provenance cannot authorize CSV/claim inspection', () => {
  const out = scopeResultSummary({ planFile: plan, workerResultTables: [{ rawResultCsvPath: 'x.csv', completedJob: { planFile: foreign } }, { rawResultCsvPath: 'y.csv' }],
    results: [{ planFile: plan, provenance: { plan_file: foreign } }, { seed: 42 }], claimEvidence: { planFile: foreign, evidenceCsvPath: 'evidence.csv' } }, plan);
  assert.equal(out.workerResultTables.length, 1); assert.equal(out.workerResultTables[0].rawResultCsvPath, 'y.csv'); assert.equal(out.claimEvidence, undefined); assert.equal(out.results.length, 1);
});
test('receipt children inherit a verified parent, while anonymous ancestors and foreign siblings never contribute paths', () => {
  const valid = scopeResultOperation({ planFile: plan, action: 'check-output-contract', contractReport: { unparseableFiles: ['tmp/result/current.csv'] } }, plan);
  assert.equal(valid.contractCheck, true); assert.equal(valid.payloads.length, 2);
  const child = scopeResultOperation({ unparseableFiles: ['foreign.csv'], payload: { planFile: plan, type: 'check-output-contract', unparseableFiles: ['owned.csv'] } }, plan);
  assert.equal(child.payloads.length, 1); assert.deepEqual(child.payloads[0].unparseableFiles, ['owned.csv']);
  assert.equal(scopeResultOperation({ planFile: plan, payload: { planFile: foreign } }, plan).payloads.length, 0);
});
test('revision aliases, cycles, traversal, deep trees and conflicting entries reject without repairing evidence', () => {
  const cyclic = { planFile: plan }; cyclic.payload = cyclic;
  const bad = [{ planFile: plan, planRevision: 'one', payload: { plan_revision: 'two' } }, cyclic,
    { planFile: '../escape.yaml' }, { planFile: plan, unparseable: [{ path: 'a.csv', planFile: foreign }] }, { planFile: plan, options: { plan_file: foreign } }];
  const deep = { planFile: plan }; let nested = deep; for (let i = 0; i < 10; i++) { nested.payload = {}; nested = nested.payload; } bad.push(deep);
  for (const row of bad) assert.equal(scopeResultOperation(row, plan).payloads.length, 0);
});
