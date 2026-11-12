const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { readSource, readBuiltAgentRuntime } = require("../_helpers/sourceReader");

function extractAgent() { return readBuiltAgentRuntime(); }

function write(root, relative, content) {
  const target = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function plan(suite, resultPath) {
  return [
    `suite: ${suite}`,
    "mode: test",
    "paper:",
    `  result_csv: ${resultPath}`,
    "cases:",
    "  - case: smoke",
  ].join("\n");
}

function snapshots(root, directory) {
  write(root, `${directory}/env_snapshot.json`, '{"python":"3.10"}\n');
  write(root, `${directory}/config_snapshot.yaml`, "seed: 0\n");
}

test("output contract accepts declared CSV, JSON, and text results without cross-plan or metadata leakage", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-output-contract-"));
  const root = path.join(tmp, "project");
  const source = readSource("src/clusterAgentRuntime.ts");
  const agentPath = path.join(tmp, "cluster_agent.py");
  fs.writeFileSync(agentPath, extractAgent(source), "utf8");

  const cases = {
    canonical: "work_dirs/canonical/metrics_summary.csv",
    json: "work_dirs/json/metrics.json",
    text: "work_dirs/text/summary.txt",
    invalid: "work_dirs/invalid/metrics.json",
    missing_snapshots: "work_dirs/missing_snapshots/metrics.json",
    metadata: "work_dirs/metadata/status.json",
    multi: "work_dirs/multi/bad.json",
    current: "work_dirs/current/metrics.json",
    generic: "work_dirs/nested/generic/0_smoke_seed42/metrics.csv",
    generic_missing_model: "work_dirs/nested/generic_missing_model/0_smoke_seed42/metrics.csv",
    multimodal: "work_dirs/nested/multimodal/0_smoke_seed42/test_results/job_metrics.csv",
    declared_snapshot: "work_dirs/declared_snapshot/metrics.csv",
  };
  for (const [suite, resultPath] of Object.entries(cases)) {
    write(root, `experiments/plans/${suite}.yaml`, plan(suite, resultPath));
  }
  write(root, "experiments/plans/multi.yaml", [
    "suite: multi",
    "mode: test",
    "expectedResults:",
    "  - work_dirs/multi/bad.json",
    "  - work_dirs/multi/summary.txt",
    "cases:",
    "  - case: smoke",
  ].join("\n"));

  write(root, cases.canonical, "experiment_id,metric,value\nrun-1,AUC,0.91\n");
  snapshots(root, "work_dirs/canonical");
  write(root, cases.json, JSON.stringify({ metrics: { AUC: 0.92 }, seed: 0 }));
  snapshots(root, "work_dirs/json");
  write(root, cases.text, "AUC: 0.93\nloss=0.2\n");
  snapshots(root, "work_dirs/text");
  write(root, cases.invalid, JSON.stringify({ results: [{ status: "done", seed: 1 }] }));
  snapshots(root, "work_dirs/invalid");
  write(root, cases.missing_snapshots, JSON.stringify({ metrics: { AUC: 0.94 } }));
  write(root, cases.metadata, JSON.stringify({ status: "done", progress: 100, pid: 1234 }));
  snapshots(root, "work_dirs/metadata");
  write(root, "work_dirs/multi/bad.json", JSON.stringify({ status: "done" }));
  write(root, "work_dirs/multi/summary.txt", "AUC: 0.95\n");
  snapshots(root, "work_dirs/multi");
  write(root, "work_dirs/other/metrics.json", JSON.stringify({ metrics: { AUC: 0.99 } }));
  snapshots(root, "work_dirs/other");
  write(root, "config.yaml", "epochs: 1\n");
  for (const name of ['generic', 'generic_missing_model']) {
    write(root, `experiments/plans/${name}.yaml`, [
      `suite: ${name}`, 'base_config: config.yaml', 'seeds: [42]', 'runner:',
      '  train_command: python train.py --output-dir {output_dir}',
      'naming:', `  sweep_dir: work_dirs/nested/${name}`, "  job_name: '{index}_{case}_seed{seed}'",
      'paper:', "  result_csv: '{output_dir}/metrics.csv'", 'expectedResults:',
      "  - '{output_dir}/metrics.csv'", "  - '{output_dir}/model.pt'", 'cases:', '  - case: smoke',
    ].join('\n'));
    write(root, cases[name], 'accuracy,loss\n0.9,0.1\n');
  }
  write(root, 'work_dirs/nested/generic/0_smoke_seed42/model.pt', 'dedicated model fixture');
  write(root, 'work_dirs/nested/other/0_smoke_seed42/metrics.csv', 'accuracy\n0.1\n');
  const multimodalOutputs = ['metrics_summary.csv', 'metrics_case.csv', 'test_results/job_metrics.csv',
    'test_results/quality_evaluation_complete.json', 'test_results/main_all_low_quality/metrics.csv',
    'test_results/supplemental_clean/metrics.csv', 'test_results/operation_audit.json'];
  write(root, 'experiments/plans/multimodal.yaml', [
    'suite: multimodal', 'base_config: config.yaml', 'seeds: [42]', 'mode: train_test',
    'runner:', '  train_command: python train.py --output-dir {output_dir}',
    '  test_command: python test.py --result-csv {result_csv}',
    'naming:', '  sweep_dir: work_dirs/nested/multimodal', "  job_name: '{index}_{case}_seed{seed}'",
    'paper:', "  result_csv: '{output_dir}/test_results/job_metrics.csv'", 'expectedResults:',
    ...multimodalOutputs.map(file => `  - '{output_dir}/${file}'`), 'cases:', '  - case: smoke',
  ].join('\n'));
  for (const file of multimodalOutputs) write(root, `work_dirs/nested/multimodal/0_smoke_seed42/${file}`,
    file.endsWith('.csv') ? 'accuracy,loss\n0.9,0.1\n' : JSON.stringify({status:'complete'}));
  write(root, 'experiments/plans/declared_snapshot.yaml', [
    plan('declared_snapshot', cases.declared_snapshot), 'expectedResults:',
    `  - ${cases.declared_snapshot}`, '  - work_dirs/declared_snapshot/config_snapshot.yaml',
  ].join('\n'));
  write(root, cases.declared_snapshot, 'accuracy\n0.9\n');

  const script = path.join(tmp, "check.py");
  const plans = Object.keys(cases);
  fs.writeFileSync(script, [
    "import importlib.util, json, os",
    `spec = (lambda _name, _file: __import__("runpy").run_path(${JSON.stringify(require("node:path").resolve(__dirname, "../_helpers/extractRuntimeFunctions.py"))})["extract_runtime_functions"](_file, ["check_output_contract_action", "output_contract_result_candidate"]))('agent', ${JSON.stringify(agentPath)})`,
    "agent = spec",
    `scheduler = __import__("runpy").run_path(${JSON.stringify(path.resolve(__dirname, '../_helpers/extractRuntimeFunctions.py'))})['extract_runtime_functions'](${JSON.stringify(path.resolve(__dirname, '../../dist/runtime/cluster_scheduler.py'))}, ['load_plan', 'build_jobs', 'safe_project_relative_path'])`,
    "agent.scalar_scheduler_module = lambda: scheduler",
    "pass",
    `root = ${JSON.stringify(root)}`,
    "os.chdir(root)",
    `plans = ${JSON.stringify(plans)}`,
    "reports = {name: agent.check_output_contract_action(root, 'experiments/plans/' + name + '.yaml') for name in plans}",
    "reports['internalCandidate'] = agent.output_contract_result_candidate('simple_cluster/results/by_plan/current/statistics.json')",
    "print(json.dumps(reports))",
  ].join("\n"), "utf8");
  const result = spawnSync("python", [script], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const reports = JSON.parse((result.stdout || "").trim().split(/\r?\n/).pop());

  for (const name of ["canonical", "json", "text", "multi"]) {
    assert.equal(reports[name].status, "ok", `${name}: ${reports[name].message}`);
    assert.ok(reports[name].parseableResultCount > 0);
  }
  assert.deepEqual(reports.canonical.metricFiles, [cases.canonical]);
  assert.deepEqual(reports.json.resultFiles, [cases.json]);
  assert.deepEqual(reports.text.resultFiles, [cases.text]);

  assert.equal(reports.invalid.status, "failed");
  assert.equal(reports.invalid.issueType, "unparseable_result");
  assert.deepEqual(reports.invalid.missing, []);
  assert.deepEqual(reports.invalid.unparseableFiles, [cases.invalid]);
  assert.match(reports.invalid.unparseable[0].error, /数值指标/);

  assert.equal(reports.missing_snapshots.status, "failed");
  assert.equal(reports.missing_snapshots.issueType, "missing_files");
  assert.equal(reports.missing_snapshots.parseableResultCount, 1);
  assert.deepEqual(reports.missing_snapshots.missing.sort(), ["config_snapshot.yaml", "env_snapshot.json"]);

  assert.equal(reports.metadata.status, "failed");
  assert.equal(reports.metadata.issueType, "missing_files");
  assert.deepEqual(reports.metadata.resultFiles, []);
  assert.deepEqual(reports.metadata.missing.sort(), ["config_snapshot.yaml", "env_snapshot.json", "parseable_result_file"]);

  assert.equal(reports.multi.status, "ok");
  assert.ok(reports.multi.resultFiles.includes("work_dirs/multi/bad.json"));
  assert.ok(reports.multi.resultFiles.includes("work_dirs/multi/summary.txt"));
  assert.deepEqual(reports.multi.unparseableFiles, ["work_dirs/multi/bad.json"]);

  assert.equal(reports.current.status, "failed");
  assert.equal(reports.current.issueType, "missing_files");
  assert.deepEqual(reports.current.resultFiles, []);
  assert.deepEqual(reports.current.missing.sort(), ["config_snapshot.yaml", "env_snapshot.json", "parseable_result_file"]);
  assert.ok(!reports.current.files.some((item) => item.startsWith("work_dirs/other/")));
  assert.equal(reports.internalCandidate, "");
  assert.equal(reports.generic.status, 'ok', reports.generic.message);
  assert.deepEqual(reports.generic.requiredSnapshots, []);
  assert.deepEqual(reports.generic.resultFiles, [cases.generic]);
  assert.ok(reports.generic.files.includes('work_dirs/nested/generic/0_smoke_seed42/model.pt'));
  assert.deepEqual(reports.generic_missing_model.missing, ['work_dirs/nested/generic_missing_model/0_smoke_seed42/model.pt']);
  assert.equal(reports.multimodal.status, 'ok', reports.multimodal.message);
  assert.deepEqual(reports.multimodal.requiredSnapshots, []);
  for (const file of multimodalOutputs) assert.ok(reports.multimodal.files.includes(`work_dirs/nested/multimodal/0_smoke_seed42/${file}`));
  assert.ok(reports.multimodal.resultFiles.every(file => file.startsWith('work_dirs/nested/multimodal/')));
  assert.deepEqual(reports.declared_snapshot.requiredSnapshots, ['config_snapshot.yaml']);
  assert.deepEqual(reports.declared_snapshot.missing, ['work_dirs/declared_snapshot/config_snapshot.yaml']);
});
