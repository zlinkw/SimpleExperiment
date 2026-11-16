const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const extension = readSource("src/extension.ts");

function extractFunction(name) {
  const start = extension.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = extension.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < extension.length; index += 1) {
    if (extension[index] === "{") depth += 1;
    if (extension[index] === "}") depth -= 1;
    if (depth === 0) return extension.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function trackedMetrics(values) {
  let iterations = 0;
  return {
    values: {
      [Symbol.iterator]() {
        iterations += 1;
        return values[Symbol.iterator]();
      },
    },
    iterations: () => iterations,
  };
}

test("project metrics split classification and segmentation in one traversal", () => {
  const sandbox = { SEGMENTATION_PROJECT_METRIC_PATTERN: /dice|dsc|iou|hd95|asd|hausdorff/i };
  vm.createContext(sandbox);
  const source = extractFunction("partitionProjectMetrics");
  assert.doesNotMatch(source, /normalizedMetrics\.(?:filter|map)\(/);
  vm.runInContext(`${source}\nthis.partition = partitionProjectMetrics;`, sandbox);
  const metrics = trackedMetrics(["AUC", "Dice", "mean_IoU", "HD95", "specificity", "hausdorff95", "ASD_score", "DSC"]);
  const groups = sandbox.partition(metrics.values);

  assert.equal(metrics.iterations(), 1);
  assert.deepEqual(Array.from(groups.classification), ["AUC", "specificity"]);
  assert.deepEqual(Array.from(groups.segmentation), ["Dice", "mean_IoU", "HD95", "hausdorff95", "ASD_score", "DSC"]);
});

test("project adapter inference retains observed groups without guessing primary or additional metrics", async () => {
  const source = extractFunction("inferProjectAdapterRules");
  assert.match(source, /const metricGroups = partitionProjectMetrics\(normalizedMetrics\)/);
  const sandbox = { path, readUtf8Preview: async () => 'data', configEvidenceText: () => 'data',
    task: '', extractYamlStringValues: (_text, key) => key === 'task' ? [sandbox.task] : [],
    extractYamlListValues: () => ['AP', 'weighted_f1', 'Dice'], inferResultFileCandidatesFromConfig: () => [],
    uniqueStrings: rows => [...new Set(rows)], normalizeMetricName: value => value,
    partitionProjectMetrics: rows => ({ classification: rows.filter(x => x !== 'Dice'), segmentation: rows.filter(x => x === 'Dice') }),
    defaultMetricAliases: () => ({}), PlanBuilder_1: {}, dedupOutputCandidates: rows => rows };
  vm.createContext(sandbox);
  vm.runInContext(`async ${source}\n${extractFunction('mergeProjectAdapterRules')}\nthis.infer = inferProjectAdapterRules; this.merge = mergeProjectAdapterRules;`, sandbox);
  for (const task of ['classification', 'segmentation', 'regression']) {
    sandbox.task = task;
    const inferred = await sandbox.infer('/project', ['config.yaml'], { files: [], symbols: [], multimodalHints: [] }, []);
    assert.equal(inferred.primaryMetric, '');
    assert.deepEqual(Array.from(inferred.secondaryMetrics), []);
    assert.deepEqual(Array.from(inferred.classificationMetrics), ['AP', 'weighted_f1']);
    assert.deepEqual(Array.from(inferred.segmentationMetrics), ['Dice']);
    const explicit = sandbox.merge({ taskType: task, primaryMetric: 'macro_f1', secondaryMetrics: ['AP'] }, inferred);
    assert.equal(explicit.primaryMetric, 'macro_f1');
    assert.deepEqual(Array.from(explicit.secondaryMetrics), ['AP']);
  }
});
