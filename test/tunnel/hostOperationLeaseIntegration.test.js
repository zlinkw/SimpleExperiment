const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");
const compiled = fs.readFileSync(path.join(__dirname, "../../dist/extension.js"), "utf8");

test("SimpleExperiment routes UI side effects through the shared host lease", () => {
  assert.match(source, /require\("\.\/core\/HostOperationLease"\)/);
  assert.match(compiled, /require\("\.\/core\/HostOperationLease"\)/);
  assert.match(source, /this\.hostOperationLease\.run\(/);
  assert.match(source, /hostOperationLeaseActionForUiCommand\(command\)/);
  assert.match(source, /runActionCommandCore\(command, message\)/);
  for (const command of [
    "startAllConnections",
    "prepareAgents",
    "runPlan",
    "archiveArtifacts",
    "deleteArtifacts",
    "uploadProjectToHub",
    "deployLatestAgent",
    "downloadRemoteResult",
    "openResultArtifact",
  ]) {
    assert.match(source, new RegExp(`\\"${command}\\"`), command);
  }
});

test("read-only state commands are not included in the host side-effect set", () => {
  const start = source.indexOf("const hostOperationUiCommands = new Set([");
  const end = source.indexOf("]);", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  for (const command of ["snapshot", "manualGpuSnapshot", "loadGpuHistory", "manualSchedulerSnapshot", "manualTracesSnapshot", "testAll"]) {
    assert.doesNotMatch(block, new RegExp(`\\"${command}\\"`), command);
  }
});
