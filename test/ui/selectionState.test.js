const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("provider tracks plan task and in-card log selection without remote browser state", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  for (const field of ["selectedPlanId", "selectedExperimentIds", "selectedRunKeys", "selectedRunKey", "selectedArchiveKeys", "selectedTaskUiKeys", "selectedLogRunKey", "selection:"]) {
    assert.match(source, new RegExp(field), field);
  }
  assert.match(source, /selectExperimentFromUi/);
  assert.match(source, /selectPlanFromUi/);
  assert.doesNotMatch(source, /selectedRemoteFile|selectRemoteFileFromUi/);
});
