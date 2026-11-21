const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const root = path.join(__dirname, "..", "..");
const extension = readSource("src/extension.ts");
const panel = readSource("src/ui/PanelHtml.ts");
const agent = readSource("src/clusterAgentRuntime.ts");

test("manual Worker reassignment is exposed only as a worker-pool task action", () => {
  assert.match(panel, /reassignWorkerTask/);
  assert.match(panel, /manualReassignSurfaceVisible\(row\)/);
  assert.match(panel, /topology\.mode === "worker_pool"/);
  assert.match(panel, /data-task-status/);
  assert.match(panel, /仅允许转移排队或未开始任务/);
});

test("manual Worker reassignment keeps an immutable source record and creates a new attempt", () => {
  const start = extension.indexOf("async reassignWorkerTaskFromUi");
  const end = extension.indexOf("async saveHubConfigFromUi", start);
  assert.ok(start >= 0 && end > start);
  const flow = extension.slice(start, end);
  assert.match(flow, /this\.assertTopologyReady\("手动转移任务"\)/);
  assert.match(flow, /this\.enabledWorkerConfigs\(\)/);
  assert.doesNotMatch(flow, /postHubAction|lastProbe/);
  assert.match(flow, /new Set\(\["queued", "pending"\]\)/);
  assert.match(flow, /probe\.status === "ok"/);
  assert.match(flow, /missingWorkerActionCapabilities\(worker\.id, "retry-worker-task"\)/);
  assert.match(flow, /showQuickPick/);
  assert.match(flow, /showWarningMessage\(detail, \{ modal: true \}, "确认手动转移"\)/);
  assert.match(flow, /body\.originalRunKey = runKey/);
  assert.match(flow, /body\.sourceWorkerId = sourceWorkerId/);
  assert.match(flow, /body\.targetWorkerId = picked\.workerId/);
  assert.match(flow, /body\.manualReassignment = true/);
  assert.match(flow, /postWorkerTunnelAction\(picked\.workerId, "retry-worker-task"/);
});

test("manual Worker reassignment crosses the webview and host command gates", () => {
  assert.match(extension, /case "reassignWorkerTask":\s*await this\.reassignWorkerTaskFromUi\(message\)/);
  assert.match(extension, /SAFE_WEBVIEW_COMMANDS = new Set\(\[[\s\S]*"reassignWorkerTask"/);
  assert.match(extension, /hostOperationUiCommands = new Set\(\[[\s\S]*"reassignWorkerTask"/);
  assert.match(extension, /reassignWorkerTask: "手动转移 Worker 任务"/);
});

test("Worker runtime retains manual reassignment provenance and target ownership", () => {
  assert.match(agent, /manual_reassignment = any\(action_bool/);
  assert.match(agent, /"resultOwnerWorkerId": worker_id/);
  assert.match(agent, /"sourceWorkerId": source_worker_id/);
  assert.match(agent, /"targetWorkerId": worker_id/);
  assert.match(agent, /"originalRunKey": original_run_key/);
  assert.match(agent, /"reassignmentRunKey": reassignment_run_key or command_id/);
  assert.match(agent, /append_event\(root, \{"type": "worker_task_started"[\s\S]*\{\*\*task, \*\*result\}/);
});

test("confirmation is followed by a fresh exact source queue check before submission", async () => {
  const ts = require("typescript"), vm = require("node:vm");
  const tree = ts.createSourceFile("legacy.ts", extension, ts.ScriptTarget.Latest, true);
  let method;
  const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(tree) === "reassignWorkerTaskFromUi") method = node.getText(tree); ts.forEachChild(node, visit); };
  visit(tree); assert.ok(method);
  const sandbox = { vscode: { window: { showQuickPick: async () => ({ workerId: "target" }), showWarningMessage: async () => "确认手动转移" } },
    stringField: (row, key) => row[key] || "", usableSelectionKey: value => value,
    samePlanSelection: (a, b) => a === b, DistributedPlanQueue: { hasFreshDurableSnapshot: snapshot => snapshot.fresh === true }, UiCommandCancelled: Error };
  vm.runInNewContext(ts.transpileModule(`class Host { ${method} }; this.Host = Host;`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, sandbox);
  const host = new sandbox.Host(); let task, sent = 0;
  Object.assign(host, { assertTopologyReady() {}, resolveWorkerEndpointId: id => id, enabledWorkerConfigs: () => [{ id: "target" }],
    lastWorkerProbes: { target: { status: "ok" } }, missingWorkerActionCapabilities: () => [], actionBody: () => ({}),
    refreshLocalPlanMetadataForAction: async () => {}, stampPlanRevision() {},
    readWorkerTaskSnapshot: async id => ({ workerId: id, fresh: true, tasks: task ? [task] : [] }),
    postWorkerTunnelAction: async (_worker, _action, body) => { sent++; assert.equal(body.sourceWorkerId, "source"); assert.equal(body.originalRunKey, "run:0"); },
    throwIfRemoteActionPending() {}, postState() {} });
  const message = { taskStatus: "queued", workerId: "source", runKey: "run:0", planFile: "plan.yaml", experimentIndex: 0 };
  for (const status of ["running", "completed", "unknown"]) {
    task = { runKey: "run:0", experimentIndex: 0, status }; await assert.rejects(host.reassignWorkerTaskFromUi(message), /未确认仍在排队/);
  }
  task = { runKey: "other", experimentIndex: 0, status: "queued" };
  await assert.rejects(host.reassignWorkerTaskFromUi(message), /未确认仍在排队/);
  task = { runKey: "run:0", experimentIndex: 0, status: "queued" };
  await host.reassignWorkerTaskFromUi(message); assert.equal(sent, 1);
});
