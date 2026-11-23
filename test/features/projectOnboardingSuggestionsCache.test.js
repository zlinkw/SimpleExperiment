const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");
const ts = require("typescript");
require("../_helpers/registerTsRequire");
const Results = require("../../src/features/Results.legacy.ts");

const extension = readSource("src/extension.ts");

test("local result previews select CSV format from actual columns", async () => {
  const files = {
    "wide.csv": "dataset,method,seed,AP,macro_f1\nsynthetic,a,42,0.11,0.22\nsynthetic,b,42,0.44,0.55\n",
    "long.csv": "dataset,method,metric,value\nsynthetic,a,AP,0.11\n",
    "empty.csv": "dataset,method\nsynthetic,a\n",
    "mixed.csv": "dataset,method,AP\nsynthetic,a,\nsynthetic,b,0.44\n",
    "result.json": '{"results":[{"dimensions":{"method":"a"},"metrics":{"AP":0.11}}]}',
    "mapped.csv": "dataset,method,measure,amount\nsynthetic,a,average_precision,0\n",
  };
  const source = ts.createSourceFile("extension.ts", extension, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let fn;
  function find(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === "previewLocalResultFiles") fn = node;
    else ts.forEachChild(node, find);
  }
  find(source);
  assert.ok(fn, "local preview function exists");
  const sandbox = { path, fs: { stat: async () => ({ size: 100 }) }, Results_1: Results,
    resultPreviewTargets: (values) => values, readUtf8Preview: async (file) => files[path.basename(file)],
    errorMessage: (error) => String(error.message || error), Date };
  vm.createContext(sandbox);
  vm.runInContext(`${fn.getText(source)}\nthis.preview = previewLocalResultFiles;`, sandbox);
  const rows = await sandbox.preview("fixture", Object.keys(files).filter((file) => file !== "mapped.csv"), { csvColumnMapping: { dataset: "dataset", method: "method", seed: "seed" } });
  assert.equal(rows[0].format, "wide_csv");
  assert.equal(rows[0].records, 2);
  assert.deepEqual(Array.from(rows[0].sampleMetrics).sort(), ["AP", "macro_f1"]);
  assert.equal(rows[1].format, "long_csv");
  assert.equal(rows[1].records, 1);
  assert.equal(rows[2].parseable, false);
  assert.equal(rows[3].parseable, true);
  assert.equal(rows[3].records, 1);
  assert.deepEqual(Array.from(rows[3].sampleMetrics), ["AP"]);
  assert.equal(rows[4].format, "json");
  assert.equal(rows[4].records, 1);
  const [mapped] = await sandbox.preview("fixture", ["mapped.csv"], {
    csvColumnMapping: { dataset: "dataset", method: "method", metric: "measure", value: "amount" },
    metricAliases: { average_precision: "AP" },
  });
  assert.equal(mapped.format, "long_csv");
  assert.equal(mapped.records, 1);
  assert.deepEqual(Array.from(mapped.sampleMetrics), ["AP"]);
  const config = { columnMapping: { dataset: "dataset", method: "method", metric: "measure", value: "amount" } };
  const preset = { ...Results.selectResultPreset("mapped.csv", undefined, files["mapped.csv"], config), metricAliases: { average_precision: "AP" } };
  assert.equal(Results.previewResultParse(files["mapped.csv"], "mapped.csv", preset, config).sampleMetrics.AP.value, 0);
});

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

