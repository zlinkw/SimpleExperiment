const test = require("node:test");
const assert = require("node:assert/strict");

const {
  agentTmuxStartupCommand,
  defaultAgentTmuxSessionName,
  defaultAgentTmuxWindowName,
  isValidRemoteTmuxSessionName,
} = require("../../dist/tunnel/AgentTmuxPolicy.js");

test("Agent windows are stable per canonical project and separate projects sharing a Worker", () => {
  const { projectIdentityKey } = require("../../dist/features/ProjectRootMap");
  const first = defaultAgentTmuxWindowName("/srv/alice/demo");
  assert.equal(first, "agent-" + projectIdentityKey({ projectDir: "/srv/alice/demo" }).slice(0, 16));
  assert.equal(first, defaultAgentTmuxWindowName("/srv/alice/demo/"));
  assert.notEqual(first, defaultAgentTmuxWindowName("/srv/bob/demo"));
  assert.equal(defaultAgentTmuxWindowName("C:/Projects/demo"), defaultAgentTmuxWindowName("c:\\Projects\\demo"));
  for (const missing of [undefined, "", "demo", "/"]) assert.throws(() => defaultAgentTmuxWindowName(missing), /AGENT_PROJECT_REQUIRED/);
  assert.throws(() => agentTmuxStartupCommand({ role: "worker", installDir: "/srv/agent" }), /AGENT_PROJECT_REQUIRED/);
  const config = (workDir) => JSON.parse(agentTmuxStartupCommand({ role: "worker", endpointId: "shared", sessionPrefix: "alice", installDir: workDir + "/alice_agent", workDir }).split(" --config '")[1].slice(0, -1));
  const a = config("/srv/alice/demo"), b = config("/srv/bob/demo");
  assert.equal(a.tmuxSession, b.tmuxSession);
  assert.notEqual(a.tmuxWindow, b.tmuxWindow);
  assert.equal(a.projectDir, "/srv/alice/demo");
});

test("setup, runtime naming and the public setting share one prefix default and normalization", () => {
  const names = require("../../dist/config/RemoteResourcePrefix.js");
  const policy = require("../../dist/tunnel/AgentTmuxPolicy.js");
  const setup = require("../../dist/tunnel/XshellTunnelSetup.js");
  const property = require("../../package.json").contributes.configuration.properties["simpleExperiment.tunnel.remoteTmuxSessionPrefix"];
  assert.equal(property.default, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  assert.equal(property.scope, "application");
  assert.equal(policy.simpleTmuxSessionPrefix, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  assert.equal(setup.defaultXshellTunnelSetupConfig.remoteTmuxSessionPrefix, names.DEFAULT_REMOTE_RESOURCE_PREFIX);
  for (const value of [undefined, "", "simple", "zlk", "alice", " Alice Lab! ", "team.lab", "---", "x".repeat(40)]) {
    const prefix = names.normalizeRemoteResourcePrefix(value);
    assert.equal(setup.normalizeXshellSetupConfig({ remoteTmuxSessionPrefix: value }).remoteTmuxSessionPrefix, prefix);
    assert.equal(policy.normalizeRemoteTmuxSessionPrefix(value), prefix);
    assert.equal(names.remoteAgentDirectoryName(value), prefix + "_agent");
    assert.equal(policy.remoteAgentDirectoryName(value), prefix + "_agent");
  }
  assert.equal(names.remoteAgentDirectoryName("zlk"), "zlk_agent");
  assert.equal(names.remoteAgentDirectoryName("alice"), "alice_agent");
});

test("agent tmux policy supports configurable remote session prefixes", () => {
  assert.throws(()=>defaultAgentTmuxSessionName("hub"),/HUB_REMOVED/);
  assert.equal(defaultAgentTmuxSessionName("worker", "nwpu5"), "simple-worker-nwpu5-agent");
  assert.equal(defaultAgentTmuxSessionName("worker", "nwpu5", "zlk"), "zlk-worker-nwpu5-agent");
  assert.equal(isValidRemoteTmuxSessionName("simple-worker-nwpu5-agent"), true);
  assert.equal(isValidRemoteTmuxSessionName("zlk-worker-nwpu5-agent"), true);
  assert.equal(isValidRemoteTmuxSessionName("-worker-agent"), false);
});

test("agent tmux startup uses system Python by default and requires explicit Conda environments", () => {
  const blank = agentTmuxStartupCommand({ role: "worker", endpointId: "fixture", installDir: "/srv/agent", workDir: "/srv/project" });
  assert.match(blank, /SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1/);
  assert.match(blank, /SIMPLE_EXPERIMENT_CONDA_ENV=''/);
  assert.match(blank, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='0'/);
  assert.match(blank, /lifecycle --action ensure/);

  const explicit = agentTmuxStartupCommand({ role: "worker", endpointId: "fixture", installDir: "/srv/agent", workDir: "/srv/project", condaEnv: "torch2" });
  assert.match(explicit, /SIMPLE_EXPERIMENT_CONDA_ENV='torch2'/);
  assert.match(explicit, /SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV='1'/);
  assert.match(explicit, /"condaEnv":"torch2"/);
  assert.doesNotMatch(explicit, /kill-session|kill -9/);
});
