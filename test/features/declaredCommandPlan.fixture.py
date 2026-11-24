import itertools
import pathlib
import re
import tempfile
import os
import shlex
import json
import io
from contextlib import redirect_stdout
from collections import deque
from types import SimpleNamespace

source = (pathlib.Path(__file__).resolve().parents[2] / "src/clusterSchedulerRuntime.legacy.ts").read_text(encoding="utf-8")
scope = {"Path": pathlib.Path, "itertools": itertools, "re": re}
for name in ("safe_project_relative_path", "declared_command_jobs"):
    start = source.index("def " + name + "(")
    end = source.index("\n\ndef ", start)
    exec(compile("from __future__ import annotations\n" + source[start:end], name, "exec"), scope)

root = pathlib.Path(tempfile.mkdtemp(prefix="g005-plan-"))
parse = scope["declared_command_jobs"]
plan = {"plan_id": "p1", "name": "analysis", "command": "python analyze.py --size {matrix.size}",
        "output_dir": "work/run-{matrix.size}", "matrix": {"size": [1, 2]},
        "worker": "worker-{matrix.size}", "environment": "/env/research", "gpu": "{matrix.size}"}
jobs = parse(plan, root)
assert [job["command"] for job in jobs] == ["python analyze.py --size 1", "python analyze.py --size 2"]
assert [job["output_dir"] for job in jobs] == ["work/run-1", "work/run-2"]
assert all(job["working_dir"] == "." and job["outputs"] == [] for job in jobs)
assert [job["worker"] for job in jobs] == ["worker-1", "worker-2"]
assert all(job["environment"] == "/env/research" for job in jobs)
assert [job["gpu"] for job in jobs] == ["1", "2"]
assert "gpu" not in parse({"plan_id": "p", "name": "n", "command": "echo ok", "output_dir": "out", "gpu": "auto"}, root)[0]
assert parse({"plan_id": "p", "name": "n", "command": "echo ${HOME}", "output_dir": "work/one"}, root)[0]["command"] == "echo ${HOME}"
for bad in ({**plan, "output_dir": "work/same"}, {**plan, "output_dir": "../outside"}, {**plan, "command": ""}):
    try:
        parse(bad, root)
    except (ValueError, SystemExit):
        pass
    else:
        raise AssertionError("invalid PLAN was accepted")
start = source.index("def dry_run_plan_mode(")
end = source.index("\n\ndef ", start)
preview_scope = {"Path": pathlib.Path, "json": json, "deque": deque, "Any": object,
                 "load_plan": lambda _path: {"plan_id": "p", "name": "n", "command": "echo ok", "output_dir": "out"},
                 "declared_command_jobs": parse, "only_indices_for_args": lambda args: [],
                 "read_availability_cache": lambda *args: None, "refresh_missing_worker_availability": lambda *args: None,
                 "ordered_workers_for_dispatch": lambda workers: workers, "now": lambda: "now"}
exec(compile("from __future__ import annotations\n" + source[start:end], "dry_run_plan_mode", "exec"), preview_scope)
preview_scope["dry_run_plan_mode"](SimpleNamespace(plan="p.yaml", workers_json=None, worker_status_ttl_seconds=180, availability_path=""))
workers_file = root / "workers.json"
workers_file.write_text(json.dumps([{"id": "worker-1"}, {"id": "worker-2"}]), encoding="utf-8")
preview_scope["load_plan"] = lambda _path: plan
preview_scope["probe_idle_gpus"] = lambda worker, active: {"idle_gpu_ids": ["0", "1"]}
capture = io.StringIO()
with redirect_stdout(capture):
    preview_scope["dry_run_plan_mode"](SimpleNamespace(plan="p.yaml", workers_json=str(workers_file), worker_status_ttl_seconds=180, availability_path=""))
preview = json.loads(capture.getvalue())
assert [(row["experimentIndex"], row["workerId"], row["gpuId"]) for row in preview["assignments"]] == [(0, "worker-1", "1")]
assert preview["queuedExperimentIndexes"] == [1]
assert any("job 1:" in reason for reason in preview["blockedReasons"])
print("declared command plan ok; fixture retained:", root)

# Exercise only the new task function with a fake shell process and pane.
agent = (pathlib.Path(__file__).resolve().parents[2] / "src/clusterAgentRuntime.legacy.ts").read_text(encoding="utf-8")
start = agent.index("def resolve_durable_code_sync_proof(")
end = agent.index("\n\ndef ", start)
proof_scope = {"code_sync_proof_document": lambda root: {"proofs": {"proof": {"runtimeGeneration": "current"}}},
               "code_sync_proof_runtime_generation": lambda: "current",
               "verify_code_sync_proof_record": lambda root, proof, row: ("verified", row["command"])}
exec(compile(agent[start:end], "resolve_durable_code_sync_proof", "exec"), proof_scope)
assert proof_scope["resolve_durable_code_sync_proof"](str(root), {"lifecycleProtocol": 2, "planFile": "p.yaml",
    "planRevision": "revision", "codeSyncProofId": "proof", "command": "printf actual"}) == ("verified", "printf actual")
