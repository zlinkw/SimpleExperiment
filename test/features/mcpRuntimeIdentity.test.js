const assert=require('node:assert/strict'),test=require('node:test');
require('../_helpers/registerTsRequire');
function wrappedRuntimeCapture(seed = "42", contextSeed = seed, configPath = `work_dirs/corim/0_corim_bus_p100_seed${seed}/job_config.yaml`) {
  const context = {
    worker_id: "nwpu2", gpu_ids: "0", plan: "experiments/plans/comparison/corim.yaml",
    config_path: configPath,
  };
  if (contextSeed !== null) context.seed = Number(contextSeed);
  return [
    "[simple-experiment-runtime] start index=0 case=corim_bus_p100 seed=42 at 2026-09",
    "-24T14:27:17+08:00",
    `python train.py --context-json '${JSON.stringify(context)}' --case corim_bus_p100 --seed ${seed}`,
    "2026-09-24 14:27:20,123 INFO training",
  ].join("\n");
}


function corimObservation(capture) {
  const { observationFromCapture } = require("../../src/mcp/query/Runtime.ts");
  return observationFromCapture(
    { id: "nwpu2", host: "localhost", port: 1 },
    "zlk-gpu-0",
    { name: "run-1790231236812", index: "1", target: "zlk-gpu-0:1" },
    capture,
  );
}


const FAILURE_KEYS = ["id", "status", "health_status", "updated_at"];


function physicalWorkerFixture() {
  const history = {
    id: "run0-326826-291", run_id: "run0-326826-291", type: "worker_run", source: "history", status: "running",
    worker_id: "nwpu2", gpu: { id: "0" }, plan: "experiments/plans/preexperiment/bus_p100.yaml",
    experiment_case: "A", seed: "42", tmux: "zlk-gpu-0", stage: "train_test", created: "2026-09-23T09:55:44Z",
    parent_id: "", raw: {},
  };
  const observation = {
    run_id: "run-1790157344723", worker: { id: "nwpu2", host: "" }, gpu: { id: "0", memory: "", utilization: "" },
    plan: history.plan, config: { experiment_case: "A", seed: "42", path: "", model: "", dataset: "" },
    tmux: { session: "zlk-gpu-0", window: "zlk-gpu-0:1", pane: "zlk-gpu-0:1.0" },
    stage: "branch", status: "running", progress: { epoch: 7, loss: 0.2 }, updated_at: "2026-09-23T11:00:00Z", log: "",
  };
  return { history, observation };
}

test("runtime observations resolve to experiment rows", () => {
  const { runtimeRow, lifecycleOf, applyObservationFields } = require("../../src/mcp/query/Experiments.ts");
  const observation = {
    run_id: "run-9001",
    plan: "plan.yaml",
    status: "running",
    worker: { id: "worker-a", host: "127.0.0.1" },
    tmux: { session: "simple", window: "simple:3", pane: "simple:3.0" },
    stage: "run",
    progress: { epoch: 4, max_epoch: 10, batch: null, total_batch: null, percent: 40, loss: 0.31, lr: null, memory: null },
    gpu: { id: "0", memory: "", utilization: "" },
    config: { path: "", experiment_case: "case-a", seed: "7", model: "", dataset: "" },
    log: "",
    updated_at: "2026-03-01T00:00:00Z",
  };
  const row = runtimeRow(observation);
  assert.equal(row.id, "run-9001");
  assert.equal(row.type, "worker_run");
  assert.equal(row.status, "running");
  assert.equal(row.worker_id, "worker-a");
  assert.equal(row.stage, "run");
  assert.equal(row.plan, "plan.yaml");
  assert.equal(row.gpu.id, "0");
  assert.equal(row.progress.epoch, 4);
  assert.equal(typeof row.health_status, "string");
  assert.equal(row.lifecycle, "running");
  assert.equal(lifecycleOf("success"), "finished");
  assert.equal(lifecycleOf("failed"), "failed");
  assert.equal(lifecycleOf("cancelled"), "cancelled");
  const history = runtimeRow(observation);
  history.source = "history";
  history.status = "success";
  history.lifecycle = "finished";
  applyObservationFields(history, observation);
  assert.equal(history.status, "running");
  assert.equal(history.source, "runtime_observation");
  assert.equal(history.lifecycle, "running");
  assert.equal(lifecycleOf("pending"), "");
});

