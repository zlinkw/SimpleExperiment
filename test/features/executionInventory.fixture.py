"""Extract just the native execution inventory; synthetic panes, no remote server."""
import ast
import base64
import json
import os
from pathlib import Path
import re
import sys

source = Path(sys.argv[1]).read_text(encoding="utf-8").split("String.raw`", 1)[1].rsplit("`", 1)[0]
names = {"task_inventory", "task_execution_inventory"}
nodes = [n for n in ast.parse(source).body if isinstance(n, ast.FunctionDef) and n.name in names]
assert len(nodes) == len(names)
root = os.path.realpath("/synthetic-project")
lines = []
for index in range(180):
    header = dict(root=root, lifecycleProtocol=2, commandId="command-" + str(index), workerId="w", projectId="project",
                  workflowId="plan", planFile="plan.yaml", outputDir="work/" + str(index), tmuxPane="%" + str(index), pane="%" + str(index),
                  _se_payload=dict(version=1, parts=80, bytes=160000, sha256="a" * 64))
    if index == 179:
        header["root"] = os.path.realpath("/other-project")
    encoded = base64.urlsafe_b64encode(json.dumps(header).encode("utf-8")).decode("ascii")
    lines.append("\t".join([header["pane"], "@" + str(index), "mine-gpu-0", "0" if index < 3 else "1",
                           "" if index < 3 else "0", encoded, "running", "0", "work/log"]))
calls = []
def tmux(args):
    calls.append(args)
    assert args[0] == "list-panes", "inventory must not fetch source chunks or capture logs"
    return "\n".join(lines)
def forbidden(*args, **kwargs):
    raise AssertionError("execution inventory read artifacts, logs or source payload")
ns = dict(os=os, base64=base64, json=json, re=re, task_tmux=tmux, now_iso=lambda: "now",
          task_read_job=forbidden, task_public_observation=forbidden, task_manifest_observation=forbidden)
exec(compile(ast.Module(body=nodes, type_ignores=[]), "execution_inventory", "exec"), ns)
result = ns["task_execution_inventory"](root)
assert result["queryComplete"] and result["executionOnly"] and len(result["tasks"]) == 179
assert sum(not task["observation"]["tmux"]["dead"] for task in result["tasks"]) == 3
assert len(calls) == 1
assert all(not ({"runtimeDiagnostics", "successful", "resultState", "_se_payload", "executionSource"} & task.keys()) for task in result["tasks"])
print(json.dumps(dict(ok=True, panes=179, tmuxCalls=len(calls))))
