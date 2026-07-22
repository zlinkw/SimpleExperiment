const test = require("node:test");
const assert = require("node:assert/strict");

const {
  agentTmuxStartupCommand,
  defaultAgentTmuxSessionName,
  isValidZlkTmuxSessionName,
} = require("../../dist/tunnel/AgentTmuxPolicy.js");

test("agent tmux policy uses zlk prefix for all generated sessions", () => {
  assert.equal(defaultAgentTmuxSessionName("hub"), "zlk-hub-agent");
  assert.equal(defaultAgentTmuxSessionName("worker", "nwpu5"), "zlk-worker-nwpu5-agent");
  assert.equal(isValidZlkTmuxSessionName("zlk-worker-nwpu5-agent"), true);
  assert.equal(isValidZlkTmuxSessionName("worker-nwpu5-agent"), false);
});

test("agent tmux startup command checks existing session and process before starting", () => {
  const command = agentTmuxStartupCommand({ role: "worker", endpointId: "nwpu5", port: 18765 });
  assert.match(command, /SESSION='zlk-worker-nwpu5-agent'/);
  assert.match(command, /tmux has-session/);
  assert.match(command, /ps -eo pid=,comm=,args=/);
  assert.match(command, /cluster_agent\.py/);
  assert.match(command, /ss -ltnp/);
  assert.match(command, /lsof -nP/);
  assert.match(command, /tmux kill-session/);
  assert.match(command, /kill -9/);
  assert.match(command, /tmux new-session -d -s/);
  assert.doesNotMatch(command, /pgrep -f/);
  assert.doesNotMatch(command, /tmux new-session -A -s/);
  assert.match(command, /MODE='worker_telemetry'/);
  assert.match(command, /--mode "\$MODE"/);
  assert.match(command, /--worker-id/);
});

test("agent tmux startup uses system Python by default and requires explicit Conda environments", () => {
  const blank = agentTmuxStartupCommand({ role: "hub", installDir: "/srv/agent", workDir: "/srv/project" });
  assert.match(blank, /ZLK_AGENT_TMUX_V19=1/);
  assert.match(blank, /ZLK_CONDA_ENV=''/);
  assert.match(blank, /ZLK_REQUIRE_CONDA_ENV='0'/);
  assert.match(blank, /if \[ -n "\$ZLK_CONDA_ENV" \]; then :/);

  const explicit = agentTmuxStartupCommand({ role: "hub", installDir: "/srv/agent", workDir: "/srv/project", condaEnv: "torch2" });
  assert.match(explicit, /ZLK_CONDA_ENV='torch2'/);
  assert.match(explicit, /ZLK_REQUIRE_CONDA_ENV='1'/);
  assert.match(explicit, /export ZLK_REQUIRE_CONDA_ENV="\$\{ZLK_REQUIRE_CONDA_ENV:-1\}"/);
  assert.match(explicit, /conda activate "\$ZLK_CONDA_ENV"/);
});
