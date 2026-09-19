const assert = require("node:assert/strict");
const test = require("node:test");
const vm = require("node:vm");
const { readSource } = require("../_helpers/sourceReader");

const panel = readSource("src/ui/PanelHtml.ts");
const start = panel.indexOf("function planVisibleRows(");
assert.ok(start >= 0);
const end = panel.indexOf("function planIdentity(", start);
assert.ok(end > start);
const source = panel.slice(start, end);
const sandbox = {
  PLAN_RENDER_LIMIT: 30,
  asArray: (value) => Array.isArray(value) ? value : [],
  planMatchesSelection: (state, plan) => state.planFileInput === plan.file,
  planIdentity: (plan) => plan.file,
};
vm.createContext(sandbox);
vm.runInContext(source + "\nthis.visible = planVisibleRows;", sandbox);

test("selected Plan card moves to first position even below render limit", () => {
  const plans = Array.from({ length: 19 }, (_, i) => ({ file: `plan-${i}.yaml` }));
  const rows = sandbox.visible({ planFileInput: "plan-1.yaml" }, plans);
  assert.equal(rows[0].plan.file, "plan-1.yaml");
  assert.equal(rows[1].plan.file, "plan-0.yaml");
  assert.equal(rows.length, 19);
});

test("unselected Plan cards keep scan order", () => {
  const plans = Array.from({ length: 19 }, (_, i) => ({ file: `plan-${i}.yaml` }));
  const rows = sandbox.visible({ planFileInput: "plan-5.yaml" }, plans);
  assert.deepEqual(Array.from(rows, (row) => row.plan.file).slice(0, 5),
    ["plan-5.yaml", "plan-0.yaml", "plan-1.yaml", "plan-2.yaml", "plan-3.yaml"]);
});
