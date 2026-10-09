import ast
import os
import pathlib
import threading

source = pathlib.Path(os.environ["TEST_AGENT_PATH"]).read_text(encoding="utf-8")
tree = ast.parse(source)
wanted = {"execute_worker_command", "_execute_worker_command_unfenced", "worker_task_matches_stop_identity", "close_worker_task_pane", "worker_task_pane_presence", "append_event", "read_json", "atomic_write", "path_for", "current_worker_task", "append_worker_task", "now_iso"}
body = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom)) or getattr(node, "name", None) in wanted]
module = ast.Module(body=body, type_ignores=[])
ast.fix_missing_locations(module)
namespace = {"__builtins__": __builtins__}
exec(compile(module, os.environ["TEST_AGENT_PATH"], "exec"), namespace)
killed = []
closed_panes = set()
calls = []
pane_sessions = {"%9": "simple-gpu-0", "%8": "simple-gpu-0", "%4": "simple-gpu-0"}
inventory_error = None
kill_error = False
kill_race = False
inventory_timeout = False
malformed_inventory = False

class Result:
    def __init__(self, code, stdout="", stderr=""):
        self.returncode = code
        self.stdout = stdout
        self.stderr = stderr

def fake_run(args, **kwargs):
    calls.append(list(args))
    if args[:3] == ["tmux", "list-panes", "-a"]:
        if malformed_inventory:
            return Result(0, "unparseable pane inventory")
        if inventory_timeout:
            raise namespace["subprocess"].TimeoutExpired(args, 3)
        if inventory_error:
            return Result(1, stderr=inventory_error)
        rows = [pane + "\t" + session for pane, session in pane_sessions.items() if pane not in closed_panes]
        return Result(0, "\n".join(rows))
    if len(args) >= 5 and args[0] == "tmux" and args[1] == "display-message" and str(args[4]).startswith("%"):
        pane = args[4]
        return Result(1 if pane in closed_panes else 0, "" if pane in closed_panes else pane + "\n")
    if args[:3] == ["tmux", "kill-pane", "-t"]:
        if kill_error:
            return Result(1, stderr="kill denied")
        killed.append(args[3])
        closed_panes.add(args[3])
        return Result(1 if kill_race else 0)
    if args[:2] == ["tmux", "kill-session"]:
        raise AssertionError("shared session must stay open")
    return Result(0)

namespace["subprocess"].run = fake_run
namespace["os"].kill = lambda *args: (_ for _ in ()).throw(AssertionError("numeric pid kill is not the pane close"))
namespace["WORKER_TASK_SNAPSHOT_LOCK"] = threading.Lock()
namespace["LEGACY_WORKER_STOP_IDENTITY_FIELDS"] = ("workflowId", "planRevision", "planFile", "case", "seed", "attempt", "outputDir", "workerId", "gpuId")
namespace["cancel_durable_plan_job"] = lambda root, command: None
namespace["agent_dir"] = lambda root: os.path.join(root, "state")
namespace["append_event"] = lambda root, event: None
store = {}

def remember(root, task):
    key = root + "::worker_task_snapshot.json"
    payload = store.setdefault(key, {"schemaVersion": 1, "tasks": []})
    rows = payload["tasks"]
    rows[:] = [row for row in rows if row.get("commandId") != task.get("commandId")]
    rows.append(dict(task))

