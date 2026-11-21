const assert = require("node:assert/strict");
const test = require("node:test");
const { readSource } = require("../_helpers/sourceReader");

const source = readSource("src/extension.ts");
function method(start, end, dependencies, values) {
  const from = source.indexOf(`    ${start}(`);
  const to = source.indexOf(`    ${end}(`, from + 1);
  assert.ok(from >= 0 && to > from);
  return new Function(...dependencies, `return ({${source.slice(from, to)}});`)(...values);
}

const keys = { hiddenLegacyTaskUiKeys: "hidden", offlineBundle: "offline", uiProjectLayout: "layout", uiProjectActions: "actions" };
const migrate = method("async migrateLegacyProjectUiStateFromVsCode", "effectiveConnectionMode",
  ["keys", "stringArrayConfig", "uniqueStrings", "normalizeUiProjectLayoutState", "defaultUiLayout"],
  [keys, x => x, x => [...new Set(x)], x => x, {}]).migrateLegacyProjectUiStateFromVsCode;

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
