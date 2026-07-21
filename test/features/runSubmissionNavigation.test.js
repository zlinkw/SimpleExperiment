const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

test("all accepted Plan submissions open the current task monitor", () => {
  const start = extension.indexOf("async runActionCommand(command, message)");
  const end = extension.indexOf("async runPlanPreflight(body, label)", start);
  assert.ok(start >= 0 && end > start);
  const source = extension.slice(start, end);
  const post = source.indexOf("const result = await this.postTunnelAction(action, body");
  const navigate = source.indexOf('if (command === "runPlan" || command === "reproducePlan")', post);
  const throwPending = source.indexOf("this.throwIfRemoteActionPending(command, action, finalResult)");

  assert.ok(post >= 0);
  assert.ok(navigate > post);
  assert.ok(throwPending > navigate);
  assert.match(source.slice(navigate, throwPending), /await this\.openPanelAt\("tasks", "tasks-list"\)/);
});

test("submission navigation does not replace preflight blocking", () => {
  const start = extension.indexOf("async runActionCommand(command, message)");
  const end = extension.indexOf("async runPlanPreflight(body, label)", start);
  const source = extension.slice(start, end);
  assert.ok(source.indexOf("await this.runPlanPreflight(body, \"当前计划\")") < source.indexOf("const result = await this.postTunnelAction(action, body"));
  assert.match(source, /if \(!await this\.runPlanPreflight\(body, "当前计划"\)\)\s*return;/);
});
