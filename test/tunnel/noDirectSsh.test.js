const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..");

test("plugin runtime source does not contain legacy remote runner code", () => {
  const files = walk(path.join(root, "src"))
    .filter((file) => file.endsWith(".ts"))
    .filter((file) => !file.includes(`${path.sep}test${path.sep}`));
  const forbidden = [
    "runSsh(",
    "ControlMaster",
    "ControlPath",
    "persistent_shell",
    "oneshot",
    "connectSshSessions",
    "closeControlMasterSessions",
    "sshTransportMode",
    "hub_agent_stream",
    "direct_ssh",
  ];
  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const item of forbidden) assert.equal(text.includes(item), false, `${item} in ${path.relative(root, file)}`);
  }
});

test("extension dist has no direct remote command fallback", () => {
  const text = fs.readFileSync(path.join(root, "dist", "extension.js"), "utf8");
  for (const item of ["runSsh(", "connectSshSessions", "closeControlMasterSessions", "ControlMaster", "ControlPath"]) {
    assert.equal(text.includes(item), false, item);
  }
  assert.match(text, /mobaxterm_tunnel_realtime/);
  assert.match(text, /127\.0\.0\.1/);
});

test("package UI does not expose direct fallback commands", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const commandIds = pkg.contributes.commands.map((item) => item.command);
  for (const forbidden of ["zlkCluster.scanGpu", "zlkCluster.deployRuntime", "zlkCluster.verifyRuntime"]) {
    assert.equal(commandIds.includes(forbidden), false, forbidden);
  }
  assert.equal(commandIds.some((id) => /MobaXterm/i.test(id)), false);
  assert.equal(commandIds.some((id) => /LegacySsh|legacySsh/i.test(id)), false);
});

test("extension command registration exposes only Xshell tunnel command ids", () => {
  const text = fs.readFileSync(path.join(root, "src", "extension.ts"), "utf8");
  const registered = Array.from(text.matchAll(/registerCommand\("([^"]+)"/g)).map((match) => match[1]);
  assert.equal(registered.some((id) => /MobaXterm/i.test(id)), false);
  assert.equal(registered.some((id) => /LegacySsh|legacySsh/i.test(id)), false);
  assert.equal(registered.includes("zlkCluster.configureXshellSavedSessions"), true);
  assert.equal(registered.includes("zlkCluster.startAllXshellRealtimeTunnels"), true);
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