test("runtime row prefers direct Worker task id over tmux runtime alias", () => {
  const { runtimeRow, applyObservationFields } = require("../../src/mcp/query/Experiments.ts");
  const observation = {
    run_id: "run-1790241627897", plan: "experiments/plans/comparison/corim.yaml", status: "running",
    worker: { id: "nwpu2", host: "" }, tmux: { session: "zlk-gpu-1", window: "zlk-gpu-1:2", pane: "zlk-gpu-1:2.0" },
    stage: "train_test", progress: null, gpu: { id: "1", memory: "", utilization: "" },
    config: { path: "", experiment_case: "corim_pad_p100", seed: "43", model: "", dataset: "" },
    worker_task: { id: "run6-600294-437", status: "running", plan: "experiments/plans/comparison/corim.yaml", gpu_id: "1", experiment_case: "corim_pad_p100", seed: "43", started_at: "2026-09-24T09:20:27Z", finished_at: "", log_updated_at: "2026-09-24T09:20:50Z" },
    log: "", updated_at: "2026-09-24T09:21:00Z",
  };
  const row = runtimeRow(observation);
  assert.equal(row.id, "run6-600294-437");
  assert.equal(row.run_id, "run-1790241627897");
  assert.equal(row.created, "2026-09-24T09:20:27Z");
  assert.equal(row.started_at, "2026-09-24T09:20:27Z");
  assert.equal(row.raw.runtimeActivityAt, "2026-09-24T09:20:50Z");
  const history = { ...row, created: "2026-09-24T09:19:00Z", started_at: "2026-09-24T09:19:01Z" };
  applyObservationFields(history, observation);
  assert.equal(history.created, "2026-09-24T09:19:00Z");
  assert.equal(history.started_at, "2026-09-24T09:19:01Z");
  assert.equal(runtimeRow({ ...observation, worker_task: null }).id, observation.run_id);
});

test("wrapped runtime capture merges into the stable worker identity", async () => {
  const { workerHistoryIdentityMatchesRuntime, applyRuntimeObservations } = require("../../src/mcp/query/Experiments.ts");
  const observation = corimObservation(wrappedRuntimeCapture());
  const history = {
    id: "run0-228782-829", run_id: "run0-228782-829", type: "worker_run", source: "history", status: "running",
    worker_id: "nwpu2", gpu: { id: "0" }, plan: "experiments/plans/comparison/corim.yaml",
    name: "corim_bus_p100", experiment_case: "corim_bus_p100", seed: "42", tmux: "zlk-gpu-0",
    stage: "train_test", created: "2026-09-24T06:27:16Z", parent_id: "", raw: {},
  };
  assert.equal(workerHistoryIdentityMatchesRuntime(history, observation), true);
  const byId = new Map([[history.id, history]]);
  await applyRuntimeObservations(byId, [observation]);
  assert.deepEqual([...byId.keys()], [history.id]);
  assert.equal(history.run_id, observation.run_id);
  assert.equal(history.seed, "42");
  assert.equal(history.stage, "train_test");
  assert.equal(history.name, "corim_bus_p100");
});

