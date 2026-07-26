const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../../src/extension.ts"), "utf8");

function extractMethod(name) {
  const match = new RegExp(`^\\s*(?:private\\s+)?(?:async\\s+)?${name}\\(`, "m").exec(source);
  assert.ok(match, `missing method ${name}`);
  const start = match.index;
  const body = source.indexOf("{", start);
  let depth = 0;
  for (let index = body; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1).trim();
  }
  throw new Error(`unterminated method ${name}`);
}

test("Extension Host reuses enabled Worker configs until source array changes", () => {
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`
    class Subject {
      enabledWorkerConfigsCacheSource;
      enabledWorkerConfigsCacheValue = [];
      ${extractMethod("enabledWorkerConfigs")}
    }
    this.Subject = Subject;
  `, sandbox);

  let reads = 0;
  const worker = (id, enabled) => ({ id, get enabled() { reads += 1; return enabled; } });
  const firstSource = [worker("a", true), worker("b", false)];
  const subject = new sandbox.Subject();
  subject.setupConfig = { workerTunnels: firstSource };

  const first = subject.enabledWorkerConfigs();
  assert.deepEqual(first.map((item) => item.id), ["a"]);
  assert.equal(reads, 2);
  assert.equal(subject.enabledWorkerConfigs(), first);
  assert.equal(reads, 2);

  subject.setupConfig = { workerTunnels: [worker("c", true)] };
  const second = subject.enabledWorkerConfigs();
  assert.deepEqual(second.map((item) => item.id), ["c"]);
  assert.notEqual(second, first);
  assert.equal(reads, 3);
});

test("high-frequency Extension Host consumers share enabled Worker cache", () => {
  for (const name of [
    "showFirstRunSetupPromptOnceCore",
    "completeQuickSetupAfterWorkspace",
    "assertExecutionAgentProjectsReady",
    "sftpSharedTargets",
    "workerCodeSyncTargets",
    "workerActualWorkRootTargets",
    "localWorkerAvailabilityRows",
    "tunnelLaunchItems",
    "agentStartupTargets",
    "currentAssignments",
    "configurationSourceState",
  ]) {
    assert.match(extractMethod(name), /this\.enabledWorkerConfigs\(\)/, name);
  }
  assert.doesNotMatch(source, /this\.setupConfig\.workerTunnels\s*\.filter\(\((?:worker|item)\) => (?:worker|item)\.enabled !== false\)/);
});
