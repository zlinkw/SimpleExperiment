const { assert, fs, http, os, path, test, spawn, root, cli, validPlan, invalidPlan, runCli, writeProject, wrappedRuntimeCapture, corimObservation, FAILURE_KEYS, physicalWorkerFixture } = require("./simpleCli.support.cjs");

test("CLI consumes exact native lifecycle facts and keeps completion separate from the current query", async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-native-lifecycle-"));
  const planFile = "experiments/plans/a.yaml", verifiedAt = "2026-10-30T00:00:00.000Z", queriedAt = "2026-11-02T00:00:00.000Z";
  writeProject(dir, { "simple_cluster/experiment_index.json": JSON.stringify([
    { global_job_id: "command-a", type: "run", status: "running", worker_id: "worker-a", plan: planFile, outputDir: "work_dirs/a" },
  ]) });
  const fact = { projectId: "project-a", workflowId: "workflow-a", lifecycleProtocol: 2, index: 0, workerId: "worker-a", commandId: "command-a", planFile,
    outputDir: "work_dirs/a", expectedJobCount: 3, status: "completed", executionState: "exited", resultState: "complete", completionState: "verified", successful: true, exitCode: 0,
    lastObservedAt: verifiedAt, queryState: "unknown", verifiedCompletion: { schemaVersion: 1, identity: "bound-proof", exitCode: 0, verifiedAt }, queryError: "本轮连接失败",
    artifactSync: { state: "partial", checkedAt: verifiedAt, error: "worker-b 同步失败" } };
  let nativeFacts = [fact,
    { ...fact, index: 1, commandId: "command-b", outputDir: "work_dirs/b", completionState: "unverified", successful: false, queryState: "observed", verifiedCompletion: undefined, queryError: undefined },
    { ...fact, index: 2, commandId: "", workerId: "", status: "pending", executionState: undefined, completionState: undefined, successful: false, queryState: "local_intent", artifactSync: undefined, verifiedCompletion: undefined, queryError: undefined },
    { ...fact, projectId: "other-project", index: 3, commandId: "foreign-command" }];
  const requests = [];
  const server = http.createServer((req, res) => {
    if (req.url === "/api/v1/capabilities") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ schemaVersion: 1, rpc: "json-rpc-2.0", name: "SimpleExperiment", version: "0.0.0-fake", instanceId: "4242:2026-01-01T00:00:00.000Z", methods: ["status", "tasks.list", "operations.list", "state.get"] }));
      return;
    }
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => {
      const { id, method } = JSON.parse(Buffer.concat(chunks).toString("utf8")); requests.push(method);
      const result = method === "tasks.list" ? { lifecycleProtocol: 2, stateSource: "active_query", projectId: "project-a", queriedAt,
        jobLifecycle: nativeFacts,
        workerTasks: [{ workerId: "worker-a", capabilities: { taskLifecycle: 2 }, tasks: [{ commandId: "command-a", lifecycleProtocol: 2, projectId: "project-a", status: "running", planFile }] }] }
        : method === "operations.list" ? { records: [{ id: "workflow-a", type: "run-plan", status: "completed", planFile, startedAt: "2026-10-29T00:00:00.000Z" }] } : method === "state.get" ? { value: { workerTunnels: [] } } : {};
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    });
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const apiFile = path.join(dir, "api.json");
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test", name: "SimpleExperiment", version: "0.0.0-fake", pid: 4242, startedAt: "2026-01-01T00:00:00.000Z" }), "utf8");
  const args = { cwd: dir, apiFile, env: { SIMPLE_EXPERIMENT_PROJECT_ROOT: dir } };
  const listed = await runCli(["experiment", "list", "--json"], args);
  assert.equal(listed.code, 0, listed.stderr);
  const rows = JSON.parse(listed.stdout), completed = rows.find(row => row.native_state?.command_id === "command-a");
  assert.equal(completed?.status, "success", JSON.stringify({ rows, requests }));
  assert.equal(completed.status_source, "native_lifecycle");
  assert.equal(completed.native_state.verified_at, verifiedAt);
  assert.equal(completed.native_state.queried_at, queriedAt);
  assert.equal(completed.native_state.query_error, "本轮连接失败");
  assert.equal(completed.native_state.query_state, "unknown");
  assert.equal(completed.observation_source, "active_query");
  assert.equal(completed.native_state.sync_state, "partial");
  assert.equal(completed.native_state.sync_error, "worker-b 同步失败", "sync failure does not revoke completion");
  assert.equal(rows.find(row => row.native_state?.command_id === "command-b")?.status, "unknown", "exit without log/output verification is not clean success");
  assert.equal(rows.find(row => row.native_state?.index === 2)?.status, "pending");
  assert.equal(rows.some(row => row.native_state?.command_id === "foreign-command"), false);
  const workflow = rows.find(row => row.native_summary);
  assert.equal(workflow?.status, "unknown", "submission completion is not whole-workflow execution success");
  assert.equal(workflow.native_summary.expected_count, 3);
  assert.equal(workflow.native_summary.verified_count, 1);
  assert.equal(workflow.native_summary.query_unknown_count, 1);
  assert.equal(workflow.id, "workflow-a", "the completed submission record was actually consumed");
  const status = await runCli(["experiment", "status", completed.id, "--json"], args);
  assert.equal(status.code, 0, status.stderr);
  assert.deepEqual(JSON.parse(status.stdout).native_state, completed.native_state);
  nativeFacts = [{ ...nativeFacts[2], expectedJobCount: 1 }];
  const pending = await runCli(["experiment", "list", "--json"], args);
  assert.equal(pending.code, 0, pending.stderr);
  assert.equal(JSON.parse(pending.stdout).find(row => row.native_summary)?.status, "pending");
  nativeFacts = [{ ...fact, expectedJobCount: 2 }];
  const missing = await runCli(["experiment", "list", "--json"], args);
  assert.equal(missing.code, 0, missing.stderr);
  assert.equal(JSON.parse(missing.stdout).find(row => row.native_summary)?.native_summary.missing_count, 1);
  assert.equal(JSON.parse(missing.stdout).find(row => row.native_summary)?.status, "unknown");
  nativeFacts = [{ ...fact, expectedJobCount: 1 }];
  const confirmed = await runCli(["experiment", "list", "--json"], args);
  assert.equal(confirmed.code, 0, confirmed.stderr);
  assert.equal(JSON.parse(confirmed.stdout).find(row => row.native_summary)?.status, "success", "a failed recheck does not undo verified workflow completion");
  assert.ok(requests.includes("tasks.list"));
  assert.ok(requests.every(method => ["status", "tasks.list", "operations.list", "state.get"].includes(method)));
});

