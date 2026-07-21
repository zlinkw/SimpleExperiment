const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const extension = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");

test("archived plan restore creates an isolated version with isolated configs and result scope", () => {
  assert.match(extension, /case "restoreArchivedPlan":/);
  assert.match(extension, /async restoreArchivedPlanFromUi\(message\)/);
  assert.match(extension, /path\.basename\(source\)\.toLowerCase\(\) !== "plan\.yaml"/);
  assert.match(extension, /readPlanArchiveBundle\(source\)/);
  assert.match(extension, /nextAvailableVersionedPlanFile\(path\.join\(planRoot, "_restored", path\.dirname\(originalRelative\)\), parsed\.name, parsed\.ext\)/);
  assert.match(extension, /safeArchiveBundleChildPath\(path\.join\(bundleDir, "configs"\), relative\)/);
  assert.match(extension, /"zlk_cluster", "restored_configs", safePlanToken\(restoredFile\), relative/);
  assert.match(extension, /resultScopeFile: restoredFile/);
  assert.match(extension, /restorePlanText\(planText, \{ originalPlanFile, archivedPlanFile: file, restoredFile, planVersion, configPathMap \}\)/);
  assert.match(extension, /await this\.persistProjectPlanSelectionState\(\)/);
  assert.match(extension, /await openWorkspaceFile\(restoredFile\)/);
});

test("archived plan card exposes restore through the local command allowlist", () => {
  assert.match(panel, /data-command="restoreArchivedPlan"/);
  assert.match(panel, /"restoreArchivedPlan"/);
  assert.match(panel, /restoreArchivedPlan: "恢复归档 Plan"/);
  assert.match(panel, /plan\.restoreVersion/);
  assert.match(panel, /plan\.restoreOutputNamespace/);
  assert.match(panel, /taskMetric\("版本输出", plan\.restoreOutputNamespace\)/);
});
