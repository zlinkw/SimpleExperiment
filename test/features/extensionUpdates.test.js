const assert = require("node:assert/strict");
const test = require("node:test");

const {
  compareSemanticVersions,
  componentUpdate,
  refreshStoredPluginUpdatePlan,
  planPairedUpdates,
} = require("../../dist/features/ExtensionUpdates");

const fs = require("node:fs");
const path = require("node:path");

const panelSource = fs.readFileSync(path.join(__dirname, "../../src/ui/PanelHtml.ts"), "utf8");
const extensionSource = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function release(version, names = [`simple-${version}.vsix`, `simple-${version}.vsix.sha256`]) {
  return {
    tagName: `v${version}`,
    htmlUrl: `https://example.com/releases/v${version}`,
    assets: names.map((name) => ({ name, browser_download_url: `https://example.com/${name}`, size: 1 })),
  };
}

test("release versions use semantic comparison and ignore the optional v prefix", () => {
  assert.equal(compareSemanticVersions("0.4.7", "0.4.6"), 1);
  assert.equal(compareSemanticVersions("v0.4.7", "0.4.7"), 0);
  assert.equal(compareSemanticVersions("0.4.10", "0.4.9"), 1);
});

test("paired update plan requires VSIX assets from both releases", () => {
  const experiment = componentUpdate("simple-local.simple-experiment", "zlinkw/SimpleExperiment", "SimpleExperiment", "0.4.6", release("0.4.7"), "experiment");
  const sftp = componentUpdate("simple-local.simple-sftp", "zlinkw/SimpleSFTP", "SimpleSFTP", "0.2.5", release("0.2.6"), "sftp");
  const plan = planPairedUpdates(experiment, sftp);
  assert.equal(plan.status, "update_available");
  assert.equal(plan.experiment.vsix.name, "simple-0.4.7.vsix");
  assert.equal(plan.sftp.checksum.name, "simple-0.2.6.vsix.sha256");

  const missingAsset = componentUpdate("id", "repo", "Broken", "1.0.0", { tagName: "v1.1.0", assets: [] }, "broken");
  assert.equal(planPairedUpdates(missingAsset, sftp).status, "error");
});

test("stored update plans are refreshed against installed versions", () => {
  const experiment = componentUpdate("simple-local.simple-experiment", "zlinkw/SimpleExperiment", "SimpleExperiment", "0.4.9", release("0.4.10"), "simple-experiment");
  const sftp = componentUpdate("simple-local.simple-sftp", "zlinkw/SimpleSFTP", "SimpleSFTP", "0.2.6", release("0.2.7"), "simple-sftp");
  const stored = planPairedUpdates(experiment, sftp);
  const refreshed = refreshStoredPluginUpdatePlan(stored, (id) => id.includes("experiment") ? "0.4.10" : "0.2.7");

  assert.equal(refreshed.status, "up_to_date");
  assert.equal(refreshed.experiment.updateAvailable, false);
  assert.equal(refreshed.sftp.updateAvailable, false);
  assert.equal(refreshed.checkedAt, stored.checkedAt);

  const newerExperiment = componentUpdate("simple-local.simple-experiment", "zlinkw/SimpleExperiment", "SimpleExperiment", "0.4.10", release("0.4.11"), "simple-experiment");
  const partial = refreshStoredPluginUpdatePlan(planPairedUpdates(newerExperiment, sftp), (id) => id.includes("experiment") ? "0.4.10" : "0.2.7");

  assert.equal(partial.status, "update_available");
  assert.equal(partial.experiment.updateAvailable, true);
  assert.equal(partial.sftp.updateAvailable, false);
});

test("update card hides installation when the installed versions are current", () => {
  assert.match(panelSource, /storedStatus === "update_available" && !hasStoredUpdate \? "up_to_date" : storedStatus/);
  assert.match(panelSource, /canInstall = status === "update_available" && hasStoredUpdate/);
  assert.match(panelSource, /\(canInstall \? '<button data-command="installPluginUpdates"/);
  assert.match(panelSource, /当前已是最新版本；更新来源为两个仓库的 GitHub Latest Release。/);
});

test("local API update commands return their plans directly", () => {
  assert.match(extensionSource, /if \(command === "checkPluginUpdates"\)\s*return await this\.checkPluginUpdates\(params\.manual !== false\);/);
  assert.match(extensionSource, /if \(command === "installPluginUpdates"\)\s*return await this\.installPluginUpdates\(\);/);
});
