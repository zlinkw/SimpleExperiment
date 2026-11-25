import ast
import json
import os
import re
import shlex
import sys
import tempfile
import types
from pathlib import Path

source = Path(sys.argv[1]).read_text(encoding="utf-8")
tree = ast.parse(source[source.index("def task_safe_path("):source.index("\n\ndef task_inventory(")] + "\n" +
                 source[source.index("def task_result_query("):source.index("\n\ndef task_declaration_query(")])
namespace = {"os": os, "re": re, "json": json, "now_iso": lambda: "2026-01-01T00:00:00Z"}
rows = []
namespace["task_inventory"] = lambda root, _settle_exit=False: rows
exec(compile(tree, "extracted-runtime", "exec"), namespace)
root = tempfile.mkdtemp(prefix="g005-declared-output-")
Path(root, "out").mkdir()
Path(root, "out", "result.txt").write_text("ok", encoding="utf-8")
Path(root, "extra.txt").write_text("external", encoding="utf-8")
job = {"commandId": "c", "projectId": "p", "workerId": "w", "workflowId": "flow", "experimentIndex": 0, "outputDir": "out",
       "command": "echo ok", "outputs": ["out/result.txt"], "collectionResultCsv": "extra.txt"}
rows.append({**job, "dead": True, "exitCode": 0})
query = namespace["task_result_query"]
def observe(value):
    result = query(root, [value])
    assert result["capabilities"]["declaredOutputObservation"] == 1
    return result["tasks"][0]["observation"]
assert observe(job)["artifactIssue"] == "declared_manifest_missing"
namespace["task_write_declared_manifest"](root, job)
assert "command" not in json.loads(Path(root, "out", "artifact_manifest.json").read_text(encoding="utf-8"))["simpleExperiment"]["identity"]
assert "extra.txt" in json.loads(Path(root, "out", "artifact_manifest.json").read_text(encoding="utf-8"))["simpleExperiment"]["files"]
assert observe(job)["result"]["artifactsComplete"] is True
rows[0]["collectionResultCsv"] = "missing.csv"
assert observe({**job, "collectionResultCsv": "missing.csv"})["artifactIssue"] == "declared_output_missing"
rows[0]["collectionResultCsv"] = job["collectionResultCsv"]
result_path = Path(root, "out", "result.txt")
old_mtime = result_path.stat().st_mtime_ns
result_path.write_text("no", encoding="utf-8")
os.utime(result_path, ns=(old_mtime + 1000000000, old_mtime + 1000000000))
assert observe(job)["artifactIssue"] == "declared_output_changed"
try:
    namespace["task_write_declared_manifest"](root, job)
except FileExistsError:
    pass
else:
    raise AssertionError("existing manifest must never be overwritten")
missing = {**job, "outputs": ["out/missing.txt"]}
rows[0]["outputs"] = missing["outputs"]
assert observe(missing)["artifactIssue"] == "declared_output_missing"
rows[0]["outputs"] = job["outputs"]
assert "TASK_OUTPUT_IDENTITY_UNVERIFIED" in observe({**job, "commandId": "other"})["resultQueryError"]
Path(root, "out", "artifact_manifest.json").write_text("{broken", encoding="utf-8")
assert observe(job)["artifactIssue"] == "declared_manifest_invalid"
rows[0]["dead"] = False
assert "TASK_OUTPUT_IDENTITY_UNVERIFIED" in observe(job)["resultQueryError"]
agent = Path(sys.argv[2]).read_text(encoding="utf-8")
runner = agent[agent.index("def execute_declared_command("):agent.index("\ndef execute_worker_command(")]
run_root = tempfile.mkdtemp(prefix="g005-declared-runner-")
os.environ["TMUX_PANE"] = "%fixture"
def fake_run(*args, **kwargs):
    Path(run_root, "out", "result.txt").write_text("output", encoding="utf-8")
    Path(run_root, "extra.txt").write_text("external", encoding="utf-8")
    return types.SimpleNamespace(returncode=0)
namespace.update({"sys": sys, "shlex": shlex, "subprocess": types.SimpleNamespace(run=fake_run),
    "resolve_durable_code_sync_proof": lambda *a: None, "task_assert_output_available": lambda *a: None,
    "task_assert_external_outputs_absent": lambda *a: None, "worker_task_console_log": lambda *a: "logs/console.log",
    "safe_project_path": lambda root, relative: os.path.join(root, relative), "formal_job_command_env": lambda *a: {},
    "task_option": lambda *a: None, "job_shell_environment_prefix": lambda *a: "",
    "simple_conda_wrapped_args": lambda args, env: args})
exec(compile(ast.parse(runner), "extracted-declared-runner", "exec"), namespace)
run_job = {**job, "workingDirectory": "."}
assert namespace["execute_declared_command"](run_root, run_job)["exitCode"] == 0
rows[:] = [{**run_job, "dead": True, "exitCode": 0}]
observation = namespace["task_result_query"](run_root, [run_job])["tasks"][0]["observation"]
assert observation["result"]["artifactsComplete"] is True
print(json.dumps(observation))
