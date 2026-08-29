const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..", "..");
const agentPath = path.join(root, "dist", "runtime", "cluster_agent.py");
const agentSource = fs.readFileSync(path.join(root, "src", "clusterAgentRuntime.ts"), "utf8");
const extensionSource = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

function runPython(script) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tb-test-"));
  const file = path.join(tmp, "run.py");
  fs.writeFileSync(file, script, "utf8");
  const result = spawnSync("python", [file], { encoding: "utf8", env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
  fs.rmSync(tmp, { recursive: true, force: true });
  return result;
}

test("tb_tmux_session_name normalizes prefix to <normalized>_tb", () => {
  assert.match(agentSource, /def tb_tmux_session_name\(prefix\)/);
  assert.match(agentSource, /return p \+ "_tb"/);
  // TS side normalizeRemoteTmuxSessionPrefix lowercases, replaces [^a-z0-9._-] with "-", trims, slices 32
  const py = `
import importlib.util, pathlib
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(agentPath)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
cases = [
  ("Simple", "simple_tb"),
  ("ZLK_Test", "zlk_test_tb"),
  ("My Prefix!", "my-prefix_tb"),
  ("", "simple_tb"),
  ("-invalid", "invalid_tb"),
  ("A"*40, "a"*32 + "_tb"),
]
for inp, expected in cases:
    got = agent.tb_tmux_session_name(inp)
    assert got == expected, f"{inp!r} -> {got!r} != {expected!r}"
    assert len(got) <= 35, got
print("ok")
`;
  const r = runPython(py);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("tb_discover_launch: explicit script hit / relative discovery / logdir fallback / events dir / root fallback", () => {
  const script = `
import importlib.util, pathlib, os, tempfile, json, sys
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(agentPath)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

def assert_discover(root, logdir_hint, port, explicit, expected_source_contains, expected_logdir_checker):
    args, source, logdir = agent.tb_discover_launch(root, logdir_hint, port, explicit)
    assert expected_source_contains in str(source), f"source {source!r} missing {expected_source_contains!r}"
    if expected_logdir_checker:
        assert expected_logdir_checker(logdir), f"logdir {logdir!r} failed checker"
    return args, source, logdir

with tempfile.TemporaryDirectory() as tmp:
    # 1) explicit relative script hit (must be within allowed project roots: tmp/start_tb.sh etc)
    explicit_rel = "tmp/my_tb.sh"
    explicit_path = os.path.join(tmp, "tmp", "my_tb.sh")
    os.makedirs(os.path.dirname(explicit_path), exist_ok=True)
    with open(explicit_path, "w") as f:
        f.write("#!/bin/bash\\necho hi")
    args, src, _ = assert_discover(tmp, "work_dirs", 6006, explicit_rel, "my_tb.sh", lambda x: x is None)
    assert args[0] == "bash" and "my_tb.sh" in args[1], args

    # 1b) explicit absolute hit
    args, src, _ = assert_discover(tmp, "work_dirs", 6006, explicit_path, "my_tb.sh", lambda x: x is None)
    assert args[0] == "bash"

    # 1c) explicit given but not exists -> falls through to next discovery
    args, src, _ = assert_discover(tmp, "work_dirs", 6006, "nonexistent.sh", "tensorboard", lambda x: True)

    # 2) discovery order: tmp/start_tb.sh and simple_cluster/tmp/start_tb.sh are within allowed roots
    # start_tb.sh and scripts/start_tb.sh at root are not in safe_project_path allowlist, so they fall back to tensorboard
    for rel, should_find in [("tmp/start_tb.sh", True), ("simple_cluster/tmp/start_tb.sh", True), ("start_tb.sh", False), ("scripts/start_tb.sh", False)]:
        with tempfile.TemporaryDirectory() as tmp2:
            cand = os.path.join(tmp2, *rel.split("/"))
            # ensure parent exists (for root file, dirname is tmp2 itself)
            parent = os.path.dirname(cand)
            if parent and not os.path.exists(parent):
                os.makedirs(parent, exist_ok=True)
            with open(cand, "w") as f:
                f.write("#!/bin/bash")
            args, src, _ = agent.tb_discover_launch(tmp2, "work_dirs", 6006, "")
            if should_find:
                assert os.path.normpath(src) == os.path.normpath(cand), f"expected {cand}, got {src}"
                assert args[0] == "bash" and os.path.normpath(args[1]) == os.path.normpath(cand)
            else:
                # safe_project_path rejects this rel, so discovery skips it and falls back to tensorboard (root or hint)
                assert src == "tensorboard", f"expected tensorboard fallback for {rel}, got {src}"

    # 3) fallback tensorboard with hint dir exists -> uses hint
    with tempfile.TemporaryDirectory() as tmp3:
        hint = os.path.join(tmp3, "work_dirs")
        os.makedirs(hint)
        args, src, logdir = agent.tb_discover_launch(tmp3, "work_dirs", 6006, "")
        assert src == "tensorboard"
        assert logdir == hint
        assert "--logdir" in args and str(6006) in args

    # 4) hint missing, events dir exists -> uses events dir
    with tempfile.TemporaryDirectory() as tmp4:
        # create nested events file depth 2
        ev_dir = os.path.join(tmp4, "work_dirs", "run1")
        os.makedirs(ev_dir)
        with open(os.path.join(ev_dir, "events.out.tfevents.123"), "w") as f:
            f.write("x")
        args, src, logdir = agent.tb_discover_launch(tmp4, "work_dirs", 6006, "")
        # hint work_dirs exists (as parent) -> would use hint before events search. So ensure hint does NOT exist to trigger events search
        # clean hint and use non-existing hint
        import shutil
        shutil.rmtree(os.path.join(tmp4, "work_dirs"))
        # now no hint, but events dir is still found via tb_find_events_dir bounded search
        # recreate events at depth 1 with new root
        os.makedirs(ev_dir, exist_ok=True)
        with open(os.path.join(ev_dir, "events.out.tfevents.456"), "w") as f:
            f.write("x")
        # use hint "work_dirs/missing_xyz" which is allowed (work_dirs prefix) but does not exist, so fallback to events dir
        args, src, logdir = agent.tb_discover_launch(tmp4, "work_dirs/missing_xyz", 6006, "")
        assert src == "tensorboard"
        assert logdir == ev_dir, f"expected {ev_dir}, got {logdir}"

    # 5) no hint, no events -> fallback to root
    with tempfile.TemporaryDirectory() as tmp5:
        args, src, logdir = agent.tb_discover_launch(tmp5, "work_dirs", 6006, "")
        assert src == "tensorboard"
        assert logdir == tmp5

    # 6) tb_find_events_dir respects depth <=5 and skips .git/node_modules/.venv/simple_cluster
    with tempfile.TemporaryDirectory() as tmp6:
        # create deep events beyond depth 5 -> should not be found
        deep = tmp6
        for i in range(7):
            deep = os.path.join(deep, f"d{i}")
            os.makedirs(deep, exist_ok=True)
        with open(os.path.join(deep, "events.out.tfevents.999"), "w") as f:
            f.write("x")
        found = agent.tb_find_events_dir(tmp6, max_depth=5)
        assert found is None, f"should not find deep {found}"
        # skip .git
        git_ev = os.path.join(tmp6, ".git", "ev")
        os.makedirs(git_ev, exist_ok=True)
        with open(os.path.join(git_ev, "events.out.tfevents.111"), "w") as f:
            f.write("x")
        found2 = agent.tb_find_events_dir(tmp6, max_depth=5)
        assert found2 is None or ".git" not in found2, found2

print("tb_discover_launch ok")
`;
  const r = runPython(script);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /tb_discover_launch ok/);
});

test("tensorboard actions are registered in WORKER_RESULT_ACTIONS and ACTION_PATHS and handle_action routes", () => {
  assert.match(agentSource, /"start-tensorboard", "get-tensorboard-status"/);
  assert.match(agentSource, /\/api\/actions\/start-tensorboard/);
  assert.match(agentSource, /\/api\/actions\/get-tensorboard-status/);
  assert.match(agentSource, /if action in \("start-tensorboard", "get-tensorboard-status"\):\s*\n\s*return tensorboard_action/);
  // verify dist py also contains routing
  const distPy = fs.readFileSync(agentPath, "utf8");
  assert.match(distPy, /tensorboard_action\(root, action, payload/);
});

test("openTensorBoardFromUi restarts <prefix>_tb, polls get-tensorboard-status ~10s, uses localPort = agentLocalForwardPort+1000, surfaces error", () => {
  // Check package.json config
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.port"].default, 6006);
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.logdir"].default, "work_dirs");
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.tmuxSession"].default, "");
  // Check extension.ts logic
  assert.match(extensionSource, /async openTensorBoardFromUi/);
  assert.match(extensionSource, /postTensorboardAction/);
  assert.match(extensionSource, /start-tensorboard/);
  assert.match(extensionSource, /for \(let i = 0; i < 10; i\+\+\)/);
  assert.match(extensionSource, /await new Promise.*1000/);
  assert.match(extensionSource, /get-tensorboard-status/);
  assert.match(extensionSource, /status\.listening/);
  assert.match(extensionSource, /agentLocal \+ 1000|localPort = .*\+ 1000/);
  assert.match(extensionSource, /TB 启动失败，请检查服务器 start_tb\.sh \/ 端口占用/);
  // body contains only non-absolute fields
  assert.match(extensionSource, /sessionPrefix.*port.*logdir.*condaEnv.*tmuxSession/);
  // Verify transmission via hub or worker client (through postTensorboardAction wrapper)
  assert.match(extensionSource, /postTensorboardAction/);
  assert.match(extensionSource, /postWorkerAction|postAction/);
});

test("fence_stale_run_plans: overlapping fences old, non-overlapping coexists, zombie reap", () => {
  const script = `
import importlib.util, pathlib, os, tempfile, json, time, subprocess, sys
agent_path = pathlib.Path(${JSON.stringify(agentPath)})
spec = importlib.util.spec_from_file_location("agent", agent_path)
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

def registry_path(root):
    return agent._run_plan_registry_path(root)

with tempfile.TemporaryDirectory() as tmp:
    # Isolate agent state to tmp
    agent.AGENT_STATE_DIR = os.path.join(tmp, "state")
    root = os.path.join(tmp, "project")
    os.makedirs(root, exist_ok=True)

    # Mock tmux and pid liveness to avoid real system calls
    orig_tmux_alive = agent.tmux_session_alive
    orig_pid_alive = agent._is_pid_alive
    orig_tmux_available = agent.tmux_available
    alive_sessions = set()
    alive_pids = set()
    reap_calls = []

    def fake_tmux_alive(sess, cwd=None, env=None):
        return sess in alive_sessions
    def fake_pid_alive(pid):
        return int(pid) in alive_pids
    def fake_tmux_available():
        return True
    def fake_reap(root_arg, known):
        reap_calls.append(set(known))
        return []

    agent.tmux_session_alive = fake_tmux_alive
    agent._is_pid_alive = fake_pid_alive
    agent.tmux_available = fake_tmux_available
    # we want to test reap logic directly, so keep original reap for now but mock tmux ls
    # Test 1: overlapping workerIds -> fence old
    # register old plan op-old with worker w1
    old_op = "op-old-111"
    new_op = "op-new-222"
    # simulate old entry alive
    alive_sessions.add(agent.simple_tmux_name(f"sch-{old_op}"))
    alive_pids.add(12345)
    agent.register_active_run_plan(root, old_op, 12345, agent.simple_tmux_name(f"sch-{old_op}"), ["w1"], "worker-1")
    # also register a non-overlapping old entry
    other_op = "op-other-333"
    alive_sessions.add(agent.simple_tmux_name(f"sch-{other_op}"))
    alive_pids.add(12346)
    agent.register_active_run_plan(root, other_op, 12346, agent.simple_tmux_name(f"sch-{other_op}"), ["w2"], "worker-2")

    # Mock kill to just remove from alive sets
    orig_kill = agent.subprocess.run
    orig_kill_pid = os.kill
    def fake_run(args, **kwargs):
        if args[:3] == ["tmux", "kill-session", "-t"]:
            sess = args[3]
            alive_sessions.discard(sess)
            class R: returncode=0
            return R()
        if args == ["tmux", "ls"]:
            class R:
                stdout="\\n".join(list(alive_sessions)) + "\\n"
                returncode=0
            return R()
        return orig_kill(args, **kwargs)
    agent.subprocess.run = fake_run
    def fake_os_kill(pid, sig):
        alive_pids.discard(int(pid))
    os.kill = fake_os_kill

    # Now fence with new_op overlapping w1 and same owner worker-1
    result = agent.fence_stale_run_plans(root, new_op, ["w1"], "worker-1")
    assert old_op in result["fenced"], f"expected fenced {old_op}, got {result}"
    assert other_op not in result["fenced"], "non-overlapping should not be fenced"
    # old session should be killed
    assert agent.simple_tmux_name(f"sch-{old_op}") not in alive_sessions
    assert 12345 not in alive_pids
    # other should remain
    assert agent.simple_tmux_name(f"sch-{other_op}") in alive_sessions
    # registry should have removed old, kept other
    reg = agent._read_run_plan_registry(root)
    ops = [e["opId"] for e in reg]
    assert old_op not in ops
    assert other_op in ops

    # Test 2: same owner even with different workerIds -> fence
    alive_sessions.add(agent.simple_tmux_name(f"sch-{other_op}"))
    # re-add old-like entry with same owner but different worker
    owner_op = "op-owner-444"
    alive_sessions.add(agent.simple_tmux_name(f"sch-{owner_op}"))
    alive_pids.add(12347)
    agent.register_active_run_plan(root, owner_op, 12347, agent.simple_tmux_name(f"sch-{owner_op}"), ["w9"], "worker-1")
    result2 = agent.fence_stale_run_plans(root, "op-new-555", ["w10"], "worker-1")
    assert owner_op in result2["fenced"], f"same owner should fence, got {result2}"

    # Test 3: zombie reap -> session not in registry but tmux ls shows it
    zombie_sess = agent._tmux_prefix() + "-sch-zombie999"
    alive_sessions.add(zombie_sess)
    # ensure zombie not in registry
    reg_before = agent._read_run_plan_registry(root)
    known = [e["opId"] for e in reg_before]
    assert "zombie999" not in known
    reaped = agent._reap_zombie_scheduler_sessions(root, known)
    assert zombie_sess in reaped, f"zombie should be reaped, got {reaped}"
    assert zombie_sess not in alive_sessions

    # restore
    agent.tmux_session_alive = orig_tmux_alive
    agent._is_pid_alive = orig_pid_alive
    agent.tmux_available = orig_tmux_available
    agent.subprocess.run = orig_kill
    os.kill = orig_kill_pid

print("fence ok")
`;
  const r = runPython(script);
  assert.equal(r.status, 0, r.stderr || r.stdout);
  assert.match(r.stdout, /fence ok/);
});

test("stop-scheduler-operation deregisters and reaps with remaining registry, not empty set", () => {
  assert.match(agentSource, /remaining = set\(str\(e\.get\("opId"\) or ""\) for e in _read_run_plan_registry\(root\)/);
  assert.match(agentSource, /_reap_zombie_scheduler_sessions\(root, remaining\)/);
});

test("extension and agent never hardcode absolute server paths or tmux names", () => {
  // Check that tb session name is derived from prefix, not hardcoded
  assert.match(agentSource, /tb_tmux_session_name\(prefix\)/);
  assert.match(agentSource, /normalizeRemoteTmuxSessionPrefix/i);
  assert.match(extensionSource, /_tb/);
  assert.match(extensionSource, /tbSession/);
  // Ensure no absolute server path in tb_discover_launch candidates (they are relative to root)
  assert.match(agentSource, /for rel in \("tmp\/start_tb\.sh", "start_tb\.sh", "scripts\/start_tb\.sh", "simple_cluster\/tmp\/start_tb\.sh"\)/);
});

test("worker_tmux_session_name: single-machine degenerates to gpu-<gpu>, multi-machine keeps worker", () => {
  assert.match(agentSource, /def worker_tmux_session_name\(worker_id, gpu_id, local_worker_id=None\)/);
  const py = `
import importlib.util, pathlib, os
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(agentPath)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

def check(worker_id, gpu_id, local, expected):
    got = agent.worker_tmux_session_name(worker_id, gpu_id, local_worker_id=local)
    assert got == expected, f"worker={worker_id!r} gpu={gpu_id!r} local={local!r} -> {got!r} != {expected!r}"
    assert got.startswith("gpu-"), got

# single-machine signals: empty / worker / default -> degenerate to gpu-<gpu>
check("", "0", None, "gpu-0")
check("worker", "3", None, "gpu-3")
check("default", "7", None, "gpu-7")
# worker matches local id -> same machine -> degenerate
check("nodeA", "3", "nodeA", "gpu-3")
# distinct worker vs local -> multi-machine -> keep worker in name
check("Worker-1", "0", "nodeA", "gpu-worker-1-0")
# worker normalization: uppercase + spaces collapsed to dashes, lowercased; gpu stays numeric
check("My Worker!", "0", "other", "gpu-my-worker-0")
check("GPU-Node", "0", "nodeA", "gpu-gpu-node-0")
print("ok")
`;
  const r = runPython(py);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("execute_worker_command reuses worker_tmux_session_name for per-GPU single tmux", () => {
  // The start path must call worker_tmux_session_name (not build the session inline).
  assert.match(agentSource, /session = worker_tmux_session_name\(worker_id, gpu_id, os\.environ\.get\("SIMPLE_EXPERIMENT_WORKER_ID"\)\)/);
  // Final tmux name still goes through simple_tmux_name (prefix + lowercase) so reuse key is normalized.
  assert.match(agentSource, /tmux_session = simple_tmux_name\(session\)/);
});
