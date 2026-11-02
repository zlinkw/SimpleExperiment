const test = require("node:test");
const assert = require("node:assert/strict");

const {
  agentTmuxStartupCommand,
  defaultAgentTmuxSessionName,
  defaultAgentTmuxWindowName,
  isValidRemoteTmuxSessionName,
} = require("../../dist/tunnel/AgentTmuxPolicy.js");

test("Agent windows are stable per canonical project and separate projects sharing a Worker", () => {
  const { projectIdentityKey } = require("../../dist/features/ProjectRootMap");
  const first = defaultAgentTmuxWindowName("/srv/alice/demo");
  assert.equal(first, "agent-" + projectIdentityKey({ projectDir: "/srv/alice/demo" }).slice(0, 16));
  assert.equal(first, defaultAgentTmuxWindowName("/srv/alice/demo/"));
  assert.notEqual(first, defaultAgentTmuxWindowName("/srv/bob/demo"));
  assert.equal(defaultAgentTmuxWindowName("C:/Projects/demo"), defaultAgentTmuxWindowName("c:\\Projects\\demo"));
  for (const missing of [undefined, "", "demo", "/"]) assert.throws(() => defaultAgentTmuxWindowName(missing), /AGENT_PROJECT_REQUIRED/);
  assert.throws(() => agentTmuxStartupCommand({ role: "worker", installDir: "/srv/agent" }), /AGENT_PROJECT_REQUIRED/);
  const config = (workDir) => JSON.parse(agentTmuxStartupCommand({ role: "worker", endpointId: "shared", sessionPrefix: "alice", installDir: workDir + "/alice_agent", workDir }).split(" --config '")[1].slice(0, -1));
  const a = config("/srv/alice/demo"), b = config("/srv/bob/demo");
  assert.equal(a.tmuxSession, b.tmuxSession);
  assert.notEqual(a.tmuxWindow, b.tmuxWindow);
  assert.equal(a.projectDir, "/srv/alice/demo");
});

