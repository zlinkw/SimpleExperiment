const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");

test("catalog status and error changes invalidate every results render cache", () => {
  const extract = (name, next) => panel.slice(panel.indexOf(`function ${name}(`), panel.indexOf(`function ${next}(`));
  const record = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));
  const context = {
    objectReferenceIds: new WeakMap(), nextObjectReferenceId: 1,
    compactSelectedResultPlanForSignature: () => ({}), compactResultsSummaryForSignature: () => ({}),
    compactOutputContractCheckForSignature: value => value, currentResultOutputContractCheck: () => ({}),
    resultAutoParseReadinessForState: () => ({}), resultAnalysisArtifactsForState: () => ({}),
    compactRecordForSignature: record, compactTracesForSignature: () => ({}),
    compactResultSelectionForSignature: () => ({}), compactPlanArchiveForSignature: () => ({}),
    traceRowsForPlanScope: () => ({ rows: [] }), experimentTraceRowsForState: () => [],
    resultEvidenceTraceStatsForRows: () => ({}), meaningfulValue: value => value,
    pick: (value, keys, fallback) => keys.map(key => value[key]).find(item => item !== undefined) ?? fallback,
    resultEvidenceWorkbenchCacheKeyFor: () => "unchanged-evidence",
    stableSectionSignature: JSON.stringify, resultSplitTableKey: "", resultSplitFieldName: "",
  };
  const workbenchStart = panel.indexOf("function renderResultEvidenceWorkbench(");
  const cacheCheck = panel.indexOf("if (cacheKey === resultEvidenceWorkbenchCacheKey", workbenchStart);
  assert.ok(workbenchStart >= 0 && cacheCheck > workbenchStart);
  vm.createContext(context);
  vm.runInContext([
    extract("sectionDependencyKey", "sectionLocalPreKey"),
    extract("refListKey", "sectionRenderSignature"),
    extract("sectionRenderModel", "compactRowsForSignature"),
    panel.slice(workbenchStart, cacheCheck) + "return cacheKey; }",
  ].join("\n"), context);
  const config = { tables: [], catalog: {}, catalogLoadStatus: "stale", catalogLoadError: "" };
  const state = { resultOutputConfig: config };
  const keys = () => [context.sectionDependencyKey(state, "results"),
    JSON.stringify(context.sectionRenderModel(state, "results")), context.renderResultEvidenceWorkbench(state, {})];
  let previous = keys();
  for (const status of ["ready", "loading", "error", "publicationPending"]) {
    config.catalogLoadStatus = status;
    const current = keys();
    current.forEach((key, index) => assert.notEqual(key, previous[index], `cache ${index} must observe ${status}`));
    previous = current;
  }
  config.catalogLoadError = "读取汇总失败";
  keys().forEach((key, index) => assert.notEqual(key, previous[index], `cache ${index} must observe the error`));
});

test("results section pre-key includes relevant Plan selection and operation changes", () => {
  const start = panel.indexOf("function sectionDependencyKey(");
  const end = panel.indexOf("function sectionLocalPreKey(", start);
  const dependency = panel.slice(start, end);
  assert.match(dependency, /section === "results"[\s\S]*data\.planFileInput[\s\S]*data\.plans[\s\S]*data\.resultsSummary[\s\S]*data\.operations[\s\S]*data\.schedulerStates/);
  assert.match(dependency, /data\.experimentTraces[\s\S]*data\.selection[\s\S]*data\.planArchive[\s\S]*data\.pptPlotConfig/);
  assert.doesNotMatch(dependency, /section === "results"[^\n]*data\.selectedTraceKey/);
  assert.doesNotMatch(dependency, /section === "results"[^\n]*data\.capabilities/);
});

test("results render signature derives contract and analysis paths from operations", () => {
  const start = panel.indexOf("function sectionRenderModel(");
  const end = panel.indexOf("function compactRowsForSignature(", start);
  const model = panel.slice(start, end);
  assert.match(model, /if \(section === "results"\)/);
  assert.match(model, /planFileInput: data\.planFileInput/);
  assert.match(model, /selectedPlan: compactSelectedResultPlanForSignature\(data\)/);
  assert.match(model, /selection: compactResultSelectionForSignature\(data\.selection\)/);
  assert.match(model, /outputContractCheck: compactOutputContractCheckForSignature\(currentResultOutputContractCheck\(data\)\)/);
  assert.match(model, /analysisArtifacts: resultAnalysisArtifactsForState\(data, data\.resultsSummary \|\| \{\}\)/);
  const resultsModel = model.slice(model.indexOf('if (section === "results")'), model.indexOf('if (section === "gpu")'));
  assert.doesNotMatch(resultsModel, /minuteBucket/);
  assert.doesNotMatch(resultsModel, /plans: compactPlansForSignature/);
  assert.doesNotMatch(resultsModel, /capabilities: compactCapabilitiesForSignature/);
  assert.match(panel, /resultEvidenceWorkbenchCacheKeyFor\(summary, traceStats, outputContractCheck, analysisArtifacts, autoParseReadiness\)/);
  assert.match(resultsModel, /resultSyncReport: data\.resultSyncReport/);
  assert.match(panel, /stableSectionSignature\(\(state \|\| \{\}\)\.resultSyncReport \|\| \{\}\)/);
});

test("results signature ignores task-only selection fields", () => {
  const start = panel.indexOf("function compactResultSelectionForSignature(");
  const end = panel.indexOf("function compactPlanArchiveForSignature(", start);
  const compact = panel.slice(start, end);
  assert.match(compact, /selectedPlanId: item\.selectedPlanId/);
  assert.match(compact, /selectedRunKeys: asArray\(item\.selectedRunKeys\)/);
  assert.match(compact, /selectedArchiveKeys: asArray\(item\.selectedArchiveKeys\)/);
  assert.doesNotMatch(compact, /selectedTaskUiKeys|selectedWorkerIds|selectedExperimentIds/);
});
