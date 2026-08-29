const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const agentPath = path.join(root, "dist", "runtime", "cluster_agent.py");
const agentSource = fs.readFileSync(path.join(root, "src", "clusterAgentRuntime.ts"), "utf8");

function runPython(script) {
  const os = require("os");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "worker-naming-"));
  const file = path.join(tmp, "run.py");
  fs.writeFileSync(file, script, "utf8");
  const result = spawnSync("python", [file], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
  fs.rmSync(tmp, { recursive: true, force: true });
  return result;
}

test("worker_tmux_session_name 可测性与归一加固", () => {
  // 源码存在纯函数
  assert.match(agentSource, /def worker_tmux_session_name\(worker_id, gpu_id, local_worker_id=None\)/);
  assert.match(agentSource, /gpu_id_norm.*re\.sub/);
  assert.match(agentSource, /worker_norm.*re\.sub/);
  // execute_worker_command 已改用该函数，且直传仍经 simple_tmux_name
  assert.match(agentSource, /session = worker_tmux_session_name\(worker_id, gpu_id, os\.environ\.get\("SIMPLE_EXPERIMENT_WORKER_ID"\)\)/);
  assert.match(agentSource, /tmux_session = simple_tmux_name\(session\)/);

  const script = `
import importlib.util, pathlib, os
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(agentPath)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

# a) worker_id 空/worker/default → gpu-0
assert agent.worker_tmux_session_name("", "0") == "gpu-0", agent.worker_tmux_session_name("", "0")
assert agent.worker_tmux_session_name("worker", "0") == "gpu-0"
assert agent.worker_tmux_session_name("default", "0") == "gpu-0"
assert agent.worker_tmux_session_name(None, "0") == "gpu-0"
assert agent.worker_tmux_session_name("   ", "0") == "gpu-0"

# b) worker_id="Worker-1" 且 local 不同 → gpu-worker-1-0 (小写归一)
os.environ["SIMPLE_EXPERIMENT_WORKER_ID"] = "other-worker"
assert agent.worker_tmux_session_name("Worker-1", "0") == "gpu-worker-1-0", agent.worker_tmux_session_name("Worker-1", "0")
# 大小写与非法字符归一（_ . 保留，: @ → -）
assert agent.worker_tmux_session_name("Worker_1@Test", "GPU:0") == "gpu-worker_1-test-gpu-0"

# c) worker_id 与 local SIMPLE_EXPERIMENT_WORKER_ID 相同 → gpu-3 (单机退化)
os.environ["SIMPLE_EXPERIMENT_WORKER_ID"] = "3"
assert agent.worker_tmux_session_name("3", "3", "3") == "gpu-3"
assert agent.worker_tmux_session_name("3", "0") == "gpu-0"
# 显式传 local_worker_id 参数也生效
assert agent.worker_tmux_session_name("myworker", "2", "myworker") == "gpu-2"
assert agent.worker_tmux_session_name("myworker", "2", "other") == "gpu-myworker-2"

# d) simple_tmux_name 能正确加前缀且小写（_ 保留，空格/! → -）
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "ZLK_My Prefix!"
# simple_tmux_name 应对大小写与非法字符，且截32
assert agent.simple_tmux_name("GPU-0") == "zlk_my-prefix-gpu-0", agent.simple_tmux_name("GPU-0")
assert agent.simple_tmux_name("Test_Session") == "zlk_my-prefix-test_session"
# 前缀归一
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "ZLK"
assert agent.simple_tmux_name("gpu-0") == "zlk-gpu-0"
# 空值回退
assert agent.simple_tmux_name("") == "zlk-task"
# worker_tmux_session_name 归一后经 simple_tmux_name 仍小写
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "ZLK"
# worker_tmux_session_name 返回 gpu-xxx，再经 simple_tmux_name 加前缀
raw = agent.worker_tmux_session_name("Worker-1", "0", "other")
assert raw == "gpu-worker-1-0"
assert agent.simple_tmux_name(raw) == "zlk-gpu-worker-1-0"

print("worker naming ok")
`;
  const r = runPython(script);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /worker naming ok/);
});
