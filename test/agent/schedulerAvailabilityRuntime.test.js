const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const runtimePath = path.join(root, "dist/runtime/cluster_scheduler.py");

function runPython(expression) {
  const script = `
import importlib.util, json, sys
module_name = "scheduler_runtime_under_test"
spec = importlib.util.spec_from_file_location(module_name, ${JSON.stringify(runtimePath)})
module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = module
spec.loader.exec_module(module)
${expression}
`;
  const result = spawnSync("python", ["-c", script], {
    encoding: "utf8",
    cwd: root,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("scheduler refreshes a missing availability snapshot directly from an online Agent", () => {
  const value = runPython(`
class Response:
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, size=-1):
        return json.dumps({"workers": [{
            "workerId": "nwpu3",
            "available": True,
            "availableGpuIds": ["0"],
            "busyGpuIds": [],
            "ttlSeconds": 180,
        }]}).encode()
class FakeOpener:
    def __call__(self, url, timeout=1.5): return Response()
module.urllib.request.urlopen = FakeOpener()
worker = {"id": "nwpu3", "local_agent_url": "http://127.0.0.1:18766", "_availability_state_key": "/state#workers/nwpu3"}
module.refresh_missing_worker_availability([worker])
print(json.dumps({
    "agentStatus": worker.get("_agent_status"),
    "available": worker["_availability"]["available"],
    "source": worker["_availability"]["source"],
}))
`);
  assert.equal(value.agentStatus, "online");
  assert.equal(value.available, true);
  assert.equal(value.source, "worker_agent_direct_refresh");
});

test("availability freshness uses local receipt time and rejects extreme clock skew", () => {
  const value = runPython(`
import time
from datetime import timedelta
worker = {
    "id": "nwpu3",
    "_availability": {"available": True, "updatedAt": module.now(), "ttlSeconds": 180},
}
module.note_availability_receipt(worker, dict(worker["_availability"]))
fresh = module.availability_is_fresh(worker)
worker["_availability_received_monotonic"] = time.monotonic() - 181
expired = module.availability_is_fresh(worker)
future = dict(worker)
future["_availability_received_monotonic"] = 0
future["_availability"]["updatedAt"] = module.now().replace("+", "|") if False else module.now()
from datetime import datetime
future["_availability"]["updatedAt"] = (datetime.now().astimezone() + timedelta(seconds=module.WORKER_AVAILABILITY_CLOCK_SKEW_SECONDS + 1)).isoformat()
skewed = module.availability_is_fresh(future)
print(json.dumps({"fresh": fresh, "expired": expired, "skewed": skewed}))
`);
  assert.equal(value.fresh, true);
  assert.equal(value.expired, false);
  assert.equal(value.skewed, false);
});

test("direct availability snapshots are merged through atomic state replacement", () => {
  const source = fs.readFileSync(path.join(root, "src/clusterSchedulerRuntime.ts"), "utf8");
  assert.match(source, /def persist_worker_availability\(path: str, row: dict\[str, Any\]\)/);
  assert.match(source, /atomic_write_json\(state_path, \{/);
  assert.match(source, /refresh_missing_worker_availability\(workers, args\.availability_path\)/);
});

test("scheduler availability reads the loopback-only unauthenticated readiness route", () => {
  const source = fs.readFileSync(path.join(root, "src/clusterAgentRuntime.ts"), "utf8");
  assert.match(source, /route == "\/api\/worker\/availability":/);
  assert.match(source, /if not self\.localhost_only\(\):\s*self\.send_json\(\{"error": "localhost only"\}, status=403\)/);
});

test("missing and stale availability errors expose the structured dispatch contract", () => {
  const value = runPython(`
worker = {
    "id": "nwpu3",
    "_availability_state_key": "/data/qgking/zlk/simple_cluster/worker_availability.json#workers/nwpu3",
    "worker_status_ttl_seconds": 180,
}
probe = module.probe_idle_gpus(worker, {})
stale_worker = dict(worker)
stale_worker["_availability"] = {"updatedAt": "2020-01-01T00:00:00+00:00", "ttlSeconds": 180}
stale_probe = module.probe_idle_gpus(stale_worker, {})
print(json.dumps({
    "missing": probe.get("structuredError"),
    "missingError": probe.get("error"),
    "stale": stale_probe.get("structuredError"),
}))
`);
  assert.equal(value.missing.workerId, "nwpu3");
  assert.match(value.missing.expectedStateKey, /#workers\/nwpu3$/);
  assert.equal(value.missing.lastSeenAt, null);
  assert.equal(value.missing.ttlSeconds, 180);
  assert.ok(value.missing.suggestedAction);
  assert.equal(value.stale.workerId, "nwpu3");
  assert.equal(value.stale.lastSeenAt, "2020-01-01T00:00:00+00:00");
});

test("scheduler rejects an unconfigured placeholder conda environment before launching", () => {
  const result = spawnSync("python", ["-c", `
import importlib.util
import sys
module_name = "scheduler_runtime_under_test"
spec = importlib.util.spec_from_file_location(module_name, ${JSON.stringify(runtimePath)})
module = importlib.util.module_from_spec(spec)
sys.modules[module_name] = module
spec.loader.exec_module(module)
try:
    module.launch_experiment({"id": "nwpu3", "conda_env": "-", "project_dir": "/tmp/project"}, "plan.yaml", 0, "0", None)
except RuntimeError as error:
    print(error.message if hasattr(error, "message") else str(error))
else:
    raise SystemExit("expected RuntimeError")
`], {
  encoding: "utf8",
  cwd: root,
  env: { ...process.env, PYTHONIOENCODING: "utf-8" },
});
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout.trim(), /Worker nwpu3 未配置 condaEnv/);
});
