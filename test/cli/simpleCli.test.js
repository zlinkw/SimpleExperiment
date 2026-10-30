const { assert, fs, http, os, path, test, spawn, root, cli, validPlan, invalidPlan, runCli, writeProject, wrappedRuntimeCapture, corimObservation, FAILURE_KEYS, physicalWorkerFixture } = require("./simpleCli.support.cjs");

test("simpleex --help lists domains", async () => {
  const result = await runCli(["--help"]);
  assert.equal(result.code, 0);
  assert.match(result.stdout, /simpleex/);
  for (const domain of ["project", "experiment", "plan", "result", "gpu", "server", "artifact"]) {
    assert.match(result.stdout, new RegExp(domain));
  }
});

test("simpleex run is refused: experiment execution goes through the API path", async () => {
  const result = await runCli(["run", "--name", "manual", "--", process.execPath, "-e", "console.log('AUC: 0.9')", "--json"]);
  assert.equal(result.code, 1);
  const body = JSON.parse(result.stdout);
  assert.equal(body.success, false);
  assert.match(body.error.message + body.error.detail, /recorded local run removed/);
  assert.match(body.error.detail, /experiment run/);
});

test("simpleex project status is human readable and json", async () => {
  const human = await runCli(["project", "status"]);
  assert.equal(human.code, 0);
  assert.match(human.stdout, /Project:/);
  assert.match(human.stdout, /Services:/);
  assert.match(human.stdout, /Status:/);

  const json = await runCli(["project", "status", "--json"]);
  assert.equal(json.code, 0);
  const payload = JSON.parse(json.stdout);
  assert.ok(payload.name);
  assert.ok(payload.root);
  assert.ok("version" in payload);
  assert.ok(payload.services.experiment);
  assert.ok(payload.services.cluster);
  assert.ok(payload.services.api);
});

test("project root uses Local API workspace from unrelated cwd and explicit env takes priority", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-root-"));
  const project = path.join(parent, "MultiModal");
  const override = path.join(parent, "ExplicitProject");
  writeProject(project, { "experiments/plans/plan.yaml": "name: test\n" });
  writeProject(override, { "experiments/plans/plan.yaml": "name: override\n" });
  const server = http.createServer((req, res) => {
    if (req.url === "/api/v1/capabilities") {
      res.end(JSON.stringify({ schemaVersion: 1, rpc: "json-rpc-2.0", name: "SimpleExperiment", version: "0.5.60", instanceId: "4242:2026-01-01T00:00:00.000Z", methods: ["status"] }));
      return;
    }
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const { id, method } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      const result = method === "status" ? { workspace: project, version: "0.5.60" } : {};
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const apiFile = path.join(parent, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test", name: "SimpleExperiment", version: "0.5.60", pid: 4242, startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");
  const resolved = await runCli(["project", "status", "--json"], { cwd: parent, apiFile });
  assert.equal(resolved.code, 0);
  assert.equal(JSON.parse(resolved.stdout).root, project);
  assert.equal(JSON.parse(resolved.stdout).services.experiment, "ready");

  const explicit = await runCli(["project", "status", "--json"], {
    cwd: parent, apiFile, env: { SIMPLE_EXPERIMENT_PROJECT_ROOT: override },
  });
  assert.equal(explicit.code, 0);
  assert.equal(JSON.parse(explicit.stdout).root, override);
  const invalid = await runCli(["project", "status", "--json"], {
    cwd: parent, apiFile, env: { SIMPLE_EXPERIMENT_PROJECT_ROOT: path.join(parent, "missing") },
  });
  assert.equal(invalid.code, 2);
  assert.equal(JSON.parse(invalid.stdout).error.code, "ENV");
});

test("simpleex plan validate uses the host contract and reports its failures", require("./serverPlanValidation.support.cjs"));

test("simpleex experiment list --json is parseable and filterable", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-exp-"));
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "exp-ok", case: "baseline", status: "completed", started_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T01:00:00Z" },
      { global_job_id: "exp-bad", case: "ablation", status: "failed", started_at: "2026-01-02T00:00:00Z", finished_at: "2026-01-02T01:00:00Z" },
    ], null, 2),
  });
  const listed = await runCli(["experiment", "list", "--json", "--full"], { cwd: dir });
  assert.equal(listed.code, 0);
  const rows = JSON.parse(listed.stdout);
  assert.ok(Array.isArray(rows));
  assert.equal(rows.length, 2);
  for (const row of rows) {
    assert.ok("id" in row);
    assert.ok("name" in row);
    assert.ok("status" in row);
    assert.ok("created" in row);
    assert.ok("updated" in row);
  }
  const failed = await runCli(["experiment", "list", "--status", "failed", "--json", "--full"], { cwd: dir });
  assert.equal(JSON.parse(failed.stdout).length, 1);
  const limited = await runCli(["experiment", "list", "--limit", "1", "--json"], { cwd: dir });
  assert.equal(JSON.parse(limited.stdout).length, 1);
  const status = await runCli(["experiment", "status", "exp-bad", "--json", "--full"], { cwd: dir });
  assert.equal(status.code, 0);
  const detail = JSON.parse(status.stdout);
  assert.equal(detail.status, "failed");
  assert.ok("stage" in detail);
  assert.ok("node" in detail);
  assert.ok("recentLogs" in detail);
  assert.ok("error" in detail);
  assert.ok("outputDir" in detail);
});

