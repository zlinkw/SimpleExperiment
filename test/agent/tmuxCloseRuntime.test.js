const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

const runtime = path.join(__dirname, "../../dist/runtime/cluster_agent.py");

test("tmux close executes and verifies the target window", () => {
  const script = `
import importlib.util, json, pathlib, tempfile, threading, types, urllib.request
from http.server import ThreadingHTTPServer
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(runtime)}))
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)
agent.start_worker_telemetry_sampler = lambda *a, **k: None
agent.start_gpu_log_tail_sampler = lambda *a, **k: None
agent.start_worker_hub_uplink = lambda *a, **k: None
agent.start_worker_local_command_processor = lambda *a, **k: None
servers, calls = [], []
class CapturedServer(ThreadingHTTPServer):
    def serve_forever(self):
        servers.append(self)
        threading.Thread(target=lambda: ThreadingHTTPServer.serve_forever(self), daemon=True).start()
agent.ThreadingHTTPServer = CapturedServer
def fake_run(args, **kwargs):
    calls.append(args)
    return types.SimpleNamespace(returncode=0, stdout='', stderr='')
agent.subprocess.run = fake_run
with tempfile.TemporaryDirectory() as root:
    agent.serve_http(types.SimpleNamespace(host='127.0.0.1', port=0, token='secret', mode='worker_telemetry', project_dir=root, worker_id='w1'))
    local = servers[0]
    url = f'http://127.0.0.1:{local.server_port}/api/tmux/kill-window'
    req = urllib.request.Request(url, data=json.dumps({'target':'experiment:1','confirm':True}).encode(), headers={'X-Simple-Agent-Token':'secret','Content-Type':'application/json'}, method='POST')
    result = json.load(urllib.request.urlopen(req, timeout=5))
    local.shutdown(); local.server_close()
assert result['ok'] is True, result
assert ['tmux','kill-window','-t','experiment:1'] in calls, calls
assert all(call[:2] != ['tmux','send-keys'] for call in calls), calls
print('ok')
`;
  const result = spawnSync("python", ["-X", "utf8", "-c", script], {
    encoding: "utf8",
    cwd: path.join(__dirname, "../.."),
    env: { ...process.env, PYTHONIOENCODING: "utf-8" },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("confirmed Agent window closes after its HTTP response", () => {
  const script = `
import importlib.util, json, os, pathlib, tempfile, threading, types, urllib.request
from http.server import ThreadingHTTPServer
spec = importlib.util.spec_from_file_location("agent", pathlib.Path(${JSON.stringify(runtime)}))
agent = importlib.util.module_from_spec(spec); spec.loader.exec_module(agent)
agent.start_worker_telemetry_sampler = lambda *a, **k: None
agent.start_gpu_log_tail_sampler = lambda *a, **k: None
agent.start_worker_hub_uplink = lambda *a, **k: None
agent.start_worker_local_command_processor = lambda *a, **k: None
servers, scheduled = [], []
class CapturedServer(ThreadingHTTPServer):
    def serve_forever(self):
        servers.append(self); threading.Thread(target=lambda: ThreadingHTTPServer.serve_forever(self), daemon=True).start()
class CapturedTimer:
    def __init__(self, delay, callback): scheduled.append((delay, callback))
    def start(self): pass
agent.ThreadingHTTPServer = CapturedServer
agent.threading.Timer = CapturedTimer
os.environ['SIMPLE_EXPERIMENT_TMUX_SESSION'] = 'worker-agent'
with tempfile.TemporaryDirectory() as root:
    agent.serve_http(types.SimpleNamespace(host='127.0.0.1', port=0, token='secret', mode='worker_telemetry', project_dir=root, worker_id='w1'))
    local = servers[0]
    req = urllib.request.Request(f'http://127.0.0.1:{local.server_port}/api/tmux/kill-window', data=json.dumps({'target':'worker-agent','confirm':True}).encode(), headers={'X-Simple-Agent-Token':'secret','Content-Type':'application/json'}, method='POST')
    result = json.load(urllib.request.urlopen(req, timeout=5))
    local.shutdown(); local.server_close()
assert result['ok'] is True and result['scheduled'] is True, result
assert len(scheduled) == 1 and scheduled[0][0] > 0, scheduled
print('ok')
`;
  const result = spawnSync("python", ["-X", "utf8", "-c", script], { encoding: "utf8", cwd: path.join(__dirname, "../..") });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
