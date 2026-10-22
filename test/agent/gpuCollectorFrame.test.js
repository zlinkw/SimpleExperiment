const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

// The collector lives in its own chunk; read the raw TS module text (String.raw
// Python body) and extract only the functions under test, per AGENTS: never
// import or exec the whole cluster_agent.py. Fixtures are deliberately kept on
// disk (the path is printed for the evidence log) — no recursive deletes.
const chunk = fs.readFileSync(path.join(__dirname, "../../src/runtime/GpuCollector.ts"), "utf8");
const tmuxChunk = fs.readFileSync(path.join(__dirname, "../../src/runtime/TmuxTaskLifecycle.ts"), "utf8");

function definitionFrom(source, name) {
  const start = source.search(new RegExp(`^def ${name}\\(`, "m"));
  assert.notEqual(start, -1, `missing production definition: ${name}`);
  const tail = source.slice(start);
  const next = tail.slice(1).search(/^(?:def |class |_[A-Z][A-Z_]*\s*=|[A-Z][A-Z_]*\s*=|`)/m);
  return next === -1 ? tail : tail.slice(0, next + 1);
}
function pythonDefinition(name) { return definitionFrom(chunk, name); }
function tmuxDefinition(name) { return definitionFrom(tmuxChunk, name); }

const definitions = [
  "gpu_collector_worker_ns", "gpu_collector_state_root", "gpu_collector_frame_path", "gpu_collector_register_path",
  "gpu_collector_session", "gpu_collector_command", "gpu_collector_tmux", "gpu_collector_binding",
  "gpu_collector_publish_generation", "gpu_collector_read_registration", "gpu_collector_ensure",
  "gpu_collector_note_mode", "gpu_collector_main", "gpu_collector_self_heal", "read_gpu_collector_frame",
  "gpu_admission_probe_bound", "gpu_admission_probe", "gpu_admission_recheck_evidence",
].map(pythonDefinition).join("\n\n");

function runPython(body, extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpu-collector-test-"));
  const file = path.join(dir, "case.py");
  const preamble = `
import hashlib, json, os, re, shlex, sys, threading, time
ROOT = ${JSON.stringify(dir.replace(/\\/g, "/"))}
os.environ["SIMPLE_EXPERIMENT_WORKER_STATE_DIR"] = os.path.join(ROOT, "worker-state")
STATE = os.path.join(ROOT, "state")
AGENT_STATE_DIR = STATE
RUNTIME_VERSION = "test"
GPU_COLLECTOR_FRESH_MS = 5000.0
GPU_ADMISSION_WAIT_SECONDS = 0.4
GPU_COLLECTOR_SOURCE = "worker_gpu_collector"
GPU_WORKER_STATE_ENV = "SIMPLE_EXPERIMENT_WORKER_STATE_DIR"
_GPU_SOURCE_MODE_LAST = {}
_GPU_COLLECTOR_HEAL_AT = {}
EVENTS = []
TMUX_CALLS = []
TMUX_SCRIPT = []
GPU_PROBES = []
def now_iso(): return "2026-10-22T00:00:00Z"
def resolve_agent_state_dir(root, configured):
    ns = "ns" + str(abs(hash(os.path.basename(root))) % 1000)
    target = os.path.join(configured, "projects", ns)
    os.makedirs(target, exist_ok=True)
    return target
def agent_dir(root):
    return resolve_agent_state_dir(root, os.path.join(root, ".agent-state"))
def append_event(root, event): EVENTS.append(event)
def collect_local_gpu():
    if GPU_PROBES: return GPU_PROBES.pop(0)
    return [{"index": 0, "memoryUsedMb": 100, "memoryTotalMb": 8000, "utilizationPercent": 3}], ""
def task_session_prefix(): return "tst"
def read_json(p, fallback):
    try:
        with open(p, "r", encoding="utf-8") as handle: return json.load(handle)
    except Exception: return fallback
def atomic_write(path, payload):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    temp = path + ".tmp.%d" % os.getpid()
    with open(temp, "w", encoding="utf-8") as handle: json.dump(payload, handle)
    os.replace(temp, path)
class FakeCompleted:
    def __init__(self, returncode, stdout, stderr): self.returncode, self.stdout, self.stderr = returncode, stdout, stderr
class FakeProc:
    @staticmethod
    def run(args, capture_output=None, text=None, timeout=None):
        TMUX_CALLS.append([str(a) for a in args])
        if TMUX_SCRIPT: return TMUX_SCRIPT.pop(0)
        return FakeCompleted(1, "", "fixture default: no session")
subprocess = FakeProc()
${definitions}
${extra || ""}
def write_frame(worker, root, epoch, seq, mono=None, gpus=None, completeness="full", frame_source=None):
    frame = {"schemaVersion": 1, "frameSource": frame_source or GPU_COLLECTOR_SOURCE, "workerId": worker,
             "epoch": epoch, "seq": seq, "collectedAt": now_iso(),
             "collectedMonotonicMs": int(time.monotonic() * 1000) if mono is None else mono,
             "status": "ok", "error": "", "completeness": completeness, "runtimeVersion": RUNTIME_VERSION,
             "gpu": gpus or [{"index": 0}], "gpus": gpus or [{"index": 0}]}
    atomic_write(gpu_collector_frame_path(worker, root), frame)
    return frame
def publish_generation(worker, root, epoch):
    atomic_write(gpu_collector_register_path(worker, root),
        {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker, "framePath": gpu_collector_frame_path(worker, root),
         "epoch": epoch, "runningVersion": RUNTIME_VERSION, "uid": os.getuid() if hasattr(os, "getuid") else -1,
         "genStartedMonotonicMs": int(time.monotonic() * 1000)})
`;
  fs.writeFileSync(file, preamble + "\n" + body, "utf-8");
  const proc = spawnSync("python3", ["-B", "-I", file],
    { encoding: "utf-8", timeout: 10000, windowsHide: true });
  return { dir, status: proc.status, stdout: proc.stdout || "", stderr: proc.stderr || "",
    spawnError: proc.error ? proc.error.message : null };
}

function ok(res) {
  assert.ok(!res.spawnError, `spawn failed: ${res.spawnError}`);
  assert.equal(res.status, 0, `python exited ${res.status} (fixture kept at ${res.dir})\n${res.stdout}\n${res.stderr}`);
  return res.stdout;
}

test("single-source identity comes from the Worker id, not per-project paths or prefixes", () => {
  const out = ok(runPython(String.raw`
pa1 = gpu_collector_frame_path("worker-a", os.path.join(ROOT, "proj1"))
pa2 = gpu_collector_frame_path("worker-a", os.path.join(ROOT, "proj2"))
assert pa1 == pa2, (pa1, pa2)
assert pa1 != gpu_collector_frame_path("worker-b", os.path.join(ROOT, "proj1"))
s1 = gpu_collector_session("worker-a", os.path.join(ROOT, "proj1"))
s2 = gpu_collector_session("worker-a", os.path.join(ROOT, "proj2"))
assert s1 == s2 and s1.startswith("se-gpu-collector-"), (s1, s2)
# Identity ignores the per-project session prefix entirely: two projects with
# different prefixes must still map to the SAME collector session (one source).
_original = task_session_prefix
task_session_prefix = lambda: "other-prefix"
assert gpu_collector_session("worker-a", os.path.join(ROOT, "proj2")) == s1
task_session_prefix = _original
# The deployment-level worker state dir wins over every per-project derivation.
os.environ["SIMPLE_EXPERIMENT_WORKER_STATE_DIR"] = os.path.join(ROOT, "shared-state")
moved = gpu_collector_frame_path("worker-a", os.path.join(ROOT, "proj1"))
assert moved.startswith(os.path.join(ROOT, "shared-state")), moved
# The launched collector command must carry BOTH the session prefix and the worker
# state dir — tmux children inherit the server env, so an uncarried variable would
# make the collector write a frame path no consumer reads.
cmd = gpu_collector_command("worker-a", os.path.join(ROOT, "proj1"))
assert cmd.startswith("exec env "), cmd
assert "SIMPLE_EXPERIMENT_WORKER_STATE_DIR=" + os.path.join(ROOT, "shared-state") in cmd, cmd
assert "SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX=tst " in cmd, cmd
del os.environ["SIMPLE_EXPERIMENT_WORKER_STATE_DIR"]
cmd2 = gpu_collector_command("worker-a", os.path.join(ROOT, "proj1"))
assert "SIMPLE_EXPERIMENT_WORKER_STATE_DIR" not in cmd2, cmd2
os.environ["SIMPLE_EXPERIMENT_WORKER_STATE_DIR"] = os.path.join(ROOT, "worker-state")
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("frame reads distinguish fresh/stale/partial/foreign/unreadable — a stat failure is never absent", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
assert read_gpu_collector_frame(worker, root)["mode"] == "absent"
write_frame(worker, root, "gen-1", 7)
got = read_gpu_collector_frame(worker, root)
assert got["mode"] == "fresh" and got["frame"]["seq"] == 7, got
# Wall-clock rewind cannot manufacture freshness; monotonic age past the bound
# and negative age (host replay) both stay stale.
write_frame(worker, root, "gen-1", 8, mono=int(time.monotonic() * 1000) - 60000)
assert read_gpu_collector_frame(worker, root)["mode"] == "stale"
write_frame(worker, root, "gen-1", 9, mono=int(time.monotonic() * 1000) + 60000)
assert read_gpu_collector_frame(worker, root)["mode"] == "stale"
# Foreign identity is never consumed.
write_frame(worker, root, "gen-1", 10, gpus=[{"index": 0}])
foreign = read_json(gpu_collector_frame_path(worker, root), None)
foreign["workerId"] = "worker-z"
atomic_write(gpu_collector_frame_path(worker, root), foreign)
assert read_gpu_collector_frame(worker, root)["mode"] == "foreign"
# A stat failure is UNREADABLE (unknown), never "absent" (which would open the
# legacy direct-sampling door on a permission error.
_real_isfile = os.path.isfile
def _denied(_p): raise PermissionError("fixture stat denial")
os.path.isfile = _denied
try:
    assert read_gpu_collector_frame(worker, root)["mode"] == "unreadable"
finally:
    os.path.isfile = _real_isfile
# A half-written/corrupt frame is unreadable, not a silently skipped absence.
with open(gpu_collector_frame_path(worker, root), "w", encoding="utf-8") as handle: handle.write("{trunc")
_real_isfile2 = os.path.isfile
def _raise_json(_p, _f): raise ValueError("corrupt")
_saved = read_json
try:
    globals()["read_json"] = _raise_json
    assert read_gpu_collector_frame(worker, root)["mode"] == "unreadable"
finally:
    globals()["read_json"] = _saved
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("gpu_collector_main really loops: registration and frames advance with a stable epoch", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
_samples = []
_counter = [0]
def collect_local_gpu():
    _counter[0] += 1
    return [{"index": 0, "memoryUsedMb": _counter[0]}], ""
stop = threading.Event()
def loop():
    try: gpu_collector_main(root, worker, poll_seconds=0.5)
    except Exception as exc: _samples.append(("loop-error", repr(exc)))
thread = threading.Thread(target=loop, daemon=True); thread.start()
deadline = time.monotonic() + 6.0
frames = []
while time.monotonic() < deadline:
    observed = read_gpu_collector_frame(worker, root)
    if observed.get("frame") and int(observed["frame"]["seq"]) >= 2:
        frames.append(observed["frame"]); break
    time.sleep(0.05)
assert frames, "collector main never produced two frames"
frame = frames[0]
registration = gpu_collector_read_registration(worker, root)
assert registration["mode"] == "registered", registration
assert registration["registration"]["epoch"] == frame["epoch"], (registration, frame)
assert isinstance(registration["registration"]["genStartedMonotonicMs"], (int, float))
assert int(frame["seq"]) >= 2 and frame["completeness"] == "full"
epoch = frame["epoch"]
deadline = time.monotonic() + 4.0
while time.monotonic() < deadline:
    later = read_gpu_collector_frame(worker, root)
    if later.get("frame") and int(later["frame"]["seq"]) > int(frame["seq"]): break
    time.sleep(0.05)
assert read_gpu_collector_frame(worker, root)["frame"]["epoch"] == epoch
assert not [row for row in _samples if row[0] == "loop-error"], _samples
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("admission rejects a sample that started BEFORE the request even when its seq advanced", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
# Registered generation E1. The newest frame was ALREADY collecting before this
# request began (start = now-500ms) and merely finishes its write before/after:
# seq advanced past the opening read, but causality forbids accepting it.
publish_generation(worker, root, "gen-1")
write_frame(worker, root, "gen-1", 10)
time.sleep(0.05)
write_frame(worker, root, "gen-1", 11, mono=int(time.monotonic() * 1000) - 500)
gpus, error, evidence = gpu_admission_probe_bound(root, worker)
assert gpus == [] and "gpu_collector_stalled" in error, (gpus, error)
assert evidence is None
assert GPU_PROBES == []  # registered worker: never a hidden second sampler
# The same fence with a start AFTER the request is accepted.
def advancer():
    time.sleep(0.1)
    write_frame(worker, root, "gen-1", 12, gpus=[{"index": 0, "memoryUsedMb": 4242}])
threading.Thread(target=advancer).start()
gpus, error, evidence = gpu_admission_probe_bound(root, worker)
assert error == "" and gpus[0]["memoryUsedMb"] == 4242, (gpus, error)
assert evidence["epoch"] == "gen-1" and evidence["seq"] == 12
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("generation authority: mid-request collector restart is followed, old epochs never flood back", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
publish_generation(worker, root, "gen-1")
write_frame(worker, root, "gen-1", 100)  # old generation, seq high, started before any request
time.sleep(0.05)
# Restart DURING the request window: registration moves first, then frames.
def restart():
    time.sleep(0.1)
    publish_generation(worker, root, "gen-2")
    write_frame(worker, root, "gen-2", 1, gpus=[{"index": 0, "memoryUsedMb": 777}])
threading.Thread(target=restart).start()
gpus, error, evidence = gpu_admission_probe_bound(root, worker)
assert error == "" and gpus[0]["memoryUsedMb"] == 777, (gpus, error)
assert evidence["epoch"] == "gen-2" and evidence["seq"] == 1
# A late-arriving old-generation frame with a HUGE seq is rejected while gen-2
# is the published generation (seq alone proves nothing across generations).
time.sleep(0.05)
write_frame(worker, root, "gen-1", 999, gpus=[{"index": 0, "memoryUsedMb": 666}])
gpus2, error2, _ = gpu_admission_probe_bound(root, worker)
assert gpus2 == [] and "gpu_collector_stalled" in error2, (gpus2, error2)
assert GPU_PROBES == []
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("reserve in-lock recheck binds the exact accepted evidence and fails closed on any change", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
publish_generation(worker, root, "gen-9")
def advancer():
    time.sleep(0.05)
    write_frame(worker, root, "gen-9", 4, gpus=[{"index": 0, "memoryUsedMb": 111}])
threading.Thread(target=advancer).start()
gpus, error, evidence = gpu_admission_probe_bound(root, worker)
assert error == "" and evidence and evidence["seq"] == 4, (gpus, error, evidence)
same, err = gpu_admission_recheck_evidence(root, worker, evidence)
assert err == "" and same[0]["memoryUsedMb"] == 111, (same, err)
# The frame moved on: the accepted evidence is no longer the disk state.
write_frame(worker, root, "gen-9", 5)
same2, err2 = gpu_admission_recheck_evidence(root, worker, evidence)
assert same2 == [] and err2 == "gpu_admission_evidence_changed", (same2, err2)
# Same frame identity on disk but the PUBLISHED generation moved (collector
# restarted, new frame not written yet): still invalidates the credential.
write_frame(worker, root, "gen-9", 4, mono=evidence["collectedMonotonicMs"], gpus=[{"index": 0, "memoryUsedMb": 111}])
atomic_write(gpu_collector_register_path(worker, root),
    {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker, "framePath": gpu_collector_frame_path(worker, root),
     "epoch": "gen-10", "runningVersion": RUNTIME_VERSION, "uid": os.getuid(), "genStartedMonotonicMs": 1})
same3, err3 = gpu_admission_recheck_evidence(root, worker, evidence)
assert same3 == [] and err3 == "gpu_admission_evidence_generation_changed", (same3, err3)
assert GPU_PROBES == []
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("legacy direct sampling requires CONFIRMED absence; failures queue instead of resampling", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj-none"); worker = "worker-a"
# Confirmed legacy: no registration AND no frame.
GPU_PROBES.append(([{"index": 0, "direct": True}], ""))
gpus, error, evidence = gpu_admission_probe_bound(root, worker)
assert error == "" and gpus[0]["direct"] is True and evidence is None
assert EVENTS[-1]["payload"]["mode"] == "direct_unoptimized"
# Registered + stale: queued error, GPU_PROBES must stay empty (no second sampler).
GPU_PROBES.append(([{"index": 0, "direct": True}], ""))
publish_generation(worker, root, "gen-1")
write_frame(worker, root, "gen-1", 3, mono=int(time.monotonic() * 1000) - 60000)
gpus2, error2, _ = gpu_admission_probe_bound(root, worker)
assert gpus2 == [] and "gpu_collector_stalled" in error2, (gpus2, error2)
assert len(GPU_PROBES) == 1, "registered stale frame must never trigger direct sampling"
# Corrupt registration: unknown capability -> error, never legacy fallback.
atomic_write(gpu_collector_register_path(worker, root), {"broken": True})
gpus3, error3, _ = gpu_admission_probe_bound(root, worker)
assert gpus3 == [] and error3 == "gpu_collector_identity_unverified", (gpus3, error3)
assert len(GPU_PROBES) == 1
# Frame present but registration missing (collector version predating the
# register file): frame-only mode still enforces the request-bound fence.
os.remove(gpu_collector_register_path(worker, root))
write_frame(worker, root, "gen-old", 3, mono=int(time.monotonic() * 1000) - 500)
gpus4, error4, _ = gpu_admission_probe_bound(root, worker)
assert gpus4 == [] and "gpu_collector_stalled" in error4, (gpus4, error4)
assert len(GPU_PROBES) == 1
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("ensure never fabricates a binding epoch and refuses foreign identity, UID and startup races", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
frame_path = gpu_collector_frame_path(worker, root)
own = {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker, "framePath": frame_path, "epoch": "gen-live", "uid": os.getuid()}
# Case 1: fresh start must NOT write any annotation (the collector publishes).
TMUX_CALLS.clear(); TMUX_SCRIPT[:] = [FakeCompleted(1, "", "no session"), FakeCompleted(0, "", ""), FakeCompleted(0, "", "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "started", report
assert not any("set-option" in " ".join(c) and "@se_gpu_collector" in " ".join(c) for c in TMUX_CALLS), TMUX_CALLS
# Case 2: running own collector -> reported with the collector's own epoch.
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(own), "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "running" and report["epoch"] == "gen-live", report
assert not any("respawn" in " ".join(c) or "set-option" in " ".join(c) or "new-session" in " ".join(c) for c in TMUX_CALLS)
# Case 3: dead pane -> respawn that exact pane only; no epoch is written by ensure.
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t1\t" + json.dumps(own), ""), FakeCompleted(0, "", "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "respawned" and report["paneId"] == "%12", report
respawns = [c for c in TMUX_CALLS if "respawn-pane" in c]
assert len(respawns) == 1 and respawns[0][respawns[0].index("-t") + 1] == "%12", respawns
assert not any("set-option" in " ".join(c) and "@se_gpu_collector" in " ".join(c) for c in TMUX_CALLS)
# Case 4: foreign frameSource -> mismatch, zero mutation.
foreign = dict(own); foreign["framePath"] = "/somewhere/else/gpu_frame.json"
TMUX_CALLS.clear(); TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(foreign), "")]
assert gpu_collector_ensure(worker, root)["status"] == "mismatch"
assert len(TMUX_CALLS) == 2
# Case 5: foreign UID -> refuse.
other = dict(own); other["uid"] = os.getuid() + 1000
TMUX_CALLS.clear(); TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(other), "")]
assert gpu_collector_ensure(worker, root)["status"] == "foreign_uid"
# Case 6: startup race (new-session loses) -> re-verify the winner, no takeover.
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(1, "", "no session"), FakeCompleted(1, "", "duplicate session"),
                  FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(own), "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "race_won_by_other", report
assert sum(1 for c in TMUX_CALLS if "new-session" in " ".join(c)) == 1, TMUX_CALLS
assert not any("respawn" in " ".join(c) or "set-option" in " ".join(c) for c in TMUX_CALLS)
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});

test("inventory carries a fresh frame lock-free and NEVER dresses a broken shared source as ready", () => {
  const extra = String.raw`
import copy
os.environ["SIMPLE_EXPERIMENT_WORKER_ID"] = "worker-a"
LOCK_ACQUIRES = []
class CountingLock:
    def __init__(self): self.held = False
    def acquire(self, blocking=None):
        LOCK_ACQUIRES.append(1)
        if self.held: return False
        self.held = True
        return True
    def release(self): self.held = False
WORKER_GPU_SAMPLE_LOCK = CountingLock()
WORKER_GPU_SAMPLE_CACHE = {"sample": (time.monotonic(), {"gpu": [{"index": 9}], "gpus": [{"index": 9}], "source": "worker_agent_direct"})}
def task_safe_path(root, path_value): return path_value
def task_inventory(root, execution_only=False):
    return [{"commandId": "cmd-1", "projectId": "proj-1", "workerId": "worker-a"}]
def local_stop_tmux_inventory(root): return []
def task_option(target, option): return "[]"
def task_queue_session(root, worker): return "sess"
` + tmuxDefinition("task_execution_inventory");
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
publish_generation(worker, root, "gen-1")
write_frame(worker, root, "gen-1", 3, gpus=[{"index": 7}])
inv = task_execution_inventory(root)
assert inv["gpuSampleState"] == "ready" and inv["gpuSample"]["frameSource"] == GPU_COLLECTOR_SOURCE
assert inv["gpuSample"]["seq"] == 3 and inv["capabilities"]["gpuCollector"] == 1
assert LOCK_ACQUIRES == [], LOCK_ACQUIRES
# Registered but stale: honest "stale" — the legacy cache must NOT resurrect ready.
write_frame(worker, root, "gen-1", 3, mono=int(time.monotonic() * 1000) - 60000)
inv2 = task_execution_inventory(root)
assert inv2["gpuSampleState"] == "stale" and inv2["gpuSample"] is None, inv2["gpuSampleState"]
assert LOCK_ACQUIRES == [], LOCK_ACQUIRES
# Registered with no frame at all: honest "stalled".
os.remove(gpu_collector_frame_path(worker, root))
inv3 = task_execution_inventory(root)
assert inv3["gpuSampleState"] == "stalled" and inv3["gpuSample"] is None
assert LOCK_ACQUIRES == [], LOCK_ACQUIRES
# Confirmed legacy (no registration, no frame): the old marked cache path stays.
os.remove(gpu_collector_register_path(worker, root))
inv4 = task_execution_inventory(root)
assert inv4["gpuSampleState"] == "ready" and inv4["gpuSample"]["gpus"][0]["index"] == 9
assert len(LOCK_ACQUIRES) == 1, LOCK_ACQUIRES
print("OK " + ROOT)
`, extra));
  assert.match(out, /OK/);
});

test("concurrent consumers only ever see whole frames with per-reader monotonic (epoch, seq)", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
path_frame = gpu_collector_frame_path(worker, root)
seen = []
errors = []
stop = threading.Event()
def writer():
    seq = 0
    while not stop.is_set():
        seq += 1
        # memoryUsedMb mirrors seq EXACTLY: a torn/half frame breaks the pairing.
        write_frame(worker, root, "gen-1", seq, gpus=[{"index": 0, "memoryUsedMb": seq, "twin": seq}])
        time.sleep(0.001)
def reader():
    try:
        last = 0
        while not stop.is_set():
            got = read_gpu_collector_frame(worker, root)
            frame = got.get("frame")
            if got.get("mode") == "fresh" and frame:
                row = frame["gpus"][0]
                # Whole-frame integrity: every field of one frame must agree.
                assert row["memoryUsedMb"] == row["twin"] == frame["seq"], (row, frame["seq"])
                if row["memoryUsedMb"] < last: errors.append("regression %d after %d" % (row["memoryUsedMb"], last))
                last = row["memoryUsedMb"]
                seen.append(last)
    except Exception as exc:
        errors.append(repr(exc))
writer_thread = threading.Thread(target=writer); writer_thread.start()
readers = [threading.Thread(target=reader) for _ in range(8)]
for thread in readers: thread.start()
time.sleep(1.2)
stop.set()
writer_thread.join(timeout=5); [thread.join(timeout=5) for thread in readers]
assert errors == [], errors
assert len(seen) > 10, len(seen)
print("OK " + ROOT)
`));
  assert.match(out, /OK/);
});
