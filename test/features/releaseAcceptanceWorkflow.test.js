const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const acceptance = fs.readFileSync(path.join(root, "scripts/acceptance.js"), "utf8");

test("release acceptance command has an executable report workflow", () => {
  assert.equal(packageJson.scripts.acceptance, "node scripts/acceptance.js");
  assert.match(acceptance, /run\("build", npm, \["run", "build"\]\)/);
  assert.match(acceptance, /run\("unit tests", npm, \["test"\]\)/);
  assert.equal(packageJson.scripts["test:scenarios"], "npm run test:features");
  assert.match(acceptance, /run\("feature regression tests", npm, \["run", "test:features"\]\)/);
  assert.match(acceptance, /shell: process\.platform === "win32" && command === npm/);
  assert.match(acceptance, /overall=\$\{overall\}/);
  assert.match(acceptance, /path\.join\(root, "zlk_cluster", "reports", "acceptance"\)/);
});
