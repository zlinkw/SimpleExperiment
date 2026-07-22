const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyResultRevision,
  applyResultSchema,
  aggregateMetricValues,
  builtInPaperTableTemplates,
  builtInResultPresets,
  builtInResultSchemas,
  buildAdvancedLeaderboard,
  buildResultDashboard,
  checkResultConsistency,
  createResultRevision,
  detectMetricAliasConflicts,
  exportResultBundle,
  extractDimension,
  filterByInclusionPolicy,
  filterResultsByDsl,
  importResultBundle,
  finalResultInclusionPolicy,
  normalizeMetricKey,
  parseResultFile,
  renderPaperTableTemplate,
  reparseResultRecords,
  validateResultRecords,
} = require("../dist/features/Results.js");

function sampleRecords() {
  const csv = [
    "experiment_id,attempt_id,suite,run_key,dataset,method,split,fold,seed,metric,value,step",
    "e1,a1,suite,r1,VinDr,baseline,test,0,1,dice,0.80,final",
    "e1,a1,suite,r1,VinDr,baseline,test,1,2,dice,0.82,final",
    "e2,a1,suite,r2,VinDr,ours,test,0,1,dice,0.90,final",
    "e2,a1,suite,r2,VinDr,ours,test,1,2,dice,0.92,final",
    "e3,a1,suite,r3,VinDr,bad,test,0,1,HD95,-1,final",
  ].join("\n");
  return parseResultFile(csv, { path: "results.csv", type: "csv", endpoint: "local" }, builtInResultPresets[0]);
}

test("result schema normalizes metric aliases and extracts dimensions", () => {
  const schema = builtInResultSchemas.find((item) => item.id === "medical_segmentation");
  const record = applyResultSchema(sampleRecords()[0], schema, { row: { method: "ours", dataset: "vindr" }, sourcePath: "runs/ours/results.csv" });
  assert.equal(normalizeMetricKey("mean_dice", schema), "DSC");
  assert.equal(record.metrics.DSC.sourceColumn, "value");
  assert.equal(record.dimensions.dataset, "VinDr");
  assert.deepEqual(detectMetricAliasConflicts({ ...schema, metrics: [...schema.metrics, { ...schema.metrics[0], key: "Dice2" }] }), [
    { alias: "dice", targets: ["DSC", "Dice2"] },
    { alias: "mean_dice", targets: ["DSC", "Dice2"] },
  ]);
});

test("dimension extraction supports source priority, regex group, alias, and expression", () => {
  assert.equal(extractDimension({}, { key: "dataset", label: "Dataset", type: "category", sources: [{ type: "regex_from_path", pattern: "dataset=([^/]+)", group: 1 }], aliases: { vindr: "VinDr" } }, { sourcePath: "a/dataset=vindr/out.csv" }), "VinDr");
  assert.equal(extractDimension({ method: "base" }, { key: "method", label: "Method", type: "category", sources: [{ type: "expression", expression: "row.method + '_x'" }] }), "base_x");
});

test("manual revision updates leaderboard and locked reparse preserves override", () => {
  const records = sampleRecords();
  const revision = createResultRevision(records[0], [{ path: "metrics.DSC.value", before: 0.82, after: 0.95 }], "paper correction");
  const edited = { ...applyResultRevision(records[0], revision), locked: true };
  assert.equal(edited.metrics.DSC.value, 0.95);
  const reparsed = reparseResultRecords([edited], [{ ...records[0], metrics: { DSC: { value: 0.1 } } }]);
  assert.equal(reparsed[0].metrics.DSC.value, 0.95);
  assert.equal(reparsed[0].revisions.length, 1);
});

test("inclusion policy explains excluded and validation critical results", () => {
  const records = sampleRecords();
  const issues = validateResultRecords(records).map((item) => item.metric === "HD95" ? { ...item, severity: "critical" } : item);
  const filtered = filterByInclusionPolicy(records, issues, { id: "paper", name: "Paper", includeStatuses: ["parsed", "validated", "manual_verified"], excludeIfValidationSeverityAtLeast: "critical", requireMetrics: ["DSC"] });
  assert.equal(filtered.some((record) => record.runKey === "r3"), false);
});

