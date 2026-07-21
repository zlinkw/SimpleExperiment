const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("operation terminal and run actions refresh results with planFile", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(source, /function operationResultPlanFile\(record\)/);
  assert.match(source, /async refreshResultsSummary\(planHint = ""\)/);
  assert.match(source, /await this\.refreshResultsSummary\(operationResultPlanFile\(this\.localOperations\[opId\]\)\)/);
  assert.match(source, /await this\.refreshResultsSummary\(operationResultPlanFile\(finalResult\) \|\| body\?\.options\?\.planFile \|\| body\?\.planFile \|\| ""\)/);
  assert.match(source, /\["runPlan", "reproducePlan", "parseResults"/);
  assert.match(source, /if \(selected && plans\.some\(\(plan\) => usableSelectionKey\(plan\.planFile \|\| plan\.file \|\| ""\) === selected\)\)\s*await this\.refreshResultsSummary\(selected\);/);
  // long-running run-plan should not block the UI wait loop by being treated as summary-wait action
  assert.doesNotMatch(source, /function actionAffectsResultsSummary\(action\) \{\s*return new Set\(\[\s*"run-plan"/);
});
