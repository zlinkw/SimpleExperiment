const test = require("node:test");

const assert = require("node:assert/strict");

const fs = require("node:fs");

const os = require("node:os");

const path = require("node:path");

const { spawnSync } = require("node:child_process");

const { readSource } = require("../_helpers/sourceReader");


const root = path.resolve(__dirname, "..", "..");

const agentPath = path.join(root, "dist", "runtime", "cluster_agent.py");

const agentSource = readSource("src/clusterAgentRuntime.ts");

const extensionSource = readSource("src/extension.ts");

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));


const wslPath = file => '/mnt/'+file[0].toLowerCase()+file.slice(2).replace(/\\/g,'/');

test("result policy sync excludes local Plan dataset mappings and preserves Agent validation", async () => {
  const vm = require("node:vm"), ts = require("typescript");
  const ast = ts.createSourceFile("host.ts", extensionSource, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === "RealtimeTunnelPanelProvider");
  const method = cls.members.find(node => node.name?.getText(ast) === "syncProjectAdapterRulesToAgents");
  const Host = vm.runInNewContext(ts.transpileModule("class Host {" + method.getText(ast) + "}; Host", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { uniqueStrings: values => [...new Set(values)], errorMessage: error => error.message });
  const host = new Host(), payloads = [];
  host.isRealtimeMode = () => true;
  host.projectTopologyAssessment = () => ({});
  host.enabledWorkerConfigs = () => [{ id: "worker-a" }, { id: "worker-b" }, { id: "worker-a" }];
  host.postTensorboardAction = async (worker, action, payload) => {
    assert.equal(action, "save-result-policy"); payloads.push({ worker, ...JSON.parse(JSON.stringify(payload)) });
    return { status: "completed" };
  };
  const policy = { taskType: "classification", primaryMetric: "AUC", candidateCsv: ["work_dirs/results.csv"],
    csvColumnMapping: { case: "case_name", seed: "seed" }, metricAliases: { auc: "AUC" },
    derivedMetric: { metric: "AUC", leftEndpoint: "clean", rightEndpoint: "corrupt", scale: 100, outputName: "auc_drop" } };
  const cases = [
    { rules: {}, expected: {} },
    { rules: { planDatasetMapping: {} }, expected: {} },
    { rules: { ...policy, planDatasetMapping: {} }, expected: policy },
    { rules: { ...policy, planDatasetMapping: { "experiments/plans/example.yaml": { datasets: ["BUS"], source: "manual" } } }, expected: policy },
    ...["C:/research/中文项目/work_dirs/results.csv", "/Users/research/project A/work_dirs/results.csv", "/srv/team-b/中文项目/work_dirs/results.csv"].map(file => ({
      rules: { ...policy, candidateCsv: [file], planDatasetMapping: {} }, expected: { ...policy, candidateCsv: [file] },
    })),
  ];
  const expectedPolicies = [];
  for (const { rules, expected } of cases) {
    const original = JSON.stringify(rules);
    assert.equal((await host.syncProjectAdapterRulesToAgents(rules)).length, 0);
    assert.equal(JSON.stringify(rules), original, "local mappings must remain unchanged");
    expectedPolicies.push(expected, expected);
  }
  assert.deepEqual(payloads.map(item => item.worker), cases.flatMap(() => ["worker-a", "worker-b"]));
  host.enabledWorkerConfigs = () => [];
  assert.equal((await host.syncProjectAdapterRulesToAgents(policy)).length, 0);
  host.isRealtimeMode = () => false;
  assert.deepEqual(Array.from(await host.syncProjectAdapterRulesToAgents(policy)), ["离线模式"]);
  assert.equal(payloads.length, expectedPolicies.length, "offline or no Worker must not send requests");
  host.isRealtimeMode = () => true;
  host.enabledWorkerConfigs = () => [{ id: "single-worker" }];
  assert.equal((await host.syncProjectAdapterRulesToAgents(policy)).length, 0);
  assert.equal(payloads.at(-1).worker, "single-worker");
  expectedPolicies.push(policy);
  const result = runPython(String.raw`
import ast, json, pathlib, re
tree = ast.parse(pathlib.Path(${JSON.stringify(agentPath)}).read_text(encoding="utf-8"))
branch = next(node for node in ast.walk(tree) if isinstance(node, ast.If) and isinstance(node.test, ast.Compare) and isinstance(node.test.left, ast.Name) and node.test.left.id == "action" and len(node.test.comparators) == 1 and isinstance(node.test.comparators[0], ast.Constant) and node.test.comparators[0].value == "save-result-policy")
function = ast.parse("def receive(root, action, payload, operation_id, op_id):\n    pass\n").body[0]
function.body = [branch]
module = ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[]))
saved = []
def terminal_action(root, action, operation_id, op_id, status, message, *args, **kwargs):
    return {"status": status, "message": message}
def atomic_write(target, value):
    saved.append(value)
namespace = {"re": re, "terminal_action": terminal_action, "atomic_write": atomic_write, "path_for": lambda root, name: name}
exec(compile(module, "isolated-save-result-policy", "exec"), namespace)
payloads = json.loads(${JSON.stringify(JSON.stringify(payloads))})
results = [namespace["receive"]("fixture", "save-result-policy", payload, "op", "id") for payload in payloads]
invalid = {"options": {"projectAdapterRules": {"unknownField": "must-not-be-ignored"}}}
results.append(namespace["receive"]("fixture", "save-result-policy", invalid, "op", "invalid"))
invalid_mapping = {"options": {"projectAdapterRules": {"csvColumnMapping": {"case": "invalid\ncolumn"}}}}
results.append(namespace["receive"]("fixture", "save-result-policy", invalid_mapping, "op", "invalid-mapping"))
print(json.dumps({"results": results, "saved": saved}))
`);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const received = JSON.parse(result.stdout.trim());
  for (const row of received.results.slice(0, payloads.length)) assert.equal(row.status, "completed", row.message);
  assert.equal(received.results.at(-2).status, "failed");
  assert.match(received.results.at(-2).message, /invalid projectAdapterRules field/);
  assert.equal(received.results.at(-1).status, "failed");
  assert.match(received.results.at(-1).message, /invalid csvColumnMapping field/);
  assert.equal(received.saved.length, payloads.length);
  for (const [index, row] of payloads.entries()) assert.deepEqual(row.options.projectAdapterRules, expectedPolicies[index]);
  for (const [index, row] of received.saved.entries()) assert.deepEqual(row, { ...expectedPolicies[index], schemaVersion: 1, csvColumnMapping: expectedPolicies[index].csvColumnMapping || {}, derivedMetric: expectedPolicies[index].derivedMetric || {} });
  host.enabledWorkerConfigs = () => [{ id: "worker-a" }, { id: "worker-b" }];
  host.postTensorboardAction = async () => ({ status: "failed", message: "invalid csvColumnMapping field" });
  assert.deepEqual(Array.from(await host.syncProjectAdapterRulesToAgents(policy)), ["worker-a: invalid csvColumnMapping field", "worker-b: invalid csvColumnMapping field"]);
});

function runPython(script) {
  if(process.platform === 'win32') for(const file of [agentPath,root,path.resolve(__dirname,'../_helpers'),path.resolve(__dirname,'../_helpers/extractRuntimeFunctions.py')])
    script=script.replaceAll(JSON.stringify(file),JSON.stringify(wslPath(file)));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tb-test-"));
  const file = path.join(tmp, "run.py");
  fs.writeFileSync(file, script, "utf8");
  try {
    const executable=process.platform==='win32'?'wsl.exe':'python';
    const args=process.platform==='win32'?['--distribution',process.env.SIMPLE_TEST_WSL_DISTRO||'Ubuntu-Codex','--exec','python3','-B','-X','utf8',wslPath(file)]:[file];
    return spawnSync(executable, args, { encoding: "utf8", timeout: 10000, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" } });
  } finally {
    // Preserve bounded Python probes and all failure inputs.
  }
}


test("tensorboard actions are worker controls with no result ownership requirement", () => {
  assert.match(agentSource, /WORKER_TENSORBOARD_ACTIONS = \{"start-tensorboard", "stop-tensorboard", "get-tensorboard-status"\}/);
  assert.match(agentSource, /\*\*\{name: True for name in WORKER_TENSORBOARD_ACTIONS\}/);
  assert.match(agentSource, /\/api\/actions\/start-tensorboard/);
  assert.match(agentSource, /\/api\/actions\/stop-tensorboard/);
  assert.match(agentSource, /\/api\/actions\/get-tensorboard-status/);
  assert.match(agentSource, /if action in \("start-tensorboard", "stop-tensorboard", "get-tensorboard-status"\):\s*\n\s*return tensorboard_action/);
  // verify dist py also contains routing
  const distPy = fs.readFileSync(agentPath, "utf8");
  assert.match(distPy, /tensorboard_action\(root, action, payload/);
});


test("TensorBoard binds project service identity, preserves foreign windows and rejects occupied ports", () => {
  const script = String.raw`
import pathlib, tempfile, types, os, json, sys, shlex
sys.path.insert(0, ${JSON.stringify(path.resolve(__dirname, "../_helpers"))})
from extractRuntimeFunctions import extract_runtime_functions
agent = extract_runtime_functions(pathlib.Path(${JSON.stringify(agentPath)}), ["close_tensorboard_window", "tensorboard_action"])
calls = []
mode = "normal"
list_count = 0
assigned = None
start_state = {"dead": False}
os.environ["SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX"] = "owner"
root = tempfile.mkdtemp(prefix="tensorboard-window-identity-")
session = agent.tb_tmux_session_name(root)
os.environ["SIMPLE_EXPERIMENT_WORKER_ID"] = "test"
raw_action = agent.tensorboard_action
def scoped_action(root, action, payload, operation_id, op_id):
    return raw_action(root, action, {"projectDir": root, "workerId": "test", **payload}, operation_id, op_id)
agent.tensorboard_action = scoped_action
def run(args, **kwargs):
    global list_count, assigned
    calls.append(args)
    if args[1] == "list-windows":
        if "-a" in args:
            return types.SimpleNamespace(returncode=0, stdout="@99\n", stderr="")
        list_count += 1
        if mode in ("absent", "query-failed"):
            return types.SimpleNamespace(returncode=1, stdout="", stderr="can't find session" if mode == "absent" else "permission denied")
        wid = "@8" if mode == "changed" and list_count > 1 else "@12" if mode == "replaced-start" else "@11" if mode == "created" else "@7"
        stdout = session + "|0|" + wid + "|tensorboard"
        if "@se_tensorboard" in args[-1]:
            binding = {"root": os.path.realpath(root) + ("-other" if mode == "foreign" else ""), "port": 6006}
            encoded = "" if mode in ("unbound", "replaced-start") else json.dumps(assigned or {}) if mode == "created" else json.dumps(binding)
            dead = "" if mode == "unknown-state" else "1" if mode == "dead" or mode == "created" and start_state["dead"] else "0"
            stdout += "|" + dead + "|" + encoded
        stdout += "\n"
        if mode == "ambiguous": stdout += session + "|1|@99|research|0|\n"
        return types.SimpleNamespace(returncode=0, stdout=stdout, stderr="")
    if args[1] == "list-panes": return types.SimpleNamespace(returncode=0, stdout="%12\n", stderr="")
    if args[1] == "set-option":
        assert args[5] == "@se_tensorboard", args
        assigned = json.loads(args[6])
    elif args[1] != "kill-window": raise AssertionError(args)
    return types.SimpleNamespace(returncode=0, stdout="", stderr="")
agent.subprocess.run = run
agent.terminal_action = lambda root, action, operation_id, op_id, status, message, extra: {"status": status, "message": message, **extra}
agent.tb_port_listening = lambda *args: True
for mode in ("normal", "ambiguous", "changed", "foreign", "unbound", "query-failed", "unknown-state"):
    calls.clear(); list_count = 0
    result = agent.tensorboard_action(root, "stop-tensorboard", {"sessionPrefix": "Owner"}, "op", "id")
    mutations = [args for args in calls if args[1].startswith("kill-")]
    if mode == "normal":
        assert result["status"] == "completed" and result["closedWindowIds"] == ["@7"], result
        assert mutations == [["tmux", "kill-window", "-t", "@7"]], calls
    else:
        assert result["status"] == "failed" and mutations == [], (result, calls)
assert not pathlib.Path(root, "simple_cluster/tmux_logs").exists()
mode = "dead"
status = agent.tensorboard_action(root, "get-tensorboard-status", {}, "op", "id")
assert status["running"] is False and status["listening"] is False, status
assert session not in agent.TENSORBOARD_PROXY_PORTS
mode = "normal"
status = agent.tensorboard_action(root, "get-tensorboard-status", {"port": 7000}, "op", "id")
assert status["running"] is True and status["listening"] is True and status["port"] == 6006, status
assert not pathlib.Path(root, "simple_cluster/tmux_logs").exists()
mode = "absent"; calls.clear()
occupied = agent.tensorboard_action(root, "start-tensorboard", {}, "op", "id")
assert occupied["status"] == "failed" and occupied["errorCode"] == "TENSORBOARD_PORT_IN_USE", occupied
assert all(args[1] not in ("kill-window", "new-session", "send-keys") for args in calls), calls
for payload in ({"sessionPrefix": "intruder"}, {"session_prefix": "old-alias"}):
    calls.clear()
    mismatch = agent.tensorboard_action(root, "start-tensorboard", payload, "op", "id")
    assert mismatch["errorCode"] == "GLOBAL_PREFIX_MISMATCH" and calls == [], mismatch
agent.tb_port_listening = lambda *args: False
agent.tb_discover_launch = lambda *args: (["tensorboard", "--logdir", root], "fixture", root)
agent.simple_runtime_env = lambda env: env
def start(session_name, args, *rest, **kwargs):
    global mode
    assert session_name == session and args[0] == "tensorboard" and kwargs["service_window"] is True
    mode = "created"
    return "@11"
agent.start_simple_tmux_command = start
mode = "absent"
created = agent.tensorboard_action(root, "start-tensorboard", {}, "op", "id")
assert created["status"] == "completed" and created["windowId"] == "@11", created
assert assigned == {"root": os.path.realpath(root), "port": 6006}, assigned
agent.tb_port_listening = lambda *args: True
status = agent.tensorboard_action(root, "get-tensorboard-status", {}, "op", "id")
assert status["windowId"] == "@11" and status["listening"] is True, status
start_state["dead"] = True
agent.tb_port_listening = lambda *args: False
mode = "absent"
exited = agent.tensorboard_action(root, "start-tensorboard", {}, "op", "id")
assert exited["status"] == "failed" and "WINDOW_EXITED" in exited["message"], exited
assert session not in agent.TENSORBOARD_PROXY_PORTS
start_state["dead"] = False
original_query = agent.tensorboard_window
seen = {"count": 0}
def replaced_query(*args, **kwargs):
    global mode
    seen["count"] += 1
    mode = "absent" if seen["count"] == 1 else "replaced-start"
    return original_query(*args, **kwargs)
agent.tensorboard_window = replaced_query
agent.tb_port_listening = lambda *args: False
calls.clear()
replaced = agent.tensorboard_action(root, "start-tensorboard", {}, "op", "id")
assert replaced["status"] == "failed" and "IDENTITY_CHANGED" in replaced["message"], replaced
assert all(args[1] != "set-option" for args in calls), calls
launch_calls, launch_lines = [], []
def launch_run(args, **kwargs):
    launch_calls.append(args)
    return types.SimpleNamespace(returncode=0, stdout="@31", stderr="")
def no_pid(*args):
    raise AssertionError("service startup must return the native window ID, not a PID")
launcher = extract_runtime_functions(pathlib.Path(${JSON.stringify(agentPath)}), ["start_simple_tmux_command"], namespace={
    "os": os, "re": agent.re, "shlex": shlex,
    "subprocess": types.SimpleNamespace(run=launch_run), "time": types.SimpleNamespace(sleep=lambda *args: None),
    "job_shell_environment_prefix": lambda *args: "env", "tmux_task_client_env": lambda env: env,
    "tmux_session_alive": lambda *args: False, "_is_main_shell_target": lambda *args: False,
    "_build_tmux_error_context": lambda *args, **kwargs: "fixture", "_truncate_text": lambda value, count: str(value)[:count],
    "write_atomic_text": lambda *args: None, "simple_conda_wrapped_args": lambda args, env: args,
    "_wait_tmux_ready": lambda *args, **kwargs: True,
    "_send_tmux_line": lambda target, line, *args: launch_lines.append(line) or 0,
    "tmux_pane_pid": no_pid,
}, include_imports=False)
assert launcher.start_simple_tmux_command(session, ["tensorboard"], root, "", {}, service_window=True) == "@31"
assert launch_calls[0][-4:-1] == ["-P", "-F", "#{window_id}"], launch_calls
assert launch_lines[-1] == "exec env tensorboard", launch_lines
print("ok")
`;
  const result = runPython(script);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("worker Agent proxies TensorBoard pages only for an active session and valid token", () => {
  const script = `
import importlib.util, pathlib, tempfile, threading, types, os, urllib.request, urllib.error, urllib.parse, json, socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import sys
sys.path.insert(0, ${JSON.stringify(require("node:path").resolve(__dirname, "../_helpers"))})
from extractRuntimeFunctions import extract_runtime_functions
agent = extract_runtime_functions(pathlib.Path(${JSON.stringify(agentPath)}), ["TENSORBOARD_PROXY_PORTS","ThreadingHTTPServer","serve_http","start_gpu_log_tail_sampler","start_worker_hub_uplink","start_worker_local_command_processor","start_worker_telemetry_sampler","tmux_session_alive"])
os.environ['SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX'] = 'owner'
native_window = {'current': None}
reads = []
agent.scalar_catalog = lambda root, logdir: reads.append(('catalog', root, logdir)) or {'plans': [], 'logdir': logdir}
agent.scalar_query = lambda root, payload: reads.append(('query', root, payload)) or {'tags': ['synthetic']}
agent.tensorboard_window = lambda *args, **kwargs: native_window['current']
class TensorBoard(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def do_GET(self):
        body = b'tensorboard page'
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
tb = ThreadingHTTPServer(('127.0.0.1', 0), TensorBoard)
threading.Thread(target=tb.serve_forever, daemon=True).start()
assert agent.tb_port_listening(tb.server_port) is True
with socket.socket() as reserved:
    reserved.bind(('127.0.0.1', 0))
    assert agent.tb_port_listening(reserved.getsockname()[1]) is False
from unittest.mock import patch
with patch.object(agent.socket, 'create_connection', side_effect=TimeoutError('query unavailable')):
    try:
        agent.tb_port_listening(tb.server_port)
        raise AssertionError('failed port query was treated as free')
    except RuntimeError as failure:
        assert 'TENSORBOARD_PORT_QUERY_FAILED' in str(failure), failure
# Service ownership and collector behavior have dedicated runtime tests. This
# fixture owns only its loopback HTTP servers and temporary state directory.
agent.lifecycle_service_guard = lambda args, version: (None,{"projectDir":args.project_dir,"workerId":args.worker_id})
agent.task_update_scheduler_runtime = lambda *a, **k: {}
agent.gpu_collector_ensure = lambda *a, **k: {"mode":"fixture"}
agent.start_worker_telemetry_sampler = lambda *a, **k: None
agent.start_gpu_log_tail_sampler = lambda *a, **k: None
agent.start_worker_hub_uplink = lambda *a, **k: None
agent.start_worker_local_command_processor = lambda *a, **k: None
servers = []
class CapturedServer(ThreadingHTTPServer):
    def serve_forever(self):
        servers.append(self)
        threading.Thread(target=lambda: ThreadingHTTPServer.serve_forever(self), daemon=True).start()
agent.ThreadingHTTPServer = CapturedServer
with tempfile.TemporaryDirectory() as root:
    agent.AGENT_STATE_DIR = os.path.join(root, 'state')
    result_path = pathlib.Path(root) / 'experiments' / 'results' / 'concatenation.csv'
    result_path.parent.mkdir(parents=True)
    result_path.write_bytes(b'protocol_version,value\\n1,0.5\\n')
    agent.serve_http(types.SimpleNamespace(host='127.0.0.1', port=0, token='secret', mode='worker_telemetry', project_dir=root, worker_id='test'))
    local = servers[0]
    service_url = f'http://127.0.0.1:{local.server_port}/api/tensorboard/service'
    def service(payload, route=service_url):
        req = urllib.request.Request(route, data=json.dumps(payload).encode(), headers={'X-Simple-Agent-Token': 'secret', 'Content-Type': 'application/json'}, method='POST')
        return json.load(urllib.request.urlopen(req, timeout=5))
    before = sorted(str(p.relative_to(root)) for p in pathlib.Path(root).rglob('*'))
    for action in ('start-tensorboard', 'stop-tensorboard', 'get-tensorboard-status'):
        for identity in ({}, {'projectDir': root + '-foreign', 'workerId': 'test'}, {'projectDir': root, 'workerId': 'other'}):
            for route in (service_url, f'http://127.0.0.1:{local.server_port}/api/actions/{action}'):
                try:
                    service({'opId': 'wrong-identity', 'action': action, **identity}, route)
                    raise AssertionError('missing or foreign service identity accepted')
                except urllib.error.HTTPError as exc:
                    assert exc.code == 403, exc.code
                    assert 'MISMATCH' in json.load(exc)['error']
    assert sorted(str(p.relative_to(root)) for p in pathlib.Path(root).rglob('*')) == before
    valid_status = service({'action': 'get-tensorboard-status', 'opId': 'project-status', 'projectDir': root, 'workerId': 'test', 'sessionPrefix': 'owner'})
    assert valid_status['status'] == 'completed' and valid_status['running'] is False, valid_status
    result_url = f'http://127.0.0.1:{local.server_port}/api/files/download?path=experiments%2Fresults%2Fconcatenation.csv'
    result_req = urllib.request.Request(result_url, headers={'X-Simple-Agent-Token': 'secret'})
    assert urllib.request.urlopen(result_req, timeout=5).read() == result_path.read_bytes()
    agent.tmux_session_alive = lambda *a, **k: False
    status_url = f'http://127.0.0.1:{local.server_port}/api/actions/get-tensorboard-status'
    status_req = urllib.request.Request(status_url, data=json.dumps({'opId': 'tb-status', 'sessionPrefix': 'owner', 'projectDir': root, 'workerId': 'test'}).encode(), headers={'X-Simple-Agent-Token': 'secret', 'Content-Type': 'application/json'}, method='POST')
    status = json.load(urllib.request.urlopen(status_req, timeout=5))
    assert status['status'] == 'completed' and status['running'] is False, status
    session = agent.tb_tmux_session_name(root)
    agent.TENSORBOARD_PROXY_PORTS[session] = tb.server_port
    native_window['current'] = {'windowId': '@7', 'dead': False, 'binding': {'root': os.path.realpath(root), 'port': tb.server_port}}
    url = f'http://127.0.0.1:{local.server_port}/api/tensorboard/proxy?port={tb.server_port}&sessionPrefix=owner&path=%2Fdata%2Fplugin'
    req = urllib.request.Request(url, headers={'X-Simple-Agent-Token': 'secret'})
    assert urllib.request.urlopen(req, timeout=5).read() == b'tensorboard page'
    browser_url = f'http://127.0.0.1:{local.server_port}/api/tensorboard/ui/'
    assert urllib.request.urlopen(browser_url, timeout=5).read() == b'tensorboard page'
    scoped = f'http://127.0.0.1:{local.server_port}/api/tensorboard/project/'
    proof = {'X-Simple-Agent-Token': 'secret', 'X-Simple-Project-Root': urllib.parse.quote(root, safe=''), 'X-Simple-Worker-Id': 'test'}
    assert json.load(urllib.request.urlopen(urllib.request.Request(scoped + 'scalars/catalog?logdir=synthetic%20only', headers=proof), timeout=5))['logdir'] == 'synthetic only'
    query = urllib.request.Request(scoped + 'scalars/query', data=b'{"case":"fixture"}', headers={**proof, 'Content-Type': 'application/json'}, method='POST')
    assert json.load(urllib.request.urlopen(query, timeout=5))['tags'] == ['synthetic']
    assert reads == [('catalog', root, 'synthetic only'), ('query', root, {'case': 'fixture'})], reads
    assert urllib.request.urlopen(urllib.request.Request(scoped + 'ui/', headers=proof), timeout=5).read() == b'tensorboard page'
    assert urllib.request.urlopen(urllib.request.Request(scoped + f'proxy?port={tb.server_port}&path=%2Fdata', headers=proof), timeout=5).read() == b'tensorboard page'
    for headers, code in (({}, 401), ({'X-Simple-Agent-Token': 'secret'}, 403), ({**proof, 'X-Simple-Project-Root': urllib.parse.quote(root + '-foreign')}, 403), ({**proof, 'X-Simple-Project-Root': 'relative'}, 403), ({**proof, 'X-Simple-Worker-Id': 'foreign'}, 403)):
        for suffix in ('scalars/catalog', 'ui/', 'proxy'):
            try:
                urllib.request.urlopen(urllib.request.Request(scoped + suffix, headers=headers), timeout=5)
                raise AssertionError(('foreign project accepted', suffix, headers))
            except urllib.error.HTTPError as exc: assert exc.code == code, (exc.code, suffix)
    try:
        urllib.request.urlopen(urllib.request.Request(scoped + 'service', data=b'{}', headers=proof, method='POST'), timeout=5)
        raise AssertionError('read-only namespace accepted service control')
    except urllib.error.HTTPError as exc: assert exc.code == 404, exc.code
    assert len(reads) == 2, reads
    foreign_query = urllib.request.Request(url.replace('sessionPrefix=owner', 'sessionPrefix=other-project'), headers={'X-Simple-Agent-Token': 'secret'})
    assert urllib.request.urlopen(foreign_query, timeout=5).read() == b'tensorboard page'
    native_window['current']['dead'] = True
    try:
        urllib.request.urlopen(req, timeout=5)
        raise AssertionError('dead native service borrowed a live port')
    except urllib.error.HTTPError as exc:
        assert exc.code == 403, exc.code
    native_window['current']['dead'] = False
    try:
        urllib.request.urlopen(url, timeout=5)
        raise AssertionError('missing token accepted')
    except urllib.error.HTTPError as exc:
        assert exc.code == 401, exc.code
    agent.TENSORBOARD_PROXY_PORTS.clear()
    try:
        urllib.request.urlopen(req, timeout=5)
        raise AssertionError('inactive session accepted')
    except urllib.error.HTTPError as exc:
        assert exc.code == 403, exc.code
    try:
        urllib.request.urlopen(browser_url, timeout=5)
        raise AssertionError('inactive browser route accepted')
    except urllib.error.HTTPError as exc:
        assert exc.code == 403, exc.code
    local.shutdown(); local.server_close()
tb.shutdown(); tb.server_close()
print('proxy ok')
`;
  const result = runPython(script);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /proxy ok/);
});


test("Host uses the global project service route, actual returned facts and visible unknown states", async () => {
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.port"].default, 6006);
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.logdir"].default, "work_dirs");
  assert.equal(packageJson.contributes.configuration.properties["simpleExperiment.tensorboard.tmuxSession"], undefined);
  const vm = require("node:vm"), ts = require("typescript");
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
  const names = ["tensorboardTarget", "postTensorboardAction", "openTensorBoardFromUi", "getTensorBoardStatusFromUi", "stopTensorBoardFromUi", "copyTensorBoardUrlFromUi", "openTensorBoardUrlFromUi", "scalarAgentFetch", "scalarEndpoints", "tensorboardViewerUrl"];
  const members = cls.members.filter(n => names.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join("\n");
  const calls = [], messages = [], notices = [], opened = [], waits = [], fetched = [];
  let project = "/projects/current", responseMode = "ready", workerEnabled = true, seq = 0;
  const worker = { id: "gpu-a", condaEnv: "" }, endpoint = { role: "worker", localHost: "localhost", localPort: 23117 };
  const facts = { status: "completed", running: true, listening: true, tmuxSession: "actual-project_tb", windowId: "@41", port: 6333, logPath: "logs/actual.log" };
  const epClient = { requestJson: async (route, purpose, body, options) => {
    calls.push({ route, purpose, body, options });
    if (responseMode === "old") throw new Error("Worker Agent HTTP 404: not found");
    if (responseMode === "failed" || responseMode === "failed-after-start" && body.action === "get-tensorboard-status") return { status: "failed", message: "window query unavailable", running: null, listening: null };
    if (body.action === "stop-tensorboard") return { status: "completed", running: false, listening: false, tmuxSession: facts.tmuxSession };
    return facts;
  } };
  const Host = vm.runInNewContext(ts.transpileModule("class Host {" + members + "}; Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    AgentTmuxPolicy_1: require(path.join(root, "dist/tunnel/AgentTmuxPolicy.js")),
    makeOpId: () => "op-" + ++seq,
    tunnelHttpOrigin: (host, port) => `http://${host}:${port}`,
    setTimeout: (done, ms) => { waits.push(ms); done(); }, AbortSignal,
    URL, Buffer, workspaceRoot: () => "/local/current",
    fetch: async (url, options) => { fetched.push({ url, options }); return new Response("page", { status: 200 }); },
    vscode: { workspace: { getConfiguration: () => ({ get: key => ({ "tensorboard.port": 6006, "tensorboard.logdir": "work_dirs" })[key] }) },
      window: { showInformationMessage: async text => { notices.push(text); }, showErrorMessage: async text => { notices.push(text); } },
      env: { openExternal: async url => opened.push(url), clipboard: { writeText: async text => opened.push(text) } }, Uri: { parse: text => text } },
  });
  const host = new Host();
  host.setupConfig = { remoteTmuxSessionPrefix: "Owner", condaEnv: "/global/env" };
  host.enabledWorkerConfigs = () => workerEnabled ? [worker] : [];
  host.expectedWorkerAgentProjectRoot = () => project;
  host.client = { endpointById: new Map([[worker.id, endpoint]]), clients: new Map([[worker.id, epClient]]),
    postWorkerAction: async () => { throw new Error("legacy transport was called"); } };
  host.view = { webview: { postMessage: value => messages.push(value) } };
  host.startLocalApiServer = async () => ({ viewerUrl: id => "http://127.0.0.1:34567/viewer?ticket=fixture&server=" + encodeURIComponent(id) });
  await host.openTensorBoardFromUi({ endpointId: worker.id });
  assert.equal(calls.length, 2); assert.equal(waits[0], 2000);
  for (const call of calls) {
    assert.equal(call.route, "/api/tensorboard/service"); assert.equal(call.options.method, "POST");
    assert.equal(call.purpose, call.body.action === "start-tensorboard" ? "run_plan" : "manual_refresh");
    assert.equal(call.body.projectDir, project); assert.equal(call.body.workerId, worker.id);
    assert.equal(call.body.sessionPrefix, "owner"); assert.equal(call.body.tmuxSession, undefined);
  }
  assert.equal(calls[0].body.condaEnv, "");
  assert.match(notices[0], /6333 actual-project_tb @41.*logs\/actual\.log/);
  const browser = new URL(opened[0]);
  assert.equal(browser.origin, "http://127.0.0.1:34567"); assert.equal(browser.searchParams.get("native"), "ready");
  assert.equal(browser.searchParams.get("server"), worker.id); assert.equal(browser.searchParams.get("workspace"), "/local/current");
  assert.equal(fetched[0].url, "http://localhost:23117/api/tensorboard/project/ui/");
  assert.equal(decodeURIComponent(fetched[0].options.headers["X-Simple-Project-Root"]), project);
  assert.equal(decodeURIComponent(fetched[0].options.headers["X-Simple-Worker-Id"]), worker.id);
  const controlsBeforeCopy = calls.length;
  await host.copyTensorBoardUrlFromUi({ endpointId: worker.id });
  assert.equal(calls.length, controlsBeforeCopy); assert.equal(opened.at(-1), opened[0]);
  assert.match(notices.at(-1), /60 秒.*复制不会启动服务/);
  assert.equal(messages.at(-1).windowId, "@41");
  await host.stopTensorBoardFromUi({ endpointId: worker.id }); assert.equal(messages.at(-1).running, false);
  assert.equal(calls.at(-1).purpose, "stop");
  responseMode = "failed";
  await host.getTensorBoardStatusFromUi({ endpointId: worker.id });
  assert.equal(messages.at(-1).running, null); assert.match(messages.at(-1).error, /window query unavailable/);
  responseMode = "old"; const before = calls.length;
  await assert.rejects(host.openTensorBoardFromUi({ endpointId: worker.id }), /主动准备该项目 Agent.*404/);
  assert.equal(calls.length, before + 1); assert.equal(messages.at(-1).running, null);
  responseMode = "failed-after-start";
  await assert.rejects(host.openTensorBoardFromUi({ endpointId: worker.id }), /window query unavailable/);
  assert.equal(messages.at(-1).running, null);
  workerEnabled = false;
  await assert.rejects(host.openTensorBoardFromUi({ endpointId: worker.id }), /已启用/);
  workerEnabled = true; project = "";
  await assert.rejects(host.stopTensorBoardFromUi({ endpointId: worker.id }), /项目根目录/);
  await assert.rejects(host.openTensorBoardFromUi({}), /已启用/);
  project = "/projects/another";
  await assert.rejects(host.postTensorboardAction(worker.id, "start-tensorboard", { projectDir: "/projects/current" }), /项目已切换/);
  const policyCalls = [];
  host.client.postWorkerAction = async (...args) => { policyCalls.push(args); return { status: "completed" }; };
  project = "";
  assert.equal((await host.postTensorboardAction(worker.id, "save-result-policy", { policy: "configured" })).status, "completed");
  assert.equal(policyCalls.length, 1); assert.equal(policyCalls[0][0], worker.id); assert.equal(policyCalls[0][1], "save-result-policy");
});

test("scalar HTTP reads bind enabled project identity through redirects and reject stale responses", async () => {
  const vm = require("node:vm"), ts = require("typescript");
  const source = fs.readFileSync(path.join(root, "src/extension/legacy.ts"), "utf8");
  const ast = ts.createSourceFile("host.ts", source, ts.ScriptTarget.Latest, true);
  const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
  const names = ["tensorboardTarget", "scalarAgentFetch", "scalarEndpoints"];
  const members = cls.members.filter(n => names.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join("\n");
  let workspace = "/local/one", project = "/project/中文 one", enabled = true, mode = "ok";
  const endpoint = { role: "worker", localHost: "localhost", localPort: 23001, token: "fixture-secret" };
  const requests = [];
  let host;
  const Host = vm.runInNewContext(ts.transpileModule("class Host {" + members + "}; Host", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, {
    URL, Buffer, workspaceRoot: () => workspace, tunnelHttpOrigin: (h, p) => `http://${h}:${p}`,
    fetch: async (url, options) => {
      requests.push({ url, ...options, headers: { ...options.headers } });
      if (mode === "old") return new Response("old", { status: 404 });
      if (mode === "workspace") workspace = "/local/two";
      if (mode === "project") project = "/project/two";
      if (mode === "client") host.client = { ...host.client };
      if (mode === "endpoint") host.client.endpointById.set("卡 a", { ...endpoint });
      if (mode === "disabled") enabled = false;
      if (mode === "foreign") return new Response(null, { status: 302, headers: { location: "http://foreign.invalid/api/tensorboard/ui/" } });
      if (mode === "relative" && requests.length === 1) return new Response(null, { status: 303, headers: { location: "assets/page?x=1" } });
      return new Response("synthetic", { status: 200, headers: { "content-type": "text/plain" } });
    },
  });
  host = new Host();
  host.enabledWorkerConfigs = () => enabled ? [{ id: "卡 a" }] : [];
  host.expectedWorkerAgentProjectRoot = () => project;
  host.client = { endpointById: new Map([["卡 a", endpoint], ["disabled", endpoint], ["hub", { ...endpoint, role: "hub" }]]) };
  assert.deepEqual(Array.from(host.scalarEndpoints(), row => row[0]), ["卡 a"]);
  const result = await host.scalarAgentFetch("卡 a", "POST", "/api/tensorboard/scalars/query?x=%E4%B8%AD", { case: "fixture" });
  assert.equal(await result.text(), "synthetic");
  assert.equal(requests[0].url, "http://localhost:23001/api/tensorboard/project/scalars/query?x=%E4%B8%AD");
  assert.equal(decodeURIComponent(requests[0].headers["X-Simple-Project-Root"]), project);
  assert.equal(decodeURIComponent(requests[0].headers["X-Simple-Worker-Id"]), "卡 a");
  assert.equal(requests[0].headers["X-Simple-Agent-Token"], "fixture-secret");
  assert.equal(requests[0].body, '{"case":"fixture"}');
  requests.length = 0; mode = "relative";
  await host.scalarAgentFetch("卡 a", "POST", "/api/tensorboard/ui/", Buffer.from("binary"), "application/octet-stream");
  assert.equal(requests.length, 2); assert.equal(requests[1].url, "http://localhost:23001/api/tensorboard/project/ui/assets/page?x=1");
  assert.equal(requests[1].method, "GET"); assert.equal(requests[1].body, undefined); assert.equal(requests[1].headers["Content-Type"], undefined);
  for (const scenario of ["foreign", "old", "workspace", "project", "client", "endpoint", "disabled"]) {
    requests.length = 0; mode = scenario; workspace = "/local/one"; project = "/project/中文 one"; enabled = true;
    host.client.endpointById.set("卡 a", endpoint);
    await assert.rejects(host.scalarAgentFetch("卡 a", "GET", "/api/tensorboard/ui/"), scenario === "old" ? /HTTP 404.*主动准备.*未回退/ : scenario === "disabled" ? /已启用/ : scenario === "foreign" ? /重定向超出/ : /已切换/);
    assert.equal(requests.length, 1, scenario + " must not follow or retry another target");
  }
  enabled = false; requests.length = 0;
  await assert.rejects(host.scalarAgentFetch("卡 a", "GET", "/api/tensorboard/scalars/catalog"), /已启用/);
  assert.equal(requests.length, 0);
});
