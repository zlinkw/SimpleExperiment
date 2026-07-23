const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const root = path.join(__dirname, "../..");

test("VSIX includes every local CommonJS dependency of extension and CLI entrypoints", () => {
  const command = process.platform === "win32" ? "node.exe" : process.execPath;
  const result = spawnSync(command, [path.join(root, "scripts", "verify-vsix-runtime.js")], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /VSIX runtime closure verified/);
});
