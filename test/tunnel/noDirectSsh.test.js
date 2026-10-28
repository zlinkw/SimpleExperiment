const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { readSource } = require("../_helpers/sourceReader");

const root = path.resolve(__dirname, "..", "..");

test("active extension uses localhost clients, a forward-only background manager and explicit Xshell sessions", () => {
  const extension = readSource("src/extension.ts");
  const launcher = fs.readFileSync(path.join(root, "src", "tunnel", "XshellSessionLauncher.ts"), "utf8");
  for (const item of ["RemoteExecutionService", "RuntimeService", "RemoteFileStore", "FakeRemoteCommandRunner", "runSsh(", "connectSshSessions", "closeControlMasterSessions"]) {
    assert.equal(extension.includes(item), false, item);
  }
  assert.doesNotMatch(extension, /(?:spawn|spawnSync|execFile|execFileSync)\s*\(\s*["'](?:ssh|scp|rsync)["']/i);
  assert.match(extension, /spawnSync\("gh", \["--version"\]/);
  assert.match(extension, /launchXshellSavedSession/);
  assert.match(extension, /BackgroundSshTunnels/);
  const background = fs.readFileSync(path.join(root, "src/tunnel/BackgroundSshTunnels.ts"), "utf8");
  assert.match(background, /"-N", "-L", forwardSpec\(endpoint\)/);
  assert.match(background, /windowsHide: true, stdio: \["ignore", "ignore", "pipe"\]/);
  assert.doesNotMatch(background, /spawn\([^\n]+\{[^\n]*shell:\s*true/);
  assert.match(launcher, /path\.basename\(request\.exePath \|\| ""\)\.toLowerCase\(\) !== "xshell\.exe"/);
  assert.match(launcher, /spawn\(request\.exePath, \[request\.sessionPath\]/);
  assert.doesNotMatch(launcher, /spawn\(["'](?:ssh|scp|rsync)/i);
});

test("extension dist has no direct remote command fallback", () => {
  const text = fs.readFileSync(path.join(root, "dist", "extension", "legacy.js"), "utf8");
  for (const item of ["runSsh(", "connectSshSessions", "closeControlMasterSessions", "ControlMaster", "ControlPath"]) {
    assert.equal(text.includes(item), false, item);
  }
  assert.match(text, /xshell_tunnel_realtime/);
  assert.match(text, /XshellSessionLauncher/);
  assert.match(text, /127\.0\.0\.1/);
});

test("package UI does not expose direct fallback commands", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const commandIds = pkg.contributes.commands.map((item) => item.command);
  for (const forbidden of ["simpleExperiment.scanGpu", "simpleExperiment.deployRuntime", "simpleExperiment.verifyRuntime"]) {
    assert.equal(commandIds.includes(forbidden), false, forbidden);
  }
  assert.equal(commandIds.filter((id) => /Tunnel/i.test(id)).every((id) => !/configure.*RealtimeTunnel/i.test(id) || /Xshell/i.test(id)), true);
  assert.equal(commandIds.some((id) => /LegacySsh|legacySsh/i.test(id)), false);
});

test("extension retains compatible tunnel ids and adds the explicit manual Xshell entry", () => {
  const text = readSource("src/extension.ts");
  const registered = Array.from(text.matchAll(/(?:registerCommand|hostCommand)\("([^"]+)"/g)).map((match) => match[1]);
  assert.equal(registered.filter((id) => /Tunnel/i.test(id)).every((id) => !/configure.*RealtimeTunnel/i.test(id) || /Xshell/i.test(id)), true);
  assert.equal(registered.some((id) => /LegacySsh|legacySsh/i.test(id)), false);
  assert.equal(registered.includes("simpleExperiment.configureXshellSavedSessions"), true);
  assert.equal(registered.includes("simpleExperiment.startAllXshellRealtimeTunnels"), true);
  assert.equal(registered.includes("simpleExperiment.openXshellSessions"), true);
});
