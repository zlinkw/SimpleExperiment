"""Exercise production POST routing without importing or starting the full Agent."""
import ast
import http.client
import json
import os
import re
import sys
import textwrap
import threading
import types
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse

source = sys.stdin.read()


def literal(name):
    start = source.index("\n" + name + " = ") + 1
    line_end = source.index("\n", start)
    line = source[start:line_end].rstrip()
    if line.endswith(("[", "{")):
        closer = "]" if line.endswith("[") else "}"
        line_end = source.index("\n" + closer, line_end) + 2
    return ast.literal_eval(ast.parse(source[start:line_end]).body[0].value)


def handler_method(name):
    start = source.index("        def " + name + "(")
    next_method = source.find("\n        def ", start + 1)
    server_start = source.index("\n    server = ", start)
    end = min(next_method, server_start) if next_method != -1 else server_start
    return textwrap.dedent(source[start:end])


namespace = {
    "SCHEMA_VERSION": literal("SCHEMA_VERSION"),
    "ACTION_ROUTES": set(literal("ACTION_PATHS")),
    "WORKER_RESULT_ACTIONS": literal("WORKER_RESULT_ACTIONS"),
    "WORKER_TENSORBOARD_ACTIONS": literal("WORKER_TENSORBOARD_ACTIONS"),
    "WORKER_ENV_ACTIONS": literal("WORKER_ENV_ACTIONS"),
    "TENSORBOARD_BROWSER_PREFIX": literal("TENSORBOARD_BROWSER_PREFIX"),
    "json": json, "os": os, "re": re, "threading": threading, "urlparse": urlparse,
    "token": "fixture-only-token",
}
start = source.index("def kill_tmux_window_response(")
end = source.index("\ndef serve_http(", start)
exec(compile(source[start:end], "production-tmux-close", "exec"), namespace)
methods = ["localhost_only", "authorized", "send_json", "read_request_body", "reject_if_needed", "do_POST"]
for name in methods:
    exec(compile(handler_method(name), "production-http-" + name, "exec"), namespace)


class Handler(BaseHTTPRequestHandler):
    MAX_CONTROL_BODY_BYTES = 8 * 1024 * 1024
    MAX_UPLOAD_CHUNK_BYTES = 2 * 1024 * 1024

    def log_message(self, *args):
        pass


for name in methods:
    setattr(Handler, name, namespace[name])


class Result:
    def __init__(self, returncode=0, stdout="", stderr=""):
        self.returncode, self.stdout, self.stderr = returncode, stdout, stderr


windows = set()
calls = []
behavior = {"kill": "normal"}


def fake_run(args, **kwargs):
    calls.append(args)
    assert kwargs.get("timeout") == 5, kwargs
    if args[:2] == ["tmux", "list-windows"]:
        assert args[2:] == ["-t", "zlk-gpu-0", "-F", "#{window_index}"], args
        return Result(stdout="\n".join(sorted(windows)))
    assert args[:3] == ["tmux", "kill-window", "-t"], args
    assert args[3] in {"zlk-gpu-0:" + str(i) for i in range(10, 14)}, args
    if behavior["kill"] == "failed":
        return Result(1, stderr="fixture tmux denial")
    if behavior["kill"] != "still-present":
        windows.remove(args[3].split(":")[1])
    return Result()


namespace["subprocess"] = types.SimpleNamespace(run=fake_run)
namespace["_resolve_tmux_prefix"] = lambda: "zlk"
os.environ["SIMPLE_EXPERIMENT_TMUX_SESSION"] = "fixture-worker-agent"

for mode in ("worker_telemetry", "hub_control"):
    namespace["mode"] = mode
    windows.clear()
    windows.update({"0", "agent", "10", "11", "12", "13"})
    calls.clear()
    behavior["kill"] = "normal"
    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=lambda: server.serve_forever(poll_interval=0.01), daemon=True)
    thread.start()

    def post(payload, route="/api/tmux/kill-window", auth=True, raw=None):
        conn = http.client.HTTPConnection(*server.server_address, timeout=2)
        headers = {"Content-Type": "application/json"}
        if auth:
            headers["X-Simple-Agent-Token"] = namespace["token"]
        try:
            conn.request("POST", route, body=json.dumps(payload) if raw is None else raw, headers=headers)
            response = conn.getresponse()
            return response.status, json.loads(response.read())
        finally:
            conn.close()

    try:
        for i in range(10, 14):
            target = "zlk-gpu-0:" + str(i)
            status, body = post({"target": target, "window": target, "session": "zlk-gpu-0", "confirm": True})
            assert status == 200 and body.get("ok") is True and body.get("verified") is True, (mode, status, body)
            assert body["target"] == target and str(i) not in windows, body
        assert windows == {"0", "agent"}, windows
        before = len(calls)
        for payload, expected in (
            ({"target": "zlk-gpu-0", "confirm": True}, 400),
            ({"target": "zlk-gpu-0:10", "session": "other-gpu-0", "confirm": True}, 400),
            ({"target": "fixture-worker-agent:0", "confirm": False}, 403),
        ):
            status, body = post(payload)
            assert status == expected, (mode, status, body)
        assert post({}, auth=False, raw="")[0] == 401
        assert post({}, raw="{")[0] == 400
        assert post({}, raw="[]")[0] == 400
        assert post({}, route="/api/tmux/not-a-route", raw="")[0] == 404
        if mode == "worker_telemetry":
            assert post({}, route="/api/admin/exec", raw="")[0] == 404
        assert len(calls) == before, calls

        # Neither a failed kill nor an unchanged list can be reported as success.
        windows.add("10")
        for outcome in ("failed", "still-present"):
            behavior["kill"] = outcome
            status, body = post({"target": "zlk-gpu-0:10", "confirm": True})
            assert status == 200 and body.get("ok") is False and "10" in windows, body
        behavior["kill"] = "normal"
        status, body = post({"target": "zlk-gpu-0:13", "confirm": True})
        assert status == 200 and body.get("ok") is False, body

        # Production localhost guard still denies a non-loopback request before dispatch.
        outsider = types.SimpleNamespace(
            client_address=("203.0.113.7", 123),
            path="/api/tmux/kill-window",
            send_json=lambda body, status=200: denied.append((status, body)),
        )
        denied = []
        outsider.localhost_only = types.MethodType(namespace["localhost_only"], outsider)
        assert namespace["reject_if_needed"](outsider) is True
        assert denied[0][0] == 403, denied
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
        assert not thread.is_alive()

print("ok: Worker and Hub HTTP cleanup; exact windows, auth and failure checks")
