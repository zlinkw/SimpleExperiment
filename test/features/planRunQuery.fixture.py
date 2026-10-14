"""Extract only the real query function; no Agent import, file writes or training."""
import ast
import json
import pathlib
import sys

text = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
python = text.split("String.raw`", 1)[1].rsplit("`", 1)[0]
tree = ast.parse(python)
query = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "task_query")
live = dict(projectId="project", commandId="live", workerId="worker", outputDir="work/live", dead=False)
ns = dict(json=json, now_iso=lambda: "now", task_inventory=lambda root: [live],
          task_safe_path=lambda root, path: path, task_tmux=lambda args: "",
          task_option=lambda *args: "[]", task_queue_session=lambda *args: "queue",
          task_public_observation=lambda root, job, row: dict(commandId=job["commandId"], status="running" if row else "unknown", observation={}))
exec(compile(ast.Module(body=[query], type_ignores=[]), "real-query", "exec"), ns)
bad = [dict(commandId="old-" + str(index), workerId="worker", outputDir="work/old") for index in range(99)]
result = ns["task_query"]("/fixture", bad + [live, None, "legacy"])
assert result["queryComplete"] is True
assert len(result["queryErrors"]) == 101
assert [row["commandId"] for row in result["tasks"]] == ["live"]
assert all("TASK_QUERY_IDENTITY_REQUIRED" in row["error"] for row in result["queryErrors"])
print(json.dumps(dict(ok=True, invalidHistoryIsolated=101, livePreserved=True)))
