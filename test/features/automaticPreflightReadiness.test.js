const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

test("run gate presents automatic sync validation and dry-run as informational", () => {
  assert.match(panel, /\["同步代码", syncReady \? "good" : "info"/);
  assert.match(panel, /"运行时自动同步"/);
  assert.match(panel, /\["校验预演", \(preflight \|\| \{\}\)\.tone/);
  assert.match(panel, /badge: "自动校验预演"/);
  assert.match(panel, /任务 " \+ .* \+ " \/ 运行时继续预演"/);
  assert.match(panel, /\.planGateItem\.info \.planGateDot/);
});

test("automatic preflight remains ordered and failures remain blocking evidence", () => {
  const start = extension.indexOf("async runPlanPreflight(body, label, authority = {})");
  const end = extension.indexOf("async openSetupGuide()", start);
  const flow = extension.slice(start, end);
  assert.ok(flow.indexOf('postPlanSchedulerAction("validate-plan"') < flow.indexOf('postPlanSchedulerAction("dry-run-plan"'));
  assert.match(panel, /operationIsFailureLike\(dryRun\.status\).*tone: "error"/s);
  assert.match(panel, /operationIsFailureLike\(validate\.status\).*tone: "error"/s);
  assert.match(panel, /tone === "error" \? "status-failed"/);
});
