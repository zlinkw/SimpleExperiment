const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");

test("agent runtime prunes terminal in-memory records while keeping active records", (t) => {
  const python = process.env.PYTHON || "python";
  const probe = spawnSync(python, ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    t.skip("python unavailable");
    return;
  }
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-agent-memory-budget-"));
  const script = path.join(project, "memory-budget.py");
  fs.writeFileSync(script, `
import importlib.util, json, pathlib
agent_path = pathlib.Path(${JSON.stringify(path.join(root, "dist", "runtime", "cluster_agent.py"))})
spec = importlib.util.spec_from_file_location("agent", agent_path)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

agent.UPLOADS.clear()
for i in range(agent.MAX_UPLOAD_RECORDS + 30):
    agent.UPLOADS[f"upload-{i}"] = {"status": "completed", "transferredBytes": i}
agent.UPLOADS["running-old"] = {"status": "running", "transferredBytes": 0}

agent.WORKER_COMMAND_RESULTS.clear()
for i in range(agent.MAX_WORKER_COMMAND_RESULT_RECORDS + 30):
    agent.WORKER_COMMAND_RESULTS[f"cmd-{i}"] = {"status": "completed", "seq": i}

agent.WORKER_ACTION_LAST_AT.clear()
agent.WORKER_ACTION_INFLIGHT.clear()
for i in range(agent.MAX_WORKER_ACTION_KEY_RECORDS + 30):
    agent.WORKER_ACTION_LAST_AT[f"worker-{i}"] = i
agent.WORKER_ACTION_INFLIGHT["worker-0"] = 1

agent.prune_runtime_memory_state()
print(json.dumps({
    "uploads": len(agent.UPLOADS),
    "uploadOld": "upload-0" in agent.UPLOADS,
    "uploadNew": f"upload-{agent.MAX_UPLOAD_RECORDS + 29}" in agent.UPLOADS,
    "uploadRunning": "running-old" in agent.UPLOADS,
    "results": len(agent.WORKER_COMMAND_RESULTS),
    "resultOld": "cmd-0" in agent.WORKER_COMMAND_RESULTS,
    "resultNew": f"cmd-{agent.MAX_WORKER_COMMAND_RESULT_RECORDS + 29}" in agent.WORKER_COMMAND_RESULTS,
    "actionKeys": len(agent.WORKER_ACTION_LAST_AT),
    "actionOldActive": "worker-0" in agent.WORKER_ACTION_LAST_AT,
    "actionOldInactive": "worker-1" in agent.WORKER_ACTION_LAST_AT,
    "actionNew": f"worker-{agent.MAX_WORKER_ACTION_KEY_RECORDS + 29}" in agent.WORKER_ACTION_LAST_AT,
}, ensure_ascii=False))
`, "utf8");
  const run = spawnSync(python, [script], { cwd: root, encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout.trim());
  assert.equal(result.uploads, 120);
  assert.equal(result.uploadOld, false);
  assert.equal(result.uploadNew, true);
  assert.equal(result.uploadRunning, true);
  assert.equal(result.results, 240);
  assert.equal(result.resultOld, false);
  assert.equal(result.resultNew, true);
  assert.equal(result.actionKeys, 240);
  assert.equal(result.actionOldActive, true);
  assert.equal(result.actionOldInactive, false);
  assert.equal(result.actionNew, true);
});