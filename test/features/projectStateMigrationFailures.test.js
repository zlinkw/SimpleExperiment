const assert = require("node:assert/strict");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");

test("unreadable project state blocks migration and replacement until it can be read", async () => {
  const ts = require("typescript");
  const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const pairs = [
    ["PROJECT_PLAN_SELECTION_PATH", "readProjectPlanSelectionState", "writeProjectPlanSelectionState"],
    ["PROJECT_TASK_SELECTION_PATH", "readProjectTaskSelectionState", "writeProjectTaskSelectionState"],
    ["PROJECT_OFFLINE_BUNDLE_PATH", "readProjectOfflineBundleState", "writeProjectOfflineBundleState"],
    ["PROJECT_UI_LAYOUT_PATH", "readProjectUiLayoutState", "writeProjectUiLayoutState"],
    ["PROJECT_FLOW_STATE_PATH", "readProjectFlowState", "writeProjectFlowState"],
  ];
  const declarations = ast.statements.filter(node =>
    ts.isFunctionDeclaration(node) && pairs.some(pair => pair.includes(node.name?.text)) ||
    ts.isVariableStatement(node) && node.declarationList.declarations.some(d => pairs.some(pair => pair[0] === d.name.getText(ast)))
  ).map(node => node.getText(ast)).join("\n");
  let content = "{broken", writes = 0;
  const fakeFs = { readFile: async () => { if (content instanceof Error) throw content; return content; }, mkdir: async () => {} };
  const helpers = { fs: fakeFs, path: require("node:path"), usableSelectionKey: x => x, mergeRecentPlans: x => x,
    normalizeSelectionList: x => x || [], errorMessage: error => error.message, defaultUiLayout: {}, normalizeUiLayout: x => x,
    normalizeUiProjectLayoutState: x => x, projectUiLayoutState: x => x, ApiWorkflow_1: { normalizeFlowState: x => x },
    writeAtomicPluginStateJson: async () => { writes++; } };
  const compiled = ts.transpileModule(declarations + "\nreturn {" + pairs.flatMap(x => x.slice(1)).join(",") + "};", {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const api = new Function(...Object.keys(helpers), compiled)(...Object.values(helpers));
  for (const [, read, write] of pairs) {
    for (content of ["{broken", "42", "[]", Object.assign(Error("access denied"), { code: "EACCES" })]) {
      await assert.rejects(api[read]("C:/synthetic"), /读取项目状态失败/);
      await assert.rejects(api[write]("C:/synthetic", {}), /读取项目状态失败/);
      assert.equal(writes, 0);
    }
    content = Object.assign(Error("missing"), { code: "ENOENT" });
    assert.equal(await api[read]("C:/synthetic"), undefined);
    content = "{}";
    await api[read]("C:/synthetic");
    await api[write]("C:/synthetic", {});
    assert.equal(writes, 1);
    writes = 0;
  }
  const bootstrap = method("async bootstrapProjectLocalUiState", "captureProjectContext", ["migrateOnboardingFacts", "projectOnboardingRoot"], [async () => {}, () => "C:/synthetic"]).bootstrapProjectLocalUiState;
  let migrated = 0;
  const host = { captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true,
    migrateLegacyProjectUiStateFromVsCode: async () => { migrated++; } };
  for (const name of ["loadProjectPlanSelectionState", "loadProjectTaskSelectionState", "loadProjectOfflineBundleState",
    "loadProjectActionErrorsState", "loadProjectPanelLifecycleDiagnosticsState", "loadProjectUiLayoutState", "loadProjectDebugBundleState",
    "loadProjectCodeSyncState", "loadProjectRemotePathConfirmationsState", "loadProjectLocalOperationsState",
    "loadProjectLocalPlanMetadataState", "loadPlanSyncLedger", "refreshCheckStaticReports", "loadProjectFlowState", "refreshLocalSshConfig"]) host[name] = async () => {};
  host.loadProjectOfflineBundleState = async () => { throw Error("unreadable"); };
  await assert.rejects(bootstrap.call(host), /unreadable/);
  assert.equal(migrated, 0);
  host.loadProjectOfflineBundleState = async () => {};
  host.loadProjectFlowState = async () => { throw Error("flow unreadable"); };
  await assert.rejects(bootstrap.call(host), /flow unreadable/);
  assert.equal(migrated, 0);
  host.loadProjectFlowState = async () => {};
  await bootstrap.call(host);
  assert.equal(migrated, 1);
});

test("automatic flow advancement reports an unsaved state without denying earlier effects", async () => {
  const advance = method("async apiAdvanceFlow", "async persistProjectFlowState", ["ApiWorkflow_1", "errorMessage"],
    [{ advanceFlowStep: (state, step, patch) => ({ ...state, [step]: patch }) }, e => e.message]).apiAdvanceFlow;
  const host = { apiFlowState: {}, persistProjectFlowState: async () => { throw Error("disk full"); } };
  await assert.rejects(advance.call(host, "prepare_agents", { completed: true }), /此前操作可能已执行.*disk full/);
  assert.equal(host.apiFlowState.prepare_agents.completed, true);
  host.persistProjectFlowState = async () => {};
  assert.equal((await advance.call(host, "prepare_agents", { completed: true })).prepare_agents.completed, true);
});

test("offline import and clear retain the current and legacy values when saving fails", async () => {
  const old = { value: "old" }, replacement = { value: "new" };
  let legacyClears = 0, reset = 0, rendered = 0;
  const common = () => ({ projectContextGeneration: 1, offlineBundle: old,
    captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true,
    pauseRealtimeStream: async () => {}, persistProjectOfflineBundleState: async () => { throw Error("disk full"); },
    context: { workspaceState: { update: async () => { legacyClears++; } } },
    refreshExperimentTracesProjectionForCurrentInterest() {}, mergeRecentPlansFromRuntime() {},
    applyOfflineResultsSummaryFromBundle() { rendered++; }, resetClient() { reset++; }, postState() {} });
  const picker = { window: { showQuickPick: async () => ({ kind: "file" }),
    showOpenDialog: async () => [{ fsPath: "C:/synthetic.json" }] } };
  const importer = method("async importOffline", "async handleMessage", ["workspaceRoot", "vscode", "OfflineImport_1", "keys"],
    [() => "C:/synthetic", picker, { importOfflineBundle: async () => ({ ok: true, bundle: replacement }) }, keys]).importOffline;
  const host = common();
  await assert.rejects(importer.call(host), /disk full/);
  assert.equal(host.offlineBundle, old);
  const clear = method("async clearOfflineImport", "async loadProjectPlanSelectionState", ["keys"], [keys]).clearOfflineImport;
  const clearing = common();
  await assert.rejects(clear.call(clearing), /disk full/);
  assert.equal(clearing.offlineBundle, old);
  assert.equal(legacyClears, 0);
  assert.equal(reset, 0);
  assert.equal(rendered, 0);
});
function method(start, end, dependencies, values) {
  const from = source.indexOf(`    ${start}(`);
  const to = source.indexOf(`    ${end}(`, from + 1);
  assert.ok(from >= 0 && to > from);
  return new Function(...dependencies, `return ({${source.slice(from, to)}});`)(...values);
}

const keys = { hiddenLegacyTaskUiKeys: "hidden", offlineBundle: "offline", uiProjectLayout: "layout", uiProjectActions: "actions" };
test("explicitly cleared project offline and layout states do not revive old workspace values", async () => {
  const ts = require("typescript"), path = require("node:path");
  const ast = ts.createSourceFile("legacy.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names = ["PROJECT_OFFLINE_BUNDLE_PATH", "PROJECT_UI_LAYOUT_PATH", "readProjectOfflineBundleState", "readProjectUiLayoutState"];
  const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.includes(n.name?.text) ||
    ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(ast))))
    .map(n => n.getText(ast)).join("\n");
  let content = "null", persisted = [];
  const fs = { readFile: async () => { if (content instanceof Error) throw content; return content; } };
  const compiled = ts.transpileModule(code + "\nreturn {readProjectOfflineBundleState,readProjectUiLayoutState};", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const api = new Function("fs", "path", "errorMessage", "normalizeUiProjectLayoutState", "defaultUiLayout", compiled)(fs, path, e => e.message, x => x, {});
  const runMigrate = method("async migrateLegacyProjectUiStateFromVsCode", "effectiveConnectionMode",
    ["keys", "stringArrayConfig", "uniqueStrings", "normalizeUiProjectLayoutState", "defaultUiLayout", "readProjectOfflineBundleState", "readProjectUiLayoutState"],
    [keys, x => x, x => [...new Set(x)], x => x, {}, api.readProjectOfflineBundleState, api.readProjectUiLayoutState]).migrateLegacyProjectUiStateFromVsCode;
  for (const value of ["null", '{"cleared":true}', '{"bundle":{"value":"new-offline"},"layout":{"value":"new-layout"}}', Object.assign(Error("missing"), { code: "ENOENT" })]) {
    content = value; persisted = [];
    const old = new Map([["offline", { value: "old-offline" }], ["layout", { value: "old-layout" }]]);
    const store = { get: (key, fallback) => old.has(key) ? old.get(key) : fallback, update: async key => { old.delete(key); } };
    const host = { context: { workspaceState: store, globalState: { get: (_, fallback) => fallback } },
      captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true,
      readCurrentProjectState: async reader => ({ current: true, value: await reader("C:/synthetic") }),
      persistProjectOfflineBundleState: async () => persisted.push("offline"), persistProjectUiLayoutState: async () => persisted.push("layout") };
    await runMigrate.call(host);
    assert.deepEqual(persisted, value instanceof Error || value.includes("new-offline") ? ["offline", "layout"] : []);
    if (typeof value === "string" && value.includes("new-offline")) {
      assert.equal(host.offlineBundle.value, "new-offline");
      assert.equal(host.projectUiLayout.value, "new-layout");
    }
    assert.equal(old.size, 0);
  }
  for (const bad of ["{broken", Object.assign(Error("denied"), { code: "EACCES" })]) {
    content = bad;
    const old = new Map([["offline", { value: "old" }]]);
    const host = { context: { workspaceState: { get: (key, fallback) => old.has(key) ? old.get(key) : fallback,
      update: async key => { old.delete(key); } }, globalState: { get: (_, fallback) => fallback } },
      captureProjectContext: () => ({ root: "C:/synthetic" }), projectContextIsCurrent: () => true,
      readCurrentProjectState: async reader => ({ current: true, value: await reader("C:/synthetic") }) };
    await assert.rejects(runMigrate.call(host), /读取项目状态失败/);
    assert.equal(old.has("offline"), true);
  }
  content = "null"; persisted = [];
  const old = new Map([["offline", { value: "old" }]]); let fail = true;
  const host = { context: { workspaceState: { get: (key, fallback) => old.has(key) ? old.get(key) : fallback,
    update: async key => { if (fail) { fail = false; throw Error("clear failed"); } old.delete(key); } },
    globalState: { get: (_, fallback) => fallback } }, captureProjectContext: () => ({ root: "C:/synthetic" }),
    projectContextIsCurrent: () => true, readCurrentProjectState: async reader => ({ current: true, value: await reader("C:/synthetic") }),
    persistProjectOfflineBundleState: async () => persisted.push("offline") };
  await assert.rejects(runMigrate.call(host), /clear failed/);
  assert.equal(old.has("offline"), true);
  await runMigrate.call(host);
  assert.deepEqual(persisted, []);
  assert.equal(old.size, 0);
});
const migrate = method("async migrateLegacyProjectUiStateFromVsCode", "effectiveConnectionMode",
  ["keys", "stringArrayConfig", "uniqueStrings", "normalizeUiProjectLayoutState", "defaultUiLayout", "readProjectOfflineBundleState", "readProjectUiLayoutState"],
  [keys, x => x, x => [...new Set(x)], x => x, {}, () => undefined, () => undefined]).migrateLegacyProjectUiStateFromVsCode;

for (const kind of ["hidden", "offline", "layout"]) {
  test(`${kind} migration keeps the old copy after a failed write and retries in the same process`, async () => {
    const old = kind === "hidden" ? ["task"] : { value: kind };
    const workspace = new Map([[kind, old]]);
    const store = map => ({ get: (key, fallback) => map.has(key) ? map.get(key) : fallback,
      update: async (key, value) => { if (value === undefined) map.delete(key); else map.set(key, value); } });
    let attempts = 0;
    const persist = async () => { if (++attempts === 1) throw new Error("write failed"); };
    const host = { context: { workspaceState: store(workspace), globalState: store(new Map()) },
      captureProjectContext: () => ({ root: "project" }), projectContextIsCurrent: () => true,
      readCurrentProjectState: async () => ({ current: true, value: undefined }),
      hiddenLegacyTaskUiKeys: new Set(), persistProjectTaskSelectionState: persist,
      persistProjectOfflineBundleState: persist, persistProjectUiLayoutState: persist };
    await assert.rejects(migrate.call(host), /write failed/);
    assert.deepEqual(workspace.get(kind), old);
    await migrate.call(host);
    assert.equal(attempts, 2);
    assert.equal(workspace.has(kind), false);
  });
}

test("migration does not clear legacy values without a project root", async () => {
  const host = { captureProjectContext: () => ({ root: undefined }), projectContextIsCurrent: () => true };
  await migrate.call(host);
});

test("migration preserves an already loaded project value", async () => {
  const workspace = new Map([["offline", { value: "old" }], ["layout", { value: "old" }]]);
  const persisted = [];
  const store = { get: (key, fallback) => workspace.has(key) ? workspace.get(key) : fallback,
    update: async key => { workspace.delete(key); } };
  const host = { context: { workspaceState: store, globalState: { get: (_, fallback) => fallback } },
    captureProjectContext: () => ({ root: "project" }), projectContextIsCurrent: () => true,
    readCurrentProjectState: async () => ({ current: true, value: undefined }),
    offlineBundle: { value: "current offline" }, projectUiLayout: { value: "current layout" },
    persistProjectOfflineBundleState: async () => persisted.push(host.offlineBundle),
    persistProjectUiLayoutState: async () => persisted.push(host.projectUiLayout) };
  await migrate.call(host);
  assert.deepEqual(persisted, [{ value: "current offline" }, { value: "current layout" }]);
  assert.equal(workspace.size, 0);
});

test("selection write failures are reported while the current selection stays visible", async () => {
  const select = method("selectPlanFromUi", "selectExperimentFromUi", ["stringField", "errorMessage"],
    [(message, key) => message[key] || "", error => error.message]).selectPlanFromUi;
  const errors = [];
  const host = { resolveSelectedPlanFile: x => x, refreshExperimentTracesProjectionForCurrentInterest() {},
    persistProjectPlanSelectionState: async () => { throw new Error("disk full"); },
    ensureSelectedPlanFileWatchers() {}, postState() {}, queuePlanScopedResultParse() {},
    recordActionError: error => errors.push(error) };
  select.call(host, { planFile: "plan.yaml" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(host.planFileInput, "plan.yaml");
  assert.match(errors[0].message, /disk full/);
});

test("hiding old tasks reports persistence failure instead of claiming success", async () => {
  const notices = [];
  const hide = method("async clearLegacyTasksFromUi", "async clearCacheFromUi",
    ["stringArrayField", "stringField", "usableSelectionKey", "uniqueStrings", "vscode"],
    [(m, k) => m[k] || [], (m, k) => m[k] || "", x => x, xs => [...new Set(xs.filter(Boolean))],
      { window: { showInformationMessage: message => notices.push(message) } }]).clearLegacyTasksFromUi;
  const host = { hiddenLegacyTaskUiKeys: new Set(), selectedExperimentIds: new Set(), selectedRunKeys: new Set(),
    selectedArchiveKeys: new Set(), selectedTaskUiKeys: new Set(), markTaskSelectionChanged() {}, postState() {},
    persistProjectTaskSelectionState: async () => { throw new Error("disk full"); } };
  await assert.rejects(hide.call(host, { selectedLegacyTaskUiKeys: ["task"] }), /disk full/);
  assert.equal(host.hiddenLegacyTaskUiKeys.has("task"), true);
  assert.deepEqual(notices, []);
});
