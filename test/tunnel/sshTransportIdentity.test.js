const assert = require("node:assert/strict");
const test = require("node:test");

const { parseLocalSshConfig } = require("../../dist/tunnel/LocalSshConfig.js");
const {
  buildSftpServerOptions,
  resolveSshTransportIdentity,
} = require("../../dist/tunnel/SshTransportIdentity.js");

const servers = parseLocalSshConfig(`
Host NWPU5
  HostName 10.68.10.238
  User simple
  IdentityFile C:/Users/ZLK/.ssh/simple

Host campus
  HostName 10.12.34.56
`, "C:/Users/ZLK/.ssh/config");

test("SSH transport identity prefers an explicit configured alias over a literal IP", () => {
  const identity = resolveSshTransportIdentity({
    id: "nwpu5",
    label: "NWPU5",
    sshConfigAlias: "NWPU5",
    host: "10.68.10.238",
    transferHost: "10.68.10.238",
    resolvedHost: "10.68.10.238",
  }, { sshServers: servers });
  assert.equal(identity.transportHost, "NWPU5");
  assert.equal(identity.sshConfigHost, "NWPU5");
  assert.equal(identity.sshConfigAlias, "NWPU5");
  assert.equal(identity.networkHost, "10.68.10.238");
});

test("A saved SSH host beats an Xshell session name when both are aliases", () => {
  const serversWithBoth = parseLocalSshConfig(`
Host saved-alias
  HostName 10.0.0.1

Host session-alias
  HostName 10.0.0.2
`);
  const identity = resolveSshTransportIdentity({
    sshConfigHost: "saved-alias",
    sessionName: "session-alias",
    host: "10.0.0.1",
  }, { sshServers: serversWithBoth, session: { name: "session-alias" } });
  assert.equal(identity.transportHost, "saved-alias");
  assert.equal(identity.source, "saved_ssh_host");
});

test("An Xshell session name is accepted when it exactly matches OpenSSH", () => {
  const identity = resolveSshTransportIdentity({
    id: "nwpu5",
    label: "NWPU5",
    host: "10.68.10.238",
  }, { sshServers: servers, session: { name: "NWPU5", host: "10.68.10.238" } });
  assert.equal(identity.transportHost, "NWPU5");
  assert.equal(identity.source, "xshell_alias");
});

test("A literal network address can discover its exact OpenSSH Host alias", () => {
  const identity = resolveSshTransportIdentity({
    id: "remote",
    label: "remote",
    host: "10.68.10.238",
  }, { sshServers: servers });
  assert.equal(identity.transportHost, "NWPU5");
  assert.equal(identity.networkHost, "10.68.10.238");
});

test("SimpleSFTP options preserve the alias and retain the network diagnostic", () => {
  const target = {
    id: "nwpu5",
    label: "NWPU5",
    host: "10.68.10.238",
    user: "simple",
    port: 22,
    remotePath: "/data/custom-root",
  };
  const identity = resolveSshTransportIdentity(target, { sshServers: servers });
  const options = buildSftpServerOptions(target, identity);
  assert.equal(options.host, "NWPU5");
  assert.equal(options.sftpHost, "NWPU5");
  assert.equal(options.sshHost, "NWPU5");
  assert.equal(options.transferHost, "NWPU5");
  assert.equal(options.resolvedHost, "NWPU5");
  assert.equal(options.sshConfigHost, "NWPU5");
  assert.equal(options.sshConfigAlias, "NWPU5");
  assert.equal(options.networkHost, "10.68.10.238");
});

test("A target without an SSH alias falls back to its IP", () => {
  const identity = resolveSshTransportIdentity({
    id: "plain",
    label: "plain",
    host: "192.168.1.8",
  }, { sshServers: [] });
  assert.equal(identity.transportHost, "192.168.1.8");
  assert.equal(identity.sshConfigAlias, "");
  assert.equal(identity.networkHost, "192.168.1.8");
});