test("native success requires zero exit and complete outputs; stop intent binds the Worker", () => {
  const { applyNativeJobLifecycle } = require("../../dist/cli/commands/experiment.js");
  const fact = { lifecycleProtocol: 2, projectId: "p", workflowId: "w", index: 0, commandId: "c", workerId: "a", planFile: "plans/a.yaml", outputDir: "work_dirs/a",
    status: "completed", completionState: "verified", resultState: "complete", successful: true, exitCode: 0, verifiedCompletion: { verifiedAt: "2026-10-30T00:00:00.000Z" }, stopIntent: { commandId: "c", workerId: "b" } };
  for (const change of [{}, { exitCode: undefined }, { exitCode: 1 }, { resultState: "unverified" }, { stopIntent: { commandId: "c", workerId: "a" } }]) {
    const rows = new Map();
    applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "p", jobLifecycle: [{ ...fact, ...change }] });
    const row = Array.from(rows.values()).find(row => row.native_state);
    const valid = !Object.hasOwn(change, "exitCode") && !Object.hasOwn(change, "resultState");
    assert.equal(row.status, valid ? "success" : "unknown");
    assert.equal(Boolean(row.native_state.verified_at), valid);
    assert.equal(row.native_state.stop_requested, Boolean(change.stopIntent));
  }
});

