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
  assert.match(command, /pgrep -f/);
  assert.match(command, /tmux new-session -A -s/);
  assert.match(command, /--mode worker_telemetry/);
});