test("workflow terminal aliases normalize to canonical public statuses", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-terminal-status-"));
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "wf-interrupted", type: "workflow", status: "interrupted" },
      { global_job_id: "wf-completed-errors", type: "workflow", status: "completed_with_errors" },
      { global_job_id: "run-normal", type: "worker_run", status: "normal_completed" },
      { global_job_id: "run-manual-stop", type: "worker_run", status: "manual_interrupted_completed" },
    ]),
  });
  const rows = JSON.parse((await runCli(["experiment", "list", "--json", "--full"], { cwd: dir })).stdout);
  const statuses = Object.fromEntries(rows.map((row) => [row.id, row.status]));
  assert.equal(statuses["wf-interrupted"], "cancelled");
  assert.equal(statuses["wf-completed-errors"], "failed");
  assert.equal(statuses["run-normal"], "success");
  assert.equal(statuses["run-manual-stop"], "cancelled");
  const cancelled = JSON.parse((await runCli(["experiment", "list", "--status", "cancelled", "--json"], { cwd: dir })).stdout);
  assert.deepEqual(cancelled.map((row) => row.id).sort(), ["run-manual-stop", "wf-interrupted"]);
  const unknown = JSON.parse((await runCli(["experiment", "list", "--status", "unknown", "--json"], { cwd: dir })).stdout);
  assert.equal(unknown.some((row) => ["wf-interrupted", "run-manual-stop"].includes(row.id)), false);
  const inspected = JSON.parse((await runCli(["experiment", "inspect", "wf-interrupted", "--json"], { cwd: dir })).stdout);
  assert.equal(inspected.summary.status, "cancelled");
});

test("simpleex experiment run --dry-run does not submit", async () => {
  const result = await runCli(["experiment", "run", validPlan, "--dry-run", "--json"]);
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.dryRun, true);
  assert.equal(payload.submitted, false);
  assert.equal(payload.ready, false);
  assert.equal(payload.validation, "local_only");
  assert.equal(payload.submitPath, "workflow.run");
  assert.equal(payload.runner, "SimpleExperiment Local API");
});

test("simpleex experiment run without API is env error", async () => {
  const result = await runCli(["experiment", "run", validPlan, "--json"]);
  assert.equal(result.code, 2);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.success, false);
  assert.equal(payload.error.code, "ENV");
});

test("simpleex experiment retry reuses lifecycle without submitting", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-retry-"));
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "exp-bad", case: "ablation", status: "failed", started_at: "2026-01-02T00:00:00Z", finished_at: "2026-01-02T01:00:00Z", suite: "smoke" },
    ], null, 2),
  });
  const result = await runCli(["experiment", "retry", "exp-bad", "--from", "failed_stage", "--json"], { cwd: dir });
  assert.equal(result.code, 0);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.id, "exp-bad");
  assert.equal(payload.from, "failed_stage");
  assert.equal(payload.submitted, false);
  assert.ok(payload.lifecycle);
});

