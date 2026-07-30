const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("operation terminal and result actions refresh results with planFile", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  const statusHelpers = source.match(/const OPERATION_TERMINAL_STATUSES[\s\S]*?function operationSubmissionAccepted/)?.[0] || "";
  const resultActions = source.match(/const RESULT_SUMMARY_AFFECTING_ACTIONS[\s\S]*?\]\);/)?.[0] || "";
  assert.match(source, /function operationResultPlanFile\(record\)/);
  assert.match(source, /async refreshResultsSummary\(planHint = ""\)/);
  assert.match(source, /const planHint = operationResultPlanFile\(this\.localOperations\[opId\]\);[\s\S]{0,240}await this\.refreshResultsSummary\(planHint\)/);
  assert.match(source, /const planHint = operationResultPlanFile\(finalResult\) \|\| body\?\.options\?\.planFile \|\| body\?\.planFile \|\| "";[\s\S]{0,240}await this\.refreshResultsSummary\(planHint\)/);
  assert.match(source, /const RESULT_PARSE_COMMANDS = new Set\(\["parseResults", "refreshResults"\]\)/);
  assert.match(source, /const IMMEDIATE_RESULT_SUMMARY_REFRESH_COMMANDS = new Set\(\[\s*\.\.\.RESULT_PARSE_COMMANDS,/);
  assert.match(source, /IMMEDIATE_RESULT_SUMMARY_REFRESH_COMMANDS\.has\(command\)/);
  assert.match(source, /!RESULT_PARSE_COMMANDS\.has\(command\)/);
  assert.doesNotMatch(source, /\["parseResults", "refreshResults", "runQualityGate"/);
  assert.match(source, /reconcileProjectPlanSelection\(plans\)/);
  assert.match(source, /const keys = new Set\(list\.flatMap\(\(plan\) => planIdentityKeys\(plan\)\)\)/);
  assert.match(source, /if \(this\.selectedPlanId && !keys\.has\(this\.selectedPlanId\)\)/);
  for (const name of [
    "OPERATION_TERMINAL_STATUSES",
    "OPERATION_FAILURE_TERMINAL_STATUSES",
    "OPERATION_CANCELLED_TERMINAL_STATUSES",
    "REMOTE_ACTION_PENDING_STATUSES",
    "LONG_RUNNING_OPERATION_ACTIONS",
  ]) assert.match(statusHelpers, new RegExp(`${name}\\.has`));
  assert.doesNotMatch(statusHelpers, /function operation(?:TerminalStatus|FailureTerminalStatus|CancelledTerminalStatus|LongRunningAction)[\s\S]{0,180}return new Set/);
  assert.match(source, /function actionAffectsResultsSummary\(action\) \{\s*return RESULT_SUMMARY_AFFECTING_ACTIONS\.has\(action\)/);
  // long-running run-plan should not block the UI wait loop by being treated as summary-wait action
  assert.doesNotMatch(resultActions, /"run-plan"/);
});
