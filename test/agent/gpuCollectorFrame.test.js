const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { readSource } = require("../_helpers/sourceReader");

// The collector lives in its own chunk; read the raw TS module text (String.raw
// Python body) and extract only the functions under test, per AGENTS: never
// import or exec the whole cluster_agent.py.
const chunk = fs.readFileSync(path.join(__dirname, "../../src/runtime/GpuCollector.ts"), "utf8");
const tmuxChunk = fs.readFileSync(path.join(__dirname, "../../src/runtime/TmuxTaskLifecycle.ts"), "utf8");

function tmuxDefinition(name) {
  const start = tmuxChunk.search(new RegExp(`^def ${name}\\(`, "m"));
  assert.notEqual(start, -1, `missing production definition: ${name}`);
  const tail = tmuxChunk.slice(start);
  const next = tail.slice(1).search(/^(?:def |class |_[A-Z][A-Z_]*\s*=|[A-Z][A-Z_]*\s*=|`)/m);
  return next === -1 ? tail : tail.slice(0, next + 1);
}

function pythonDefinition(name) {
  const start = chunk.search(new RegExp(`^def ${name}\\(`, "m"));
  assert.notEqual(start, -1, `missing production definition: ${name}`);
  const tail = chunk.slice(start);
  const next = tail.slice(1).search(/^(?:def |class |_[A-Z][A-Z_]*\s*=|[A-Z][A-Z_]*\s*=|`)/m);
  return next === -1 ? tail : tail.slice(0, next + 1);
}

const definitions = [
  "gpu_collector_worker_ns", "gpu_collector_state_root", "gpu_collector_frame_path", "gpu_collector_session",
  "gpu_collector_command", "gpu_collector_binding", "gpu_collector_tmux", "gpu_collector_ensure",
  "gpu_collector_note_mode", "gpu_collector_self_heal", "read_gpu_collector_frame", "gpu_admission_probe",
].map(pythonDefinition).join("\n\n");

function runPython(body, extra) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gpu-collector-test-"));
  const file = path.join(dir, "case.py");
  const preamble = `
import hashlib, json, os, re, shlex, sys, threading, time
ROOT = ${JSON.stringify(dir.replace(/\\/g, "/"))}
STATE = os.path.join(ROOT, "state")
AGENT_STATE_DIR = STATE
RUNTIME_VERSION = "test"
GPU_COLLECTOR_FRESH_MS = 5000.0
GPU_ADMISSION_WAIT_SECONDS = 0.4
GPU_COLLECTOR_SOURCE = "worker_gpu_collector"
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
`;
  fs.writeFileSync(file, preamble + "\n" + body, "utf-8");
  const proc = spawnSync("python3", ["-B", "-I", file],
    { encoding: "utf-8", timeout: 10000, windowsHide: true });
  assert.ok(!proc.error, `spawn failed: ${proc.error && proc.error.message}`);
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: proc.status, stdout: proc.stdout || "", stderr: proc.stderr || "" };
}

function ok(res) {
  assert.equal(res.status, 0, `python exited ${res.status}\n${res.stdout}\n${res.stderr}`);
  return res.stdout;
}

test("the shared frame path is Worker-scoped across projects and never shared across Workers", () => {
  const out = ok(runPython(String.raw`
pa1 = gpu_collector_frame_path("worker-a", os.path.join(ROOT, "proj1"))
pa2 = gpu_collector_frame_path("worker-a", os.path.join(ROOT, "proj2"))
pb = gpu_collector_frame_path("worker-b", os.path.join(ROOT, "proj1"))
assert pa1 == pa2, (pa1, pa2)
assert pa1 != pb
assert "projects" not in os.path.dirname(pa1).split(os.sep)
s1 = gpu_collector_session("worker-a", os.path.join(ROOT, "proj1"))
s2 = gpu_collector_session("worker-a", os.path.join(ROOT, "proj2"))
assert s1 == s2 and s1.startswith("tst-gpu-collector-"), (s1, s2)
print("OK")
`));
  assert.match(out, /OK/);
});

