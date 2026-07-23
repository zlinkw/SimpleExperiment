const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const sourceRoot = path.join(__dirname, "..", "src");

test("recovered feature and template sources remain TypeScript modules", () => {
  const files = [
    ["extension.ts", ["import * as vscode from \"vscode\";", "export function activate", "export function deactivate"]],
    ["features/PlanArchive.ts", ["export function planStaticConfigReferences", "export function restorePlanText"]],
    ["features/PlottingContract.ts", ["export const PLOTTING_CONTRACT_JSON_PATH", "export function buildPlottingOutputContract"]],
    ["features/PlanBuilder.ts", ["import { createHash } from \"crypto\";", "export const PLAN_REGISTRY_PATH", "export function buildExperimentMatrix"]],
    ["templates/ProjectAdapterTemplates.ts", ["import * as Quality_1", "export function projectAdapterTemplateFiles"]],
  ];

  for (const [relativePath, markers] of files) {
    const source = fs.readFileSync(path.join(sourceRoot, relativePath), "utf8");
    assert.doesNotMatch(source, /var __createBinding|Object\.defineProperty\(exports|^exports\.|^const .* = require\(/m, relativePath);
    for (const marker of markers) {
      assert.match(source, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${relativePath}: ${marker}`);
    }
  }
});
