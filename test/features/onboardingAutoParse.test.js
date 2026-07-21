const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("onboarding actions queue plan-scoped result parse", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(source, /queuePlanScopedResultParse\(reason, planFile, planId\)/);
  assert.match(source, /queuePlanScopedResultParse\("切换计划"/);
  assert.match(source, /queuePlanScopedResultParse\("生成计划模板"/);
  assert.match(source, /queueResultParseAfterProjectChange\("生成输出接入模板"/);
  assert.match(source, /queueResultParseAfterProjectChange\("保存接入规则"/);
  assert.match(source, /runActionCommand\("parseResults"/);
});