test("advanced aggregation supports ci95, median, relative improvement, and lower best", () => {
  const ci = aggregateMetricValues([1, 2, 3, 4], "mean_ci95");
  const median = aggregateMetricValues([1, 2, 100], "median_iqr");
  const rel = aggregateMetricValues([1.1], "relative_improvement", { baseline: 1 });
  const bestLower = aggregateMetricValues([4, 2, 3], "best", { higherIsBetter: false });
  assert.ok(ci.std > 0);
  assert.equal(median.median, 2);
  assert.ok(rel.mean > 9);
  assert.equal(bestLower.best, 2);
});

test("advanced leaderboard and paper template export use schema directions", () => {
  const schema = builtInResultSchemas[0];
  const records = sampleRecords().map((record) => ({ ...applyResultSchema(record, schema, { row: { method: record.runKey === "r1" ? "baseline" : "ours" } }), eligibleForFinalAnalysis: true, finalEvidenceState: "archived" }));
  const rows = buildAdvancedLeaderboard(records, { id: "lb", name: "LB", filter: { includeWarnings: true }, groupBy: ["method"], metrics: [{ key: "DSC", higherIsBetter: true, decimals: 3 }], aggregate: "mean_std", aggregation: { method: "relative_improvement", groupBy: ["method"], baselineFilter: { method: "baseline" } } }, []);
  assert.equal(rows.some((row) => row.values.DSC.mean > 0), true);
  const rendered = renderPaperTableTemplate(records, schema, builtInPaperTableTemplates[0], "markdown");
  assert.match(rendered, /Group | N | DSC/);
});

test("paper table template defaults to final archived results", () => {
  const schema = builtInResultSchemas[0];
  const draft = sampleRecords().map((record) => applyResultSchema(record, schema, { row: { method: "draft" } }));
  const final = draft.map((record) => ({ ...record, resultId: `${record.resultId}:final`, dimensions: { ...record.dimensions, method: "final" }, eligibleForFinalAnalysis: true, finalEvidenceState: "archived" }));
  const renderedDraft = renderPaperTableTemplate(draft, schema, builtInPaperTableTemplates[0], "markdown");
  const renderedFinal = renderPaperTableTemplate(final, schema, builtInPaperTableTemplates[0], "markdown");
  assert.doesNotMatch(renderedDraft, /draft/);
  assert.match(renderedFinal, /final/);
  assert.equal(filterByInclusionPolicy(draft, [], finalResultInclusionPolicy).length, 0);
});

test("dashboard, search DSL, import/export, and consistency checker work", () => {
  const schema = builtInResultSchemas[0];
  const records = sampleRecords().map((record) => applyResultSchema(record, schema, { row: { method: record.runKey === "r1" ? "baseline" : "ours" } }));
  const issues = validateResultRecords(records);
  const dashboard = buildResultDashboard(records, issues, schema);
  assert.equal(dashboard.parsedResults, records.length);
  assert.equal(filterResultsByDsl(records, "suite:suite metric.DSC>0.85").length, 2);
  const bundle = JSON.parse(exportResultBundle({ schemas: [schema], records }, { includeValues: false }));
  assert.deepEqual(bundle.records[0].metrics, {});
  assert.equal(importResultBundle([{ id: "a", value: 1 }], [{ id: "a", value: 2 }, { id: "b", value: 3 }], "merge").length, 2);
  const consistency = checkResultConsistency({ records: [...records, records[0]], schemas: [schema], presets: builtInResultPresets, leaderboards: [{ id: "bad", name: "Bad", filter: {}, groupBy: [], metrics: [{ key: "NOPE", higherIsBetter: true }], aggregate: "raw" }] });
  assert.equal(consistency.some((item) => item.id.startsWith("duplicate_result")), true);
  assert.equal(consistency.some((item) => item.id.startsWith("leaderboard_metric")), true);
});
