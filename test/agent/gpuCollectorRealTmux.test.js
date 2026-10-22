const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

// Real production-chain evidence with the ACTUAL tmux server and the generated
// dist/runtime/cluster_agent.py (not extracted stubs): a collector started by one
// Agent process must survive that process's exit, keep one session/one epoch,
// and a killed pane must respawn as a NEW generation — none of which static frame
// fixtures can prove. The unique worker id makes the session name exclusive to
// this run; cleanup kills ONLY that exact session and keeps fixtures for audit.
const DIST = path.join(__dirname, "../../dist/runtime/cluster_agent.py");
assert.ok(fs.existsSync(DIST), "generated runtime missing; run scripts/write-agent-runtime.js");

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "se-gpu-tmux-"));
const STATE = path.join(ROOT, "worker-state");
const PROJ = path.join(ROOT, "project");
const WORKER = "revtmux-" + process.pid + "-" + Math.floor(Math.random() * 1e6);
const STATE_FILE = path.join(ROOT, "evidence.json");
fs.mkdirSync(STATE, { recursive: true });
fs.mkdirSync(PROJ, { recursive: true });

const PREAMBLE = `
import importlib.util, json, os, signal, subprocess, sys, time
spec = importlib.util.spec_from_file_location("se_cluster_agent", ${JSON.stringify(DIST.replace(/\\/g, "/"))})
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
ROOT = ${JSON.stringify(ROOT.replace(/\\/g, "/"))}
PROJ = ${JSON.stringify(PROJ.replace(/\\/g, "/"))}
WORKER = ${JSON.stringify(WORKER)}
def load_state():
    with open(os.path.join(ROOT, "evidence.json"), "r", encoding="utf-8") as handle: return json.load(handle)
def save_state(payload):
    with open(os.path.join(ROOT, "evidence.json"), "w", encoding="utf-8") as handle: json.dump(payload, handle)
def wait_generation(timeout_s, epoch=None, seq_gt=0, epoch_ne=None):
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        reg = mod.gpu_collector_read_registration(WORKER, PROJ)
        frame = mod.read_gpu_collector_frame(WORKER, PROJ)
        if reg.get("mode") == "registered" and frame.get("frame"):
            r_epoch = str(reg["registration"]["epoch"])
            if epoch is not None and r_epoch != epoch:
                pass
            elif epoch_ne is not None and r_epoch == epoch_ne:
                pass
            elif str(frame["frame"]["epoch"]) == r_epoch and int(frame["frame"]["seq"]) > seq_gt:
                return reg, frame
        time.sleep(0.2)
    raise AssertionError("collector generation never appeared within " + str(timeout_s) + "s")
def out(payload):
    print(json.dumps(payload))
`;

function runPhase(name, body, timeoutMs) {
  const file = path.join(ROOT, name + ".py");
  fs.writeFileSync(file, PREAMBLE + "\n" + body, "utf-8");
  const proc = spawnSync("python3", ["-B", "-I", file], {
    encoding: "utf-8", timeout: timeoutMs, windowsHide: true,
    env: { ...process.env, SIMPLE_EXPERIMENT_WORKER_STATE_DIR: STATE },
  });
  return { status: proc.status, stdout: proc.stdout || "", stderr: proc.stderr || "",
    spawnError: proc.error ? proc.error.message : null, file };
}
function phaseOk(res) {
  assert.ok(!res.spawnError, `phase spawn failed (${res.file}): ${res.spawnError}`);
  assert.equal(res.status, 0, `phase exited ${res.status} (${res.file})\n${res.stdout}\n${res.stderr}`);
  const lines = res.stdout.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}
function tmux(args) {
  return spawnSync("tmux", args, { encoding: "utf-8", timeout: 10000, windowsHide: true });
}

let baseline = null; // gen-1 facts proven by phase A

