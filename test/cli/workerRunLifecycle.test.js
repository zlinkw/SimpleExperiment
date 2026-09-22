const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const test = require("node:test");

const cli = path.resolve(__dirname, "../../dist/cli.js");
const runId = "run0-123456-123";
const workflowId = "workflow-run-1";
const plan = "experiments/plans/baseline.yaml";

function callCli(root, apiFile, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "experiment", ...args, "--json"], {
      cwd: root,
      env: { ...process.env, SIMPLE_EXPERIMENT_API_FILE: apiFile },
    });
    let stdout = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString("utf8"); });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, body: JSON.parse(stdout) }));
  });
}

test("scheduler worker run remains listed and inspectable after runtime disappears", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-worker-run-"));
  const stateFile = path.join(root, "simple_cluster", "tmp", "cluster_scheduler", "baseline_state.json");
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(path.join(root, "simple_cluster", "experiment_index.json"), JSON.stringify([
    { global_job_id: runId, status: "failed", plan: "stale-plan.yaml", updated: "2026-09-22T00:00:00Z" },
  ]), "utf8");
  const started = "2026-09-23T00:00:00Z";
  const run = { session: runId, worker_id: "worker-a", gpu_id: "0", experiment_index: 0, output_dir: "work_dirs/baseline/case-a_seed7", started_at: started };
  const saveState = (bucket, row, updated) => fs.writeFileSync(stateFile, JSON.stringify({
    plan, scheduler_session: "scheduler-1", updated_at: updated,
    running_experiments: bucket === "running_experiments" ? [row] : [],
    completed_experiments: bucket === "completed_experiments" ? [row] : [],
    failed_experiments: bucket === "failed_experiments" ? [row] : [],
    stopped_experiments: bucket === "stopped_experiments" ? [row] : [],
  }), "utf8");
  saveState("running_experiments", run, started);
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const { id, method } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
      const result = method === "tasks.list"
        ? { schedulerStates: [state], experimentTraces: [] }
        : method === "operations.list"
          ? { records: [{ operationId: workflowId, type: "workflow-run", status: "running", planFile: plan, tmuxSession: "scheduler-1", startedAt: started }] }
          : method === "state.get" ? { value: { workerTunnels: [] } } : {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const apiFile = path.join(root, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test" }), "utf8");

  const active = await callCli(root, apiFile, ["list"]);
  assert.equal(active.code, 0);
  const worker = active.body.find((row) => row.id === runId);
  assert.equal(worker?.type, "worker_run");
  assert.equal(worker?.status, "running");
  assert.equal(worker?.parent_id, workflowId);
  assert.equal(active.body.filter((row) => row.id === runId).length, 1);
  assert.equal(worker?.plan, plan);

  saveState("completed_experiments", { ...run, status: "normal_completed", finished_at: "2026-09-23T00:03:00Z" }, "2026-09-23T00:03:00Z");
  const finished = await callCli(root, apiFile, ["list"]);
  assert.equal(finished.body.find((row) => row.id === runId)?.status, "success");
  const finishedInspect = await callCli(root, apiFile, ["inspect", runId]);
  assert.equal(finishedInspect.body.summary.status, "success");

  saveState("failed_experiments", { ...run, status: "failed", finished_at: "2026-09-23T00:04:00Z" }, "2026-09-23T00:04:00Z");
  const failed = await callCli(root, apiFile, ["list"]);
  assert.equal(failed.body.find((row) => row.id === runId)?.status, "failed");

  saveState("stopped_experiments", { ...run, status: "manual_interrupted_completed", manualInterrupted: true, finished_at: "2026-09-23T00:05:00Z" }, "2026-09-23T00:05:00Z");
  assert.equal(JSON.parse(fs.readFileSync(stateFile, "utf8")).stopped_experiments[0].session, runId);
  const after = await callCli(root, apiFile, ["list"]);
  assert.equal(after.code, 0);
  assert.equal(after.body.find((row) => row.id === runId)?.status, "cancelled");
  const inspected = await callCli(root, apiFile, ["inspect", runId]);
  assert.equal(inspected.code, 0);
  assert.equal(inspected.body.summary.id, runId);
  assert.equal(inspected.body.summary.type, "worker_run");
  assert.equal(inspected.body.summary.status, "cancelled");
  assert.equal(inspected.body.snapshot.runtime_source, "history");
});

test("scheduler-style artifact history survives without a live API", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-worker-history-"));
  const runsDir = path.join(root, "experiments", "runs");
  const runDir = path.join(runsDir, "run0-123456-123");
  fs.mkdirSync(runDir, { recursive: true });
  fs.mkdirSync(path.join(runsDir, "empty-directory"));
  fs.writeFileSync(path.join(runDir, "artifact_manifest.json"), JSON.stringify({ exitCode: 0, generatedAt: "2026-09-23T01:00:00Z" }), "utf8");
  const apiFile = path.join(root, "missing-api.json");
  const listed = await callCli(root, apiFile, ["list"]);
  assert.equal(listed.code, 0);
  assert.equal(listed.body.length, 1);
  assert.equal(listed.body[0].id, "run0-123456-123");
  assert.equal(listed.body[0].type, "worker_run");
  const inspected = await callCli(root, apiFile, ["inspect", "run0-123456-123"]);
  assert.equal(inspected.code, 0);
  assert.equal(inspected.body.summary.status, "success");
});
