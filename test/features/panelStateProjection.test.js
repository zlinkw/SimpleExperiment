const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadFeature(name) {
  const source = fs.readFileSync(path.join(__dirname, "../../src/features/" + name + ".ts"), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { exports: loaded.exports, module: loaded, Buffer, Object, Array, Set, Map, Number, String, Math });
  return loaded.exports;
}

const projection = loadFeature("PanelStateProjection");
const payload = loadFeature("PanelStatePayload");

test("serialized state attribution reports UTF-8 bytes per top-level field and bounded top eight", () => {
  const state = {
    alpha: "你好🙂",
    beta: [1, 2, 3],
    gamma: { nested: true },
    delta: "d",
    epsilon: "e",
    zeta: "z",
    eta: "η",
    theta: "θ",
    iota: "ι",
  };
  const message = JSON.stringify({ type: "state", seq: 1, state });
  const measuredBytes = Buffer.byteLength(message, "utf8");
  const scan = payload.scanSerializedPanelState(message, measuredBytes);
  assert.equal(scan.payloadBytes, measuredBytes);
  assert.equal(scan.fields.alpha.valueBytes, Buffer.byteLength(JSON.stringify(state.alpha), "utf8"));
  assert.equal(scan.fieldBytes.alpha, Buffer.byteLength('"alpha":' + JSON.stringify(state.alpha), "utf8"));
  assert.equal(scan.maxFields.length, 8);
  assert.equal(scan.maxFields[0].field, "gamma");
  assert.ok(scan.maxFields[0].percent > 0);
  const summary = payload.summarizePanelPayloadAttribution(scan);
  assert.deepEqual(Object.keys(summary.fieldBytes).sort(), Object.keys(state).sort());
  assert.equal(summary.maxFields.length, 8);
});

test("interest is generation-scoped and projection distinguishes omitted details from empty data", () => {
  assert.equal(projection.normalizePanelSectionInterest({ documentGeneration: 8, mainSection: "results" }, 9), undefined);
  const interest = projection.normalizePanelSectionInterest({
    documentGeneration: 9,
    interest: { mainSection: "sync", visibleSections: [], expandedSections: [], pinnedInspectorSection: "" },
  }, 9);
  assert.ok(interest);
  const state = {
    planFileInput: "experiments/plans/current.yaml",
    resultOutputConfig: { catalog: { datasets: [{ id: "d" }] }, tables: [{ name: "all" }], csvDirectory: "results" },
    experimentTraces: [{ id: "trace" }],
    gpuHistory: { data: { series: [{ points: [1, 2] }], totalPointCount: 2 } },
    operations: [
      { id: "old", status: "completed", planFile: "experiments/plans/old.yaml" },
      { id: "current", status: "completed", planFile: "experiments/plans/current.yaml" },
      { id: "active", status: "running", planFile: "experiments/plans/other.yaml" },
    ],
    schedulerStates: [
      { uiKey: "old", status: "completed", planFile: "experiments/plans/old.yaml" },
      { uiKey: "current", status: "completed", planFile: "experiments/plans/current.yaml" },
      { uiKey: "active", status: "running", planFile: "experiments/plans/other.yaml" },
    ],
  };
  const projected = projection.projectWebviewPanelState(state, interest);
  assert.equal(projected.sectionPayloads.results.status, "notLoaded");
  assert.equal(projected.sectionPayloads.gpu.status, "notLoaded");
  assert.equal(projected.sectionPayloads.execution.status, "notLoaded");
  assert.equal("catalog" in projected.resultOutputConfig, false);
  assert.equal("tables" in projected.resultOutputConfig, false);
  assert.equal("experimentTraces" in projected, false);
  assert.equal("gpuHistory" in projected, false);
  assert.deepEqual(projected.operations.map((row) => row.id), ["current", "active"]);
  assert.deepEqual(projected.schedulerStates.map((row) => row.uiKey), ["current", "active"]);

  const detailedInterest = projection.normalizePanelSectionInterest({
    documentGeneration: 9,
    interest: { mainSection: "results", visibleSections: ["gpu"], expandedSections: ["execution"], pinnedInspectorSection: "" },
  }, 9);
  const detailed = projection.projectWebviewPanelState(state, detailedInterest);
  assert.equal(detailed.sectionPayloads.results.status, "loaded");
  assert.equal(detailed.sectionPayloads.gpu.status, "loaded");
  assert.equal(detailed.sectionPayloads.execution.status, "loaded");
  assert.equal(detailed.resultOutputConfig.tables.length, 1);
  assert.equal(detailed.experimentTraces.length, 1);
  assert.equal(detailed.gpuHistory.data.totalPointCount, 2);
});

test("host section revisions advance only when that section's bounded input changes", () => {
  const tracker = new projection.PanelSectionRevisionTracker();
  const results = {};
  const gpu = {};
  const initial = tracker.update({ results: [results], gpu: [gpu] });
  const same = tracker.update({ results: [results], gpu: [gpu] });
  assert.equal(same.results, initial.results);
  assert.equal(same.gpu, initial.gpu);
  const changed = tracker.update({ results: [{}], gpu: [gpu] });
  assert.equal(changed.results, same.results + 1);
  assert.equal(changed.gpu, same.gpu);
  assert.deepEqual(Object.keys(changed).sort(), ["diagnostics", "execution", "gpu", "plans", "results", "settings", "sync"]);
});