test("native lifecycle never borrows metadata from another Worker, workflow or output", () => {
  const { applyNativeJobLifecycle } = require("../../dist/cli/commands/experiment.js");
  const fact = { lifecycleProtocol: 2, projectId: "project-a", workflowId: "workflow-a", index: 0, commandId: "command-a", workerId: "worker-a", planFile: "plans/a.yaml", outputDir: "work_dirs/a", status: "running", executionState: "running" };
  for (const mismatch of [
    { worker_id: "worker-b" }, { parent_id: "workflow-b" }, { plan: "plans/b.yaml" }, { raw: { outputDir: "work_dirs/b" } },
    { raw: { projectId: "project-b" } }, { raw: { index: 1 } }, { raw: { commandId: "old-command" } }, { raw: { collectionResultCsv: "work_dirs/other/metrics.csv" } },
  ]) {
    const previous = { id: "command-a", run_id: "command-a", worker_id: "worker-a", parent_id: "workflow-a", plan: "plans/a.yaml", raw: { outputDir: "work_dirs/a" }, progress: { epoch: 999 }, ...mismatch };
    const rows = new Map([[previous.id, previous]]);
    applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "project-a", jobLifecycle: [fact] });
    assert.strictEqual(rows.get(previous.id), previous, JSON.stringify(mismatch));
    const native = Array.from(rows.values()).find(row => row.native_state);
    assert.equal(native.native_state.command_id, fact.commandId);
    assert.equal(native.worker_id, fact.workerId);
    assert.equal(native.progress, null, "foreign progress was not reused");
    assert.equal(native.native_state.output_dir, fact.outputDir);
  }
  const rows = new Map();
  applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "history", projectId: "project-a", jobLifecycle: [fact] });
  assert.equal(rows.size, 0, "historical receipts cannot pose as this round's active query");
  applyNativeJobLifecycle(rows, { lifecycleProtocol: 2, stateSource: "active_query", projectId: "project-a", jobLifecycle: [{ ...fact, projectId: "project-b" }] });
  assert.equal(rows.size, 0);
});

test("actual tasks.list reports a cold Worker query failure without revoking its saved completion", async () => {
  const ts = require("typescript"), vm = require("node:vm");
  const Q = require("../../dist/features/DistributedPlanQueue.js"), V = require("../../dist/features/VerifiedCompletion.js");
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8"), ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  let arrow;
  function visit(node) { if (ts.isPropertyAssignment(node) && node.name.getText(ast) === '"tasks.list"' && ts.isArrowFunction(node.initializer)) arrow = node.initializer; ts.forEachChild(node, visit); }
  visit(ast); assert.ok(arrow);
  const code = ts.transpileModule("function make(){return " + arrow.getText(ast) + ";} make;", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const make = vm.runInNewContext(code, { DistributedPlanQueue: Q, DistributedSchedulingPolicy: { PROGRESS_FRESHNESS_MS: 5000 }, UiCommandCancelled: Error });
  const projectRoot = path.join(os.tmpdir(), "native-query-project"), projectId = Q.canonicalProjectId(projectRoot), verifiedAt = "2026-10-30T00:00:00.000Z";
  const job = { index: 0, workerId: "worker-a", commandId: "command-a", lifecycleProtocol: 2, outputDir: "work_dirs/a", status: "completed", completionState: "verified", exitCode: 0 };
  const plan = { id: "workflow-a", projectId, planFile: "plans/a.yaml", jobs: [job] };
  job.verifiedCompletion = { schemaVersion: 1, identity: V.completionIdentity(plan, job), verifiedAt, exitCode: 0 };
  let current = true, queueReads = 0, queries = 0;
  const host = { captureProjectContext: () => ({ root: projectRoot }), projectContextIsCurrent: () => current, buildState: () => ({}),
    enabledWorkerConfigs: () => [{ id: "worker-a" }], readWorkerTaskSnapshot: async () => { queries++; return { workerId: "worker-a", tasks: [], error: "cold connection failed" }; },
    loadDistributedQueue: async selectedRoot => { assert.equal(selectedRoot, projectRoot); queueReads++; return { schemaVersion: 1, plans: [plan] }; } };
  const call = target => make.call(target)({}, null, { signal: new AbortController().signal });
  const cold = await call(host), fact = cold.jobLifecycle[0];
  assert.equal(fact.status, "completed"); assert.equal(fact.successful, true);
  assert.equal(fact.verifiedCompletion.verifiedAt, verifiedAt);
  assert.equal(fact.queryState, "unknown", "missing capabilities do not prove this round observed the completed job");
  assert.match(fact.queryError, /cold connection failed/);
  const before = queries, noTarget = await call({ ...host, enabledWorkerConfigs: () => [] });
  assert.equal(queries, before); assert.equal(noTarget.jobLifecycle[0].queryState, "not_queried");
  assert.equal(noTarget.jobLifecycle[0].successful, true);
  const at = new Date().toISOString();
  const observed = await call({ ...host, readWorkerTaskSnapshot: async () => ({ workerId: "worker-a", capabilities: { taskLifecycle: 2 }, queryComplete: true, fetchedAt: at, generatedAt: at,
    tasks: [{ projectId, commandId: job.commandId, outputDir: job.outputDir, observation: { projectId, commandId: job.commandId, workerId: job.workerId, lifecycleProtocol: 2, observedAt: at,
      tmux: { windowId: "@1", paneId: "%1", dead: true, exitCode: 0 }, result: { runId: job.commandId, status: "completed", present: true, verified: true, artifactsComplete: true, exitCode: 0 },
      runtimeDiagnostics: { schemaVersion: 1, commandId: job.commandId, runId: job.commandId, state: "clear", count: 0, scanComplete: true } } }] }) });
  assert.equal(observed.jobLifecycle[0].queryState, "observed"); assert.equal(observed.jobLifecycle[0].queryError, "");
  assert.equal(observed.jobLifecycle[0].verifiedCompletion.verifiedAt, verifiedAt, "a new query does not refresh the original proof time");
  const previousReads = queueReads;
  await assert.rejects(call({ ...host, readWorkerTaskSnapshot: async () => { current = false; return { workerId: "worker-a", tasks: [] }; } }), /项目已切换/);
  assert.equal(queueReads, previousReads, "a changed workspace never reads the new project's queue");
});

test("overview active matches experiment active", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-active-shared-"));
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "run-plan-1", type: "run-plan", status: "running", plan: "plan.yaml" },
      { global_job_id: "run-100", type: "run", status: "running", parent_id: "run-plan-1", stage: "run" },
      { global_job_id: "run-200", type: "run", status: "failed", parent_id: "run-plan-1" },
    ], null, 2),
  });
  const active = JSON.parse((await runCli(["experiment", "active", "--json"], { cwd: dir })).stdout);
  const overview = JSON.parse((await runCli(["experiment", "overview", "--json"], { cwd: dir })).stdout);
  assert.deepEqual(overview.active, { active_count: active.active_count, workflows: active.workflows, runs: active.runs });
});