test("physical worker identity requires matching worker GPU metadata and launch time", () => {
  const { workerHistoryMatchesRuntime, workerHistoryIdentityMatchesRuntime } = require("../../src/mcp/query/Experiments.ts");
  const { history, observation } = physicalWorkerFixture();
  assert.equal(workerHistoryMatchesRuntime(history, observation), true);
  assert.equal(workerHistoryMatchesRuntime({ ...history, created: "2026-09-23T09:56:00Z" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, gpu: { id: "1" } }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, experiment_case: "B" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, tmux: "zlk-gpu-1" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, worker_id: "" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, source: "runtime_observation" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, status: "success" }, observation), false);
  assert.equal(workerHistoryIdentityMatchesRuntime({ ...history, status: "success" }, observation), true);
  assert.equal(workerHistoryMatchesRuntime({ ...history, plan: "other.yaml" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, seed: "43" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime({ ...history, created: "" }, observation), false);
  assert.equal(workerHistoryMatchesRuntime(history, { ...observation, run_id: "run-unknown" }), false);
  const withExplicitStart = { ...observation, run_id: "run-unknown", worker_task: { started_at: history.created } };
  assert.equal(workerHistoryMatchesRuntime(history, withExplicitStart), true);
  assert.equal(workerHistoryMatchesRuntime(history, { ...withExplicitStart, worker_task: { started_at: "2026-09-23T09:56:00Z" } }), false);
});

test("runtime observation enriches the stable worker task row without a duplicate", async () => {
  const { applyRuntimeObservations } = require("../../src/mcp/query/Experiments.ts");
  const { history, observation } = physicalWorkerFixture();
  const workflow = { id: "wf-current", type: "workflow", status: "running", plan: history.plan };
  const byId = new Map([[workflow.id, workflow], [history.id, history]]);
  await applyRuntimeObservations(byId, [observation]);
  assert.equal(byId.size, 2);
  assert.equal(byId.has(history.id), true);
  assert.equal(byId.has(observation.run_id), false);
  assert.equal(history.id, "run0-326826-291");
  assert.equal(history.source, "runtime_observation");
  assert.equal(history.run_id, observation.run_id);
  assert.deepEqual(history.progress, observation.progress);
  assert.equal(history.stage, "branch");
  assert.equal(history.parent_id, workflow.id);
  assert.equal(history.raw.runtimeRunId, observation.run_id);
  assert.equal(history.raw.workerTaskId, history.id);
});

test("direct Worker task id keeps canonical identity when Hub history row is absent", async () => {
  const { applyRuntimeObservations } = require("../../src/mcp/query/Experiments.ts");
  const { observation } = physicalWorkerFixture();
  observation.run_id = "run-1790241627897";
  observation.worker_task = { id: "run6-600294-437", status: "running", plan: observation.plan, gpu_id: "0", experiment_case: "A", seed: "42", started_at: "2026-09-24T09:20:27Z", finished_at: "" };
  const workflow = { id: "wf-current", type: "workflow", status: "running", plan: observation.plan };
  const byId = new Map([[workflow.id, workflow]]);
  await applyRuntimeObservations(byId, [observation]);
  assert.equal(byId.has("run6-600294-437"), true);
  assert.equal(byId.has(observation.run_id), false);
  const row = byId.get("run6-600294-437");
  assert.equal(row.id, "run6-600294-437");
  assert.equal(row.run_id, observation.run_id);
  assert.equal(row.source, "runtime_observation");
  assert.equal(row.status, "running");
  assert.equal(row.parent_id, workflow.id);
  assert.equal(row.raw.workerTaskId, row.id);
  assert.equal(row.raw.runtimeRunId, observation.run_id);
});

test("direct Worker task id outranks a different physical history match", async () => {
  const { applyRuntimeObservations, workerHistoryMatchesRuntime } = require("../../src/mcp/query/Experiments.ts");
  const { history, observation } = physicalWorkerFixture();
  observation.worker_task = { id: "run6-600294-437", status: "running", plan: history.plan, gpu_id: "0", experiment_case: "A", seed: "42", started_at: history.created, finished_at: "" };
  assert.equal(workerHistoryMatchesRuntime(history, observation), true);
  const byId = new Map([[history.id, history]]);
  await applyRuntimeObservations(byId, [observation]);
  assert.equal(byId.has(history.id), true);
  assert.equal(byId.has(observation.worker_task.id), true);
  assert.equal(byId.has(observation.run_id), false);
  assert.equal(history.source, "history");
});

test("unknown cached worker row reactivates through exact Worker task id", async () => {
  const { applyRuntimeObservations } = require("../../src/mcp/query/Experiments.ts");
  const { history, observation } = physicalWorkerFixture();
  history.id = "run6-600294-437";
  history.status = "unknown";
  observation.run_id = "run-1790241627897";
  observation.worker_task = { id: history.id, status: "running", plan: history.plan, gpu_id: "0", experiment_case: "A", seed: "42", started_at: "2026-09-24T09:20:27Z", finished_at: "" };
  const byId = new Map([[history.id, history]]);
  await applyRuntimeObservations(byId, [observation]);
  assert.deepEqual([...byId.keys()], [history.id]);
  assert.equal(history.status, "running");
  assert.equal(history.source, "runtime_observation");
  assert.equal(history.run_id, observation.run_id);
});

test("runtime launch seed survives tmux wrapping with context JSON", () => {
  const observation = corimObservation(wrappedRuntimeCapture());
  assert.equal(observation.config.seed, "42");
  assert.notEqual(observation.config.seed, "422026-09-24");
  assert.equal(observation.worker.id, "nwpu2");
  assert.equal(observation.gpu.id, "0");
  assert.equal(observation.plan, "experiments/plans/comparison/corim.yaml");
  assert.equal(observation.config.experiment_case, "corim_bus_p100");
});

test("runtime launch seed reads raw flag when context has no seed", () => {
  const observation = corimObservation(wrappedRuntimeCapture("43", null, "work_dirs/corim/job_config.yaml"));
  assert.equal(observation.config.seed, "43");
});

test("runtime launch rejects a seed token that is not an integer", () => {
  const observation = corimObservation(wrappedRuntimeCapture("invalid2026-09-24", null, "work_dirs/corim/job_config.yaml"));
  assert.equal(observation.config.seed, "");
});

test("runtime capture retains standard epoch evidence before job config download", () => {
  const observation = corimObservation(`${wrappedRuntimeCapture()}\nEpoch 15: Val Loss = 1.3842, accuracy = 0.6409`);
  assert.equal(observation.progress.epoch, 15);
  assert.equal(observation.progress.loss, 1.3842);
  assert.equal(observation.progress.max_epoch, null);
  assert.equal(observation.progress.percent, null);
  assert.equal(observation.config.max_epoch, null);
});

test("experiment rows distinguish workflow and worker runs", () => {
  const { parseTrainingProgress } = require("../../src/mcp/query/Runtime.ts");
  const progress = parseTrainingProgress("epoch 24/300 31% 53/171 0:02:00\n当前 loss 0.2387");
  assert.equal(progress.epoch, 24);
  assert.equal(progress.batch, 53);
  const workflow = { id: "run-plan-1", type: "workflow", plan: "experiments/plans/demo.yaml" };
  const worker = { id: "run-1789994720003", type: "worker_run", plan: workflow.plan, parent_id: workflow.id, progress };
  assert.equal(worker.type, "worker_run");
  assert.notEqual(workflow.type, worker.type);
  assert.equal(worker.parent_id, workflow.id);
});

function observation(id) {
  return {
    run_id: id,
    plan: "experiments/plans/shared.yaml",
    status: "running",
    worker: { id: "worker-a", host: "127.0.0.1" },
    tmux: { session: "gpu-0", window: "gpu-0:1", pane: "gpu-0:1.0" },
    stage: "run",
    progress: null,
    gpu: { id: "0", memory: "", utilization: "" },
    config: { path: "", experiment_case: "", seed: "", model: "", dataset: "" },
    log: "",
    updated_at: "2026-09-23T01:00:00Z",
  };
}

test("runtime observations merge by run id, never by a shared Plan", async () => {
  const { applyRuntimeObservations } = require("../../src/mcp/query/Experiments.ts");
  const old = {
    id: "run-100",
    run_id: "run-100",
    type: "worker_run",
    status: "success",
    plan: "experiments/plans/shared.yaml",
    source: "history",
    raw: {},
  };
  const rows = new Map([[old.id, old]]);
  await applyRuntimeObservations(rows, [observation("run-200")]);
  assert.equal(rows.get("run-100"), old);
  assert.equal(old.status, "success");
  assert.equal(rows.get("run-200")?.status, "running");
  assert.equal(rows.size, 2);

  await applyRuntimeObservations(rows, [observation("run-100")]);
  assert.equal(rows.get("run-100")?.status, "success");
  assert.equal(rows.get("run-100")?.source, "history");
  assert.equal(rows.get("run-100")?.raw.runtimeRunId, "run-100");
  assert.equal(rows.size, 2);
});