test("real tmux: ensure starts the ONE canonical collector session and it publishes its own generation", () => {
  const res = phaseOk(runPhase("phase_a", String.raw`
report = mod.gpu_collector_ensure(WORKER, PROJ)
assert report["status"] == "started", report
session = mod.gpu_collector_session(WORKER, PROJ)
reg, frame = wait_generation(12.0)
frame_path = mod.gpu_collector_frame_path(WORKER, PROJ)
assert frame_path.startswith(os.environ["SIMPLE_EXPERIMENT_WORKER_STATE_DIR"]), frame_path
save_state({"session": session, "epoch": reg["registration"]["epoch"], "seq": int(frame["frame"]["seq"]),
            "paneId": None, "genStart": reg["registration"]["genStartedMonotonicMs"], "framePath": frame_path})
out({"ensure": report, "session": session, "epoch": reg["registration"]["epoch"],
     "seq": int(frame["frame"]["seq"]), "framePath": frame_path,
     "completeness": frame["frame"]["completeness"]})
`), 16000);
  assert.equal(res.ensure.status, "started");
  assert.match(res.session, /^se-gpu-collector-[0-9a-f]{16}$/);
  assert.ok(res.seq >= 1 && res.epoch, res);
  assert.ok(res.framePath.startsWith(STATE), res.framePath);
  const listed = tmux(["list-sessions", "-F", "#{session_name}"]);
  assert.equal(listed.status, 0, listed.stderr);
  const matches = listed.stdout.split("\n").filter((line) => line === res.session);
  assert.equal(matches.length, 1, `expected exactly one ${res.session}: ${listed.stdout}`);
  baseline = res;
});

test("real tmux: the consumer process exits, the SAME generation keeps advancing, ensure reports running", () => {
  assert.ok(baseline, "phase A evidence missing");
  const res = phaseOk(runPhase("phase_b", String.raw`
state = load_state()
# This python process is a NEW consumer: phase A's process already exited, yet
# its seq must have advanced (real survival of a real process, not a stub).
reg0, frame0 = wait_generation(6.0, epoch=state["epoch"], seq_gt=state["seq"])
report = mod.gpu_collector_ensure(WORKER, PROJ)
assert report["status"] == "running", report
assert report["epoch"] == state["epoch"], report
reg, frame = wait_generation(6.0, epoch=state["epoch"])
state["paneId"] = report["paneId"]
save_state(state)
out({"ensure": report, "survivedSeq": int(frame0["frame"]["seq"]), "oldSeq": state["seq"],
     "epoch": reg["registration"]["epoch"], "paneId": report["paneId"]})
`), 16000);
  assert.ok(res.survivedSeq > res.oldSeq, `seq did not advance across process exit: ${res.oldSeq} -> ${res.survivedSeq}`);
  assert.equal(res.epoch, baseline.epoch);
  assert.match(res.paneId, /^%\d+$/);
});

test("real tmux: killing the exact collector pane respawns a NEW generation, never a second session", () => {
  assert.ok(baseline, "phase A evidence missing");
  const res = phaseOk(runPhase("phase_c", String.raw`
state = load_state()
pane = state["paneId"]
pid = int(subprocess.run(["tmux", "display-message", "-p", "-t", pane, "#{pane_pid}"],
    capture_output=True, text=True, timeout=5).stdout.strip())
os.kill(pid, signal.SIGTERM)
deadline = time.monotonic() + 4.0
dead = False
while time.monotonic() < deadline:
    dead = subprocess.run(["tmux", "display-message", "-p", "-t", pane, "#{pane_dead}"],
        capture_output=True, text=True, timeout=5).stdout.strip() == "1"
    if dead: break
    time.sleep(0.2)
assert dead, "killed collector pane never reported dead (remain-on-exit broken?)"
report = mod.gpu_collector_ensure(WORKER, PROJ)
assert report["status"] == "respawned", report
# Wait for the RESPAWNED process specifically: the old generation's files are
# still on disk, so only a genuinely new epoch counts as respawn evidence.
reg, frame = wait_generation(10.0, epoch_ne=state["epoch"], seq_gt=0)
listed = subprocess.run(["tmux", "list-sessions", "-F", "#{session_name}"],
    capture_output=True, text=True, timeout=5).stdout.splitlines()
assert [name for name in listed if name == state["session"]] == [state["session"]]
out({"ensure": report, "oldEpoch": state["epoch"], "newEpoch": reg["registration"]["epoch"],
     "newSeq": int(frame["frame"]["seq"]), "panePidChanged": True, "session": state["session"]})
`), 19000);
  assert.equal(res.ensure.status, "respawned");
  assert.notEqual(res.newEpoch, res.oldEpoch);
  assert.ok(res.newSeq >= 1, res);
  assert.equal(baseline.epoch, res.oldEpoch);
});

test("real tmux: only this run's exact session is torn down", () => {
  const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, "utf-8")) : null;
  const session = state && state.session;
  assert.ok(session && session.startsWith("se-gpu-collector-"), "no exact session identity to clean");
  const killed = tmux(["kill-session", "-t", "=" + session]);
  assert.equal(killed.status, 0, killed.stderr);
  const listed = tmux(["list-sessions", "-F", "#{session_name}"]);
  const leftover = listed.stdout.split("\n").filter((line) => line === session);
  assert.equal(leftover.length, 0);
  console.log("kept fixtures at " + ROOT + " (worker " + WORKER + ")");
});