test("runtime fields stay aligned across inspect health and active", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-runtime-align-"));
  const updated = new Date().toISOString();
  writeProject(dir, {
    "experiments/runs/run-1789994720003/stdout.log": [
      "python train.py --config plan.yaml",
      "2026-03-01T00:00:00Z INFO epoch 4/10 batch 12 loss 0.31 auc 0.82",
      "tmux attach -t simple",
    ].join("\n"),
    "simple_cluster/experiment_index.json": JSON.stringify([
      {
        global_job_id: "run-1789994720003",
        type: "run",
        status: "running",
        stage: "run",
        worker_id: "worker-a",
        updated,
        stdout: "experiments/runs/run-1789994720003/stdout.log",
        progress: { epoch: 4, max_epoch: 10, percent: 40, loss: 0.31 },
        gpu: { id: "0" },
      },
    ], null, 2),
  });
  const health = JSON.parse((await runCli(["experiment", "health", "--json"], { cwd: dir })).stdout);
  const status = JSON.parse((await runCli(["experiment", "status", "run-1789994720003", "--json"], { cwd: dir })).stdout);
  const inspected = JSON.parse((await runCli(["experiment", "inspect", "run-1789994720003", "--json"], { cwd: dir })).stdout);
  const active = JSON.parse((await runCli(["experiment", "active", "--json"], { cwd: dir })).stdout);
  assert.deepEqual(inspected.progress, active.runs[0].progress);
  assert.deepEqual(status.progress, active.runs[0].progress);
  assert.deepEqual(active.runs[0].worker, { id: "worker-a" });
  assert.deepEqual(active.runs[0].gpu, { id: "0" });
  assert.equal(health.health.status, inspected.health.status);
  assert.match(inspected.diagnosis.latest_message, /loss 0\.31/);
  assert.doesNotMatch(inspected.diagnosis.latest_message, /^python /);
  const overview = JSON.parse((await runCli(["experiment", "overview", "--json"], { cwd: dir })).stdout);
  assert.equal(overview.alerts.missing_progress.some((row) => row.id === "run-1789994720003"), false);
});