test("setup, runtime naming and the public setting share one prefix default and normalization", () => {
  const names = require("../../dist/config/RemoteResourcePrefix.js");
  const policy = require("../../dist/tunnel/AgentTmuxPolicy.js");
  const setup = require("../../dist/tunnel/XshellTunnelSetup.js");
  const property = require("../../package.json").contributes.configuration.properties["simpleExperiment.tunnel.remoteTmuxSessionPrefix"];
  assert.equal(property.default, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  assert.equal(property.scope, "application");
  assert.equal(policy.simpleTmuxSessionPrefix, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  assert.equal(setup.defaultXshellTunnelSetupConfig.remoteTmuxSessionPrefix, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  for (const value of [undefined, "", "simple", "zlk", "alice", " Alice Lab! ", "team.lab", "---", "x".repeat(40)]) {
    const prefix = names.normalizeRemoteResourcePrefix(value);
    assert.equal(setup.normalizeXshellSetupConfig({ remoteTmuxSessionPrefix: value }).remoteTmuxSessionPrefix, prefix);
    assert.equal(policy.normalizeRemoteTmuxSessionPrefix(value), prefix);
    assert.equal(names.remoteAgentDirectoryName(value), prefix + "_agent");
    assert.equal(policy.remoteAgentDirectoryName(value), prefix + "_agent");
  }
  assert.equal(names.remoteAgentDirectoryName("zlk"), "zlk_agent");
  assert.equal(names.remoteAgentDirectoryName("alice"), "alice_agent");
});

test("agent tmux policy supports configurable remote session prefixes", () => {
  assert.throws(()=>defaultAgentTmuxSessionName("hub"),/HUB_REMOVED/);
  assert.equal(defaultAgentTmuxSessionName("worker", "nwpu5"), "simple-worker-nwpu5-agent");
  assert.equal(defaultAgentTmuxSessionName("worker", "nwpu5", "zlk"), "zlk-worker-nwpu5-agent");
  assert.equal(isValidRemoteTmuxSessionName("simple-worker-nwpu5-agent"), true);
  assert.equal(isValidRemoteTmuxSessionName("zlk-worker-nwpu5-agent"), true);
  assert.equal(isValidRemoteTmuxSessionName("-worker-agent"), false);
});

test("agent tmux startup uses system Python by default and requires explicit Conda environments", () => {
  const blank = agentTmuxStartupCommand({ role: "worker", endpointId: "fixture", installDir: "/srv/agent", workDir: "/srv/project" });
  assert.match(blank, /SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1/);
  assert.match(blank, /SIMPLE_EXPERIMENT_CONDA_ENV=''/);
  assert.match(blank, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='0'/);
  assert.match(blank, /lifecycle --action ensure/);

  const explicit = agentTmuxStartupCommand({ role: "worker", endpointId: "fixture", installDir: "/srv/agent", workDir: "/srv/project", condaEnv: "torch2" });
  assert.match(explicit, /SIMPLE_EXPERIMENT_CONDA_ENV='torch2'/);
  assert.match(explicit, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='1'/);
  assert.match(explicit, /"condaEnv":"torch2"/);
  assert.doesNotMatch(explicit, /kill-session|kill -9/);
});

test("built Agent and Scheduler use the carried global prefix and project-local defaults", () => {
  const fs = require("node:fs"), path = require("node:path");
  const { spawnSync } = require("node:child_process");
  const dir = fs.mkdtempSync(path.join(require("node:os").tmpdir(), "se-prefix-probe-"));
  const file = path.join(dir, "probe.py");
  const names = require("../../dist/config/RemoteResourcePrefix");
  const cases = [null, "", "simple", "zlk", "alice", " Alice Lab! ", "team.lab", "---", "x".repeat(40)]
    .map(value => [value, names.normalizeRemoteResourcePrefix(value)]);
  const script = String.raw`
import json, os, pathlib, sys
sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, "../_helpers"))})
from extractRuntimeFunctions import extract_runtime_functions
agent = extract_runtime_functions(${JSON.stringify(path.resolve(__dirname, "../../dist/runtime/cluster_agent.py"))},
    ["agent_install_dir", "_resolve_tmux_prefix", "simple_tmux_name", "fixed_gpu_window_name", "tb_tmux_session_name"])
scheduler = extract_runtime_functions(${JSON.stringify(path.resolve(__dirname, "../../dist/runtime/cluster_scheduler.py"))},
    ["compute_scheduler_agent_state_dir", "resolve_scheduler_agent_state_dir", "ensure_worker_runtime", "sync_running_console_logs"])
root = pathlib.Path(__file__).parent / "project"
(root / ".vscode").mkdir(parents=True)
(root / ".vscode" / "settings.json").write_text(json.dumps({"tunnel.remoteTmuxSessionPrefix": "wrong-project-owner"}), encoding="utf-8")
os.chdir(root)
agent.__file__ = __file__
os.environ.pop("SIMPLE_EXPERIMENT_AGENT_INSTALL_DIR", None)
for value, expected in json.loads(${JSON.stringify(JSON.stringify(cases))}):
    if value is None:
        os.environ.pop("SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX", None)
    else:
        os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = value
    assert agent._resolve_tmux_prefix({"sessionPrefix": "old-option"}, {"tmuxSessionPrefix": "old-job"}, {"WORK_DIR": str(root)}) == expected
    assert agent.simple_tmux_name("sch-job") == expected + "-sch-job"
    assert agent.fixed_gpu_window_name(None, "0") == expected + "-gpu-0"
    assert agent.tb_tmux_session_name(None) == expected + "_tb"
    assert pathlib.Path(agent.agent_install_dir(root)) == root / (expected + "_agent")
    state = scheduler.compute_scheduler_agent_state_dir(root)
    assert state.parent == root / (expected + "_agent") / "state" / "projects", state
    assert scheduler.resolve_scheduler_agent_state_dir(root) == state
    assert scheduler.ensure_worker_runtime({}) == expected + "_agent/simple_cluster/runtime/cluster_scheduler.py"
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "alice"
assert agent._resolve_tmux_prefix(env={"SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX": "carried"}) == "carried"
custom = root.parent / "explicit" / "zlk_agent"
os.environ["SIMPLE_EXPERIMENT_AGENT_INSTALL_DIR"] = str(custom)
assert pathlib.Path(agent.agent_install_dir(root)) == custom
assert scheduler.compute_scheduler_agent_state_dir(root, str(custom / "state")) == custom / "state"
assert scheduler.ensure_worker_runtime({"agentRuntimeDir": str(custom)}) == str(custom).rstrip("/") + "/simple_cluster/runtime/cluster_scheduler.py"
os.environ.pop("SIMPLE_EXPERIMENT_AGENT_INSTALL_DIR")
agent.__file__ = str(custom / "simple_cluster" / "runtime" / "cluster_agent.py")
assert pathlib.Path(agent.agent_install_dir(root)) == custom
current = root / "current-state" / "live_output"
current.mkdir(parents=True)
(current / "alice-gpu-0.json").write_text(json.dumps({"tail": "current-project-log"}), encoding="utf-8")
scheduler.AGENT_STATE_DIR = str(current.parent)
row = {"worker_id": "shared", "log_path": "work_dirs/job/stdout.log", "gpu_id": "0", "tmuxPrefix": "obsolete"}
scheduler.sync_running_console_logs("plan", [row], {"shared": {"id": "shared"}}, {}, "running")
assert row.get("log_tail") == "current-project-log", row
scheduler.AGENT_STATE_DIR = str(root / "missing-state")
legacy = root / "simple_agent" / "state" / "projects" / "live_output"
legacy.mkdir(parents=True)
(legacy / "alice-gpu-1.json").write_text(json.dumps({"tail": "wrong-owner-log"}), encoding="utf-8")
missing = {"worker_id": "shared", "log_path": "work_dirs/other/stdout.log", "gpu_id": "1"}
scheduler.sync_running_console_logs("plan", [missing], {"shared": {"id": "shared"}}, {}, "running")
assert missing.get("sync_skipped") == "no_tail_yet" and "log_tail" not in missing, missing
print(json.dumps({"ok": True, "cases": len(json.loads(${JSON.stringify(JSON.stringify(cases))})), "projectSettingsIgnored": True, "explicitPathsPreserved": True}))
`;
  fs.writeFileSync(file, script, "utf8");
  console.log("kept isolated prefix fixture at " + dir);
  const result = spawnSync("python", ["-B", "-X", "utf8", file], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), { ok: true, cases: cases.length, projectSettingsIgnored: true, explicitPathsPreserved: true });
});