test("simpleex plan list and matrix reuse PlanBuilder", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-plan-"));
  writeProject(dir, {
    "experiments/plans/baseline.yaml": fs.readFileSync(validPlan, "utf8"),
  });
  const listed = await runCli(["plan", "list", "--json"], { cwd: dir });
  assert.equal(listed.code, 0);
  const rows = JSON.parse(listed.stdout);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 1);
  for (const row of rows) {
    assert.ok("name" in row);
    assert.ok("path" in row);
    assert.ok("status" in row);
    assert.ok("validation" in row);
  }
  const matrix = await runCli(["plan", "matrix", "experiments/plans/baseline.yaml", "--json"], { cwd: dir });
  assert.equal(matrix.code, 0);
  const payload = JSON.parse(matrix.stdout);
  assert.ok(typeof payload.count === "number");
  assert.ok(payload.count >= 1);
});

test("simpleex result list show export reuse Results", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-result-"));
  writeProject(dir, {
    "simple_cluster/results/result_registry.json": JSON.stringify({
      records: [{
        schemaVersion: 1,
        resultId: "res-1",
        experimentId: "exp-ok",
        runKey: "exp-ok",
        suite: "smoke",
        experimentName: "baseline",
        status: "parsed",
        sourceFiles: [{ path: "experiments/results/smoke.csv", type: "csv", endpoint: "local" }],
        metrics: { accuracy: { value: 0.91 } },
        dimensions: { seed: 42, suite: "smoke" },
        primaryMetric: "accuracy",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T01:00:00Z",
        provenance: { configPath: "configs/base.yaml", artifactKey: "ckpt.pt" },
      }],
    }, null, 2),
  });
  const listed = await runCli(["result", "list", "--json", "--history"], { cwd: dir });
  assert.equal(listed.code, 0);
  const rows = JSON.parse(listed.stdout);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, "res-1");
  const filtered = await runCli(["result", "list", "--experiment", "exp-ok", "--json", "--history"], { cwd: dir });
  assert.equal(JSON.parse(filtered.stdout).length, 1);
  const shown = await runCli(["result", "show", "res-1", "--json", "--history"], { cwd: dir });
  assert.equal(shown.code, 0);
  const detail = JSON.parse(shown.stdout);
  assert.ok("metrics" in detail);
  assert.ok("time" in detail);
  assert.ok("config" in detail);
  assert.ok("seed" in detail);
  assert.ok("checkpoint" in detail);
  assert.ok("outputFiles" in detail);
  const exported = await runCli(["result", "export", "res-1", "--format", "json", "--json", "--history"], { cwd: dir });
  assert.equal(exported.code, 0);
  const exportPayload = JSON.parse(exported.stdout);
  assert.equal(exportPayload.format, "json");
  assert.equal(exportPayload.id, "res-1");
});

test("loadResults uses only the active query and excludes diagnostic log records", async () => {
  const api = require("../../dist/cli/api.js");
  const { loadResults } = require("../../dist/cli/commands/result.js");
  const original = api.callApi, optional = api.optionalApi;
  const record = {resultId:"worker-result-1",experimentId:"suite/baseline/seed_7",runKey:"run",status:"parsed",
    metrics:{accuracy:{value:0.91}},dimensions:{seed:7},primaryMetric:"accuracy",
    sourceFiles:[{path:"experiments/results/demo.csv",type:"csv",endpoint:"worker"}]};
  api.optionalApi=async()=>assert.fail("current results cannot use legacy Worker enrichment");
  api.callApi=async(method)=>{assert.equal(method,"results.list");return {source:"active_query",summary:{current:true,observedAt:"2026-10-30T00:00:00Z"},
    results:[record,{...record,resultId:"worker-stderr-row0",sourceFiles:[{path:"work_dirs/demo/stderr.log",type:"text",endpoint:"worker"}]}]};};
  try {
    const rows=await loadResults();assert.equal(rows.length,1);
    assert.equal(rows[0].experimentId,"suite/baseline/seed_7");assert.equal(rows[0].primaryValue,0.91);
    assert.equal(rows[0].source,"active_query");assert.equal(rows[0].current,true);
  } finally { api.callApi=original;api.optionalApi=optional; }
});

