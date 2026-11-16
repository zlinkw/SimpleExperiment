const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { readSource, readBuiltAgentRuntime } = require("../_helpers/sourceReader");

function extractAgent() { return readBuiltAgentRuntime(); }

test("preview CSV keeps all parsed records while effective CSV keeps archived records only", () => {
  const source = readSource("src/clusterAgentRuntime.ts");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "simple-csv-views-"));
  const agentPath = path.join(tmp, "cluster_agent.py");
  fs.writeFileSync(agentPath, extractAgent(source), "utf8");
  const root = path.join(tmp, "project");
  fs.mkdirSync(path.join(root, "experiments", "plans"), { recursive: true });
  fs.mkdirSync(path.join(root, "work_dirs", "smoke"), { recursive: true });
  fs.writeFileSync(path.join(root, "experiments", "plans", "smoke.yaml"), "suite: smoke\nbase_config: configs/base.yaml\npaper:\n  result_csv: work_dirs/smoke/metrics.csv\n", "utf8");
  fs.writeFileSync(path.join(root, "work_dirs", "smoke", "metrics.csv"), "method,dataset,split,seed,metric,value\nbase,ds,test,1,AUC,0.80\nours,ds,test,1,AUC,0.90\n", "utf8");
  const script = path.join(tmp, "check.py");
  fs.writeFileSync(script, [
    "import importlib.util, json, os, csv",
    ("spec = (lambda _name, _file: __import__(\"runpy\").run_path(" + JSON.stringify(require("node:path").resolve(__dirname, "../_helpers/extractRuntimeFunctions.py")) + ")[\"extract_runtime_functions\"](_file, [\"archive_state_relpath\",\"atomic_write\",\"parse_results_action\",\"read_results_summary\",\"result_final_evidence_decision\",\"safe_project_path\"]))('agent', ") + JSON.stringify(agentPath) + ")",
    "agent = spec",
    "pass",
    "root = " + JSON.stringify(root),
    "plan = 'experiments/plans/smoke.yaml'",
    "initial = agent.parse_results_action(root, None, plan)",
    "key = initial['results'][0]['resultId']",
    "state_path = agent.safe_project_path(root, agent.archive_state_relpath(plan))",
    "agent.atomic_write(state_path, {'entries': {key: {'status': 'archived', 'archived': True}}})",
    "summary = agent.parse_results_action(root, None, plan)",
    "manual = agent.result_final_evidence_decision({'manualReviewState': 'approved'}, {})",
    "preview = agent.safe_project_path(root, summary['previewCsvPath'])",
    "effective = agent.safe_project_path(root, summary['effectiveResultsCsvPath'])",
    "print(json.dumps({'previewRows': len(list(csv.DictReader(open(preview, encoding='utf-8')))), 'effectiveRows': len(list(csv.DictReader(open(effective, encoding='utf-8')))), 'manualEligible': manual.get('eligibleForFinalAnalysis'), 'policy': summary.get('inclusionPolicy'), 'previewPath': summary.get('previewCsvPath'), 'effectivePath': summary.get('effectiveResultsCsvPath')}))",
  ].join("\n"), "utf8");
  const result = spawnSync("python", [script], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse((result.stdout || "").trim().split(/\r?\n/).pop());
  assert.equal(payload.previewRows, 2);
  assert.equal(payload.effectiveRows, 1);
  assert.equal(payload.manualEligible, false);
  assert.equal(payload.policy, "archived_only");
  assert.match(payload.previewPath, /by_plan\/.*results_preview_all\.csv/);
  assert.match(payload.effectivePath, /by_plan\/.*results_effective_archived\.csv/);
});

test("result views distinguish preview and archived CSV", () => {
  const agent = readSource("src/clusterAgentRuntime.ts");
  assert.match(agent, /summary\["inclusionPolicy"\] = "archived_only"/);
  assert.match(agent, /str\(record\.get\("finalEvidenceState"\) or ""\)\.lower\(\) == "archived"/);
  assert.match(agent, /results_preview_all\.csv/);
  assert.match(agent, /results_effective_archived\.csv/);
});
