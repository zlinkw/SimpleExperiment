const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

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

function loadPreviewScope() {
  const sandbox = {
    EMPTY_OUTPUT_DERIVATION_SOURCE: Object.freeze({}),
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    planScopedResultCandidateCache: new WeakMap(),
    planScopedResultPreviewCache: new WeakMap(),
    compileCalls: 0,
    matchCalls: 0,
    planOutputEvidenceCandidates(plan) { return Array.isArray((plan || {}).outputCandidates) ? plan.outputCandidates : []; },
    adapterRuleResultCandidates(rules) { return Array.isArray((rules || {}).candidateCsv) ? rules.candidateCsv : []; },
    uniqueStrings(values) { return [...new Set(values.filter(Boolean))]; },
    compileResultCandidatePatterns(candidates) {
      sandbox.compileCalls += 1;
      return { candidates: new Set(candidates.map((item) => String(item).toLowerCase())) };
    },
    compiledResultCandidatesMatchFile(compiled, file) {
      sandbox.matchCalls += 1;
      return compiled.candidates.has(String(file || "").toLowerCase());
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(`${extractFunction("planScopedResultParsePreviews")}\nthis.scope = planScopedResultParsePreviews;`, sandbox);
  return sandbox;
}

function extractPanelFunction(name) {
  const start = panel.indexOf("function " + name + "(");
  assert.ok(start >= 0, "missing panel " + name);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error("unterminated panel " + name);
}

function loadFrontendPreviewScope() {
  const sandbox = {
    EMPTY_OUTPUT_DERIVATION_SOURCE: Object.freeze({}),
    EMPTY_OUTPUT_DERIVATION_VALUES: Object.freeze([]),
    planScopedResultCandidateCache: new WeakMap(),
    planScopedResultPreviewCache: new WeakMap(),
    compileCalls: 0,
    matchCalls: 0,
    asArray(value) { return Array.isArray(value) ? value : []; },
    planOutputEvidenceCandidates(plan) { return Array.isArray((plan || {}).outputCandidates) ? plan.outputCandidates : []; },
    adapterRuleResultCandidates(rules) { return Array.isArray((rules || {}).candidateCsv) ? rules.candidateCsv : []; },
    uniqueText(values) { return [...new Set(values.filter(Boolean))]; },
    compileResultCandidatePatterns(candidates) {
      sandbox.compileCalls += 1;
      return { candidates: new Set(candidates.map((item) => String(item).toLowerCase())) };
    },
    compiledResultCandidatesMatchFile(compiled, file) {
      sandbox.matchCalls += 1;
      return compiled.candidates.has(String(file || "").toLowerCase());
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(extractPanelFunction("planScopedResultParsePreviews") + "\nthis.scope = planScopedResultParsePreviews;", sandbox);
  return sandbox;
}

test("Plan-scoped candidate compilation is reused while preview rows stay current", () => {
  const sandbox = loadPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: ["shared/reference.csv"] };

  const first = sandbox.scope([
    { file: "runs/a.csv" },
    { file: "runs/b.csv" },
  ], plan, rules);
  assert.deepEqual(JSON.parse(JSON.stringify(first.items)), [{ file: "runs/a.csv" }]);
  assert.equal(first.candidateCount, 2);
  assert.equal(sandbox.compileCalls, 1);

  const second = sandbox.scope([
    { file: "shared/reference.csv" },
    { file: "runs/c.csv" },
  ], plan, rules);
  assert.deepEqual(JSON.parse(JSON.stringify(second.items)), [{ file: "shared/reference.csv" }]);
  assert.equal(second.totalCount, 2);
  assert.equal(second.hiddenCount, 1);
  assert.equal(sandbox.compileCalls, 1);
});

test("Plan or rules replacement invalidates the compiled candidate cache", () => {
  const sandbox = loadPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: ["shared/reference.csv"] };

  sandbox.scope([], plan, rules);
  sandbox.scope([], { ...plan, outputCandidates: [...plan.outputCandidates] }, rules);
  sandbox.scope([], plan, { candidateCsv: [...rules.candidateCsv] });
  assert.equal(sandbox.compileCalls, 3);
});

test("Plan-scoped preview filtering reuses one stable preview snapshot", () => {
  const sandbox = loadPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: [] };
  const previews = [{ file: "runs/a.csv" }, { file: "runs/b.csv" }];
  const first = sandbox.scope(previews, plan, rules);
  const matchCalls = sandbox.matchCalls;

  assert.strictEqual(sandbox.scope(previews, plan, rules), first);
  assert.equal(sandbox.matchCalls, matchCalls);
  assert.notStrictEqual(sandbox.scope([...previews], plan, rules), first);
});

test("missing rules reuse the shared empty source without changing unscoped behavior", () => {
  const sandbox = loadPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  sandbox.scope([], plan, undefined);
  sandbox.scope([{ file: "runs/a.csv" }], plan, null);
  assert.equal(sandbox.compileCalls, 1);

  const unscopedRows = [{ file: "runs/a.csv" }];
  const unscoped = sandbox.scope(unscopedRows, undefined, undefined);
  assert.equal(unscoped.scoped, false);
  assert.equal(unscoped.items.length, 1);
  assert.equal(sandbox.compileCalls, 1);
  assert.match(extension, /const planScopedResultCandidateCache = new WeakMap\(\)/);
  assert.match(extension, /const planScopedResultPreviewCache = new WeakMap\(\)/);
});

test("frontend Plan-scoped candidate compilation is reused while preview rows stay current", () => {
  const sandbox = loadFrontendPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: ["shared/reference.csv"] };

  const first = sandbox.scope([{ file: "runs/a.csv" }], plan, rules);
  const second = sandbox.scope([{ file: "shared/reference.csv" }], plan, rules);
  assert.deepEqual(JSON.parse(JSON.stringify(first.items)), [{ file: "runs/a.csv" }]);
  assert.deepEqual(JSON.parse(JSON.stringify(second.items)), [{ file: "shared/reference.csv" }]);
  assert.equal(sandbox.compileCalls, 1);
});