test("simpleex gpu status and server list stay offline-safe", async () => {
  const gpu = await runCli(["gpu", "status", "--json"]);
  assert.equal(gpu.code, 0);
  const gpuRows = JSON.parse(gpu.stdout);
  assert.ok(Array.isArray(gpuRows));
  const server = await runCli(["server", "list", "--json"]);
  assert.equal(server.code, 0);
  const serverRows = JSON.parse(server.stdout);
  assert.ok(Array.isArray(serverRows));
  assert.ok(serverRows.length >= 1);
  assert.ok("id" in serverRows[0]);
  assert.ok("online" in serverRows[0]);
  assert.ok("ssh" in serverRows[0]);
  assert.ok("gpu" in serverRows[0]);
});

test('active result rows retain exact identities across order changes and failed queries never use local history',async()=>{
 const api=require('../../dist/cli/api.js'),data=require('../../dist/cli/data.js');
 const {loadResults,resultShow,resultExport}=require('../../dist/cli/commands/result.js');
 const format=require('../../dist/cli/format.js');
 const priorApi=api.callApi,priorRoot=data.projectRoot(),priorWrite=format.writeJson;
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cli-current-results-'));
 writeProject(dir,{'simple_cluster/results/result_registry.json':JSON.stringify({records:[{resultId:'stale',experimentId:'old',metrics:{auc:{value:1}},sourceFiles:[]}]})});
 const make=(workerId,runId,seed,endpoint)=>({planFile:'plans/p.yaml',workerId,runId,workflowId:'p',revision:'r',codeFingerprint:'hash',
  dimensions:{case:'baseline',seed,eval_protocol:endpoint,dataset:'bus'},metrics:{auc:0.8+seed/100},sourceFiles:[{path:'work/'+runId}],
  completionState:'verified',aggregationState:'eligible'});
 let records=[make('a','run-0',0,'clean'),make('a','run-0',1,'clean'),make('a','run-0',0,'shift'),make('b','run-0',0,'clean')],current=true,calls=0,output='';
 api.callApi=async(method)=>{calls++;assert.equal(method,'results.list');return {source:'active_query',results:records.slice(0,1),summary:{current,observedAt:'2026-10-30T00:00:00Z',results:records}};};
 try{
  data.setProjectRoot(dir);const rows=await loadResults();assert.equal(rows.length,4);assert.equal(new Set(rows.map(r=>r.id)).size,4);assert.ok(rows.every(r=>r.current&&r.source==='active_query'));
  records.reverse();assert.deepEqual((await loadResults()).map(r=>r.id).sort(),rows.map(r=>r.id).sort());
  const zero=rows[0];format.writeJson=value=>{output=JSON.stringify(value);};
  await assert.rejects(resultShow('run-0',{json:true}),error=>{
    assert.match(error.message,/RESULT_SELECTION_AMBIGUOUS/);assert.equal(JSON.parse(error.detail).candidates.length,4);return true;
  });
  const ambiguousOut=path.join(dir,'ambiguous.json');fs.writeFileSync(ambiguousOut,'keep selected export','utf8');
  await assert.rejects(resultExport('run-0',{json:true,out:ambiguousOut}),/RESULT_SELECTION_AMBIGUOUS/);
  assert.equal(fs.readFileSync(ambiguousOut,'utf8'),'keep selected export');
  await resultShow(zero.id,{json:true});let detail=JSON.parse(output);assert.equal(detail.seed,0);assert.equal(detail.metrics.auc,0.8);assert.equal(detail.current,true);
  output='';await resultExport(zero.id,{json:true,format:'json'});const exported=JSON.parse(output);assert.equal(exported.current,true);assert.equal(JSON.parse(exported.content).metrics.auc,0.8);assert.equal(JSON.parse(exported.content).rows.length,1);
  records=[make('a','unique-command',0,'clean')];await resultShow('unique-command',{json:true});assert.equal(JSON.parse(output).experimentId,'unique-command');
  const dest=path.join(dir,'existing-export.json');fs.writeFileSync(dest,'keep existing export','utf8');current=false;
  await assert.rejects(resultExport(zero.id,{json:true,out:dest}),/RESULT_QUERY_UNVERIFIED/);assert.equal(fs.readFileSync(dest,'utf8'),'keep existing export');
  api.callApi=async()=>{throw Error('connection reset');};await assert.rejects(loadResults(),/connection reset/);
  const count=calls;const history=await loadResults({history:true});assert.equal(history.length,1);assert.equal(history[0].id,'stale');assert.equal(history[0].current,false);assert.equal(calls,count);
 }finally{api.callApi=priorApi;data.setProjectRoot(priorRoot);format.writeJson=priorWrite;}
});