namespace["append_worker_task"] = remember
namespace["current_worker_task"] = lambda root, task: next((row for row in store.get(root + "::worker_task_snapshot.json", {}).get("tasks", []) if row.get("commandId") == task.get("commandId")), task)
namespace["read_json"] = lambda path, fallback: store.get(path, fallback)
namespace["atomic_write"] = lambda path, payload: store.__setitem__(path, payload)
namespace["path_for"] = lambda root, name: root + "::" + name
execute = namespace["execute_worker_command"]
root = "memory-root"
own = {"commandId": "job-own", "status": "running", "workflowId": "plan-own", "planRevision": "rev", "planFile": "plans/own.yaml", "case": "bus", "seed": 1, "attempt": 1, "outputDir": "work/own", "workerId": "w1", "gpuId": "0", "tmuxSession": "simple-gpu-0", "tmuxPane": "%9", "pid": "%9"}
other = {"commandId": "job-other", "status": "running", "workflowId": "plan-other", "planRevision": "rev", "planFile": "plans/other.yaml", "case": "pad", "seed": 2, "attempt": 1, "outputDir": "work/other", "workerId": "w1", "gpuId": "0", "tmuxSession": "simple-gpu-0", "tmuxPane": "%8", "pid": "%8"}
finished = {"commandId": "job-done", "status": "completed", "workflowId": "plan-own", "planRevision": "rev", "planFile": "plans/own.yaml", "case": "bus", "seed": 3, "attempt": 1, "outputDir": "work/done", "workerId": "w1", "gpuId": "0", "tmuxSession": "simple-gpu-0", "tmuxPane": "%4", "pid": "%4"}
store[namespace["path_for"](root, "worker_task_snapshot.json")] = {"schemaVersion": 1, "tasks": [own, other, finished]}
empty = execute(root, {"action": "stop-worker-task", "commandId": "stop-empty"}, "w1")
assert empty["status"] == "failed" and not empty["stoppedTasks"], empty
partial = {"action": "stop-worker-task", "commandId": "stop-partial", "targetCommandId": "job-own", "workflowId": "plan-own", "workerId": "w1", "gpuId": "0"}
missing = execute(root, partial, "w1")
assert missing["status"] == "failed" and "完整身份" in missing["message"] and killed == [], missing
same = execute(root, {"action": "stop-worker-task", "commandId": "job-own", "operationId": "job-own", "targetCommandId": "job-own", "workflowId": "plan-own", "planRevision": "rev", "planFile": "plans/own.yaml", "case": "bus", "seed": 1, "attempt": 1, "outputDir": "work/own", "workerId": "w1", "gpuId": "0"}, "w1")
assert same["status"] == "failed", same
request = {"action": "stop-worker-task", "commandId": "stop-own", "operationId": "stop-own", "targetCommandId": "job-own", "workflowId": "plan-own", "planRevision": "rev", "planFile": "plans/own.yaml", "case": "bus", "seed": 1, "attempt": 1, "outputDir": "work/own", "workerId": "w1", "gpuId": "0"}
before_calls = list(calls)
wrong_attempt = execute(root, dict(request, attempt=2), "w1")
assert wrong_attempt["status"] == "failed" and calls == before_calls and killed == [], wrong_attempt
done = execute(root, request, "w1")
assert done["status"] == "completed", (done, calls)
assert killed == ["%9"], killed
receipt = done["stoppedTasks"][0]
assert receipt["commandId"] == "job-own" and receipt["workflowId"] == "plan-own" and receipt["paneClosed"] is True, receipt
close_done = dict(request, commandId="stop-done", operationId="stop-done", targetCommandId="job-done", case="bus", seed=3, outputDir="work/done")
closed = execute(root, close_done, "w1")
assert closed["status"] == "completed" and closed["stoppedTasks"][0]["paneClosed"] is True, closed
assert killed == ["%9", "%4"], killed
still = [row["commandId"] for row in store[namespace["path_for"](root, "worker_task_snapshot.json")]["tasks"] if row["status"] == "running"]
assert still == ["job-other"], still

# Retrying the same exact stop must confirm absence without killing another pane.
again = execute(root, dict(request, commandId="stop-again", operationId="stop-again"), "w1")
assert again["status"] == "completed" and again["stoppedTasks"][0]["paneClosed"] is True, again
assert again["stoppedTasks"][0]["paneAlreadyMissing"] is True, again
assert killed == ["%9", "%4"], killed

def isolated(status="running", pane="%99", session="simple-gpu-0"):
    task = dict(own, status=status, tmuxPane=pane, pid=pane, tmuxSession=session)
    store[namespace["path_for"](root, "worker_task_snapshot.json")] = {"schemaVersion": 1, "tasks": [task, other]}
    return dict(request, commandId="stop-" + status, operationId="stop-" + status)

for status in ("running", "completed", "failed", "cancelled", "stopped"):
    result = execute(root, isolated(status), "w1")
    assert result["status"] == "completed" and result["stoppedTasks"][0]["paneAlreadyMissing"] is True, result
    actual = namespace["current_worker_task"](root, own)
    assert actual["status"] == ("stopped" if status == "running" else status), actual

# An unrelated session reusing the numeric pane ID is never killed.
pane_sessions["%99"] = "unrelated-development"
before_kills = list(killed)
wrong_session = execute(root, isolated(), "w1")
assert wrong_session["status"] == "failed" and killed == before_kills, wrong_session
pane_sessions.pop("%99")

# Failed/timeout inventories cannot prove absence; terminal state alone is insufficient.
for error in ("permission denied", "error connecting to socket", "unexpected failure"):
    inventory_error = error
    result = execute(root, isolated("failed"), "w1")
    assert result["status"] == "failed" and killed == before_kills, result
inventory_error = None
inventory_timeout = True
result = execute(root, isolated("cancelled"), "w1")
assert result["status"] == "failed" and killed == before_kills, result
inventory_timeout = False
malformed_inventory = True
result = execute(root, isolated("failed"), "w1")
assert result["status"] == "failed" and killed == before_kills, result
malformed_inventory = False

pane_sessions["%99"] = "simple-gpu-0"
kill_error = True
result = execute(root, isolated(), "w1")
assert result["status"] == "failed" and killed == before_kills, result
kill_error = False

# A concurrent exit during kill is successful only after a fresh absence check.
kill_race = True
result = execute(root, isolated(), "w1")
assert result["status"] == "completed" and result["stoppedTasks"][0]["paneClosed"] is True, result
kill_race = False
inventory_error = "no server running on /tmp/tmux-user/default"
result = execute(root, isolated("failed"), "w1")
assert result["status"] == "completed" and result["stoppedTasks"][0]["paneAlreadyMissing"] is True, result
inventory_error = None
print("exact pane stop: live close, repeated stop, five missing-pane states, session identity, failed inventory, timeout and exit race ok")
