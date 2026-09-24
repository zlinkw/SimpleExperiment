const assert = require("node:assert/strict");
const test = require("node:test");
const tables = require("../../dist/results/ProjectResultTables.js");

const plan = "experiments/plans/comparison/demo.yaml";
function record(workerId, method, caseName, seed, endpoint, metric, value, rate = "0.3") {
  return {
    workerId,
    method,
    dimensions: { method, case: caseName, seed, dataset: "bus", train_rate: rate, eval_protocol: endpoint },
    sourceFiles: [{ path: "experiments/results/demo.csv" }],
    metrics: { [metric]: { value } },
  };
}
function summary(rows) {
  return {
    planFile: plan,
    planRevision: "rev1",
    workerResultTables: [
      { workerId: "w1", rawResultCsvPath: "experiments/results/demo.csv", aggregateStatus: "ready" },
      { workerId: "w2", rawResultCsvPath: "experiments/results/demo.csv", aggregateStatus: "ready" },
    ],
    results: rows,
  };
}

test("stale Agent result revision cannot replace a revised local Plan", () => {
  assert.equal(tables.summaryMatchesPlanRevision({ planRevision: "old" }, { revision: "new" }), false);
  assert.equal(tables.summaryMatchesPlanRevision({ planRevision: "new" }, { revision: "new" }), true);
  assert.equal(tables.summaryMatchesPlanRevision({}, { revision: "new" }), true);
});

test("global and method tables recompute seed means across Workers, deduplicate and mark incomplete", () => {
  const s = summary([
    record("w1", "demo", "bus_p30", 42, "clean", "acc", 0.2),
    record("w2", "demo", "bus_p30", 43, "clean", "acc", 0.4),
    record("w2", "demo", "bus_p30", 43, "clean", "acc", 0.4),
    record("w1", "demo", "bus_p30", 42, "clean", "loss", 0.5),
    record("w2", "demo", "bus_p30", 43, "clean", "loss", 0.3),
    { ...record("w1", "demo", "bus_p30", 42, "clean", "acc", 9), sourceFiles: [{ path: "work_dirs/stale/metrics.csv" }] },
  ]);
  const registry = tables.updateRegistry(tables.emptyTableRegistry(), s, plan, 5);
  const output = tables.buildTables(registry);
  assert.deepEqual(Object.keys(output).sort(), ["demo", "final"]);
  assert.equal(output.final.rows.length, 1);
  const row = output.final.rows[0];
  assert.equal(row[output.final.header.indexOf("jobs")], "2/5");
  assert.equal(row[output.final.header.indexOf("rate_percent")], "30");
  assert.equal(row[output.final.header.indexOf("acc_mean")], "");
  assert.equal(row[output.final.header.indexOf("acc_sd")], "");
  assert.equal(output.demo.rows.length, 1);
  assert.match(output.final.markdown, /2\/5/);
  assert.match(output.final.markdown, /—/);
});

test("a metric missing from one of five seeds cannot be published as a five-seed mean", () => {
  const rows = [42, 43, 44, 45, 46].flatMap((seed) => [
    record("w1", "corim", "corim_pad_p100", seed, "clean", "AUC", 0.8),
    ...(seed === 44 ? [] : [record("w1", "corim", "corim_pad_p100", seed, "clean", "precision_macro", 0.6)]),
  ]);
  const registry = tables.updateRegistry(tables.emptyTableRegistry(), summary(rows), plan, 5);
  const output = tables.buildTables(registry).final;
  const row = output.rows[0];
  assert.equal(row[output.header.indexOf("jobs")], "4/5");
  assert.equal(row[output.header.indexOf("roc_auc_mean")], 0.8);
  assert.equal(row[output.header.indexOf("precision_macro_mean")], "");
  assert.equal(row[output.header.indexOf("precision_macro_sd")], "");
});

test("same seed conflicting values block publication", () => {
  const registry = tables.updateRegistry(tables.emptyTableRegistry(), summary([
    record("w1", "demo", "bus_p30", 42, "clean", "acc", 0.2),
    record("w2", "demo", "bus_p30", 42, "clean", "acc", 0.4),
  ]), plan, 1);
  assert.throws(() => tables.buildTables(registry), /指标冲突/);
});

