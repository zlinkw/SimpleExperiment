const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function readWithLegacyFallback(primary, legacy) {
  const p = path.join(__dirname, primary);
  const l = path.join(__dirname, legacy);
  let txt = "";
  try { txt = fs.readFileSync(p, "utf8"); } catch {}
  if (txt && txt.includes("async abortSchedulerFromUi(message") ) return txt;
  if (txt && txt.includes("def stop_scheduler_operation(") ) return txt;
  try { const lt = fs.readFileSync(l, "utf8"); if (lt && lt.length > txt.length) return lt; } catch {}
  return txt;
}
const extensionSource = readWithLegacyFallback("../../src/extension.ts", "../../src/extension/legacy.ts");
const agentSource = readWithLegacyFallback("../../src/clusterAgentRuntime.ts", "../../src/clusterAgentRuntime.legacy.ts");

test("abortSchedulerFromUi routes through stop-scheduler-operation (tmux kill + SIGTERM/SIGKILL + deregister)", () => {
  const start = extensionSource.indexOf("async abortSchedulerFromUi(message");
  const end = extensionSource.indexOf("private clearLocalOperationCachesForOp(", start);
  const body = extensionSource.slice(start, end);
  // 不再仅写控制文件 abort_cleanup / 调用 client.abortScheduler / 直连 /api/scheduler/abort
  assert.ok(!/action:\s*"abort_cleanup"/.test(body), "must not use abort_cleanup control-file path");
  assert.ok(!/client\.abortScheduler/.test(body), "must not call client.abortScheduler");
  assert.ok(!/\/api\/scheduler\/abort/.test(body), "must not hit scheduler/abort HTTP endpoint");
  // 统一走 stopExperimentRouted -> postWorkerTunnelAction stop-scheduler-operation
  assert.match(body, /stopExperimentRouted\(\{/);
  assert.match(body, /action:\s*"stop-scheduler-operation"/);
  // 依据 remainingActiveEvidence 确认清理，非空则重试并置 failed
  assert.match(body, /remainingActiveEvidence/);
  assert.match(body, /stopExperimentRouted\(\{\s*[\s\S]{0,400}remaining\.length/, "should retry stop when remaining evidence exists");
  assert.match(body, /op\.status = "cancelled"/, "successful stop marks cancelled");
  assert.match(body, /op\.status = "failed"/, "lingering tmux marks failed");
  assert.match(body, /tmux kill-session -t zlk-sch-/, "failed path instructs manual tmux kill");
});

test("abortSchedulerFromUi clears scoped caches and tmp instead of wiping everything", () => {
  const start = extensionSource.indexOf("async abortSchedulerFromUi(message");
  const end = extensionSource.indexOf("private clearLocalOperationCachesForOp(", start);
  const body = extensionSource.slice(start, end);
  assert.match(body, /clearLocalOperationCachesForOp\(operationId\)/, "clears realtime/snapshot cache for op");
  assert.match(body, /cleanupSchedulerTmpForOp\(operationId, planFile\)/, "scoped tmp cleanup");
  // clearLocalOperationCachesForOp strips only the target op from lastRealtimeState/lastSnapshot
  const helper = agentSource.length && extensionSource.slice(extensionSource.indexOf("private clearLocalOperationCachesForOp(opId"), extensionSource.indexOf("private cleanupSchedulerTmpForOp(opId"));
  assert.match(helper, /delete ops\[opId\]/, "cache helper deletes only the target opId");
  assert.match(helper, /store\.operations = ops\.filter/, "cache helper filters array-shaped operations");
});

test("stop-scheduler-operation handler reaps empty shells via raw session-alive", () => {
  const handler = agentSource.slice(agentSource.indexOf("def stop_scheduler_operation("), agentSource.indexOf("return terminal_action(root, \"stop-scheduler-operation\""));
  assert.match(handler, /before\["tmuxShellAlive"\]/, "kill decision uses raw shell-alive, not python-gated tmuxSessionAlive");
});

test("scheduler_process_evidence reports python-gated tmuxSessionAlive plus diagnostics", () => {
  const fn = agentSource.slice(agentSource.indexOf("def scheduler_process_evidence("), agentSource.indexOf("def api_runtime_operation_evidence("));
  assert.match(fn, /_tmux_pane_python_running/);
  assert.match(fn, /"tmuxSessionAlive": tmux_alive/);
  assert.match(fn, /"tmuxShellAlive": session_alive/);
  assert.match(fn, /"tmuxPythonRunning": python_running/);
  // 空 shell（会话存活但无 python 进程）不应判 tmuxSessionAlive
  assert.match(fn, /tmux_alive = session_alive and python_running/);
});
