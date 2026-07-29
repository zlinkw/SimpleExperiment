const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("debug bundle workflow creates through action and downloads through its bounded file path", () => {
  const source = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  assert.match(source, /createDebugBundle: "create-debug-bundle"/);
  assert.match(source, /case "downloadDebugBundle":\s*await this\.downloadDebugBundle\(\)/);
  const download = source.match(/async downloadDebugBundle\(\)[\s\S]*?async downloadRemoteResultFromUi/)?.[0] || "";
  assert.match(download, /const generation = this\.projectContextGeneration/);
  assert.match(download, /const root = workspaceRoot\(\)/);
  assert.match(download, /const client = this\.client/);
  assert.ok([...download.matchAll(/generation !== this\.projectContextGeneration \|\| root !== workspaceRoot\(\) \|\| client !== this\.client/g)].length >= 3);
  assert.match(source, /findDebugBundlePath/);
  assert.match(source, /client\.downloadFile\(pathFromOps, picked\.fsPath\)/);
  assert.doesNotMatch(source, /downloadSelectedRemoteFile|listRemoteFiles|uploadFileToCurrentRemoteDir/);
});