test("GPU tasks require one matching running worker and GPU", () => {
  const { flattenGpus } = require("../../dist/cli/commands/gpu.js");
  const snapshot = { gpu: {
    nwpu2: { gpus: [{ index: 0 }, { index: 1 }] },
    nwpu3: { gpus: [{ index: 0 }] },
  } };
  const experiments = [
    { id: "workflow", type: "workflow", status: "running", worker_id: "nwpu2", gpu: { id: "0" } },
    { id: "nwpu2-gpu0", type: "worker_run", status: "running", worker_id: "nwpu2", gpu: { id: "0" } },
    { id: "nwpu2-gpu1", type: "worker_run", status: "running", worker_id: "nwpu2", gpu: { id: "1" } },
    { id: "nwpu3-gpu0", type: "worker_run", status: "running", worker_id: "nwpu3", gpu: { id: "0" } },
    { id: "finished", type: "worker_run", status: "success", worker_id: "nwpu2", gpu: { id: "0" } },
    { id: "missing-worker", type: "worker_run", status: "running", worker_id: "", gpu: { id: "0" } },
    { id: "missing-gpu", type: "worker_run", status: "running", worker_id: "nwpu2", gpu: null },
  ];
  const rows = flattenGpus(snapshot, experiments);
  assert.equal(rows.find((row) => row.server === "nwpu2" && row.gpu === "0").task, "nwpu2-gpu0");
  assert.equal(rows.find((row) => row.server === "nwpu2" && row.gpu === "1").task, "nwpu2-gpu1");
  assert.equal(rows.find((row) => row.server === "nwpu3" && row.gpu === "0").task, "nwpu3-gpu0");
});

test("simpleex artifact list from local run dir", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-art-"));
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "exp-ok", case: "baseline", status: "completed", hub_job_dir: "experiments/runs/exp-ok", started_at: "2026-01-01T00:00:00Z", finished_at: "2026-01-01T01:00:00Z" },
    ], null, 2),
    "experiments/runs/exp-ok/artifact_manifest.json": JSON.stringify({
      files: [{ path: "metrics.csv", size: 12 }],
    }, null, 2),
    "experiments/runs/exp-ok/metrics.csv": "metric,value\naccuracy,0.9\n",
  });
  const listed = await runCli(["artifact", "list", "exp-ok", "--json"], { cwd: dir });
  assert.equal(listed.code, 0);
  const rows = JSON.parse(listed.stdout);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 1);
  assert.ok("id" in rows[0]);
  assert.ok("path" in rows[0]);
  const dest = path.join(dir, "experiments", "downloads", "metrics.csv");
  const downloaded = await runCli(["artifact", "download", rows[0].id, "--out", dest, "--json"], { cwd: dir });
  assert.equal(downloaded.code, 0);
  const payload = JSON.parse(downloaded.stdout);
  assert.equal(payload.source, "local");
  assert.equal(fs.existsSync(payload.path || dest), true);
});

test("simpleex json errors are strict JSON", async () => {
  const result = await runCli(["experiment", "status", "--json"]);
  assert.equal(result.code, 1);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.success, false);
  assert.ok(payload.error.code);
  assert.ok(payload.error.message);
  assert.ok("detail" in payload.error);
});