test("offline Worker and untrusted identity do not overwrite registry", () => {
  const offline = summary([record("w1", "demo", "bus_p30", 42, "clean", "acc", 0.2)]);
  offline.unavailableWorkerIds = ["w2"];
  assert.throws(() => tables.updateRegistry(tables.emptyTableRegistry(), offline, plan, 5), /Worker 离线/);
  const untrusted = summary([record("w1", "demo", "", 42, "clean", "acc", 0.2)]);
  assert.throws(() => tables.updateRegistry(tables.emptyTableRegistry(), untrusted, plan, 5), /case 或 seed/);
});

test("local rebuild merges ready Workers and retains earlier Worker records", () => {
  const previous = tables.updateRegistry(tables.emptyTableRegistry(), summary([
    record("w1", "demo", "bus_p30", 42, "clean", "acc", 0.2),
  ]), plan, 2);
  const partial = summary([
    record("w2", "demo", "bus_p30", 43, "clean", "acc", 0.4),
  ]);
  partial.workerResultTables[0].aggregateStatus = "no_declared_csv";
  partial.workerResultTables[0].rawResultCsvPath = "";
  partial.unavailableWorkerIds = ["w3"];
  partial.incompleteAggregate = true;
  const merged = tables.mergeAvailableWorkerResults(previous, partial, plan, 2);
  assert.deepEqual(merged.plans[plan].records.map((row) => row.workerId).sort(), ["w1", "w2"]);
  assert.equal(tables.buildTables(merged).final.rows.length, 1);
  assert.strictEqual(tables.mergeAvailableWorkerResults(previous, { ...partial, results: [] }, plan, 2), previous);
});

test("CSV splitting supports manual value and column selection with quoted cells", () => {
  const source = tables.writeCsv(["result_family", "rate_percent", "note", "acc_mean"], [
    ["demo", "0", "a,b", 0.1],
    ["demo", "30", "a\nb", 0.2],
    ["demo", "70", "x", 0.3],
  ]);
  const split = tables.splitCsvByValues(source, "rate_percent", ["0", "30"], ["rate_percent", "note", "acc_mean"]);
  assert.deepEqual(Object.keys(split), ["0", "30"]);
  assert.deepEqual(tables.readCsv(split["0"]).rows[0], ["0", "a,b", "0.1"]);
  assert.deepEqual(tables.readCsv(split["30"]).rows[0], ["30", "a\nb", "0.2"]);
  assert.throws(() => tables.splitCsvByValues(source, "missing", ["0"], []), /不存在/);
  assert.throws(() => tables.splitCsvByValues(source, "rate_percent", ["0"], []), /保留列无效/);
});

test("optional endpoint difference uses paired seeds and a separate output column", () => {
  const registry = tables.updateRegistry(tables.emptyTableRegistry(), summary([
    record("w1", "demo", "bus_p30", 42, "clean", "AUC", 0.8),
    record("w1", "demo", "bus_p30", 42, "p100_low", "AUC", 0.7),
    record("w2", "demo", "bus_p30", 43, "clean", "AUC", 0.9),
    record("w2", "demo", "bus_p30", 43, "p100_low", "AUC", 0.6),
  ]), plan, 2);
  registry.derivedMetric = { metric: "AUC", leftEndpoint: "clean", rightEndpoint: "p100_low", outputName: "ba_drop_pp", scale: 100 };
  const result = tables.buildTables(registry).final;
  assert.equal(result.rows.length, 2);
  assert.ok(result.header.includes("roc_auc_mean"));
  assert.ok(result.header.includes("ba_drop_pp_mean"));
  assert.ok(Math.abs(result.rows[0][result.header.indexOf("ba_drop_pp_mean")] - 20) < 1e-12);
});

test("global final includes multiple Plans and keeps a method named final in its own folder", () => {
  const first = tables.updateRegistry(tables.emptyTableRegistry(), summary([
    record("w1", "demo", "bus_p30", 42, "clean", "acc", 0.2),
  ]), plan, 1);
  const secondPlan = "experiments/plans/final.yaml";
  const other = { ...summary([record("w1", "final", "bus_p70", 42, "clean", "acc", 0.9, "0.7")]), planFile: secondPlan };
  const registry = tables.updateRegistry(first, other, secondPlan, 1);
  const output = tables.buildTables(registry);
  assert.deepEqual(Object.keys(output).sort(), ["_method_final", "demo", "final"]);
  assert.equal(output.final.rows.length, 2);
  assert.equal(output._method_final.rows.length, 1);
});
