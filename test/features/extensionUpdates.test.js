const assert = require("node:assert/strict");
const test = require("node:test");

const {
  compareSemanticVersions,
  componentUpdate,
  planPairedUpdates,
} = require("../../dist/features/ExtensionUpdates");

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
