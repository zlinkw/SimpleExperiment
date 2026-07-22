const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const { MobaXtermIntegration } = require("../../dist/tunnel/MobaXtermIntegration.js");

test("legacy integration wrapper accepts configured Xshell.exe", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zlk-moba-"));
  const exe = path.join(dir, "Xshell.exe");
  await fs.writeFile(exe, "");
  const integration = new MobaXtermIntegration({ configuredPath: exe });
  const found = await integration.findExecutable();
  const validation = await integration.validateExecutable(exe);
  assert.equal(found.found, true);
  assert.equal(found.source, "configured");
  assert.equal(validation.ok, true);
});

test("legacy integration wrapper rejects non-Xshell basename", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zlk-moba-"));
  const exe = path.join(dir, "ssh.exe");
  await fs.writeFile(exe, "");
  const validation = await new MobaXtermIntegration().validateExecutable(exe);
  assert.equal(validation.ok, false);
  assert.equal(validation.extensionOk, false);
});
