const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http");
require("../_helpers/registerTsRequire");
const {businessContext}=require("../../src/mcp/query/ExecutionContext.ts");

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


test("running observation uses one worker config download to complete percent", async () => {
  const { observeRunningExperiments } = require("../../src/mcp/query/Runtime.ts");
  const requests = [];
  const capture = `${wrappedRuntimeCapture()}\nEpoch 15: Val Loss = 1.3842, accuracy = 0.6409`;
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, { "Content-Type": request.url.startsWith("/api/files/download") ? "text/plain" : "application/json" });
    if (request.url === "/api/tmux/list") response.end(JSON.stringify({ sessions: [{ name: "zlk-gpu-0", windows: [{ name: "run-1790231236812", index: "1", target: "zlk-gpu-0:1" }] }] }));
    else if (request.url.startsWith("/api/tmux/capture")) response.end(JSON.stringify({ text: capture }));
    else if (request.url.startsWith("/api/files/download")) response.end("train:\n  epochs: 300\nmodel:\n  name: corim\ndata:\n  dataset: bus\n");
    else { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const context = {root:"fixture",emit(){},rpc:async () => ({ value: { workerTunnels: [{ id: "nwpu2", localForwardHost: "127.0.0.1", localForwardPort: server.address().port }] } })};
  try {
    const observations = await businessContext.run(context, () => observeRunningExperiments());
    assert.equal(observations.length, 1);
    assert.equal(observations[0].progress.epoch, 15);
    assert.equal(observations[0].progress.max_epoch, 300);
    assert.equal(observations[0].progress.percent, 5);
    assert.equal(requests.filter((url) => url.startsWith("/api/files/download")).length, 1);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("worker tmux metadata skips terminal windows before capture", async () => {
  const { observeRunningExperiments } = require("../../src/mcp/query/Runtime.ts");
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, { "Content-Type": "application/json" });
    if (request.url === "/api/tmux/list") response.end(JSON.stringify({ sessions: [{ name: "zlk-gpu-0", windows: [
      { name: "run-1790237001150", target: "zlk-gpu-0:1", task: { commandId: "run3-998997-687", status: "running", gpuId: "0", case: "corim_bus_p100", seed: 45, planFile: "experiments/plans/comparison/corim.yaml", startedAt: "2026-09-24T08:03:21Z", logUpdatedAt: "2026-09-24T11:30:00Z", outputDir: "work_dirs/corim/3_seed45", configPath: "work_dirs/corim/3_seed45/job_config.yaml" } },
      { name: "run-1790231236812", target: "zlk-gpu-0:2", task: { commandId: "run0-228782-829", status: "completed", gpuId: "0", case: "corim_bus_p100", seed: 42, planFile: "experiments/plans/comparison/corim.yaml", startedAt: "2026-09-24T06:27:16Z", finishedAt: "2026-09-24T08:03:04Z" } },
    ] }] }));
    else if (request.url.startsWith("/api/tmux/capture")) response.end(JSON.stringify({ text: "Epoch 10: Val Loss = 0.4" }));
    else response.end("{}");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const context = {root:"fixture",emit(){},rpc:async () => ({ value: { workerTunnels: [{ id: "nwpu2", localForwardHost: "127.0.0.1", localForwardPort: server.address().port }] } })};
  try {
    const observations = await businessContext.run(context, () => observeRunningExperiments());
    assert.equal(observations.length, 1);
    const [observation] = observations;
    assert.equal(observation.run_id, "run-1790237001150");
    assert.equal(observation.worker_task.id, "run3-998997-687");
    assert.equal(observation.worker_task.status, "running");
    assert.equal(observation.worker_task.log_updated_at, "2026-09-24T11:30:00Z");
    assert.equal(observation.worker_task.output_dir, "work_dirs/corim/3_seed45");
    assert.equal(observation.worker_task.config_path, "work_dirs/corim/3_seed45/job_config.yaml");
    assert.equal(observation.plan, "experiments/plans/comparison/corim.yaml");
    assert.equal(observation.gpu.id, "0");
    assert.equal(observation.config.experiment_case, "corim_bus_p100");
    assert.equal(observation.config.seed, "45");
    assert.equal(requests.filter((url) => url.startsWith("/api/tmux/capture")).length, 1);
    assert.equal(requests.some((url) => url.includes("zlk-gpu-0%3A2")), false);
    assert.equal(requests.filter((url) => url.startsWith("/api/files/download")).length, 1);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("historical worker config resolves only through its exact terminal task window", async () => {
  const { readWorkerTaskConfig } = require("../../src/mcp/query/Runtime.ts");
  const requests = [];
  const configPath = "work_dirs/corim/6_corim_pad_p100_seed43/job_config.yaml";
  const yaml = "seed: 43\ndata:\n  dataset: pad_ufes_20\nmodel:\n  name: frozen_feature_mlp\noptimizer:\n  name: AdamW\ntrain:\n  batch_size: 64\n  epochs: 300\n";
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/api/tmux/list") {
      response.end(JSON.stringify({ sessions: [{ name: "zlk-gpu-0", windows: [
        { target: "zlk-gpu-0:1", task: { commandId: "other-task", case: "corim_pad_p100", seed: 43 } },
        { target: "zlk-gpu-0:2", task: { commandId: "run6-600294-437", case: "corim_pad_p100", seed: 43 } },
      ] }] }));
    } else if (url.pathname === "/api/tmux/capture") {
      response.end(JSON.stringify({ text: wrappedRuntimeCapture("43", "43", configPath) }));
    } else if (url.pathname === "/api/files/download" && url.searchParams.get("path") === configPath) {
      response.end(yaml);
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const context = {root:"fixture",emit(){},rpc:async () => ({ value: { workerTunnels: [{ id: "nwpu2", localForwardHost: "127.0.0.1", localForwardPort: server.address().port }] } })};
  try {
    const result = await businessContext.run(context, () => readWorkerTaskConfig("nwpu2", "run6-600294-437"));
    assert.equal(result.config_path, configPath);
    assert.equal(result.yaml, yaml);
    assert.equal(requests.filter((url) => url.startsWith("/api/tmux/capture")).length, 1);
    assert.match(requests.find((url) => url.startsWith("/api/tmux/capture")), /zlk-gpu-0%3A2/);
    assert.match(requests.find((url) => url.startsWith("/api/tmux/capture")), /lines=4000/);
    assert.equal((await businessContext.run(context, () => readWorkerTaskConfig("nwpu2", "run6-600294-437", configPath))).yaml, yaml);
    assert.equal(requests.filter((url) => url.startsWith("/api/tmux/capture")).length, 1);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

