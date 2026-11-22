const assert = require("node:assert/strict");
const fs = require("node:fs"), http = require("node:http"), os = require("node:os"), path = require("node:path");
const test = require("node:test");
require("../_helpers/registerTsRequire");
const { queryProject } = require("../../src/mcp/ProjectQueries.ts");
const runId = "run0-123456-123", workflowId = "workflow-run-1", plan = "experiments/plans/baseline.yaml";
async function callMcp(root, apiFile, args) {
  const {baseUrl} = JSON.parse(fs.readFileSync(apiFile, "utf8"));
  const url = new URL(baseUrl);
  assert.equal(url.hostname, "127.0.0.1");
  const rpc = async (method, params) => {
    const response = await fetch(url, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({jsonrpc:"2.0",id:1,method,params})});
    const data = await response.json();
    if (data.error) throw Error(data.error.message);
    return data.result;
  };
  const options = {id:args[1] && !args[1].startsWith("--") ? args[1] : undefined, full:args.includes("--full")};
  if (args.includes("--type")) options.type = args[args.indexOf("--type")+1];
  return {code:0, body:await queryProject(root,rpc,"experiment_"+args[0],options)};
}

test("rate-limited snapshots keep the last run while classification stays stable", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-worker-ratelimit-"));
  const sharedPlan = "experiments/plans/baseline.yaml";
  const firstWorkflow = "run-plan-111-aaaa";
  const secondWorkflow = "run-plan-222-bbbb";
  const otherRunId = "run0-123456-124";
  const phases = ["success", "limited", "recovered"];
  let phase = 0;
  const server = http.createServer((req, res) => {
    if(req.url==='/api/v1/capabilities') {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',name:'SimpleExperiment',version:'0.0.0-fake',instanceId:'4242:2026-01-01T00:00:00.000Z',methods:['status','invoke','tasks.list','operations.list','state.get','live.output']}));return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const { id, method, params } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const current = phases[Math.min(phase, phases.length - 1)];
      if (method === "tasks.list") phase += 1;
      const result = method === "tasks.list" ? taskPayload(current, sharedPlan, firstWorkflow, secondWorkflow, otherRunId)
        : method === "operations.list" ? operationPayload(sharedPlan, firstWorkflow, secondWorkflow)
        : method === "live.output" ? livePayload(params && params.runKey, otherRunId)
        : {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const apiFile = path.join(root, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test", name: "SimpleExperiment", version: "0.0.0-fake", pid: 4242, startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");

  const first = await callMcp(root, apiFile, ["list"]);
  assert.equal(first.body.find((row) => row.id === runId).type, "worker_run");
  assert.equal(first.body.find((row) => row.id === runId).parent_id ?? "", "");
  assert.equal(first.body.find((row) => row.id === otherRunId).parent_id, secondWorkflow);
  assert.equal(first.body.find((row) => row.id === firstWorkflow).type, "workflow");
  assert.equal(first.body.some((row) => row.id === "validate-plan-1" || row.id === "stop-scheduler-1"), false);
  const historyFile = path.join(root, "simple_cluster", "tmp", "worker_task_snapshots", "worker-a.json");
  const history = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  assert.equal(history.rows.length, 2);
  assert.equal("raw" in history.rows[0], false);
  assert.equal("logPath" in history.rows[0], false);

  const limited = await callMcp(root, apiFile, ["list"]);
  assert.equal(limited.body.find((row) => row.id === runId).type, "worker_run");
  assert.equal(limited.body.find((row) => row.id === runId).status, "running");
  const limitedInspect = await callMcp(root, apiFile, ["inspect", runId]);
  assert.equal(limitedInspect.body.summary.type, "worker_run");
  assert.equal(limitedInspect.body.summary.status, "running");

  const aged = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  aged.rows.find((row) => row.id === runId).updated = "2026-09-23T00:04:00Z";
  fs.writeFileSync(historyFile, JSON.stringify(aged), "utf8");
  const recovered = await callMcp(root, apiFile, ["inspect", runId]);
  assert.equal(recovered.body.summary.type, "worker_run");
  assert.equal(recovered.body.summary.status, "unknown");
  assert.match(recovered.body.diagnosis.latest_message, new RegExp(runId));
  assert.doesNotMatch(recovered.body.diagnosis.latest_message, new RegExp(otherRunId));
  const other = await callMcp(root, apiFile, ["inspect", otherRunId]);
  assert.match(other.body.diagnosis.latest_message, new RegExp(otherRunId));
  assert.doesNotMatch(other.body.diagnosis.latest_message, new RegExp(runId));
});

test("Scheduler operation provenance overrides stale experiment index", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-operation-provenance-"));
  const workflow = "run-plan-provenance";
  const indexFile = path.join(root, "simple_cluster", "experiment_index.json");
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });
  fs.writeFileSync(indexFile, JSON.stringify([
    { global_job_id: workflow, type: "workflow", status: "running", plan: "stale-plan.yaml", started_at: "2026-09-23T00:00:00Z" },
  ]), "utf8");
  const server = http.createServer((req, res) => {
    if(req.url==='/api/v1/capabilities') {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',name:'SimpleExperiment',version:'0.0.0-fake',instanceId:'4242:2026-01-01T00:00:00.000Z',methods:['status','invoke','tasks.list','operations.list','state.get','live.output']}));return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const { id, method } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = method === "tasks.list"
        ? { schedulerStates: [], experimentTraces: [], workerTasks: [] }
        : method === "operations.list"
          ? { records: [{
            operationId: workflow,
            type: "run-plan",
            status: "interrupted",
            planFile: "experiments/plans/real.yaml",
            workerId: "worker-a",
            startedAt: "2026-09-23T00:00:00Z",
            updatedAt: "2026-09-23T00:10:00Z",
          }] }
          : method === "state.get" ? { value: { workerTunnels: [] } } : {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const apiFile = path.join(root, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test", name: "SimpleExperiment", version: "0.0.0-fake", pid: 4242, startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");

  const listed = await callMcp(root, apiFile, ["list", "--full"]);
  assert.equal(listed.code, 0);
  const row = listed.body.find((item) => item.id === workflow);
  assert.equal(row.type, "workflow");
  assert.equal(row.status, "cancelled");
  assert.equal(row.status_source, "scheduler");
  assert.equal(row.plan, "experiments/plans/real.yaml");
  assert.equal(row.worker_id, "worker-a");

  const inspected = await callMcp(root, apiFile, ["inspect", workflow]);
  assert.equal(inspected.body.summary.status, "cancelled");
  assert.equal(inspected.body.status.status, "cancelled");
  assert.equal(inspected.body.status.plan, "experiments/plans/real.yaml");
  assert.equal(inspected.body.snapshot.runtime_source, "history");

  const tree = await callMcp(root, apiFile, ["tree"]);
  const node = tree.body.find((item) => item.id === workflow);
  assert.equal(node.status, "cancelled");
  assert.equal(node.status_source, "scheduler");
  assert.equal(node.children_count, 0);
});

test("historical Worker task gains and retains a unique workflow parent", async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-worker-parent-"));
  const workflow = "run-plan-1790156858344-oz9lwg";
  const workerRun = "run0-866039-975";
  const planFile = "experiments/plans/demo.yaml";
  const indexFile = path.join(root, "simple_cluster", "experiment_index.json");
  fs.mkdirSync(path.dirname(indexFile), { recursive: true });
  fs.writeFileSync(indexFile, JSON.stringify([
    { global_job_id: workflow, type: "workflow", status: "failed", plan: planFile, started_at: "2026-09-23T00:00:00Z", finished_at: "2026-09-23T00:10:00Z" },
  ]), "utf8");
  let tasksVisible = true;
  const server = http.createServer((req, res) => {
    if(req.url==='/api/v1/capabilities') {
      res.writeHead(200,{'content-type':'application/json'});
      res.end(JSON.stringify({schemaVersion:1,rpc:'json-rpc-2.0',name:'SimpleExperiment',version:'0.0.0-fake',instanceId:'4242:2026-01-01T00:00:00.000Z',methods:['status','invoke','tasks.list','operations.list','state.get','live.output']}));return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const { id, method } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = method === "operations.list"
        ? { records: [{ operationId: workflow, type: "run-plan", status: "failed", startedAt: "2026-09-23T00:00:00Z", finishedAt: "2026-09-23T00:10:00Z" }] }
        : method === "tasks.list"
          ? { workerTasks: tasksVisible ? [{ workerId: "worker-a", generatedAt: "2026-09-23T00:07:00Z", tasks: [
            { runKey: workerRun, status: "failed", planFile, workerId: "worker-a", startedAt: "2026-09-23T00:05:00Z", finishedAt: "2026-09-23T00:07:00Z", logPath: "secret.log" },
          ] }] : [] }
          : method === "state.get" ? { value: { workerTunnels: [] } } : {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {server.closeAllConnections();return new Promise(resolve=>server.close(resolve));});
  const apiFile = path.join(root, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test", name: "SimpleExperiment", version: "0.0.0-fake", pid: 4242, startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");

  const listed = await callMcp(root, apiFile, ["list", "--full"]);
  assert.equal(listed.code, 0);
  assert.equal(listed.body.find((row) => row.id === workerRun)?.parent_id, workflow);
  const historyFile = path.join(root, "simple_cluster", "tmp", "worker_task_snapshots", "worker-a.json");
  const cached = JSON.parse(fs.readFileSync(historyFile, "utf8"));
  assert.equal(cached.rows.find((row) => row.id === workerRun)?.parent_id, workflow);
  assert.equal("raw" in cached.rows[0], false);
  assert.equal("logPath" in cached.rows[0], false);

  tasksVisible = false;
  const tree = await callMcp(root, apiFile, ["tree"]);
  const node = tree.body.find((row) => row.id === workflow);
  assert.equal(node?.children_count, 1);
  assert.equal(node?.children?.[0]?.id, workerRun);
  assert.equal(node?.status_source, "aggregate");
  const inspectedWorkflow = await callMcp(root, apiFile, ["inspect", workflow]);
  assert.equal(inspectedWorkflow.body.snapshot.runtime_source, "history");
  const status = await callMcp(root, apiFile, ["status", workflow, "--full"]);
  assert.equal(status.body.children?.[0]?.id, workerRun);
});

function taskPayload(phase, planFile, firstWorkflow, secondWorkflow, otherRunId) {
  if (phase === "limited") {
    return { workerTasks: [{ workerId: "worker-a", tasks: [], error: "Worker task snapshot rate_limited", generatedAt: "2026-09-23T00:05:00Z" }] };
  }
  return { workerTasks: [{ workerId: "worker-a", schemaVersion: 1, generatedAt: new Date().toISOString(), tasks: [
    { operationId: firstWorkflow, status: "running", planFile, workerId: "worker-a" },
    ...(phase === "recovered" ? [] : [{ runKey: runId, status: "running", planFile, workerId: "worker-a", startedAt: "2026-09-23T00:02:00Z", logPath: "secret.log", largeConfig: { secret: "never-cache" } }]),
    { runKey: otherRunId, workflowId: secondWorkflow, status: "running", planFile, workerId: "worker-a", startedAt: "2026-09-23T00:03:00Z" },
  ] }] };
}

function operationPayload(planFile, firstWorkflow, secondWorkflow) {
  return { records: [
    { operationId: firstWorkflow, type: "run-plan", status: "running", planFile, workerId: "worker-a", startedAt: "2026-09-23T00:00:00Z" },
    { operationId: secondWorkflow, type: "workflow-run", status: "running", planFile, workerId: "worker-a", startedAt: "2026-09-23T00:01:00Z" },
    { operationId: "validate-plan-1", type: "validate-plan", status: "completed", planFile },
    { operationId: "stop-scheduler-1", type: "stop-scheduler-operation", status: "completed", planFile },
  ] };
}

function livePayload(requested, otherRunId) {
  return { output: { runKey: requested }, text: `${requested} epoch 1`, logs: [
    { runKey: runId, text: `${runId} epoch 1` },
    { runKey: otherRunId, text: `${otherRunId} epoch 2` },
  ] };
}
