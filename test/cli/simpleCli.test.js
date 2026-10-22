const assert = require("node:assert/strict");

const fs = require("node:fs");

const http = require("node:http");

const os = require("node:os");

const path = require("node:path");

const test = require("node:test");

const { spawn } = require("node:child_process");


const root = path.resolve(__dirname, "../..");

const cli = path.join(root, "dist", "cli.js");

const validPlan = path.join(__dirname, "fixtures", "valid-plan.yaml");

const invalidPlan = path.join(__dirname, "fixtures", "invalid-plan.yaml");


function runCli(args, extra = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: extra.cwd || root,
      windowsHide: true,
      env: { ...process.env, SIMPLE_EXPERIMENT_API_FILE: extra.apiFile || path.join(os.tmpdir(), "missing-simple-experiment-api.json"), ...extra.env },
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 10000);
    child.stdout.on("data", (chunk) => { stdout = (stdout + chunk.toString("utf8")).slice(-1024 * 1024); });
    child.stderr.on("data", (chunk) => { stderr = (stderr + chunk.toString("utf8")).slice(-65536); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (timedOut) reject(new Error(`CLI fixture exceeded 10 seconds: ${args[0]}`));
      else resolve({ code, stdout, stderr });
    });
  });
}


function writeProject(dir, files) {
  for (const [rel, body] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body, "utf8");
  }
}


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
  const { observationFromCapture } = require("../../dist/cli/runtime.js");
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


test("project root uses Local API workspace from unrelated cwd and explicit env takes priority", async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "simple-cli-root-"));
  const project = path.join(parent, "MultiModal");
  const override = path.join(parent, "ExplicitProject");
  writeProject(project, { "experiments/plans/plan.yaml": "name: test\n" });
  writeProject(override, { "experiments/plans/plan.yaml": "name: override\n" });
  const server = http.createServer((req, res) => {
    if (req.url === "/api/v1/capabilities") {
      res.end(JSON.stringify({ schemaVersion: 1, rpc: "json-rpc-2.0", methods: ["status"] }));
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
  fs.writeFileSync(apiFile, JSON.stringify({ baseUrl: `http://127.0.0.1:${server.address().port}`, token: "test" }), "utf8");
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
