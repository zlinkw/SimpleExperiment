const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");
const { runOperationMatchesTarget } = require("../../dist/features/RunOperations");

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

test("abortSchedulerFromUi routes through an identity-bound stop and reconciles its result", () => {
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
  // 未确认时保留运行记录，不重复发送停止请求。
  assert.match(body, /remainingActiveEvidence/);
  assert.equal((body.match(/stopExperimentRouted\(\{/g) || []).length, 1);
  assert.match(body, /result\.matchedOperations\.includes\(operationId\)/, "requires remote target confirmation");
  assert.match(body, /op\.status = "cancelled"/, "successful stop marks cancelled");
  assert.match(body, /remainingSummary/, "unknown path reports the exact returned activity identity");
  assert.doesNotMatch(body, /zlk-sch-/, "failed path does not invent a tmux prefix");
});

test("abortSchedulerFromUi clears scoped UI caches but preserves unowned temp files", () => {
  const start = extensionSource.indexOf("async abortSchedulerFromUi(message");
  const end = extensionSource.indexOf("private clearLocalOperationCachesForOp(", start);
  const body = extensionSource.slice(start, end);
  assert.match(body, /clearLocalOperationCachesForOp\(operationId\)/, "clears realtime/snapshot cache for op");
  assert.match(body, /cleanupSchedulerTmpForOp\(operationId, planFile\)/, "checks whether cleanup has a precise owner");
  assert.match(body, /调度状态保留 7 天用于排错/);
  const cleanupStart = extensionSource.indexOf("private cleanupSchedulerTmpForOp(opId: string, planFile: string)");
  const cleanupEnd = extensionSource.indexOf("async openScalarViewerFromUi", cleanupStart);
  const cleanup = extensionSource.slice(cleanupStart, cleanupEnd);
  assert.match(cleanup, /新调度状态保留 7 天/);
  assert.doesNotMatch(cleanup, /unlink|rmSync|rmdir|readdirSync/);
  // clearLocalOperationCachesForOp strips only the target op from lastRealtimeState/lastSnapshot
  const helper = agentSource.length && extensionSource.slice(extensionSource.indexOf("private clearLocalOperationCachesForOp(opId"), extensionSource.indexOf("private cleanupSchedulerTmpForOp(opId"));
  assert.match(helper, /delete ops\[opId\]/, "cache helper deletes only the target opId");
  assert.match(helper, /store\.operations = ops\.filter/, "cache helper filters array-shaped operations");
});

test("normal stop forwards the clicked operation id through actionBody", () => {
  assert.match(extensionSource, /stopExperimentRouted\(\{ \.\.\.body, operationId: stringField\(message, "operationId"\)/);
  assert.match(extensionSource, /confirmed\.map\(String\)\.includes\(String\(request\.targetOperationId/);
  assert.match(extensionSource, /operationId: target\.operationId, planFile: target\.planFile, type: "run-plan"/, "explicit Worker can stop an explicit remote operation");
});

function stopHarness(response, initial = true) {
  const source = ts.createSourceFile("legacy.ts", extensionSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const methods = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && ["stopExperimentRouted", "abortSchedulerFromUi"].includes(node.name?.getText(source))) methods.push(node.getText(source));
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(methods.length, 2);
  const warnings = [], calls = [], cleared = [];
  const context = {
    Error, Date, Object, Array, String, Number, Map, Set,
    vscode: { window: { showWarningMessage: (msg) => warnings.push(msg), showErrorMessage: () => {}, showInformationMessage: () => {} } },
    uniqueStrings: (xs) => [...new Set(xs.filter(Boolean))],
    stringField: (row, key) => String(row?.[key] || ""),
    stringArrayField: (row, keys) => { const value = [keys].flat().map((key) => row?.[key]).find((v) => Array.isArray(v) || typeof v === "string"); return Array.isArray(value) ? value : value ? [value] : []; },
    numberField: (row, key) => Number(row?.[key] || 0),
    operationResultPlanFile: (row) => String(row?.planFile || ""),
    usableSelectionKey: (value) => value,
    operationTerminal: (row) => ["completed", "failed", "cancelled"].includes(row?.status),
    LONG_RUNNING_OPERATION_ACTIONS: new Set(["run-plan"]), planSubmitProgress: { isLocal: () => false },
    makeOpId: () => "stop-1", workspaceRoot: () => "C:/project",
    DistributedPlanQueue: { canonicalProjectId: () => "project" },
    resultStatus: (record) => record.status,
    stringFromRecord: (row, keys) => keys.map((key) => row?.[key]).find(Boolean) || "",
  };
  vm.createContext(context);
  const code = ts.transpileModule(`class Harness { ${methods.join("\n")} }; this.Harness = Harness;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInContext(code, context);
  const provider = new context.Harness();
  const row = { operationId: "op-1", planFile: "p.yaml", type: "run-plan", status: "running", schedulerOwnerWorkerId: "worker-b" };
  Object.assign(provider, {
    localOperations: initial ? { "op-1": row } : {},
    projectTopologyAssessment: () => ({ mode: "single_worker" }),
    enabledWorkerConfigs: () => [{ id: "worker-a" }, { id: "worker-b" }],
    resolveWorkerEndpointId: (id) => ["worker-a", "worker-b"].includes(id) ? id : "",
    stopExperimentMatchesTarget: runOperationMatchesTarget,
    client: { postWorkerAction: async (...args) => { calls.push(args); return response; } },
    markLocalOperationsDirty() {}, postState() {},
    cleanupSchedulerTmpForOp: () => ({ message: "" }),
    clearLocalOperationCachesForOp: () => cleared.push("cache"),
    clearOperationStatusProbe: () => cleared.push("probe"), clearOperationWatchdog: () => cleared.push("watchdog"),
  });
  return { provider, calls, warnings, cleared };
}

test("exact Worker binding and explicit remote identity govern stops", async () => {
  const response = { status: "completed", stopBoundary: "local_command", matchedOperations: ["op-1"] };
  const a = stopHarness(response);
  await a.provider.stopExperimentRouted({ operationId: "op-1", planFile: "p.yaml" });
  assert.equal(a.calls.length, 1); assert.equal(a.calls[0][0], "worker-b");
  const b = stopHarness(response, false);
  await b.provider.stopExperimentRouted({ operationId: "op-1", planFile: "p.yaml", workerId: "worker-a" });
  assert.equal(b.calls[0][0], "worker-a");
  const unbound = stopHarness(response);
  delete unbound.provider.localOperations["op-1"].schedulerOwnerWorkerId;
  for (const [fixture, body] of [
    [stopHarness(response, false), {}], [unbound, {}], [stopHarness(response), { workerId: "missing" }], [stopHarness(response), { workerId: "worker-a" }], [stopHarness(response), { workerId: "worker-b", planFile: "other.yaml" }],
  ]) {
    await assert.rejects(fixture.provider.stopExperimentRouted({ operationId: "op-1", planFile: "p.yaml", ...body }));
    assert.equal(fixture.calls.length, 0);
  }
});

test("matched but pending reply retains stop intent and does not finalize", async () => {
  const fixture = stopHarness({ status: "accepted", matchedOperations: ["op-1"] });
  await assert.rejects(fixture.provider.abortSchedulerFromUi({ operationId: "op-1", planFile: "p.yaml" }));
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.provider.localOperations["op-1"].status, "running");
  assert.equal(fixture.provider.localOperations["op-1"].stopIntent.state, "pending");
  assert.deepEqual(fixture.cleared, []);
});

test("remaining activity keeps intent and state without a second stop or cache clearing", async () => {
  const fixture = stopHarness({ status: "completed", matchedOperations: ["op-1"], remainingActiveEvidence: [{ kind: "window", value: "w1" }] });
  await fixture.provider.abortSchedulerFromUi({ operationId: "op-1", planFile: "p.yaml" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.provider.localOperations["op-1"].status, "running");
  assert.equal(fixture.provider.localOperations["op-1"].stopIntent.state, "pending");
  assert.deepEqual(fixture.cleared, []); assert.match(fixture.warnings[0], /window:w1/);
});

test("matched legacy reply without stop evidence remains unconfirmed", async () => {
  const fixture = stopHarness({ status: "completed", matchedOperations: ["op-1"] });
  await fixture.provider.abortSchedulerFromUi({ operationId: "op-1", planFile: "p.yaml" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.provider.localOperations["op-1"].status, "running");
  assert.equal(fixture.provider.localOperations["op-1"].stopIntent.state, "pending");
  assert.deepEqual(fixture.cleared, []);
});

test("confirmed stop clears only its caches and ends the local record", async () => {
  const fixture = stopHarness({ status: "completed", stopBoundary: "local_command", matchedOperations: ["op-1"] });
  await fixture.provider.abortSchedulerFromUi({ operationId: "op-1", planFile: "p.yaml" });
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.provider.localOperations["op-1"].status, "cancelled");
  assert.equal(fixture.provider.localOperations["op-1"].stopIntent, undefined);
  assert.deepEqual(fixture.cleared, ["cache", "probe", "watchdog"]);
});

test("stop-scheduler-operation uses the original command and window boundary without session or PID gates", () => {
  const start=agentSource.indexOf('def stop_scheduler_operation('),handler=agentSource.slice(start,agentSource.indexOf('def recent_operations(',start));
  assert.match(handler,/task_stop\(root, command, worker\)/);
  assert.match(handler,/"targetCommandId": wanted/);
  assert.match(handler,/"matchedOperations": \[wanted\] if ok else \[\]/);
  assert.doesNotMatch(handler,/os\.kill|kill-session|_reap_|scheduler_process_evidence/);
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
