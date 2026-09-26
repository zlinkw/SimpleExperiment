import json
import os
import re
import subprocess
import sys
import threading

SCHEMA_VERSION = 1
source = sys.stdin.read()
start = source.index("def kill_tmux_window_response(")
end = source.index("\ndef serve_http(", start)
resolved_prefix = {"value": ""}


def resolve_tmux_prefix():
    return resolved_prefix["value"]


namespace = {
    "SCHEMA_VERSION": SCHEMA_VERSION,
    "json": json,
    "os": os,
    "re": re,
    "subprocess": subprocess,
    "threading": threading,
    "_resolve_tmux_prefix": resolve_tmux_prefix,
}
exec(compile(source[start:end], "kill_tmux_window_response", "exec"), namespace)
kill_tmux_window_response = namespace["kill_tmux_window_response"]


class Result:
    def __init__(self, returncode, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


calls = []


def fake_run(args, **kwargs):
    listed = list(args)
    calls.append(listed)
    if listed[:2] == ["tmux", "list-windows"]:
        killed = any(item[:4] == ["tmux", "kill-window", "-t", "zlk-gpu-0:2"] for item in calls[:-1])
        return Result(0, "0\n" if killed else "0\n2\n", "")
    if listed[:2] == ["tmux", "kill-window"]:
        if listed[3] != "zlk-gpu-0:2":
            raise AssertionError(listed)
        return Result(0, "", "")
    raise AssertionError(listed)


subprocess.run = fake_run
os.environ["SIMPLE_EXPERIMENT_TMUX_SESSION"] = "simple-worker-w1-agent"
body, status = kill_tmux_window_response(
    {"target": "zlk-gpu-0:2", "window": "zlk-gpu-0:2", "session": "zlk-gpu-0", "confirm": True},
    "worker_telemetry",
)
assert status == 200 and body["ok"] is True and body["verified"] is True and body["index"] == "2", body
assert ["tmux", "kill-window", "-t", "zlk-gpu-0:2"] in calls, calls
assert all(call[:2] != ["tmux", "kill-session"] for call in calls), calls
assert all(call[:2] != ["tmux", "send-keys"] for call in calls), calls
rejected, rejected_status = kill_tmux_window_response({"target": "zlk-gpu-0", "confirm": True}, "worker_telemetry")
assert rejected_status == 400 and "session:index" in str(rejected.get("detail") or ""), rejected
mismatch, mismatch_status = kill_tmux_window_response({"target": "zlk-gpu-0:2", "session": "zlk-gpu-1"}, "worker_telemetry")
assert mismatch_status == 400 and "does not match" in mismatch["error"], mismatch
still, still_status = kill_tmux_window_response({"target": "zlk-gpu-0:9", "session": "zlk-gpu-0", "confirm": True}, "worker_telemetry")
assert still_status == 200 and still["ok"] is False and "not found" in still["error"], still

scheduled = []


class CapturedTimer:
    def __init__(self, delay, callback):
        scheduled.append((delay, callback))

    def start(self):
        return None


threading.Timer = CapturedTimer


def forbid_run(*args, **kwargs):
    raise AssertionError(args)


subprocess.run = forbid_run
os.environ["SIMPLE_EXPERIMENT_TMUX_SESSION"] = "worker-agent"
agent_body, agent_status = kill_tmux_window_response({"target": "worker-agent:0", "confirm": True}, "worker_telemetry")
assert agent_status == 200 and agent_body["ok"] is True and agent_body["scheduled"] is True, agent_body
assert len(scheduled) == 1 and scheduled[0][0] > 0, scheduled
denied, denied_status = kill_tmux_window_response({"target": "worker-agent:0", "confirm": False}, "worker_telemetry")
assert denied_status == 403 and denied["ok"] is False, denied

os.environ.pop("SIMPLE_EXPERIMENT_TMUX_SESSION", None)
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "simple"
os.environ["SIMPLE_EXPERIMENT_WORKER_ID"] = "w1"
resolved_prefix["value"] = "lab"
scheduled.clear()
subprocess.run = forbid_run
configured, configured_status = kill_tmux_window_response({"target": "lab-worker-w1-agent:0", "confirm": True}, "worker_telemetry")
assert configured_status == 200 and configured["ok"] is True and configured["scheduled"] is True, configured
assert len(scheduled) == 1, scheduled
print("ok")