test("a fresh frame carries the collector epoch and seq; a wall-clock rewind cannot manufacture freshness", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
frame = {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
         "epoch": "gen-1", "seq": 7, "collectedAt": "2026-01-01T00:00:00Z",
         "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
         "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": [{"index": 0}], "gpus": [{"index": 0}]}
atomic_write(gpu_collector_frame_path(worker, root), frame)
got = read_gpu_collector_frame(worker, root)
assert got["mode"] == "fresh", got
assert got["frame"]["seq"] == 7 and got["frame"]["epoch"] == "gen-1"
# Wall clock rewound (collectedAt ancient) but monotonic fresh: still fresh.
frame["collectedMonotonicMs"] = int(time.monotonic() * 1000) - 500
atomic_write(gpu_collector_frame_path(worker, root), frame)
assert read_gpu_collector_frame(worker, root)["mode"] == "fresh"
# Monotonic age past the bound: stale, never fresh.
frame["collectedMonotonicMs"] = int(time.monotonic() * 1000) - 60000
atomic_write(gpu_collector_frame_path(worker, root), frame)
assert read_gpu_collector_frame(worker, root)["mode"] == "stale"
# Negative monotonic age (host replay) stays honest: stale, not fresh.
frame["collectedMonotonicMs"] = int(time.monotonic() * 1000) + 60000
atomic_write(gpu_collector_frame_path(worker, root), frame)
assert read_gpu_collector_frame(worker, root)["mode"] == "stale"
# A frame carrying another worker's identity is never consumed (write happens at
# worker-a's own path, so only the identity check can reject it).
frame["workerId"] = "worker-z"
atomic_write(gpu_collector_frame_path(worker, root), frame)
assert read_gpu_collector_frame(worker, root)["mode"] == "foreign"
# A stat failure can only mean "no shared frame here" (marked direct fallback),
# never a fabricated reading or freshness.
_real_isfile = os.path.isfile
def _denied(_p): raise PermissionError("fixture stat denial")
os.path.isfile = _denied
try:
    assert read_gpu_collector_frame(worker, root)["mode"] == "absent"
finally:
    os.path.isfile = _real_isfile
print("OK")
`));
  assert.match(out, /OK/);
});

test("an Agent restart never resets the collector generation: epoch holds and seq keeps advancing", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
path_frame = gpu_collector_frame_path(worker, root)
for seq in range(1, 4):
    atomic_write(path_frame, {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
        "epoch": "gen-1", "seq": seq, "collectedAt": now_iso(),
        "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
        "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": [], "gpus": [{"index": 0}]})
after_agent = read_gpu_collector_frame(worker, root)
assert (after_agent["frame"]["epoch"], after_agent["frame"]["seq"]) == ("gen-1", 3)
# Collector restart: a NEW epoch starts a fresh sequence; late old-generation
# frames can never extend it (host-side ring retires epochs separately).
for seq in range(1, 2):
    atomic_write(path_frame, {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
        "epoch": "gen-2", "seq": seq, "collectedAt": now_iso(),
        "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
        "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": [], "gpus": [{"index": 0}]})
assert read_gpu_collector_frame(worker, root)["frame"]["epoch"] == "gen-2"
print("OK")
`));
  assert.match(out, /OK/);
});

