const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("capability-driven UI disables missing agent features before click", () => {
  const source = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.match(source, /runPlan:\s*\["actions\.run-plan"\]/);
  assert.match(source, /refreshResults:\s*\["actions\.refresh-results",\s*"endpoints\.resultsSummary"\]/);
  assert.match(source, /downloadDebugBundle:\s*\["endpoints\.fileDownload"\]/);
  assert.match(source, /const keys = uiCapabilityMap\[command\] \|\| \[\];\s*const missing = keys\.filter\(\(key\) => !hasCapability\(state, key\)\);/);
  assert.match(source, /return Boolean\(endpoints\.actions && actionEndpoints\[action\] === true\)/);
  assert.match(source, /button\.disabled = Boolean\(reason \|\| pending\)/);
  assert.match(source, /if \(!button \|\| button\.disabled\) return/);
});
