const test = require("node:test");
const assert = require("node:assert/strict");

const { buildTunnelCommand } = require("../../dist/tunnel/MobaXtermCommandBuilder.js");

const base = {
  xshellExePath: "C:\\Program Files\\NetSarang\\Xshell 8\\Xshell.exe",
  hubHost: "hub.example.edu",
  hubUser: "zlk user",
  hubSshPort: 2222,
  localForwardHost: "127.0.0.1",
  localForwardPort: 18766,
  remoteAgentHost: "127.0.0.1",
  remoteAgentPort: 18767,
  launchMode: "open_xshell_exec",
  realtimeEnabled: true,
  fileTransferEnabled: true,
  keepWindowVisible: true,
  useNewTab: true,
  autoStartTunnelOnExtensionActivation: false,
  autoTestTunnelAfterStart: true,
  authMethod: "password",
};

test("mobaxterm command builder defaults to password login even when key path is known", () => {
  const preview = buildTunnelCommand({ ...base, privateKeyPath: "C:\\Users\\ZLK\\keys\\id_ed25519" });
  assert.match(preview.sshCommand, /-L 127\.0\.0\.1:18766:127\.0\.0\.1:18767/);
  assert.match(preview.sshCommand, /-p 2222/);
  assert.match(preview.sshCommand, /"zlk user@hub\.example\.edu"/);
  assert.doesNotMatch(preview.sshCommand, / -i /);
  assert.doesNotMatch(preview.sshCommand, /id_ed25519/);
  assert.doesNotMatch(preview.sshCommand, /StrictHostKeyChecking=no|UserKnownHostsFile=\/dev\/null/);
});

test("mobaxterm command builder uses quoted key only for key login", () => {
  const preview = buildTunnelCommand({ ...base, authMethod: "key", privateKeyPath: "C:\\Users\\ZLK\\keys\\id_ed25519" });
  assert.match(preview.sshCommand, /-i "C:\\\\Users\\\\ZLK\\\\keys\\\\id_ed25519"/);
  assert.match(preview.redactedSshCommand, /id_ed25519/);
  assert.doesNotMatch(preview.redactedSshCommand, /C:\\Users\\ZLK\\keys/);
});

test("mobaxterm command builder uses explicit host before ssh alias", () => {
  const preview = buildTunnelCommand({ ...base, sshConfigAlias: "my-hub" });
  assert.match(preview.sshCommand, /hub\.example\.edu/);
  assert.doesNotMatch(preview.sshCommand, / my-hub$/);
});

test("mobaxterm command builder uses ssh alias when host fields are missing", () => {
  const preview = buildTunnelCommand({ ...base, hubHost: "", hubUser: "", sshConfigAlias: "my-hub" });
  assert.match(preview.sshCommand, / my-hub$/);
});

test("mobaxterm command builder rejects host key bypass args", () => {
  assert.throws(() => buildTunnelCommand({ ...base, extraSshArgs: ["StrictHostKeyChecking=no"] }), /host key|不允许/);
});
