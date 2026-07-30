const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("plan workflow exposes validate dry-run and run through tunnel actions", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /validatePlan: "validate-plan"/);
  assert.match(source, /dryRunPlan: "dry-run-plan"/);
  assert.match(source, /runPlan: "run-plan"/);
  assert.match(source, /if \(PLAN_SUBMISSION_COMMANDS\.has\(command\)\)[\s\S]*runPlanPreflight\(body/);
  assert.match(source, /async runPlanPreflight\(body, label, authority = \{\}\)[\s\S]*postPlanSchedulerAction\("validate-plan"[\s\S]*\.\.\.authority[\s\S]*postPlanSchedulerAction\("dry-run-plan"[\s\S]*\.\.\.authority/);
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.match(html, /planFileInput/);
  assert.match(html, /data-command="validatePlan">校验<\/button>/);
  assert.match(html, /data-command="dryRunPlan" class="secondary">预演<\/button>/);
  assert.match(html, /data-command="runPlan" data-confirm="true">校验并提交运行<\/button>/);
});
