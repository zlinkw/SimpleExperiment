const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function methodBody(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, `missing method range ${startMarker}`);
  return source.slice(start, end);
}

test("backend Worker action confirmation reuses one fixed command set", () => {
  const body = methodBody("async runActionCommandCore(command, message)", "async runPlanPreflight(body, label, authority = {})");
  assert.match(source, /const WORKER_ACTION_CONFIRM_COMMANDS = new Set\(\["stopExperiment", "archiveArtifacts", "deleteArtifacts"\]\)/);
  assert.equal((body.match(/WORKER_ACTION_CONFIRM_COMMANDS\.has\(command\)/g) || []).length, 2);
  assert.doesNotMatch(body, /\["stopExperiment", "archiveArtifacts", "deleteArtifacts"\]\.includes\(command\)/);
});
