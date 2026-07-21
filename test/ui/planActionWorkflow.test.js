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
  assert.match(source, /if \(command === "runPlan"\)[\s\S]*"validate-plan"/);
  const html = fs.readFileSync(path.join(root, "src", "ui", "PanelHtml.ts"), "utf8");
  assert.match(html, /planFileInput/);
  assert.match(html, /Validate Plan/);
  assert.match(html, /Dry-run Plan/);
  assert.match(html, /Run Plan/);
});