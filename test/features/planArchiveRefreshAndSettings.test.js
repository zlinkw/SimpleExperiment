const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../../src/extension/legacy.ts"), "utf8");
const tree = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.ES2022, true);
function extract(name, method = false) {
  let found;
  function visit(node) { if ((method ? ts.isMethodDeclaration(node) : ts.isFunctionDeclaration(node)) && node.name?.getText(tree) === name) found = node; ts.forEachChild(node, visit); }
  visit(tree); assert.ok(found, name); return found.getText(tree);
}
function compile(text, globals) { return vm.runInNewContext(ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, globals); }

test("poll interval retains fractional seconds while integer settings stay integer", async () => {
  const updates = {};
  const code = `${extract("hasNumericPatchValue")}\n${extract("numberRangePatch")}\n({${extract("saveSchedulerConfigFromUi", true)}}).saveSchedulerConfigFromUi`;
  const save = compile(code, { recordField: m => m.patch, GpuQuotaScheduling: { quotaSettings: () => ({}) },
    vscode: { workspace: { getConfiguration: () => ({ update: async (key, value) => { updates[key] = value; } }) },
      ConfigurationTarget: { Global: 1 }, window: { showInformationMessage() {} } } });
  const host = { schedulerSettings: () => ({ pollSeconds: 10, jitterSeconds: 30, workerStatusTtlSeconds: 10,
    localAvailabilityPushSeconds: 10, workerAvailabilityPushSeconds: 10, operationEventMaxDelayMs: 100,
    workerActionMinIntervalMs: 200, workerActionMaxConcurrent: 1 }), startAvailabilityPushLoop() {}, postState() {} };
  await save.call(host, { patch: { pollSeconds: 10.5, jitterSeconds: 12.5 } });
  assert.equal(updates["scheduler.pollSeconds"], 10.5);
  assert.equal(updates["scheduler.jitterSeconds"], 12);
});

test("failed or skipped result refresh cannot authorize archive from a stale summary", async () => {
  const archive = compile(`({${extract("archivePlanFromUi", true)}}).archivePlanFromUi`, {
    workspaceRoot: () => "project", stringField: (m, k) => m[k] || "", planDirSafe: () => "plans", path,
    safeWorkspacePlanPath: (_root, file) => file, fs: { readFile: async () => "suite: demo" }, planArchiveRunGate: () => ({ ok: true }),
  });
  const host = { client: { currentState: () => ({}) }, captureProjectContext: () => ({ root: "project" }), projectContextIsCurrent: () => true,
    refreshLocalPlanMetadataForAction: async () => {}, actionBody: value => value,
    refreshResultsSummary: async () => ({ ok: false, reason: "EACCES" }),
    filterResultsSummaryForPlan: () => assert.fail("stale summary must not be used") };
  await assert.rejects(archive.call(host, { planFile: "plan.yaml" }), /本轮结果未刷新：EACCES/);
  host.refreshResultsSummary = async () => ({ ok: false, reason: "低流量模式未刷新" });
  await assert.rejects(archive.call(host, { planFile: "plan.yaml" }), /低流量模式未刷新/);
});

test("offline result refresh remains available in low traffic mode", async () => {
  let applied;
  const refresh = compile(`({${extract("refreshResultsSummary", true)}}).refreshResultsSummary`, {});
  const host = { lowTrafficMode: true, effectiveConnectionMode: () => "offline_import", offlineBundle: { local: true },
    applyOfflineResultsSummaryFromBundle: value => { applied = value; }, postState() {} };
  const result = await refresh.call(host);
  assert.equal(result.ok, true); assert.equal(applied.local, true);
});
test("failed result collection reports this attempt's error", async () => {
  const refresh = compile(`({${extract("refreshResultsSummary", true)}}).refreshResultsSummary`, {
    resultCollectionHost: () => ({ update: async () => { throw new Error("read failed"); } }), errorMessage: error => error.message,
  });
  const host = { effectiveConnectionMode: () => "online", captureProjectContext: () => ({}), projectContextIsCurrent: () => true, recordActionError() {}, postState() {} };
  const result = await refresh.call(host);
  assert.equal(result.ok, false); assert.equal(result.reason, "read failed");
});
