const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

function extractFunction(name) {
  const start = panel.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing ${name}`);
  const body = panel.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < panel.length; index += 1) {
    if (panel[index] === "{") depth += 1;
    if (panel[index] === "}") depth -= 1;
    if (depth === 0) return panel.slice(start, index + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function loadEquivalence() {
  const sandbox = {
    PLAN_FILE_EQUIVALENCE_CACHE_LIMIT: 2,
    EMPTY_PLAN_FILE_EQUIVALENCE_ENTRY: { keys: [], keySet: new Set() },
    planFileEquivalenceCache: new Map(),
    normalizePlanSelectionKey(value) {
      const normalized = String(value || "").trim().replace(/\\/g, "/");
      return normalized.startsWith("./") ? normalized.slice(2) : normalized;
    },
    uniqueText(values) {
      return [...new Set(values.filter(Boolean))];
    },
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("planFileEquivalenceEntry"),
    extractFunction("planFileEquivalenceKeys"),
    extractFunction("samePlanSelection"),
    "this.keys = planFileEquivalenceKeys;",
    "this.same = samePlanSelection;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("Plan equivalence keys reuse normalized entries and stay bounded", () => {
  const sandbox = loadEquivalence();
  const first = sandbox.keys("Experiments\\Plans\\A.YAML");
  const equivalent = sandbox.keys("./experiments/plans/a.yaml");
  assert.equal(first, equivalent);
  assert.equal(first.join("|"), "experiments/plans/a.yaml|a.yaml|a");
  assert.equal(sandbox.same("plans/a.yml", "A"), true);
  assert.equal(sandbox.same("", "A"), false);

  sandbox.keys("plans/b.yaml");
  sandbox.keys("plans/c.yaml");
  assert.ok(sandbox.planFileEquivalenceCache.size <= 2);
});

test("Plan selection comparison reuses cached key sets", () => {
  const entry = extractFunction("planFileEquivalenceEntry");
  const compare = extractFunction("samePlanSelection");
  assert.match(entry, /keySet: new Set\(keys\)/);
  assert.match(entry, /PLAN_FILE_EQUIVALENCE_CACHE_LIMIT/);
  assert.doesNotMatch(compare, /new Set\(/);
  assert.match(compare, /rightEntry\.keySet\.has\(key\)/);
});
