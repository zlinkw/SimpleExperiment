const test = require("node:test"), assert = require("node:assert/strict");
const path = require("node:path"), { spawnSync } = require("node:child_process");

test("declared output producer rechecks identity and current manifest", () => {
  const proc = spawnSync(process.platform === "win32" ? "python" : "python3", ["-B", "-X", "utf8",
    path.join(__dirname, "declaredOutputObservation.fixture.py"), path.join(__dirname, "../../src/runtime/TmuxTaskLifecycle.ts"),
    path.join(__dirname, "../../src/clusterAgentRuntime.legacy.ts")], { encoding: "utf8", timeout: 10000, windowsHide: true });
  assert.equal(proc.status, 0, proc.stderr || proc.stdout);
  const observation = JSON.parse(proc.stdout);
  assert.equal(observation.result.runId, observation.commandId);
  assert.equal(observation.result.artifactsComplete, true);
  assert.equal(observation.result.identityMatches, true);
});
