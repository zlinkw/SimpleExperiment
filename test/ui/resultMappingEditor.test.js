const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const { renderPanelHtml } = require("../../dist/ui/PanelHtml.js");

test("visible GPU refresh is offered as the matching inspector action", () => {
  const panelFunction = require("../_helpers/panelFunction");
  const context = {
    inspectorSectionsForCustomGroup: () => ["gpu"],
    inspectorVisibleCommandsForSection: () => new Set(["manualGpuSnapshot"]),
    inspectorActionSection: (section) => section,
    orderInspectorActionsByResourceTree: (_section, actions) => actions,
    featureCommandLabel: (command) => command,
    webviewHandledCommands: new Set(["manualGpuSnapshot"]),
  };
  vm.createContext(context);
  vm.runInContext(panelFunction("workbenchInspectorActions") + panelFunction("inspectorCustomCandidatePool"), context);
  const choices = context.inspectorCustomCandidatePool("GPU 状态");
  assert.equal(choices.length, 1);
  assert.equal(choices[0][1], "manualGpuSnapshot");
});

test("result mapping summary shows source, configured and detected columns, examples and derived metrics", () => {
  const html = renderPanelHtml();
  const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
    .find((candidate) => candidate.includes("function renderResultColumnMappingEditor(")) || "";
  const start = script.indexOf("function renderResultColumnMappingEditor(");
  const end = script.indexOf("\n    function ", start + 1);
  assert.ok(start >= 0 && end > start);
  const context = {
    asArray: (value) => Array.isArray(value) ? value : [],
    configDraftValue: (_scope, _field, fallback) => fallback,
    detailsOpenAttr: () => "",
    esc: (value) => String(value),
    escAttr: (value) => String(value),
  };
  vm.runInNewContext(script.slice(start, end), context);
  const rendered = context.renderResultColumnMappingEditor(
    { resultOutputConfig: { columnMapping: { case: "specimen" }, adapterRules: { derivedMetric: { metric: "AP", leftEndpoint: "clean", rightEndpoint: "test", outputName: "ap_delta", scale: 1 } } } },
    { source: "experiments/results/raw.csv", headers: ["specimen", "rng", "accuracy"], mapping: { case: "specimen", seed: "rng" }, sampleValues: { specimen: ["alpha", "beta"], rng: ["42"], accuracy: ["0.9"] }, metricColumns: [{ column: "accuracy", metric: "accuracy" }] },
  );
  assert.match(rendered, /id="resultColumnMappingEditor"/);
  assert.match(rendered, /experiments\/results\/raw\.csv/);
  assert.match(rendered, /case → specimen/);
  assert.match(rendered, /seed → rng/);
  assert.match(rendered, /specimen： alpha \/ beta/);
  assert.match(rendered, /AP · clean · test · ap_delta · 1/);
  assert.doesNotMatch(rendered, /<input|<select|<textarea|保存映射|data-config-input="resultMapping"/);
});

test("cold result navigation opens the mapping after lazy render only once", () => {
  const panelFunction = require("../_helpers/panelFunction");
  let editor, scrolls = 0;
  const sandbox = { detailsOpenState: {}, pendingResultMappingOpen: false, activeResourceSection: "results",
    el: () => editor, renderWorkerResultAggregateWarning: () => "",
    renderResultEvidenceWorkbench: () => "editor", setHtmlIfChanged() {
      editor ||= { open: false, scrollIntoView() { scrolls++; } };
    } };
  vm.createContext(sandbox);
  vm.runInContext(panelFunction("openResultColumnMappingEditor") + panelFunction("renderResultSummary"), sandbox);
  sandbox.openResultColumnMappingEditor();
  assert.equal(sandbox.detailsOpenState["result-column-mapping-editor"], true);
  sandbox.renderResultSummary({});
  assert.equal(editor.open, true);
  assert.equal(scrolls, 1);
  sandbox.renderResultSummary({});
  assert.equal(scrolls, 1, "later state refreshes cannot replay the navigation");
  editor = undefined;
  sandbox.openResultColumnMappingEditor();
  sandbox.currentMainView = "workspace";
  sandbox.document = { body: { classList: { toggle() {} } } };
  vm.runInContext(panelFunction("applyMainViewForSection"), sandbox);
  sandbox.applyMainViewForSection("gpu");
  assert.equal(sandbox.pendingResultMappingOpen, false, "leaving results cancels the pending jump");
});

test("saved legacy manual configuration actions stay hidden without changing the saved layout", () => {
  const panelFunction = require("../_helpers/panelFunction");
  const groups = {
    "实验准备": [
      { id: "old-rules", command: "saveProjectAdapterRules" },
      { id: "plan", command: "validatePlan" },
    ],
    "结果文件": [
      { id: "old-mapping", command: "saveResultColumnMapping" },
      { id: "result", command: "syncPendingPlanArtifacts" },
    ],
  };
  const original = JSON.stringify(groups);
  const context = {
    inspectorCustomGroupTitles: () => Object.keys(groups),
    inspectorCustomGroupsState: () => groups,
    inspectorSectionsForCustomGroup: () => [],
    inspectorSavedActionButton: (item) => `<button data-command="${item.command}"></button>`,
    esc: String,
    escAttr: String,
  };
  vm.createContext(context);
  vm.runInContext(panelFunction("renderInspectorCustomGroups"), context);
  const rendered = context.renderInspectorCustomGroups();
  assert.doesNotMatch(rendered, /saveProjectAdapterRules|saveResultColumnMapping|old-rules|old-mapping/);
  assert.match(rendered, /data-command="validatePlan"/);
  assert.match(rendered, /data-command="syncPendingPlanArtifacts"/);
  assert.equal(JSON.stringify(groups), original);
});

test("moving visible saved actions skips hidden legacy actions", () => {
  const panelFunction = require("../_helpers/panelFunction");
  const groups = { "实验准备": [
    { id: "first", command: "validatePlan" },
    { id: "hidden", command: "saveProjectAdapterRules" },
    { id: "last", command: "dryRunPlan" },
  ] };
  let saved;
  const context = {
    inspectorCustomGroupsState: () => groups,
    markWorkbenchInspectorInteraction() {},
    saveInspectorCustomGroups: (value) => { saved = value; },
  };
  vm.createContext(context);
  vm.runInContext(panelFunction("moveInspectorCustomButton"), context);
  context.moveInspectorCustomButton("实验准备", "first", 1);
  assert.deepEqual(Array.from(saved["实验准备"], (item) => item.id), ["last", "hidden", "first"]);
});