start = agent.index("def execute_declared_command(")
end = agent.index("\n\ndef ", start)
calls = []
os.environ["TMUX_PANE"] = "%fixture"
def run(args, **kwargs):
    calls.append((args, kwargs))
    return SimpleNamespace(returncode=7)
agent_scope = {"os": os, "shlex": shlex, "subprocess": SimpleNamespace(run=run),
               "task_safe_path": lambda root, relative: str(pathlib.Path(root) / relative),
               "safe_project_path": lambda root, relative: str(pathlib.Path(root) / relative),
               "resolve_durable_code_sync_proof": lambda root, command: calls.append("proof"),
               "worker_task_console_log": lambda command_id: "logs/" + command_id + ".log",
               "formal_job_command_env": lambda command: {},
               "task_option": lambda *args: calls.append(args),
               "task_assert_external_outputs_absent": lambda root, command: None,
               "job_shell_environment_prefix": lambda env, args: "env",
               "simple_conda_wrapped_args": lambda args, env: args}
exec(compile(agent[start:end], "execute_declared_command", "exec"), agent_scope)
task = {"commandId": "cmd", "projectId": "p", "workingDirectory": ".", "outputDir": "work/one", "command": "printf actual"}
result = agent_scope["execute_declared_command"](str(root), task)
assert result == {"commandId": "cmd", "status": "failed", "exitCode": 7}
assert calls[0] == "proof" and calls[1] == ("%fixture", "log", "logs/cmd.log")
assert "printf actual" in calls[2][0][2] and calls[2][1]["cwd"] == str(root)

lifecycle = (pathlib.Path(__file__).resolve().parents[2] / "src/runtime/TmuxTaskLifecycle.ts").read_text(encoding="utf-8")
start = lifecycle.index("def task_assert_external_outputs_absent(")
end = lifecycle.index("\n\ndef ", start)
output_scope = {"os": os, "task_safe_path": lambda root, relative: str(pathlib.Path(root) / relative)}
exec(compile(lifecycle[start:end], "task_assert_external_outputs_absent", "exec"), output_scope)
start = lifecycle.index("def task_public_observation(")
end = lifecycle.index("\n\ndef ", start)
observation_scope = {"now_iso": lambda: "now"}
exec(compile(lifecycle[start:end], "task_public_observation", "exec"), observation_scope)
job = {"command": "printf actual", "workingDirectory": ".", "outputs": [], "commandId": "cmd", "projectId": "p", "workerId": "w"}
row = {"tmuxWindowId": "@1", "tmuxPane": "%1", "tmuxSession": "session", "gpuId": "0",
       "dead": True, "exitCode": 0, "phase": "running"}
observe = observation_scope["task_public_observation"]
public = observe(str(root), job, row)
assert public["status"] == "completed" and public["command"] == job["command"] and public["outputs"] == []
assert observe(str(root), job, {**row, "exitCode": None})["status"] == "unknown"
assert observe(str(root), job, {**row, "exitCode": 4})["status"] == "failed"

start = lifecycle.index("def task_queue_job(")
end = lifecycle.index("\n\ndef ", start)
queue_scope = {"os": os, "re": re, "task_safe_path": lambda root, relative: str(pathlib.Path(root) / relative),
               "task_inventory": lambda root: [], "task_assert_external_outputs_absent": output_scope["task_assert_external_outputs_absent"]}
exec(compile(lifecycle[start:end], "task_queue_job", "exec"), queue_scope)
request = {"action": "start-worker-task", "commandId": "cmd", "projectId": "p", "workerId": "w", "workflowId": "flow",
           "planFile": "plan.yaml", "outputDir": "work/one", "planRevision": "revision", "codeFingerprint": "code",
           "globalJobId": "flow:0", "experimentIndex": 0, "resultPathPolicy": "declared", "command": "printf actual",
           "workingDirectory": ".", "outputs": []}
queued = queue_scope["task_queue_job"](str(root), "w", request)
assert queued["command"] == "printf actual" and queued["outputs"] == []
(root / "report.txt").write_text("existing", encoding="utf-8")
try:
    queue_scope["task_queue_job"](str(root), "w", {**request, "outputs": ["report.txt"]})
except ValueError as error:
    assert "TASK_EXTERNAL_OUTPUT_EXISTS" in str(error)
else:
    raise AssertionError("existing independent output was accepted")
assert (root / "report.txt").read_text(encoding="utf-8") == "existing"
agent_scope["task_assert_external_outputs_absent"] = output_scope["task_assert_external_outputs_absent"]
previous_calls = len(calls)
try:
    agent_scope["execute_declared_command"](str(root), {**task, "outputs": ["report.txt"]})
except ValueError as error:
    assert "TASK_EXTERNAL_OUTPUT_EXISTS" in str(error)
else:
    raise AssertionError("execution overwrote an existing independent output")
assert len(calls) == previous_calls + 1  # source proof only; no process or output mutation
try:
    queue_scope["task_queue_job"](str(root), "w", {key: value for key, value in request.items() if key != "command"})
except ValueError:
    pass
else:
    raise AssertionError("old job without a declared command was accepted")
