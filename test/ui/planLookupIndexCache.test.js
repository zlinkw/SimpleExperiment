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

function loadLookup() {
  const sandbox = {
    EMPTY_PLAN_ROWS_FOR_LOOKUP: [],
    planLookupIndexCacheSource: null,
    planLookupIndexCacheValue: new Map(),
  };
  vm.createContext(sandbox);
  vm.runInContext([
    extractFunction("planLookupIndexForState"),
    extractFunction("planFromContext"),
    "this.indexFor = planLookupIndexForState;",
    "this.lookup = planFromContext;",
  ].join("\n"), sandbox);
  return sandbox;
}

test("Plan lookup index reuses source arrays and invalidates on replacement", () => {
  const sandbox = loadLookup();
  let reads = 0;
  const plan = (file, id) => ({
    get planFile() { reads += 1; return file; },
    get planId() { reads += 1; return id; },
  });
  const firstPlan = plan("plans/a.yaml", "a");
  const duplicate = plan("plans/a.yaml", "duplicate");
  const source = [firstPlan, duplicate, plan("plans/b.yaml", "b")];
  const state = { plans: source };

  const firstIndex = sandbox.indexFor(state);
  const firstReadCount = reads;
  assert.equal(sandbox.lookup(state, { planFile: "plans/a.yaml" }), firstPlan);
  assert.equal(sandbox.lookup(state, { planId: "b" }).planId, "b");
  assert.equal(sandbox.indexFor(state), firstIndex);
  assert.equal(reads, firstReadCount + 1);

  const nextPlan = plan("plans/c.yaml", "c");
  const nextState = { plans: [nextPlan] };
  assert.notEqual(sandbox.indexFor(nextState), firstIndex);
  assert.equal(sandbox.lookup(nextState, { planId: "c" }), nextPlan);
  assert.equal(sandbox.lookup(nextState, { planId: "a" }), undefined);
});

test("Plan lookup preserves first-row priority across distinct context keys", () => {
  const sandbox = loadLookup();
  const first = { planFile: "plans/first.yaml", planId: "first" };
  const second = { planFile: "plans/second.yaml", planId: "second" };
  const state = { plans: [first, second] };
  assert.equal(sandbox.lookup(state, { planFile: "plans/second.yaml", planId: "first" }), first);
  assert.equal(sandbox.lookup({ plans: [], recentPlans: [second] }, { planId: "second" }), second);
});
