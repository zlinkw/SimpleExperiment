const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "../..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const packageScript = fs.readFileSync(path.join(root, "scripts/package-public.ps1"), "utf8");
const installScript = fs.readFileSync(path.join(root, "scripts/install-public-release.ps1"), "utf8");
const extension = fs.readFileSync(path.join(root, "src/extension.ts"), "utf8");
const panel = fs.readFileSync(path.join(root, "src/ui/PanelHtml.ts"), "utf8");
const vsixIgnore = fs.readFileSync(path.join(root, ".vscodeignore"), "utf8");

test("public release declares paired SimpleSFTP dependency", () => {
  assert.equal(packageJson.name, "simple-experiment");
  assert.equal(packageJson.displayName, "SimpleExperiment");
  assert.equal(packageJson.__metadata, undefined);
  assert.ok(packageJson.extensionDependencies.includes("simple-local.simple-sftp"));
});

test("public UI uses SimpleExperiment and SimpleSFTP names", () => {
  assert.match(extension, /title: "SimpleExperiment 一键配置向导"/);
  assert.match(extension, /# 由 SimpleExperiment 生成/);
  assert.match(panel, /<title>SimpleExperiment<\/title>/);
  assert.match(panel, /topologyNode\("sftp", "SimpleSFTP", "文件"\)/);
  assert.doesNotMatch(panel, /ZLK SFTP Manager/);
});

test("public release package creates an offline paired installer", () => {
  assert.match(packageScript, /simple-sftp/);
  assert.match(packageScript, /simple-experiment/);
  assert.match(packageScript, /install-public-release\.ps1/);
  assert.match(packageScript, /simple-experiment-setup\.md/);
  assert.match(packageScript, /function Invoke-VscePackage/);
  assert.match(packageScript, /Release bundle already exists and will not be overwritten/);
  assert.doesNotMatch(packageScript, /Remove-Item/);
  assert.doesNotMatch(packageScript, /Copy-Item[^\r\n]*-Force/);
  assert.doesNotMatch(packageScript, /Set-Content/);
  assert.match(installScript, /simple-sftp-\*\.vsix/);
  assert.match(installScript, /simple-experiment-\*\.vsix/);
  assert.match(installScript, /\$sftp/);
  assert.match(installScript, /\$experiment/);
  assert.match(installScript, /--install-extension/);
});

test("public VSIX excludes local assistant state and rendered scratch files", () => {
  assert.match(vsixIgnore, /^\.claude\/\*\*$/m);
  assert.match(vsixIgnore, /^\.local-gpt\/\*\*$/m);
  assert.match(vsixIgnore, /^_\*\.html$/m);
  assert.match(vsixIgnore, /^dist\/runtime\/__pycache__\/\*\*$/m);
  for (const recoveredArtifact of ["-First", "-Path", "-Raw", ".vscodeignore}else{'NO", "package.json)"]) {
    assert.match(vsixIgnore, new RegExp(`^${escapeRegExp(recoveredArtifact)}$`, "m"));
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