function loadSuggestions() {
  const sandbox = {
    EMPTY_PROJECT_ONBOARDING_SELECTION_PROJECT: Object.freeze({}),
    EMPTY_PROJECT_ONBOARDING_SELECTION_PLANS: Object.freeze([]),
    projectOnboardingSuggestionsForSelectionCache: null,
    suggestionCalls: 0,
    scopeCalls: 0,
    projectOnboardingSuggestions(options) {
      sandbox.suggestionCalls += 1;
      return [JSON.stringify(options)];
    },
    resolvePlanFileFromPlanList(plans, planFileInput, selectedPlanIds) {
      return String(planFileInput || selectedPlanIds[0] || "").trim();
    },
    samePlanSelection(left, right) { return String(left || "").trim() === String(right || "").trim(); },
    nestedRecord(record, key) {
      const value = record && record[key];
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    },
    arrayFromRecord(record, key) { return Array.isArray(record && record[key]) ? record[key] : []; },
    planScopedResultParsePreviews(previews, plan) {
      sandbox.scopeCalls += 1;
      return { items: previews.filter((row) => row.planFile === plan.planFile) };
    },
    planOutputEvidenceSignals(plan) { return Array.isArray(plan.outputSignals) ? plan.outputSignals : []; },
    planOutputEvidenceCandidates(plan) { return Array.isArray(plan.outputCandidates) ? plan.outputCandidates : []; },
    actionableAdapterRuleSignals(rules) { return rules.actionable === true; },
    resultPreviewHasRecords(row) { return Number(row.records || 0) > 0; },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("projectOnboardingSuggestionsForSelection")}\nthis.check = projectOnboardingSuggestionsForSelection;`, sandbox);
  return sandbox;
}

test("onboarding guidance directs result configuration to AI and MCP", () => {
  const sandbox = vm.createContext({});
  vm.runInContext(`${extractFunction("projectOnboardingSuggestions")}\nthis.suggest = projectOnboardingSuggestions;`, sandbox);
  for (const options of [
    { planCount: 1, hasActionableOutput: false, adapterConfig: "existing.yaml" },
    { planCount: 1, hasActionableOutput: false },
    { planCount: 1, hasActionableOutput: true, resultFileCount: 1, parseableResultCount: 0 },
  ]) {
    const text = sandbox.suggest(options).join(" ");
    assert.match(text, /AI/); assert.match(text, /MCP/);
    assert.doesNotMatch(text, /插件设置中配置|生成模板|请检查列映射/);
  }
});

function fixtures() {
  return {
    project: {
      adapterConfig: "experiments/simple_project.yaml",
      adapterRules: { actionable: false },
      resultParsePreviews: [
        { planFile: "a.yaml", records: 2 },
        { planFile: "b.yaml", records: 0 },
      ],
    },
    plans: [
      { planFile: "a.yaml", outputSignals: ["metrics"], outputCandidates: ["metrics.csv"] },
      { planFile: "b.yaml", outputSignals: ["metrics"], outputCandidates: ["metrics.csv"] },
    ],
  };
}

test("current Plan onboarding suggestions reuse stable project and selection inputs", () => {
  const sandbox = loadSuggestions();
  const { project, plans } = fixtures();
  const first = sandbox.check(project, plans, "a.yaml", "");

  assert.strictEqual(sandbox.check(project, plans, "a.yaml", ""), first);
  assert.equal(sandbox.scopeCalls, 1);
  assert.equal(sandbox.suggestionCalls, 1);
  assert.match(first[0], /"parseableResultCount":1/);

  const selected = sandbox.check(project, plans, "b.yaml", "");
  assert.notStrictEqual(selected, first);
  assert.equal(sandbox.scopeCalls, 2);
  assert.match(selected[0], /"parseableResultCount":0/);
});

test("project and Plan list replacements invalidate onboarding suggestions", () => {
  const sandbox = loadSuggestions();
  const { project, plans } = fixtures();
  const first = sandbox.check(project, plans, "a.yaml", "");
  const projectReplacement = sandbox.check({ ...project }, plans, "a.yaml", "");
  const plansReplacement = sandbox.check(project, [...plans], "a.yaml", "");

  assert.notStrictEqual(projectReplacement, first);
  assert.notStrictEqual(plansReplacement, projectReplacement);
  assert.equal(sandbox.scopeCalls, 3);
  assert.equal(sandbox.suggestionCalls, 3);
});

test("empty and unresolved Plan states remain cacheable without changing messages", () => {
  const sandbox = loadSuggestions();
  const empty = sandbox.check(undefined, undefined, "", "");
  assert.strictEqual(sandbox.check(null, null, "", ""), empty);
  assert.equal(sandbox.suggestionCalls, 1);

  const { project, plans } = fixtures();
  const unresolved = sandbox.check(project, plans, "", "");
  assert.strictEqual(sandbox.check(project, plans, "", ""), unresolved);
  assert.deepEqual(Array.from(unresolved), ["发现 2 个 Plan；请先明确选择本次要接入并运行的 Plan。"]);
  assert.equal(sandbox.scopeCalls, 0);
});

test("buildState keeps dynamic suggestions outside detected-project compaction", () => {
  const buildStateStart = extension.indexOf("private buildState(");
  const buildState = extension.slice(buildStateStart, extension.indexOf("\n    private ", buildStateStart + 1));
  assert.match(buildState, /missingOnboarding: projectOnboardingSuggestionsForSelection\(/);
  assert.match(extension, /let projectOnboardingSuggestionsForSelectionCache = null/);
});
