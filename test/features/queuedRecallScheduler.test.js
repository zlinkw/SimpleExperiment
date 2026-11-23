const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const source = fs.readFileSync(path.join(__dirname, '../../src/runtime/TmuxTaskLifecycle.ts'), 'utf8');
const begin = source.indexOf('def task_recall_queued(');
const end = source.indexOf('\ndef task_queue_serve(', begin);
const inventoryBegin = source.indexOf('def task_execution_inventory(');
const inventoryEnd = source.indexOf('\ndef ', inventoryBegin + 4);
assert.ok(begin >= 0 && end > begin && inventoryBegin >= 0 && inventoryEnd > inventoryBegin);

test('Scheduler admits only the exact still-queued task inside its existing mutex', () => {
  const handler = source.slice(source.indexOf('def task_queue_serve('), source.indexOf('def task_stop('));
  assert.match(handler, /with mutex:[\s\S]*?request\["action"\] == "recall_queued"[\s\S]*?task_recall_queued\(/);
  assert.match(source, /action == "recall_queued" and endpoint\.get\("queuedRecallExact"\) != 1/);
  assert.match(handler, /row\["phase"\] == "queued" and row\["commandId"\] not in remembered/);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g004-queued-recall-'));
  const file = path.join(dir, 'fixture.py');
  const fixture = `import json, re\n${source.slice(begin, end)}\n${source.slice(inventoryBegin, inventoryEnd)}\n` + String.raw`
base = {"commandId":"cmd", "projectId":"p", "workerId":"w", "workflowId":"flow", "experimentIndex":0, "tmuxWindowId":"@1", "dead":False, "phase":"queued"}
payload = {"targetCommandId":"cmd", "projectId":"p", "workflowId":"flow", "experimentIndex":0, "recallOperationId":"recall-123"}
rows = []
effects = []
options = {}
def task_inventory(root, execution_only=False):
    return rows.pop(0) if len(rows) > 1 else rows[0]
def task_option(target, name, value=None):
    if value is None: return options.get(name)
    effects.append(("option", (target, name, value)))
    options[name] = value
def task_tmux(args): effects.append(("tmux", args))
def rejected(first, second=None, request=None):
    global rows, effects, options
    rows = [[first]] if second is None else [[first], [second]]
    effects, options = [], {}
    try: task_recall_queued("/fake", "w", request or payload, set(), "%controller")
    except ValueError: pass
    else: raise AssertionError("expected rejection")
    assert effects == []
for phase in ("admitted", "starting", "running", "exited", "unknown"):
    rejected(dict(base, phase=phase))
rejected(dict(base, dead=True))
rejected(dict(base, workerId="other"))
rejected(base, dict(base, phase="running"))
rejected(base, request=dict(payload, workflowId="other"))
rows, effects, options = [[base], [base]], [], {}
try: task_recall_queued("/fake", "w", payload, {"cmd"}, "%controller")
except ValueError: pass
else: raise AssertionError("already cancelled command must not be recalled")
assert effects == []
rows, effects, options = [[base], [base]], [], {}
remembered = set()
result = task_recall_queued("/fake", "w", payload, remembered, "%controller")
assert result == {"cancelled":True, "queuedRecallExact":1, "targetCommandId":"cmd"}
assert remembered == {"cmd"}
assert [item[0] for item in effects] == ["option", "option", "tmux", "option"]
assert effects[2][1] == ["kill-window", "-t", "@1"]
assert json.loads(options["queuedRecalls"])["recall-123"] == {"phase":"completed", "operationId":"recall-123", "commandId":"cmd", "workerId":"w", "projectId":"p", "workflowId":"flow", "experimentIndex":0}
rows, effects, options = [[base], [base]], [], {}
remembered = set()
def task_tmux(args): raise RuntimeError("fake kill failed")
try: task_recall_queued("/fake", "w", payload, remembered, "%controller")
except RuntimeError: pass
else: raise AssertionError("expected fake kill failure")
assert remembered == {"cmd"}
assert [item[0] for item in effects] == ["option", "option"]
assert json.loads(options["queuedRecalls"])["recall-123"]["phase"] == "pending"
assert not [row for row in [base] if not row["dead"] and row["phase"] == "queued" and row["commandId"] not in remembered]
rows, effects, options = [[base], [base]], [], {}
def task_tmux(args): effects.append(("tmux", args))
def task_option(target, name, value=None):
    if value is None: return options.get(name)
    if name == "queuedRecalls" and json.loads(value)["recall-123"]["phase"] == "completed": raise RuntimeError("fake proof write failed")
    effects.append(("option", (target, name, value)))
    options[name] = value
try: task_recall_queued("/fake", "w", payload, set(), "%controller")
except RuntimeError: pass
else: raise AssertionError("expected fake proof write failure")
assert json.loads(options["queuedRecalls"])["recall-123"]["phase"] == "pending"
options["queuedRecalls"] = json.dumps({"recall-123": {"phase":"completed", "operationId":"recall-123", "commandId":"cmd", "workerId":"w", "projectId":"p", "workflowId":"flow", "experimentIndex":0}})
options["cancelled"] = json.dumps(["cmd"])
rows = [[]]
def task_safe_path(root, value): return value
def task_queue_session(root, worker): return "fake-session"
def now_iso(): return "2026-11-23T00:00:00Z"
query = {**payload, "commandId":"cmd", "workerId":"w", "outputDir":"runs/a"}
observation = task_execution_inventory("/fake", [query])["tasks"][0]["observation"]
assert observation["cancelled"] is True and observation["tmux"] is None
assert observation["queuedRecall"]["operationId"] == "recall-123"
query["recallOperationId"] = "other-123"
assert task_execution_inventory("/fake", [query])["tasks"][0]["observation"]["queuedRecall"] is None
print("queued recall fake executor OK")
`;
  fs.writeFileSync(file, fixture, 'utf8');
  const child = spawnSync('python', ['-B', '-X', 'utf8', file], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  assert.equal(child.status, 0, child.stderr || child.error?.message);
  assert.match(child.stdout, /queued recall fake executor OK/);
});
