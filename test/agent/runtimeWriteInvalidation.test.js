const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

test("agent writes invalidate cached read-only snapshots even under coarse file timestamps", () => {
  const agentPath = path.join(__dirname, "../../dist/runtime/cluster_agent.py");
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "zlk-write-invalidation-"));
  const script = String.raw`
import importlib.util, json, os, types

spec = importlib.util.spec_from_file_location("cluster_agent", ${JSON.stringify(agentPath)})
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

workdir = ${JSON.stringify(workdir.replace(/\\/g, "/"))}
snapshot = os.path.join(workdir, "cluster_snapshot.json")
landing = os.path.join(workdir, "results_summary.json")
uploaded = os.path.join(workdir, "uploaded.json")

frozen = types.SimpleNamespace(st_dev=1, st_ino=1, st_size=1, st_mtime=1, st_mtime_ns=1)
real_stat = os.stat
agent.os.stat = lambda path: frozen

agent.atomic_write(snapshot, {"generation": 1})
first = agent.read_runtime_json_cached(snapshot, {})
cached = agent.read_runtime_json_cached(snapshot, {})
agent.atomic_write(snapshot, {"generation": 2})
after_write = agent.read_runtime_json_cached(snapshot, {})

agent.atomic_write(landing, {"generation": "landing-1"})
agent.read_runtime_json_cached(landing, {})
agent.os.stat = real_stat
with open(uploaded, "w", encoding="utf-8") as handle:
    json.dump({"generation": "landing-2"}, handle)
agent.os.stat = lambda path: frozen
agent.move_file_replace(uploaded, landing)
after_move = agent.read_runtime_json_cached(landing, {})

print(json.dumps({
    "cachedReused": first is cached,
    "firstGeneration": first["generation"],
    "afterWriteGeneration": after_write["generation"],
    "afterMoveGeneration": after_move["generation"],
}))
`;

  try {
    const run = spawnSync("python", ["-c", script], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stderr);
    const result = JSON.parse(run.stdout.trim());
    assert.equal(result.cachedReused, true);
    assert.equal(result.firstGeneration, 1);
    assert.equal(result.afterWriteGeneration, 2);
    assert.equal(result.afterMoveGeneration, "landing-2");
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test("agent write helpers drop cached runtime JSON entries", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.ts"), "utf8");
  assert.match(source, /def invalidate_runtime_json_cache\(path\)/);
  assert.match(source, /replace_with_retry\(tmp, path\)/);
  assert.match(source, / {8}raise\n {4}invalidate_runtime_json_cache\(path\)/);
  assert.match(source, /shutil\.move\(src, dst\)\n {4}invalidate_runtime_json_cache\(dst\)/);
});
