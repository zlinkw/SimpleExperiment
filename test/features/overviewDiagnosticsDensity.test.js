const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("drawer UI keeps closed-loop helpers and inspector hub facts", () => {
  const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
  assert.match(panel, /function renderResultEvidenceWorkbench\(/);
  assert.match(panel, /var\(--tree-col\)/);
  assert.match(panel, /resourceTree:hover|always-visible three columns|\.resourceTree \{/);
  assert.match(panel, /\["Hub", labelStatus\(/);
  assert.match(panel, /labelStatus\(health\)/);
});

test("results summary refresh stays selected-plan scoped without dirty narrowing", () => {
  const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
  assert.match(source, /Dirty planFile only decides whether a refresh is relevant/);
  assert.match(source, /const planFile = selectedPlan \|\| ""/);
  assert.doesNotMatch(source, /const planFile = selectedPlan \|\| dirtyPlan/);
});
