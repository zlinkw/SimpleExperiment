const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
const wanted = ["withUiCommandStatus", "handleMessageCore", "manualGpuSnapshot", "manualSchedulerSnapshot", "manualTracesSnapshot", "restartRealtimeStream", "resumeRealtimeStream", "resumeNetwork", "ensureRealtimeConnected"];
const cls = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === "RealtimeTunnelPanelProvider");
const code = cls.members.filter(n => wanted.includes(n.name?.getText(ast))).map(n => n.getText(ast)).join("\n");
const context = { PLAN_SUBMISSION_COMMANDS: new Set(), localCommandReleasesAfterTrigger: () => false,
  getSafeCommand: m => m.command, booleanField: () => false, isUiCommandRemotePending: () => false, isUiCommandCancelled: () => false,
  errorMessage: e => e.message, actionErrorSuggestion: () => "", hostOperationLeaseActionLabel: c => c, compactSensitiveText: x => x,
  OperationOutcome_1: { operationOutcomeFor: () => ({}) }, vscode: { window: { showErrorMessage: async () => undefined } } };
const retired = ast.statements.find(n => ts.isVariableStatement(n) && n.declarationList.declarations.some(d => d.name.getText(ast) === "RETIRED_DRAFT_COMMANDS")).getText(ast);
const Host = vm.runInNewContext(ts.transpileModule(`${retired}\nclass Host {${code}}; Host`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);

function fixture() {
  const statuses = [], h = new Host();
  const client = { getGpu: async () => {}, getScheduler: async () => {}, getTraces: async () => {}, reconnect: async () => {}, connect: async () => {},
    diagnostics: () => ({ endpoints: [] }), resume() {} };
  Object.assign(h, { client, projectContextGeneration: 1, captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true, panelLifecycleState: "ready", projectBootstrapPromise: Promise.resolve(),
    budget: { isPaused: () => false, resume() {} }, effectiveConnectionMode: () => "xshell", isRealtimeMode: () => true,
    extensionRuntimeVersionState: () => ({ reloadRequired: false }), beginSimpleSftpCapabilityLaunch() {},
    postUiCommandStatus: (_id, status) => statuses.push(status), finishPlanSubmissionProgress() {}, recordActionError() {}, postState() {},
    applyTrafficScheduling() {}, pushLocalWorkerAvailability: async () => {}, clearOfflineImport: async () => {},
    restoreRemotePlanOperations: async () => {}, reconcileStalePlanRunOperations: async () => {} });
  return { h, client, statuses };
}
async function run(h, command) { await h.withUiCommandStatus("id", command, {}, () => h.handleMessageCore({ command }, command)); }

test("manual offline snapshots and reconnect report failure instead of completion", async () => {
  for (const command of ["manualGpuSnapshot", "manualSchedulerSnapshot", "manualTracesSnapshot", "restart"]) {
    const { h, statuses } = fixture(); h.effectiveConnectionMode = () => "offline_import";
    await run(h, command); assert.deepEqual(statuses, ["running", "failed"], command);
  }
});

test("manual transport failures are visible while successful snapshots complete", async () => {
  for (const [command, method] of [["manualGpuSnapshot", "getGpu"], ["manualSchedulerSnapshot", "getScheduler"], ["manualTracesSnapshot", "getTraces"], ["restart", "reconnect"]]) {
    const { h, client, statuses } = fixture(); client[method] = async () => { throw Error("connection failed"); };
    await run(h, command); assert.deepEqual(statuses, ["running", "failed"]); assert.equal(h.lastError, "connection failed");
    statuses.length = 0; client[method] = async () => {}; await run(h, command); assert.deepEqual(statuses, ["running", "completed"]);
  }
});

test("resume waits for failure; background connection remains tolerant", async () => {
  const { h, client, statuses } = fixture(); let reject;
  client.connect = () => new Promise((_, fail) => { reject = fail; });
  const pending = run(h, "resumeNetwork"); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(statuses, ["running"]); reject(Error("connection failed")); await pending;
  assert.deepEqual(statuses, ["running", "failed"]); assert.equal(h.lastError, "connection failed");
  client.connect = async () => { throw Error("background failed"); };
  await h.ensureRealtimeConnected("background tunnels launched"); assert.equal(h.lastError, "background failed");
});

test("resuming stream distinguishes disconnected endpoints from intentional low-traffic closure", async () => {
  const { h, client, statuses } = fixture();
  client.diagnostics = () => ({ endpoints: [{ streamStatus: "disconnected" }] });
  await run(h, "resumeStream"); assert.deepEqual(statuses, ["running", "failed"]);
  statuses.length = 0; client.diagnostics = () => ({ endpoints: [{ streamStatus: "disconnected" }], displayAutoRefreshDisabled: true, displayAutoClosed: true });
  await run(h, "resumeStream"); assert.deepEqual(statuses, ["running", "completed"]);
});
