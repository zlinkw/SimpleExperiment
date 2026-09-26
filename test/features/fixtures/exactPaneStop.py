import ast
import os
import pathlib
import threading

source = pathlib.Path(os.environ["TEST_AGENT_PATH"]).read_text(encoding="utf-8")
tree = ast.parse(source)
wanted = {"execute_worker_command", "append_event", "read_json", "atomic_write", "path_for", "current_worker_task", "append_worker_task", "now_iso"}
body = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom)) or getattr(node, "name", None) in wanted]
module = ast.Module(body=body, type_ignores=[])
ast.fix_missing_locations(module)
namespace = {"__builtins__": __builtins__}
exec(compile(module, os.environ["TEST_AGENT_PATH"], "exec"), namespace)
killed = []
closed_panes = set()
calls = []

class Result:
    def __init__(self, code, stdout=""):
        self.returncode = code
        self.stdout = stdout

def fake_run(args, **kwargs):
    calls.append(list(args))
    if len(args) >= 5 and args[0] == "tmux" and args[1] == "display-message" and str(args[4]).startswith("%"):
        pane = args[4]
        return Result(1 if pane in closed_panes else 0, "" if pane in closed_panes else pane + "\n")
    if args[:3] == ["tmux", "kill-pane", "-t"]:
        killed.append(args[3])
        closed_panes.add(args[3])
        return Result(0)
    if args[:2] == ["tmux", "kill-session"]:
        raise AssertionError("shared session must stay open")
    return Result(0)

namespace["subprocess"].run = fake_run
namespace["os"].kill = lambda *args: (_ for _ in ()).throw(AssertionError("numeric pid kill is not the pane close"))
namespace["WORKER_TASK_SNAPSHOT_LOCK"] = threading.Lock()
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
namespace["current_worker_task"] = lambda root, task: next((row for row in store.get(root, []) if row.get("commandId") == task.get("commandId")), task)
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
print("stop identity ok")