test("frontend Plan or rules replacement invalidates the compiled candidate cache", () => {
  const sandbox = loadFrontendPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: ["shared/reference.csv"] };

  sandbox.scope([], plan, rules);
  sandbox.scope([], { ...plan, outputCandidates: [...plan.outputCandidates] }, rules);
  sandbox.scope([], plan, { candidateCsv: [...rules.candidateCsv] });
  assert.equal(sandbox.compileCalls, 3);
});

test("frontend Plan-scoped preview filtering reuses one stable preview snapshot", () => {
  const sandbox = loadFrontendPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  const rules = { candidateCsv: [] };
  const previews = [{ file: "runs/a.csv" }, { file: "runs/b.csv" }];
  const first = sandbox.scope(previews, plan, rules);
  const matchCalls = sandbox.matchCalls;

  assert.strictEqual(sandbox.scope(previews, plan, rules), first);
  assert.equal(sandbox.matchCalls, matchCalls);
  assert.notStrictEqual(sandbox.scope([...previews], plan, rules), first);
});

test("frontend missing rules reuse the shared empty source without changing unscoped behavior", () => {
  const sandbox = loadFrontendPreviewScope();
  const plan = { planFile: "experiments/plans/a.yaml", outputCandidates: ["runs/a.csv"] };
  sandbox.scope([], plan, undefined);
  sandbox.scope([{ file: "runs/a.csv" }], plan, null);
  const unscoped = sandbox.scope([{ file: "runs/a.csv" }], undefined, undefined);

  assert.equal(sandbox.compileCalls, 1);
  assert.equal(unscoped.scoped, false);
  assert.equal(unscoped.items.length, 1);
  assert.match(panel, /const planScopedResultCandidateCache = new WeakMap\(\)/);
  assert.match(panel, /const planScopedResultPreviewCache = new WeakMap\(\)/);
});
