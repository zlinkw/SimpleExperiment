const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");
const panel = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
const extension = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");

test("plan selection owns the YAML preview and uses one checkbox control", () => {
  assert.match(panel, /shouldKeepPlanPreviewDraft\(state\)/);
  assert.match(panel, /samePlanSelection\(editor\.dataset\.planFile[^)]*, selectedPlan\)/);
  assert.match(panel, /data-plan-preview="true" data-plan-file=/);
  assert.match(panel, /function planMatchesSelection[\s\S]{0,500}samePlanSelection/);
  assert.doesNotMatch(panel, /<button class="taskActionButton" data-command="selectPlan"/);
  assert.match(panel, /type="checkbox" data-command="selectPlan"/);
  assert.match(extension, /const selected = \(plan\) => planIdentityKeys\(plan\)\.some\(\(key\) => selectedPlanKeys\.some\(\(selectedKey\) => samePlanSelection\(key, selectedKey\)\)\)/);
});

test("worker onboarding status stays a compact rectangular label", () => {
  assert.match(panel, /\.serverObjectMeta \.pill \{[^}]*white-space: nowrap;[^}]*overflow-wrap: normal;[^}]*border-radius: 6px;/);
  assert.match(panel, /meta: \["待接入"\]/);
});
