const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");
const { assessProjectTopology, normalizeTopologyMode } = require("../../dist/features/TopologyMode");

test("topology mode is a project-scoped explicit setting", () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const setting = pkg.contributes.configuration.properties["simpleExperiment.topologyMode"];
  assert.equal(setting.scope, "resource");
  assert.equal(setting.default, "worker_pool");
  assert.deepEqual(setting.enum, ["worker_pool"]);
});

test("topology modes validate endpoint counts and Hub exclusion", () => {
  assert.equal(assessProjectTopology("single_worker", { hubConfigured: false, enabledWorkerIds: ["w1"] }).valid, true);
  assert.equal(assessProjectTopology("worker_pool", { hubConfigured: false, enabledWorkerIds: ["w1", "w2"] }).valid, true);
  assert.equal(assessProjectTopology("hub_worker", { hubConfigured: true, enabledWorkerIds: ["w1"] }).valid, true);
  assert.equal(assessProjectTopology("single_worker", { hubConfigured: true, enabledWorkerIds: ["w1"] }).valid,true);
  assert.equal(assessProjectTopology("worker_pool", { hubConfigured: false, enabledWorkerIds: ["w1"] }).valid,true);
  assert.equal(assessProjectTopology("hub_worker", { hubConfigured: false, enabledWorkerIds: ["w1"] }).hubAllowed,false);
});

test("legacy Hub projects are inferred without confirming worker-only projects", () => {
  const legacyHub = assessProjectTopology("", { hubConfigured: true, enabledWorkerIds: ["w1"] });
  assert.equal(legacyHub.mode, "worker_pool");
  assert.equal(legacyHub.source, "explicit");
  assert.equal(legacyHub.requiresConfirmation, false);

  const workerOnly = assessProjectTopology("", { hubConfigured: false, enabledWorkerIds: ["w1"] });
  assert.equal(workerOnly.mode, "worker_pool");
  assert.equal(workerOnly.source, "explicit");
  assert.equal(workerOnly.requiresConfirmation, false);
});

test("worker inventory is unique and invalid configured values stay blocked", () => {
  const duplicate = assessProjectTopology("worker_pool", { hubConfigured: false, enabledWorkerIds: ["w1", "w1"] });
  assert.equal(duplicate.workerCount, 1);
  assert.equal(duplicate.valid, false);
  const invalid = assessProjectTopology("automatic", { hubConfigured: true, enabledWorkerCount: 2 });
  assert.equal(invalid.source, "invalid");
  assert.equal(invalid.valid, false);
  assert.equal(normalizeTopologyMode("automatic"), undefined);
});

test("topology assessment exposes scheduler and state ownership", () => {
  const single = assessProjectTopology("single_worker", { hubConfigured: false, enabledWorkerCount: 1 });
  assert.equal(single.schedulerOwner, "各 Worker 独立调度");
  assert.equal(single.stateOwner, "Worker 本机项目目录");
  assert.equal(single.hubAllowed, false);
  const hub = assessProjectTopology("hub_worker", { hubConfigured: true, enabledWorkerCount: 1 });
  assert.equal(hub.schedulerOwner, "各 Worker 独立调度");
  assert.equal(hub.stateOwner, "Worker 本机项目目录");
  assert.equal(hub.hubAllowed, false);
});
