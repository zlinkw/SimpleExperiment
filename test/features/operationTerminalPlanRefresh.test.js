const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("operation terminal and result actions refresh results with planFile", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(source, /function operationResultPlanFile\(record\)/);
  assert.match(source, /async refreshResultsSummary\(planHint = ""\)/);
  assert.match(source, /const planHint = operationResultPlanFile\(this\.localOperations\[opId\]\);[\s\S]{0,240}await this\.refreshResultsSummary\(planHint\)/);
  assert.match(source, /const planHint = operationResultPlanFile\(finalResult\) \|\| body\?\.options\?\.planFile \|\| body\?\.planFile \|\| "";[\s\S]{0,240}await this\.refreshResultsSummary\(planHint\)/);
  assert.match(source, /\["parseResults", "refreshResults", "runQualityGate"/);
  assert.match(source, /reconcileProjectPlanSelection\(plans\)/);
  assert.match(source, /const keys = new Set\(list\.flatMap\(\(plan\) => planIdentityKeys\(plan\)\)\)/);
  assert.match(source, /if \(this\.selectedPlanId && !keys\.has\(this\.selectedPlanId\)\)/);
  // long-running run-plan should not block the UI wait loop by being treated as summary-wait action
  assert.doesNotMatch(source, /function actionAffectsResultsSummary\(action\) \{\s*return new Set\(\[\s*"run-plan"/);
});
