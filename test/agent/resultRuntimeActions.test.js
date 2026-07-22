const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");

test("hub agent runtime performs real result actions", (t) => {
  const python = process.env.PYTHON || "python";
  const probe = spawnSync(python, ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    t.skip("python unavailable");
    return;
  }
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-agent-results-"));
  fs.mkdirSync(path.join(project, "experiments", "results"), { recursive: true });
  fs.writeFileSync(
    path.join(project, "experiments", "results", "metrics.csv"),
    [
      "experiment_id,suite,run_key,dataset,split,seed,metric,value",
      "e1,classification,r1,VinDr,test,1,AUC,0.91",
      "e1,classification,r1,VinDr,test,1,accuracy,0.82",
    ].join("\n"),
    "utf8",
  );
  const script = path.join(project, "action-smoke.py");
  fs.writeFileSync(script, `
import importlib.util, json, pathlib, os
root = pathlib.Path(${JSON.stringify(project)})
agent_path = pathlib.Path(${JSON.stringify(path.join(root, "dist", "runtime", "cluster_agent.py"))})
spec = importlib.util.spec_from_file_location("agent", agent_path)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
out = {
    "parse-results": agent.handle_action(str(root), "parse-results", {"opId": "parse-results", "operationId": "parse-results"}, "parse-results", "parse-results"),
    "archive-artifacts": agent.handle_action(str(root), "archive-artifacts", {"opId": "archive-artifacts", "operationId": "archive-artifacts", "selectedArchiveKeys": ["experiments/results/metrics.csv"]}, "archive-artifacts", "archive-artifacts"),
}
for action in ["run-quality-gate", "run-statistics", "export-paper-table", "create-debug-bundle"]:
    out[action] = agent.handle_action(str(root), action, {"opId": action, "operationId": action}, action, action)
print(json.dumps(out, ensure_ascii=False))
`, "utf8");
  const run = spawnSync(python, [script], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout.trim());
  assert.equal(result["parse-results"].status, "completed");
  assert.equal(result["parse-results"].resultCount, 1);
  assert.equal(result["archive-artifacts"].status, "completed");
  assert.equal(result["run-quality-gate"].qualityGate.status, "passed");
  assert.equal(result["run-statistics"].statistics.rows.length, 1);
  assert.match(result["export-paper-table"].paperTablePath, /paper\/tables\/zlk_results_table\.md/);
  assert.match(result["create-debug-bundle"].debugBundlePath, /zlk_cluster\/debug\/debug_bundle_/);
  assert.equal(fs.existsSync(path.join(project, "zlk_cluster", "results", "summary.json")), true);
  assert.match(
    fs.readFileSync(path.join(project, "zlk_cluster", "results", "results_effective_archived.csv"), "utf8"),
    /,archived,True/,
  );
  assert.equal(fs.existsSync(path.join(project, "paper", "tables", "zlk_results_table.md")), true);
});