test("missing progress past timeout is a warning", async () => {
  const { isMissingProgress, buildHealthSummary, findLatestTrainingMessage } = require("../../dist/cli/commands/experiment.js");
  const now = Date.parse("2026-09-23T00:20:00Z");
  const fresh = { type: "worker_run", status: "running", stage: "train_test", progress: null, started_at: "2026-09-23T00:15:00Z", created: "2026-09-23T00:15:00Z", updated: "2026-09-23T00:19:59Z" };
  const stale = { type: "worker_run", status: "running", stage: "train_test", progress: null, started_at: "2026-09-23T00:00:00Z", created: "2026-09-23T00:00:00Z", updated: "2026-09-23T00:19:59Z" };
  assert.equal(isMissingProgress(fresh, now), false);
  assert.equal(isMissingProgress(stale, now), true);
  assert.equal(isMissingProgress({ ...stale, stage: "train" }, now), true);
  assert.equal(isMissingProgress({ ...stale, stage: "run" }, now), true);
  assert.equal(isMissingProgress({ ...stale, stage: "train-test" }, now), true);
  assert.equal(isMissingProgress({ ...stale, stage: "test" }, now), false);
  assert.equal(isMissingProgress({ ...stale, stage: "debug" }, now), false);
  assert.equal(isMissingProgress({ ...stale, progress: { epoch: null, max_epoch: null, batch: 5, total_batch: 10, percent: null, loss: 0.4 } }, now), false);
  assert.equal(isMissingProgress({ ...stale, started_at: "invalid" }, now), true);
  assert.equal(isMissingProgress({ ...stale, started_at: "invalid", created: "invalid" }, now), false);
  assert.deepEqual(buildHealthSummary([stale], now), { status: "warning", reason: "missing_progress" });
  const message = findLatestTrainingMessage([
    { timestamp: "", level: "", message: "python train.py --epochs 10" },
    { timestamp: "", level: "INFO", message: "epoch 2/10 loss 0.4" },
    { timestamp: "", level: "", message: "tmux attach -t simple" },
  ]);
  assert.equal(message, "epoch 2/10 loss 0.4");
});

test("train_test missing progress uses task start time instead of refreshed runtime time", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-missing-progress-"));
  const now = Date.now();
  const started = new Date(now - 20 * 60 * 1000).toISOString();
  const updated = new Date(now - 1000).toISOString();
  writeProject(dir, {
    "simple_cluster/experiment_index.json": JSON.stringify([
      { global_job_id: "run-train-stale", type: "worker_run", status: "running", stage: "train_test", started_at: started, updated },
      { global_job_id: "run-test-stale", type: "worker_run", status: "running", stage: "test", started_at: started, updated },
    ]),
  });
  const overviewRun = await runCli(["experiment", "overview", "--json"], { cwd: dir });
  assert.equal(overviewRun.code, 0, overviewRun.stderr);
  const overview = JSON.parse(overviewRun.stdout);
  assert.deepEqual(overview.alerts.missing_progress.map((row) => row.id), ["run-train-stale"]);
  assert.deepEqual(overview.health, { status: "warning", reason: "missing_progress" });

  const healthRun = await runCli(["experiment", "health", "--json"], { cwd: dir });
  assert.equal(healthRun.code, 0, healthRun.stderr);
  const health = JSON.parse(healthRun.stdout);
  assert.equal(health.health.status, "warning");
  assert.equal(health.health.reason, "missing_progress");
  assert.equal(health.alerts.missing_progress, true);

  const inspectRun = await runCli(["experiment", "inspect", "run-train-stale", "--json"], { cwd: dir });
  assert.equal(inspectRun.code, 0, inspectRun.stderr);
  const inspect = JSON.parse(inspectRun.stdout);
  assert.equal(inspect.alerts.missing_progress, true);
  assert.deepEqual(inspect.health, { status: "warning", reason: "missing_progress" });
});

test("status monitor and diagnose share runtime fields with inspect", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-runtime-query-"));
  const updated = new Date().toISOString();
  writeProject(dir, {
    "experiments/runs/run-1789994720003/stdout.log": "2026-03-01T00:00:00Z INFO epoch 4/10 loss 0.31\n",
    "simple_cluster/experiment_index.json": JSON.stringify([
      {
        global_job_id: "run-1789994720003",
        type: "run",
        status: "running",
        stage: "run",
        worker_id: "worker-a",
        updated,
        stdout: "experiments/runs/run-1789994720003/stdout.log",
        progress: { epoch: 4, max_epoch: 10, percent: 40, loss: 0.31 },
        gpu: { id: "0" },
      },
    ], null, 2),
  });
  const args = { cwd: dir };
  const id = "run-1789994720003";
  const status = JSON.parse((await runCli(["experiment", "status", id, "--json"], args)).stdout);
  const inspected = JSON.parse((await runCli(["experiment", "inspect", id, "--json"], args)).stdout);
  const monitor = JSON.parse((await runCli(["experiment", "monitor", id, "--json"], args)).stdout);
  const diagnosis = JSON.parse((await runCli(["experiment", "diagnose", id, "--json"], args)).stdout);
  assert.equal(status.status, inspected.summary.status);
  assert.equal(status.health_status, inspected.summary.health_status);
  assert.deepEqual(status.worker, inspected.status.worker);
  assert.deepEqual(status.gpu, inspected.status.gpu);
  assert.deepEqual(status.progress, inspected.progress);
  assert.equal(monitor.stage, inspected.status.stage);
  assert.deepEqual(monitor.progress, inspected.progress);
  assert.equal(monitor.updated_at, inspected.status.updated_at);
  assert.equal(diagnosis.health_status, inspected.summary.health_status);
});

