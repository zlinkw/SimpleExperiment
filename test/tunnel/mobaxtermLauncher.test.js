const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

const {
  buildForwardCommand,
  buildMobaXtermArgs,
  buildMobaXtermPreview,
  generateBatScript,
  generatePs1Script,
  validateMobaXtermExecutable,
} = require("../../dist/tunnel/MobaXtermLauncher.js");
const { normalizeMobaXtermSetupConfig } = require("../../dist/tunnel/MobaXtermSetup.js");

test("mobaxterm launcher builds visible local forwarding command with custom ports", () => {
  const config = normalizeMobaXtermSetupConfig({
    mobaxtermExePath: "C:\\Program Files\\NetSarang\\Xshell 8\\Xshell.exe",
    hubHost: "hub.example.edu",
    hubUser: "zlk",
    hubSshPort: 2222,
    localForwardPort: 20001,
    remoteAgentPort: 20002,
  });
  const command = buildForwardCommand(config);
  assert.match(command, /127\.0\.0\.1:20001:127\.0\.0\.1:20002/);
  assert.match(command, /-p 2222/);
  assert.doesNotMatch(command, /password|StrictHostKeyChecking=no/i);
  assert.deepEqual(buildMobaXtermArgs(config)[0], "-newtab");
  assert.match(buildMobaXtermPreview(config), /Xshell\.exe/);
  assert.match(generateBatScript(config), /LOCAL_PORT=20001/);
  assert.match(generatePs1Script(config), /20002/);
});

test("legacy launcher validation only accepts Xshell.exe files", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zlk-moba-"));
  const exe = path.join(dir, "Xshell.exe");
  const other = path.join(dir, "other.exe");
  await fs.writeFile(exe, "");
  await fs.writeFile(other, "");
  assert.equal(await validateMobaXtermExecutable(exe), true);
  assert.equal(await validateMobaXtermExecutable(other), false);
});
