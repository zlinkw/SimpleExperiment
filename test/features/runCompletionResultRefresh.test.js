const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text, "utf8");
}

function pyString(value) {
  return JSON.stringify(String(value));
}

test("scheduler terminal parses completed, failed, and cancelled plans without cross-plan mixing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-experiment-run-terminal-"));
  const runtime = path.join(__dirname, "../../dist/runtime/cluster_agent.py");
  const plans = [
    ["completed", "operation_completed", "completed"],
    ["failed", "operation_failed", "failed"],
    ["cancelled", "operation_failed", "cancelled"],
  ];
  for (const [name] of plans) {
    write(path.join(root, "experiments", "plans", `${name}.yaml`), [
      `suite: ${name}`,
      "mode: test",
      "paper:",
      `  result_csv: experiments/results/${name}.csv`,
    ].join("\n") + "\n");
    write(path.join(root, "experiments", "results", `${name}.csv`), [
      "experiment_id,suite,method,dataset,split,seed,metric,value",
      `${name}-run,${name},ours,demo,test,0,AUC,0.9`,
    ].join("\n") + "\n");
  }
  write(path.join(root, "experiments", "zlk_project.yaml"), [
    "project: multi-plan",
    "taskType: classification",
    "primaryMetric: AUC",
    "candidateCsv:",
    "  - experiments/results/*.csv",
  ].join("\n") + "\n");
  const script = path.join(root, "verify.py");
  write(script, [
    "import json, os, sys",
    `sys.path.insert(0, ${pyString(path.dirname(runtime))})`,
    "import cluster_agent as agent",
    `root = ${pyString(root)}`,
    `plans = ${JSON.stringify(plans)}`,
    "rows = []",
    "for name, event_type, status in plans:",
    "    plan = f'experiments/plans/{name}.yaml'",
    "    event = {'schemaVersion': 1, 'seq': len(rows) + 1, 'generatedAt': agent.now_iso(), 'source': 'hub_agent', 'type': event_type, 'operationId': f'op-{name}', 'payload': {'action': 'run-plan', 'status': status, 'planFile': plan, 'schedulerFinished': True}}",
    "    result = agent.maybe_auto_run_completion_pipeline(root, event)",
    "    duplicate = agent.maybe_auto_run_completion_pipeline(root, event)",
    "    summary = agent.read_results_summary(root, plan)",
    "    state = agent.read_auto_completion_state(root, plan)",
    "    rows.append({'name': name, 'result': result, 'duplicate': duplicate, 'planFile': summary.get('planFile'), 'sources': summary.get('sources') or [], 'resultCount': summary.get('resultCount'), 'statisticsPath': summary.get('statisticsPath') or '', 'statePlan': state.get('planFile'), 'processed': list((state.get('processedKeys') or {}).keys())})",
    "print(json.dumps(rows))",
  ].join("\n"));
  const result = spawnSync("python", [script], { encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const rows = JSON.parse((result.stdout || "").trim().split(/\r?\n/).pop());
  assert.equal(rows.length, 3);
  for (const row of rows) {
    const plan = `experiments/plans/${row.name}.yaml`;
    assert.equal(row.result.planFile, plan);
    assert.equal(row.duplicate, null);
    assert.equal(row.planFile, plan);
    assert.equal(row.statePlan, plan);
    assert.equal(row.resultCount, 1);
    assert.equal(row.statisticsPath, "");
    assert.equal(row.result.statisticsPath, "");
    assert.match(row.result.message, /筛选并归档/);
    assert.deepEqual(row.sources, [`experiments/results/${row.name}.csv`]);
    assert.equal(row.processed.length, 1);
    assert.match(row.processed[0], new RegExp(`^operation:run-plan:op-${row.name}$`));
  }
});
