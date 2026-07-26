const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");

const agentPath = path.join(__dirname, "../../dist/runtime/cluster_agent.py");

function runAgentScript(body) {
  const script = `
import importlib.util, json, threading, time

spec = importlib.util.spec_from_file_location("cluster_agent", ${JSON.stringify(agentPath)})
agent = importlib.util.module_from_spec(spec)
spec.loader.exec_module(agent)

${body}
`;
  const run = spawnSync("python", ["-c", script], { encoding: "utf8", timeout: 120000 });
  assert.equal(run.status, 0, run.stderr);
  return JSON.parse(run.stdout.trim());
}

test("a starved waiter gives up instead of blocking its request thread forever", () => {
  const result = runAgentScript(`
agent.WORKER_ACTION_WAIT_TIMEOUT_SECONDS = 1
payload = {"options": {"workerActionMinIntervalMs": 100000, "workerActionMaxConcurrent": 4}}

release = agent.acquire_worker_action_slot(".", "worker-a", payload)
started = time.time()
error = ""
try:
    agent.acquire_worker_action_slot(".", "worker-a", payload)
except RuntimeError as exc:
    error = str(exc)
elapsed = time.time() - started
release()

print(json.dumps({
    "error": error,
    "elapsed": elapsed,
    "inflightCleared": agent.WORKER_ACTION_INFLIGHT.get("worker-a", 0),
}))
`);

  assert.match(result.error, /等待防连点间隔超过 1 秒/);
  assert.ok(result.elapsed >= 0.9, `gave up after ${result.elapsed}s, expected to wait out the deadline`);
  assert.ok(result.elapsed < 10, `waited ${result.elapsed}s, deadline was not honoured`);
  assert.equal(result.inflightCleared, 0, "the released slot must not leak");
});

test("the concurrency ceiling still rejects immediately", () => {
  const result = runAgentScript(`
payload = {"options": {"workerActionMinIntervalMs": 500, "workerActionMaxConcurrent": 1}}
first = agent.acquire_worker_action_slot(".", "worker-b", payload)
started = time.time()
error = ""
try:
    agent.acquire_worker_action_slot(".", "worker-b", payload)
except RuntimeError as exc:
    error = str(exc)
elapsed = time.time() - started
first()

print(json.dumps({"error": error, "elapsed": elapsed, "inflight": agent.WORKER_ACTION_INFLIGHT.get("worker-b", 0)}))
`);

  assert.match(result.error, /已达到并发上限 1/);
  assert.ok(result.elapsed < 1, "the ceiling check must not wait");
  assert.equal(result.inflight, 0);
});

test("a waiter that gets its turn still acquires the slot", () => {
  const result = runAgentScript(`
payload = {"options": {"workerActionMinIntervalMs": 600, "workerActionMaxConcurrent": 4}}
first = agent.acquire_worker_action_slot(".", "worker-c", payload)
first()

started = time.time()
second = agent.acquire_worker_action_slot(".", "worker-c", payload)
elapsed = time.time() - started
inflight_during = agent.WORKER_ACTION_INFLIGHT.get("worker-c", 0)
second()

print(json.dumps({
    "elapsed": elapsed,
    "inflightDuring": inflight_during,
    "inflightAfter": agent.WORKER_ACTION_INFLIGHT.get("worker-c", 0),
}))
`);

  assert.ok(result.elapsed >= 0.4, `acquired after ${result.elapsed}s, the debounce interval was skipped`);
  assert.equal(result.inflightDuring, 1);
  assert.equal(result.inflightAfter, 0);
});

test("the wait deadline is a named runtime constant", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/clusterAgentRuntime.ts"), "utf8");
  assert.match(source, /WORKER_ACTION_WAIT_TIMEOUT_SECONDS = 30/);
  assert.match(source, /deadline = time\.time\(\) \+ WORKER_ACTION_WAIT_TIMEOUT_SECONDS/);
  assert.match(source, /remaining_ms = int\(\(deadline - time\.time\(\)\) \* 1000\)/);
  assert.match(source, /time\.sleep\(max\(1, min\(wait_ms, remaining_ms\)\) \/ 1000\.0\)/);
});