test("admission accepts only a frame whose seq advanced past the request watermark", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
path_frame = gpu_collector_frame_path(worker, root)
def write_frame(seq, gpus):
    atomic_write(path_frame, {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
        "epoch": "gen-1", "seq": seq, "collectedAt": now_iso(),
        "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
        "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": gpus, "gpus": gpus})
# The frame is a duplicate of the opening read (same seq): a background writer must
# advance past the watermark before the probe accepts anything.
write_frame(10, [{"index": 0}])
def advancer():
    time.sleep(0.1)
    write_frame(11, [{"index": 0, "memoryUsedMb": 4242}])
threading.Thread(target=advancer).start()
gpus, error = gpu_admission_probe(root, worker)
assert error == "", error
assert gpus[0].get("memoryUsedMb") == 4242
assert EVENTS[-1]["payload"]["mode"] == "collector"
print("OK")
`));
  assert.match(out, /OK/);
});

test("a stalled collector keeps the job queued instead of silently sampling or admitting", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
path_frame = gpu_collector_frame_path(worker, root)
atomic_write(path_frame, {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
    "epoch": "gen-1", "seq": 10, "collectedAt": now_iso(),
    "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
    "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": [{"index": 0}], "gpus": [{"index": 0}]})
started = time.monotonic()
gpus, error = gpu_admission_probe(root, worker)
assert gpus == [] and "gpu_collector_stalled" in error, (gpus, error)
assert 0.2 < time.monotonic() - started <= 2.0
assert EVENTS[-1]["payload"]["mode"] == "collector_stalled"
# Zero-wait recheck (after the admission transaction already passed the causality
# fence) accepts the still-fresh frame without waiting; it must never loop.
mark = time.monotonic()
gpus2, error2 = gpu_admission_probe(root, worker, wait_seconds=0)
assert gpus2 == [{"index": 0}] and error2 == "", (gpus2, error2)
assert time.monotonic() - mark < 0.2
# Truly stalled collector (frame past the freshness bound): zero-wait fails fast.
atomic_write(path_frame, {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
    "epoch": "gen-1", "seq": 10, "collectedAt": now_iso(),
    "collectedMonotonicMs": int(time.monotonic() * 1000) - 60000, "status": "ok", "error": "",
    "completeness": "full", "runtimeVersion": RUNTIME_VERSION, "gpu": [{"index": 0}], "gpus": [{"index": 0}]})
gpus3, error3 = gpu_admission_probe(root, worker, wait_seconds=0)
assert gpus3 == [] and error3 == "gpu_collector_no_fresh_frame", (gpus3, error3)
assert time.monotonic() - started < 2.5
print("OK")
`));
  assert.match(out, /OK/);
});

