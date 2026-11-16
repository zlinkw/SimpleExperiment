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

test("declared CSV, JSON, and text results retain plan boundaries and artifact completeness", () => {
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
  write(root, "work_dirs/other/metrics.json", JSON.stringify({ suite: "other", metrics: { AUC: 0.99 } }));
  snapshots(root, "work_dirs/other");
  write(root, "work_dirs/errors/broken.json", '{"metrics":');
  write(root, "work_dirs/errors/empty.csv", "experiment_id,metric,value\nrun-1,AUC,not-a-number\n");
  write(root, "work_dirs/errors/empty.txt", "training finished without metrics\n");
  write(root, "work_dirs/errors/metrics_case.csv", "case_id,metric,value\ncase-1,AUC,0.9\n");
  write(root, "work_dirs/errors/env_snapshot.json", '{"python":"3.10"}');
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
  write(root, 'work_dirs/nested/multimodal/0_smoke_seed42/test_results/operation_audit.json', JSON.stringify({
    status:'SEEDED_STRATIFIED_RANDOM', sample_count:100, patient_count:90, image_operation_count_delta:0,
    text_operation_count_delta:0, text_donor_max_reuse:2, operations:{image:'noise'}, actual_counts:{noise:100},
  }));
  write(root, 'work_dirs/nested/multimodal/0_smoke_seed42/test_results/quality_evaluation_complete.json', JSON.stringify({
    status:'complete', metric_rows:10, evaluation_contract:{protocol:'test'}, artifacts_sha256:{},
  }));
  write(root, 'experiments/plans/declared_snapshot.yaml', [
    plan('declared_snapshot', cases.declared_snapshot), 'base_config: config.yaml', 'expectedResults:',
    `  - ${cases.declared_snapshot}`, '  - work_dirs/declared_snapshot/config_snapshot.yaml',
  ].join('\n'));
  write(root, cases.declared_snapshot, 'accuracy\n0.9\n');

  const script = path.join(tmp, "check.py");
  const plans = Object.keys(cases);
  fs.writeFileSync(script, [
    "import importlib.util, json, os",
    `spec = (lambda _name, _file: __import__("runpy").run_path(${JSON.stringify(require("node:path").resolve(__dirname, "../_helpers/extractRuntimeFunctions.py"))})["extract_runtime_functions"](_file, ["parse_results_action", "parse_result_file", "parseable_result_candidate", "plan_declared_result_candidates", "plan_output_declarations", "read_project_metric_policy"]))('agent', ${JSON.stringify(agentPath)})`,
    "agent = spec",
    `scheduler = __import__("runpy").run_path(${JSON.stringify(path.resolve(__dirname, '../_helpers/extractRuntimeFunctions.py'))})['extract_runtime_functions'](${JSON.stringify(path.resolve(__dirname, '../../dist/runtime/cluster_scheduler.py'))}, ['load_plan', 'build_jobs', 'safe_project_relative_path', 'declared_outputs_complete'])`,
    "agent.scalar_scheduler_module = lambda: scheduler",
    "pass",
    `root = ${JSON.stringify(root)}`,
    "os.chdir(root)",
    `plans = ${JSON.stringify(plans)}`,
    "policy = agent.read_project_metric_policy(root)",
    "reports = {'parsed': {}, 'declared': {}, 'jobs': {}}",
    "for name in plans:",
    "  plan_file = 'experiments/plans/' + name + '.yaml'",
    "  reports['declared'][name] = agent.plan_declared_result_candidates(root, plan_file)",
    "  if name in ('generic', 'generic_missing_model', 'multimodal', 'declared_snapshot'):",
    "    _, jobs = scheduler.build_jobs(scheduler.load_plan(plan_file))",
    "    reports['jobs'][name] = {'outputs': list(jobs[0].outputs), 'complete': scheduler.declared_outputs_complete(jobs[0])}",
    "for name in ('canonical', 'json', 'text', 'invalid', 'metadata'):",
    `  file = ${JSON.stringify(cases)}[name]`,
    "  reports['parsed'][name] = agent.parse_result_file(root, file, policy)",
    "reports['parsed']['multiBad'] = agent.parse_result_file(root, 'work_dirs/multi/bad.json', policy)",
    "reports['parsed']['multiText'] = agent.parse_result_file(root, 'work_dirs/multi/summary.txt', policy)",
    "reports['internalCandidate'] = agent.parseable_result_candidate('simple_cluster/results/by_plan/current/statistics.json')",
    "reports['metadataCandidates'] = {name: agent.parseable_result_candidate('work_dirs/nested/multimodal/0_smoke_seed42/test_results/' + name) for name in ['operation_audit.json', 'quality_evaluation_complete.json']}",
    "reports['declaredSnapshot'] = agent.plan_output_declarations(root, 'experiments/plans/declared_snapshot.yaml', open('experiments/plans/declared_snapshot.yaml', encoding='utf-8').read())",
    "reports['jsonPlan'] = agent.parse_results_action(root, None, 'experiments/plans/json.yaml')",
    "errors = ['work_dirs/errors/broken.json', 'work_dirs/errors/empty.csv', 'work_dirs/invalid/metrics.json', 'work_dirs/errors/empty.txt']",
    "reports['diagnostics'] = agent.parse_results_action(root, errors, 'experiments/plans/canonical.yaml')",
    "reports['mixedResults'] = agent.parse_results_action(root, ['work_dirs/multi/bad.json', 'work_dirs/multi/summary.txt'], 'experiments/plans/multi.yaml')",
    "try:",
    "  agent.parse_result_file(root, 'work_dirs/errors/broken.json', policy)",
    "except json.JSONDecodeError:",
    "  reports['directBadJson'] = 'JSONDecodeError'",
    "else:",
    "  reports['directBadJson'] = 'not raised'",
    "reports['excludedMetadata'] = agent.parse_results_action(root, ['work_dirs/errors/env_snapshot.json', 'work_dirs/errors/metrics_case.csv'], 'experiments/plans/canonical.yaml')",
    "original_policy = agent.read_project_metric_policy",
    "original_parse = agent.parse_result_file",
    "observed = []",
    "def record_parse(root_arg, source, policy_arg=None):",
    "  observed.append(source)",
    "  return original_parse(root_arg, source, policy_arg)",
    "agent.read_project_metric_policy = lambda _root: {**policy, 'candidateJson': ['work_dirs/other/metrics.json']}",
    "agent.parse_result_file = record_parse",
    "reports['foreignPolicy'] = agent.parse_results_action(root, None, 'experiments/plans/canonical.yaml')",
    "reports['foreignPolicyObserved'] = observed",
    "agent.read_project_metric_policy = original_policy",
    "agent.parse_result_file = original_parse",
    "def parse_with_read_error(root_arg, source, policy_arg=None):",
    "  if source == 'work_dirs/canonical/metrics_summary.csv': raise OSError('fixture read failure')",
    "  return original_parse(root_arg, source, policy_arg)",
    "agent.parse_result_file = parse_with_read_error",
    "reports['readFailure'] = agent.parse_results_action(root, ['work_dirs/canonical/metrics_summary.csv'], 'experiments/plans/canonical.yaml')",
    "print(json.dumps(reports))",
  ].join("\n"), "utf8");
  const result = spawnSync("python", [script], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const reports = JSON.parse((result.stdout || "").trim().split(/\r?\n/).pop());

  for (const name of ["canonical", "json", "text"]) {
    assert.ok(reports.parsed[name].length > 0, `${name} produces metric records`);
    assert.ok(reports.parsed[name][0].metrics.AUC, `${name} retains AUC`);
    assert.ok(reports.declared[name].includes(cases[name]), `${name} retains its declared result`);
    assert.ok(reports.declared[name].every(file => !file.startsWith("work_dirs/other/")));
  }
  assert.deepEqual(reports.parsed.invalid, []);
  assert.deepEqual(reports.parsed.metadata, []);
  assert.deepEqual(reports.parsed.multiBad, []);
  assert.ok(reports.parsed.multiText[0].metrics.AUC);
  assert.ok(reports.declared.multi.includes("work_dirs/multi/bad.json"));
  assert.ok(reports.declared.multi.includes("work_dirs/multi/summary.txt"));
  assert.ok(!reports.declared.current.some(file => file.startsWith("work_dirs/other/")));
  assert.ok(reports.jsonPlan.sources.includes(cases.json));
  assert.ok(reports.jsonPlan.sources.every(file => !file.startsWith("work_dirs/other/")));
  assert.equal(reports.jsonPlan.parseFailed, 0);
  assert.equal(reports.directBadJson, "JSONDecodeError");
  assert.equal(reports.diagnostics.parseFailed, 4);
  const failures = new Map(reports.diagnostics.failures.map(item => [item.path, item.error]));
  assert.match(failures.get("work_dirs/errors/broken.json"), /Expecting value/);
  for (const file of ["work_dirs/errors/empty.csv", cases.invalid, "work_dirs/errors/empty.txt"]) {
    assert.match(failures.get(file), /未解析到数值指标/);
  }
  assert.ok(reports.diagnostics.sources.every(file => !failures.has(file)));
  assert.equal(reports.mixedResults.resultCount, 1);
  assert.equal(reports.mixedResults.parseFailed, 1);
  assert.deepEqual(reports.mixedResults.failures, [{ path: "work_dirs/multi/bad.json", error: "未解析到数值指标" }]);
  assert.ok(reports.mixedResults.sources.includes("work_dirs/multi/summary.txt"));
  assert.equal(reports.excludedMetadata.parseFailed, 0);
  assert.equal(reports.excludedMetadata.resultCount, 0);
  assert.ok(!reports.excludedMetadata.sources.includes("work_dirs/errors/env_snapshot.json"));
  assert.ok(reports.excludedMetadata.sources.includes("work_dirs/errors/metrics_case.csv"));
  assert.equal(reports.foreignPolicy.parseFailed, 0);
  assert.ok(reports.foreignPolicyObserved.includes("work_dirs/other/metrics.json"));
  assert.ok(!reports.foreignPolicy.sources.includes("work_dirs/other/metrics.json"));
  assert.ok(reports.foreignPolicy.sources.includes(cases.canonical));
  assert.ok(reports.foreignPolicy.results.every(record => record.suite !== "other"));
  assert.equal(reports.internalCandidate, "");
  assert.deepEqual(reports.metadataCandidates, { "operation_audit.json": "", "quality_evaluation_complete.json": "" });

  assert.ok(reports.declared.generic.includes(cases.generic));
  assert.ok(reports.jobs.generic.outputs.includes("work_dirs/nested/generic/0_smoke_seed42/model.pt"));
  assert.equal(reports.jobs.generic.complete, true);
  assert.ok(reports.jobs.generic_missing_model.outputs.includes("work_dirs/nested/generic_missing_model/0_smoke_seed42/model.pt"));
  assert.equal(reports.jobs.generic_missing_model.complete, false);
  assert.equal(reports.jobs.multimodal.complete, true);
  for (const file of multimodalOutputs) assert.ok(reports.jobs.multimodal.outputs.includes(`work_dirs/nested/multimodal/0_smoke_seed42/${file}`));
  for (const file of ["test_results/operation_audit.json", "test_results/quality_evaluation_complete.json"]) {
    assert.ok(!reports.declared.multimodal.includes(`work_dirs/nested/multimodal/0_smoke_seed42/${file}`));
  }
  assert.ok(reports.declaredSnapshot.paths.includes("work_dirs/declared_snapshot/config_snapshot.yaml"));
  assert.ok(reports.jobs.declared_snapshot.outputs.includes("work_dirs/declared_snapshot/config_snapshot.yaml"));
  assert.equal(reports.jobs.declared_snapshot.complete, false);
  assert.equal(fs.existsSync(path.join(root, "work_dirs", "declared_snapshot", "config_snapshot.yaml")), false);
  assert.equal(reports.readFailure.parseFailed, 1);
  assert.deepEqual(reports.readFailure.failures, [{ path: cases.canonical, error: "fixture read failure" }]);
});