test("query commands share one runtime snapshot schema", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-snapshot-schema-"));
  const updated = new Date().toISOString();
  writeProject(dir, {
    "experiments/runs/run-1789994720003/stdout.log": [
      "base_config: configs/base.yaml",
      "python -m train --config plan.yaml",
      "dataset: data/train encoder: resnet",
      "2026-03-01T00:00:00Z INFO epoch 4/10 batch 12 loss 0.31 auc 0.82",
    ].join("\n"),
    "simple_cluster/experiment_index.json": JSON.stringify([
      {
        global_job_id: "run-1789994720003",
        type: "run",
        status: "running",
        stage: "run",
        plan: "plan.yaml",
        worker_id: "worker-a",
        updated,
        stdout: "experiments/runs/run-1789994720003/stdout.log",
        progress: { epoch: 4, max_epoch: 10, percent: 40, loss: 0.31 },
        gpu: { id: "0" },
      },
    ], null, 2),
  });
  const args = { cwd: dir };
  const id = "run-1789994720003";
  const status = JSON.parse((await runCli(["experiment", "status", id, "--json"], args)).stdout);
  const inspected = JSON.parse((await runCli(["experiment", "inspect", id, "--json"], args)).stdout);
  const monitor = JSON.parse((await runCli(["experiment", "monitor", id, "--json"], args)).stdout);
  const diagnosis = JSON.parse((await runCli(["experiment", "diagnose", id, "--json"], args)).stdout);
  const health = JSON.parse((await runCli(["experiment", "health", "--json"], args)).stdout);
  const active = JSON.parse((await runCli(["experiment", "active", "--json"], args)).stdout);

  for (const key of ["status", "health_status", "stage"]) {
    assert.equal(status[key], monitor[key], key);
    assert.equal(status[key], diagnosis[key], key);
  }
  assert.equal(status.status, inspected.summary.status);
  assert.equal(status.stage, inspected.status.stage);
  assert.equal(status.updated_at, monitor.updated_at);

  const progressKeys = ["epoch", "max_epoch", "percent", "loss", "updated_at"];
  for (const payload of [status.progress, monitor.progress, inspected.progress, active.runs[0].progress]) {
    assert.deepEqual(Object.keys(payload).sort(), progressKeys.slice().sort());
  }
  assert.deepEqual(status.progress, monitor.progress);
  assert.deepEqual(status.progress, inspected.progress);

  for (const node of [status, diagnosis, active.runs[0]]) {
    assert.deepEqual(node.worker, { id: "worker-a" });
    assert.deepEqual(node.gpu, { id: "0" });
  }
  assert.match(monitor.latest_message, /loss 0\.31/);
  assert.doesNotMatch(monitor.latest_message, /yaml|config|python\s+-m/i);
  assert.ok(monitor.latest_message.length <= 300);
  assert.equal("last_update" in status, false);
  assert.equal(status.observation_source, "legacy_or_history");
  assert.equal("last_update" in monitor, false);
  assert.equal("last_update" in diagnosis, false);
  assert.equal(status.updated_at, diagnosis.updated_at);
  assert.deepEqual(status.progress, diagnosis.progress);
  assert.deepEqual(status.worker, diagnosis.worker);
  assert.deepEqual(status.gpu, diagnosis.gpu);
  for (const payload of [status, monitor, diagnosis, inspected.snapshot]) {
    assert.match(String(payload.snapshot_id), /^\d+$/);
    assert.match(String(payload.snapshot_time), /^\d{4}-\d{2}-\d{2}T/);
  }
  assert.deepEqual(
    [status.progress.epoch, status.progress.loss, status.progress.updated_at],
    [diagnosis.progress.epoch, diagnosis.progress.loss, diagnosis.progress.updated_at],
  );
  assert.deepEqual(
    [status.progress.epoch, status.progress.loss, status.progress.updated_at],
    [inspected.progress.epoch, inspected.progress.loss, inspected.progress.updated_at],
  );
});