test("a worker without any collector keeps the marked legacy direct sample", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj-none"); worker = "worker-a"
GPU_PROBES.append(([{"index": 0, "direct": True}], ""))
gpus, error = gpu_admission_probe(root, worker)
assert error == "" and gpus[0]["direct"] is True
assert EVENTS[-1]["payload"]["mode"] == "direct_unoptimized"
assert GPU_PROBES == []
print("OK")
`));
  assert.match(out, /OK/);
});

test("ensure manages only its own exact window: a dead pane respawns by pane id, a foreign binding is refused", () => {
  const out = ok(runPython(String.raw`
root = os.path.join(ROOT, "proj1"); worker = "worker-a"
frame_path = gpu_collector_frame_path(worker, root)
binding = {"frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker, "framePath": frame_path, "epoch": "gen-1", "uid": 0}
# Case 1: running collector is reported, nothing is mutated.
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(binding), "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "running", report
assert not any("respawn" in " ".join(c) or "kill" in " ".join(c) for c in TMUX_CALLS), TMUX_CALLS
# Case 2: dead pane -> only that pane is respawned with -k.
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t1\t" + json.dumps(binding), ""),
                  FakeCompleted(0, "", "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "respawned" and report["paneId"] == "%12", report
respawns = [c for c in TMUX_CALLS if "respawn-pane" in c]
assert len(respawns) == 1 and respawns[0][respawns[0].index("-t") + 1] == "%12", respawns
assert not any("kill-session" in " ".join(c) or "kill-server" in " ".join(c) for c in TMUX_CALLS)
# Case 3: same session name but foreign binding is never taken over.
foreign = dict(binding); foreign["framePath"] = "/somewhere/else/gpu_frame.json"
TMUX_CALLS.clear()
TMUX_SCRIPT[:] = [FakeCompleted(0, "", ""), FakeCompleted(0, "@9\t%12\t0\t" + json.dumps(foreign), "")]
report = gpu_collector_ensure(worker, root)
assert report["status"] == "mismatch", report
assert len(TMUX_CALLS) == 2 and "has-session" in " ".join(TMUX_CALLS[0]), TMUX_CALLS
assert not any("respawn" in " ".join(c) or "set-option" in " ".join(c) or "new-session" in " ".join(c) for c in TMUX_CALLS), TMUX_CALLS
print("OK")
`));
  assert.match(out, /OK/);
});

test("concurrent consumers never observe a half-written frame", () => {
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
        write_frame = {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
            "epoch": "gen-1", "seq": seq, "collectedAt": now_iso(),
            "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
            "completeness": "full", "runtimeVersion": RUNTIME_VERSION,
            "gpu": [{"index": 0, "memoryUsedMb": seq}], "gpus": [{"index": 0, "memoryUsedMb": seq}]}
        atomic_write(path_frame, write_frame)
        time.sleep(0.001)
def reader():
    try:
        while not stop.is_set():
            got = read_gpu_collector_frame(worker, root)
            if got.get("frame"): seen.append(int(got["frame"]["seq"]))
    except Exception as exc:
        errors.append(repr(exc))
writer_thread = threading.Thread(target=writer); writer_thread.start()
readers = [threading.Thread(target=reader) for _ in range(8)]
for thread in readers: thread.start()
time.sleep(1.2)
stop.set()
writer_thread.join(timeout=5); [thread.join(timeout=5) for thread in readers]
assert errors == [], errors
assert len(seen) > 10
assert all(a <= b for a, b in zip(sorted(set(seen)), sorted(set(seen))[1:]))
print("OK")
`));
  assert.match(out, /OK/);
});

test("the fast inventory carries a fresh shared frame without ever touching the sampler lock", () => {
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
atomic_write(gpu_collector_frame_path(worker, root),
    {"schemaVersion": 1, "frameSource": GPU_COLLECTOR_SOURCE, "workerId": worker,
     "epoch": "gen-1", "seq": 3, "collectedAt": now_iso(),
     "collectedMonotonicMs": int(time.monotonic() * 1000), "status": "ok", "error": "",
     "completeness": "full", "runtimeVersion": RUNTIME_VERSION,
     "gpu": [{"index": 7}], "gpus": [{"index": 7}]})
inv = task_execution_inventory(root)
assert inv["gpuSampleState"] == "ready", inv["gpuSampleState"]
assert inv["gpuSample"]["frameSource"] == GPU_COLLECTOR_SOURCE
assert inv["gpuSample"]["seq"] == 3 and inv["gpuSample"]["epoch"] == "gen-1"
assert inv["gpuSample"]["gpus"][0]["index"] == 7
assert inv["capabilities"]["gpuCollector"] == 1
# The shared frame path never acquires the sampler lock (inventory stays fast
# even while a sampler holds it during nvidia-smi).
assert LOCK_ACQUIRES == [], LOCK_ACQUIRES
# No shared frame -> the legacy cache path with the lock remains (marked, unchanged).
os.remove(gpu_collector_frame_path(worker, root))
inv2 = task_execution_inventory(root)
assert inv2["gpuSampleState"] == "ready" and inv2["gpuSample"]["gpus"][0]["index"] == 9
assert len(LOCK_ACQUIRES) == 1, LOCK_ACQUIRES
# Neither source -> honestly absent, never a fabricated or re-timestamped frame.
WORKER_GPU_SAMPLE_CACHE["sample"] = None
inv3 = task_execution_inventory(root)
assert inv3["gpuSampleState"] == "missing" and inv3["gpuSample"] is None
print("OK")
`, extra));
  assert.match(out, /OK/);
});
