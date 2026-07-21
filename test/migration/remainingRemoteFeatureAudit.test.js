const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("remaining remote feature audit is migrated to tunnel-only sources", () => {
  const deletedSources = [
    "src/services/RemoteExecutionService.ts",
    "src/services/RuntimeService.ts",
    "src/runtime/RuntimeManager.ts",
    "src/remote/RemoteFileStore.ts",
    "src/test/fakes/FakeRemoteCommandRunner.ts",
  ];
  for (const file of deletedSources) {
    assert.equal(fs.existsSync(path.join(root, file)), false, `${file} should be removed`);
  }

  const files = walk(path.join(root, "src")).filter((file) => file.endsWith(".ts"));
  const text = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  for (const oldName of ["RemoteExecutionService", "RuntimeManager", "RemoteFileStore", "FakeRemoteCommandRunner", "writeRemoteBase64"]) {
    assert.equal(text.includes(oldName), false, `${oldName} still referenced`);
  }
});

function walk(dir) {
  const out = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}