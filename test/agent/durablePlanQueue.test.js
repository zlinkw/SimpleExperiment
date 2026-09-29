const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/clusterAgentRuntime.ts");

function pythonDefinition(name) {
  const start = source.search(new RegExp(`^def ${name}\\(`, "m"));
  assert.notEqual(start, -1, `missing production definition: ${name}`);
  const tail = source.slice(start);
  const next = tail.slice(1).search(/^(?:def |class |[A-Z][A-Z_]*\\s*=)/m);
  return next === -1 ? tail : tail.slice(0, next + 1);
}

function fixture(root) {
  const definitions = [
    "durable_plan_queue_path", "read_durable_plan_queue", "write_durable_plan_queue",
    "durable_plan_value", "durable_plan_identity", "durable_plan_public_task",
    "durable_plan_same_identity", "accept_durable_plan_job", "cancel_durable_plan_job",
    "start_durable_plan_queue_processor",
  ].map(pythonDefinition);
  const identity = source.match(/^DURABLE_PLAN_IDENTITY_FIELDS\s*=\s*\([\s\S]*?^\)/m);
  assert.ok(identity, "missing durable identity contract");
  return String.raw`
import json, os, threading, time
ROOT = ${JSON.stringify(root.replace(/\\/g, "/"))}
SCHEMA_VERSION = 1
WORKER_TASK_SNAPSHOT_LOCK = threading.RLock()
EVENTS = []
def path_for(root, name):
    state = os.path.join(root, ".agent")
    os.makedirs(state, exist_ok=True)
    return os.path.join(state, name)
def now_iso(): return "2026-09-29T00:00:00Z"
def read_json(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as handle: return json.load(handle)
    except Exception: return fallback
def replace_with_retry(source, target): os.replace(source, target)
def invalidate_runtime_json_cache(path): pass
def append_event(root, event): EVENTS.append(event)
def append_worker_task(root, task): pass
${identity[0]}
${definitions.join("\n\n")}

def make_job(index, command_id):
    return {"projectId":"project-a", "workflowId":"workflow-a", "planFile":"experiments/plans/a.yaml",
        "planRevision":"revision-a", "codeFingerprint":"sha-a", "experimentIndex":index, "case":"case-a",
        "seed":40+index, "attempt":1, "outputDir":"experiments/runs/job-"+str(index)+"/attempts/1",
        "runKey":command_id, "commandId":command_id, "workerId":"worker-a", "planJobCount":3,
        "action":"start-worker-task", "durablePlanQueue":True}

first = accept_durable_plan_job(ROOT, make_job(0, "legacy-0"), "worker-a")
again = accept_durable_plan_job(ROOT, make_job(0, "legacy-0"), "worker-a")
assert first["durableAccepted"] is True and first["status"] == "queued"
assert again["commandId"] == "legacy-0" and again["durableAccepted"] is True
assert first["runKey"] == "legacy-0" and first["planJobCount"] == 3
assert len(read_durable_plan_queue(ROOT)["jobs"]) == 1

cancel = {**make_job(0, "legacy-0"), "targetCommandId":"legacy-0", "commandId":"cancel-op"}
bad = {**cancel, "seed":999}
try:
    cancel_durable_plan_job(ROOT, bad)
    raise AssertionError("mismatched cancellation identity must be rejected")
except ValueError:
    pass
cancelled = cancel_durable_plan_job(ROOT, cancel)
assert cancelled["status"] == "cancelled" and cancelled["stopReason"] == "user_cancel"
assert read_durable_plan_queue(ROOT)["jobs"][0]["status"] == "cancelled"
replay_cancel = cancel_durable_plan_job(ROOT, cancel)
assert replay_cancel is None, "ordinary cancellation semantics must remain unchanged"

# Restart fences dispatching work as unknown and never replays it.
crash = accept_durable_plan_job(ROOT, make_job(1, "legacy-crash"), "worker-a")
ledger = read_durable_plan_queue(ROOT)
next(row for row in ledger["jobs"] if row["commandId"] == "legacy-crash").update({"status":"dispatching", "gpuId":"2"})
write_durable_plan_queue(ROOT, ledger)
real_thread = threading.Thread
threads = []
class HeldThread:
    def __init__(self, *args, **kwargs): self.args=args; self.kwargs=kwargs; threads.append(self)
    def start(self): pass
threading.Thread = HeldThread
start_durable_plan_queue_processor(ROOT, "worker-a", 1)
threading.Thread = real_thread
recovered = next(row for row in read_durable_plan_queue(ROOT)["jobs"] if row["commandId"] == "legacy-crash")
assert recovered["status"] == "unknown" and recovered["recoveredAt"]
assert len(threads) == 1
assert any(event["type"] == "distributed_plan_job_accepted" for event in EVENTS)
print(json.dumps({"legacyAccept":True,"legacyCancel":True,"restartFence":True}))
`;
}

test("durable Plan queue preserves legacy acceptance, cancellation, and restart fencing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "durable-plan-queue-"));
  const scriptPath = path.join(os.tmpdir(), `durable-plan-queue-${process.pid}-${Date.now()}.py`);
  fs.writeFileSync(scriptPath, fixture(root), "utf8");
  const run = spawnSync(process.env.PYTHON || "python", ["-X", "utf8", scriptPath], {
    encoding: "utf8",
    timeout: 10000,
    windowsHide: true,
  });
  assert.equal(run.status, 0, run.stderr || run.error?.message);
  assert.deepEqual(JSON.parse(run.stdout.trim()), { legacyAccept: true, legacyCancel: true, restartFence: true });
});
