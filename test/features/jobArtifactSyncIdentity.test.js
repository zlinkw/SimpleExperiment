const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { jobArtifactRetentionKey, jobArtifactRunGeneration, syncScopeStagingIdentity } = require("../../src/features/JobArtifactSyncIdentity.ts");

test("the completed-job retentionKey is the exact five-tuple the dedicated plan chain already uses", () => {
  const planFile = "experiments/plans/comparison/qmf.yaml", index = 2, caseName = "qmf_bus_p100", seed = 43;
  // Byte-for-byte equal to the dedicated chain's literal construction (legacy.ts syncDistributedJobArtifacts).
  assert.equal(jobArtifactRetentionKey(planFile, index, caseName, seed),
    JSON.stringify(["job-artifacts", planFile, index, caseName, seed]));
  assert.equal(jobArtifactRetentionKey("plans/p.yaml", 0, "case0", 42),
    JSON.stringify(["job-artifacts", "plans/p.yaml", 0, "case0", 42]));
  assert.notEqual(jobArtifactRetentionKey("plans/p.yaml", 0, "case0", 42),
    jobArtifactRetentionKey("plans/p.yaml", 1, "case0", 42), "different jobs never share a staging identity");
});

test("the run generation is a 64-hex value that retries of the same source manifest reuse", () => {
  const files = { "work_dirs/p/job0/model.pth": "A".repeat(64), "work_dirs/p/job0/summary.json": "b".repeat(64) };
  const first = jobArtifactRunGeneration("plan", "command0", files);
  assert.match(first, /^[0-9a-f]{64}$/, "hex passes the receiver transferScope64 unchanged");
  assert.equal(jobArtifactRunGeneration("plan", "command0", { ...files }), first, "same input retries and reloads reuse one generation");
  assert.equal(jobArtifactRunGeneration("plan", "command0", Object.fromEntries(Object.entries(files).reverse())), first,
    "inventory key order cannot change the generation");
  assert.equal(jobArtifactRunGeneration("plan", "command0", { "work_dirs/p/job0/model.pth": "a".repeat(64), "work_dirs/p/job0/summary.json": "b".repeat(64) }), first,
    "SHA case is normalized before hashing");
});

test("a new command, run or content hash always opens a new generation while missing destination progress never does", () => {
  const files = { "work_dirs/p/job0/model.pth": "a".repeat(64) };
  const base = jobArtifactRunGeneration("plan", "command0", files);
  assert.notEqual(jobArtifactRunGeneration("plan", "command1", files), base, "a new dispatch/attempt never reuses the old run generation");
  assert.notEqual(jobArtifactRunGeneration("plan-2", "command0", files), base, "a new plan run opens its own generation");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", { "work_dirs/p/job0/model.pth": "c".repeat(64) }), base,
    "a changed source SHA opens a new generation even under the same command");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", { ...files, "work_dirs/p/job0/extra.bin": "d".repeat(64) }), base,
    "a changed source file set opens a new generation");
  assert.notEqual(jobArtifactRunGeneration("plan", "command0", {}), base);
});

// r112：共享保留/合并链的暂存身份（现场依据：nwpu3 共享 project-files 双槽 d-47be3d71…/d-008f3730…
// 被同一逻辑源自家 committed 代占满，之前这些链每发都是随机新代，重试必撞 TRANSFER_STAGE_PENDING）。
test("the shared retain-lane identity is the sorted batch path scope plus frozen SHAs, reused verbatim by retries", () => {
  const files = { "work_dirs/p/model.pth": "A".repeat(64), "tmp/a.json": "b".repeat(64) };
  const first = syncScopeStagingIdentity(["tmp/a.json", "work_dirs/p/model.pth", "tmp/a.json"], files);
  assert.equal(first.retentionKey, 'sync-scope-retain:["tmp/a.json","work_dirs/p/model.pth"]', "排序去重的路径清单即身份，且不含任何来源/节点字段");
  assert.match(first.generation, /^[0-9a-f]{64}$/, "64 位小写 hex 原样通过 receiver transferScope64");
  assert.deepEqual(syncScopeStagingIdentity(["work_dirs/p/model.pth", "tmp/a.json"], { ...files }), first,
    "同一批、同一冻结清单：顺序与重复不构成新身份，重试逐字复用自己的代");
  const literal = crypto.createHash("sha256").update(JSON.stringify(["sync-scope-retain",
    ["tmp/a.json", "work_dirs/p/model.pth"], [["tmp/a.json", "b".repeat(64)], ["work_dirs/p/model.pth", "a".repeat(64)]]])).digest("hex");
  assert.equal(first.generation, literal, "盐、scope 数组与排序 path+sha 清单就是上线格式（SHA 大小写归一）");
});

test("a changed path set or SHA opens a new retain-lane generation while the same path stays one logical source", () => {
  const files = { "work_dirs/p/model.pth": "a".repeat(64) };
  const base = syncScopeStagingIdentity(["work_dirs/p/model.pth"], files);
  assert.notEqual(syncScopeStagingIdentity(["work_dirs/p/model.pth"], { "work_dirs/p/model.pth": "c".repeat(64) }).generation, base.generation,
    "单文件 SHA 变化必须开新代，不与旧代混淆");
  assert.notEqual(syncScopeStagingIdentity(["work_dirs/p/model.pth", "extra.bin"], { ...files, "extra.bin": "d".repeat(64) }).generation, base.generation,
    "路径集变化必须开新代");
  assert.notEqual(syncScopeStagingIdentity(["work_dirs/p/other.pth"], { "work_dirs/p/other.pth": "a".repeat(64) }).retentionKey, base.retentionKey,
    "不同 relative 是不同逻辑源，互不挤占槽位");
  assert.notEqual(syncScopeStagingIdentity(["work_dirs/p/model.pth"], {}).generation, base.generation,
    "缺失来源 SHA 不静默等同旧代");
});
