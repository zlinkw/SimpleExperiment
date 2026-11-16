const test = require("node:test");
const assert = require("node:assert/strict");

const { importLegacyPlanYamlToRegistry } = require("../dist/features/PlanBuilder.js");
const { readSource } = require("./_helpers/sourceReader");
const {
  buildCompletenessMatrix,
  completenessMatrixToCsv,
  completenessMatrixToMarkdown,
  generateMissingOnlyRerunPlan,
  normalizeSmallScaleSettings,
} = require("../dist/features/SmallScale.js");

function resultRecord(experimentId, metrics = { DSC: { value: 0.9 } }, extra = {}) {
  return {
    schemaVersion: 1,
    resultId: `r_${experimentId}`,
    experimentId,
    runKey: `method-ours_dataset-VinDr_split-test_seed-${extra.seed || 42}`,
    suite: "smoke",
    experimentName: experimentId,
    status: "parsed",
    sourceFiles: [{ path: "metrics_summary.csv", type: "csv", endpoint: "local" }],
    metrics,
    dimensions: { method: "ours", dataset: "VinDr", split: "test", seed: extra.seed || 42 },
    primaryMetric: "DSC",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    provenance: {},
    ...extra,
  };
}

test("small scale settings force file registry and cap concurrency", () => {
  const settings = normalizeSmallScaleSettings({ scaleMode: "custom", maxConcurrentExperiments: 99, enableExternalDatabase: true, enableHeavyIndexing: true, useFileBasedRegistryOnly: false });
  assert.equal(settings.maxConcurrentExperiments, 10);
  assert.equal(settings.useFileBasedRegistryOnly, true);
  assert.equal(settings.enableExternalDatabase, false);
  assert.equal(settings.enableHeavyIndexing, false);
});

test("completeness matrix finds missing results and metrics", () => {
  const plan = importLegacyPlanYamlToRegistry("experiments/plans/smoke.yaml", [
    "suite: smoke",
    "cases:",
    "  - name: method-ours_dataset-VinDr_split-test_seed-42",
    "  - name: method-ours_dataset-VinDr_split-test_seed-43",
    "  - name: method-ours_dataset-VinDr_split-test_seed-44",
  ].join("\n"));
  const results = [
    resultRecord(plan.plannedExperiments[0].experimentKey, { DSC: { value: 0.9 } }, { seed: 42 }),
    resultRecord(plan.plannedExperiments[1].experimentKey, {}, { seed: 43 }),
  ];
  const cells = buildCompletenessMatrix({
    id: "m",
    name: "matrix",
    scope: { planId: plan.planId },
    axes: ["method", "dataset", "split", "seed"],
    requiredMetrics: ["DSC"],
  }, { plans: [plan], results, lifecycles: [{ experimentId: plan.plannedExperiments[2].experimentKey, status: "completed" }] });
  assert.equal(cells.some((cell) => cell.status === "ready_for_analysis"), true);
  assert.ok(cells.some((cell) => cell.missingMetrics.includes("DSC")));
  assert.equal(cells.some((cell) => cell.status === "completed_no_result"), true);
  assert.match(completenessMatrixToMarkdown(cells), /ready_for_analysis/);
  assert.match(completenessMatrixToCsv(cells), /DSC/);
});

test("completeness matrix groups scoped results once and preserves result order", () => {
  const source = readSource("src/features/SmallScale.ts");
  const body = source.match(/export function buildCompletenessMatrix[\s\S]*?\n}\n\nexport function completenessMatrixToMarkdown/)?.[0] || "";
  assert.match(body, /const resultKeys = new Map<string, ExperimentResultRecord\[\]>/);
  assert.match(body, /const plannedItems = planKeys\.get\(key\)/);
  assert.match(body, /if \(plannedItems\) plannedItems\.push\(item\)/);
  assert.doesNotMatch(body, /planKeys\.set\(key, \[\.\.\.\(planKeys\.get\(key\)/);
  assert.match(body, /for \(const record of input\.results \|\| \[\]\)/);
  assert.match(body, /const records = resultKeys\.get\(key\) \|\| \[\]/);
  assert.doesNotMatch(body, /resultRows|\.filter\(\(row\) => row\.key === key\)/);

  const cells = buildCompletenessMatrix({
    id: "grouped",
    name: "grouped",
    scope: { suite: "keep" },
    axes: ["method"],
    requiredMetrics: [],
  }, {
    results: [
      resultRecord("e2", {}, { resultId: "r2", suite: "keep", dimensions: { method: "ours" } }),
      resultRecord("e1", {}, { resultId: "r1", suite: "keep", dimensions: { method: "ours" } }),
      resultRecord("ignored", {}, { resultId: "ignored", suite: "drop", dimensions: { method: "ours" } }),
      resultRecord("e3", {}, { resultId: "r3", suite: "keep", runKey: "method-baseline_dataset-VinDr_split-test_seed-42", dimensions: { method: "baseline" } }),
    ],
  });
  assert.deepEqual(cells.map((cell) => [cell.key.method, cell.resultIds]), [
    ["baseline", ["r3"]],
    ["ours", ["r2", "r1"]],
  ]);
});

test("completeness matrix indexes lifecycles without duplicate cell matches", () => {
  const source = readSource("src/features/SmallScale.ts");
  const body = source.match(/export function buildCompletenessMatrix[\s\S]*?\n}\n\nexport function completenessMatrixToMarkdown/)?.[0] || "";
  assert.match(body, /const lifecyclesByExperiment = new Map/);
  assert.doesNotMatch(body, /\(input\.lifecycles \|\| \[\]\)\.filter/);

  const plan = importLegacyPlanYamlToRegistry("indexed.yaml", "suite: indexed\ncases:\n  - name: method-ours_seed-1\n");
  plan.plannedExperiments.push({ ...plan.plannedExperiments[0] });
  const lifecycleCells = buildCompletenessMatrix({
    id: "lifecycle-indexed",
    name: "lifecycle-indexed",
    scope: { planId: plan.planId },
    axes: ["method"],
    requiredMetrics: [],
  }, {
    plans: [plan],
    lifecycles: [
      { experimentId: "ignored", status: "completed" },
      { experimentId: plan.plannedExperiments[0].experimentKey, status: "running" },
    ],
  });
  assert.equal(lifecycleCells[0].status, "running");
});

test("missing-only rerun plan generates only selected missing cells", () => {
  const cells = [
    { key: { method: "ours", seed: 1 }, status: "ready_for_analysis", experimentIds: ["e1"], resultIds: ["r1"] },
    { key: { method: "ours", seed: 2 }, status: "completed_no_result", experimentIds: ["e2"], resultIds: [] },
    { key: { method: "ours", seed: 3 }, status: "parse_failed", experimentIds: ["e3"], resultIds: ["r3"] },
  ];
  const plan = generateMissingOnlyRerunPlan(cells, { sourcePlanId: "p1", missingTypes: ["completed_no_result"], skipLockedResults: true, keepSameSeed: true, keepSameSplit: true, generateNewAttemptId: true });
  assert.equal(plan.experimentCount, 1);
  assert.equal(plan.provenance.parentPlanId, "p1");
});
