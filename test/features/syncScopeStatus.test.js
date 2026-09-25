const assert = require("node:assert/strict");
const test = require("node:test");
const { buildScopeStatuses } = require("../../dist/features/SyncScopeStatus.js");

const file = (hash) => ({ sha256: hash, size: 1 });
const ledger = { schemaVersion: 2, entries: {
  run: { planFile: "experiments/plans/p.yaml", revision: "1", runId: "run", sourceWorkerId: "w2", artifactPaths: ["work_dirs/p"], directoryPaths: ["work_dirs/p"], destinations: {} },
} };

test("local scope treats local content as latest and aggregates directory state", () => {
  const inventory = { local: { "configs/a.weird": file("a") }, workers: { w1: { "configs/a.weird": file("a") }, w2: { "configs/a.weird": file("b") } } };
  const status = buildScopeStatuses(inventory, "local-server", [], new Set(["configs/a.weird"]), ledger);
  assert.equal(status["configs/a.weird"].state, "different");
  assert.match(status["configs/a.weird"].detail, /本机 最新.*w1 最新.*w2 待更新/);
  assert.equal(status.configs.state, "different");
});

test("server scope uses Plan owner, reports unrelated conflicts, and defaults to whole project", () => {
  const inventory = {
    local: {},
    workers: {
      w1: { "work_dirs/p/weight.bin": file("old"), "datasets/data.bin": file("x") },
      w2: { "work_dirs/p/weight.bin": file("new"), "datasets/data.bin": file("y") },
    },
  };
  const status = buildScopeStatuses(inventory, "server-server", ["."], new Set(), ledger);
  assert.match(status["work_dirs/p/weight.bin"].detail, /Plan 归属：w2.*w1 待更新.*w2 最新版/);
  assert.match(status["datasets/data.bin"].detail, /无法判定最新版/);
  assert.equal(status["datasets/data.bin"].state, "different");
});

test("equal Workers are orange when server-owned data is absent locally", () => {
  const inventory = { local: {}, workers: { w1: { "datasets/data.bin": file("same") }, w2: { "datasets/data.bin": file("same") } } };
  const status = buildScopeStatuses(inventory, "server-server", ["."], new Set(), ledger);
  assert.equal(status["datasets/data.bin"].state, "remote-only");
  assert.equal(status.datasets.state, "remote-only");
  assert.match(status["datasets/data.bin"].detail, /本机 缺失/);
  inventory.local["datasets/data.bin"] = file("same");
  assert.equal(buildScopeStatuses(inventory, "server-server", ["."], new Set(), ledger)["datasets/data.bin"].state, "same");
});

test("an offline Worker stays unverified instead of showing green", () => {
  const inventory = { local: { "train.py": file("a") }, workers: { w1: { "train.py": file("a") }, w2: {} } };
  const status = buildScopeStatuses(inventory, "local-server", [], new Set(["train.py"]), ledger, new Set(["w2"]));
  assert.equal(status["train.py"].state, "unknown");
  assert.match(status["train.py"].detail, /w2 未连接，待核对/);
});
