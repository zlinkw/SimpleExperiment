// r6 必须项1（跨入口身份一致性，可移植行为回归——纯 JS，无 receiver/python/固定机器路径）：
// 同一 job/run/完整冻结源清单经两个真实入口（CompletedJobSyncHost→merge 与
// syncDistributedJobArtifacts）必须产生同一 retentionKey+generation；同输入重试同代；
// 真实内容变化跨入口同新代；新 command 同清单新代。真实 staged receiver 的两代槽断言为
// Linux 专属套件（r9 起位于 verification/linux/jobArtifactStagedSlotReceiver.test.js，
// 通用 test glob 之外、Windows 通道不执行；Linux 最终清单显式必跑并 env 注入 receiver 路径+SHA）。
const test = require("node:test");
const assert = require("node:assert/strict");
const { OUT, H, V1, V2, completedJobEntry, dedicatedEntry, jobArtifactRunGeneration } = require("./jobArtifactStagedSlot.support.cjs");

test("both real entry points derive one identity and one generation for the same run and manifest", async () => {
  const entryA = await completedJobEntry(V1).run();
  const entryB = await dedicatedEntry(V1).run();
  assert.equal(entryA.length, 1); assert.equal(entryB.length, 1);
  const expectedKey = JSON.stringify(["job-artifacts", "plans/p.yaml", 0, "c0", 42]);
  assert.equal(entryA[0].retentionKey, expectedKey);
  assert.equal(entryB[0].retentionKey, expectedKey);
  // 不断言 generation 的内部摘要域（属实现细节），只断言 r6 要求的行为关系：
  // 同 job/run/完整清单跨入口必须同代；同入口重试同代；真实内容变化必须新代且跨入口仍同代。
  assert.match(entryA[0].generation, /^[0-9a-f]{64}$/, "A 链 generation 必须是接收端可用的 64hex 稳定代");
  assert.match(entryB[0].generation, /^[0-9a-f]{64}$/, "B 链 generation 必须是接收端可用的 64hex 稳定代（String(plan.id) 不是）");
  assert.equal(entryB[0].generation, entryA[0].generation, "同一 run 的完整冻结源清单跨入口必须同代，否则两个入口白白消耗两代槽");
  const retryA = await completedJobEntry(V1).run();
  assert.equal(retryA[0].generation, entryA[0].generation, "同输入重试必须复用同代");
  // 内容变化：两条链各自开同一个新代（真实清单不同才允许不同代，这里清单相同）。
  const entryA2 = await completedJobEntry(V2).run();
  const entryB2 = await dedicatedEntry(V2).run();
  assert.equal(entryA2[0].generation, entryB2[0].generation, "变化后的完整清单跨入口仍须同代");
  assert.notEqual(entryA2[0].generation, entryA[0].generation, "真实源内容变化必须开新代");
  // 同 command、同 job 身份下专用链自身的内容变化也必须新代（不固定 plan.id）。
  assert.notEqual(entryB2[0].generation, entryB[0].generation);
  // 新 command（新 attempt/run）即使清单相同也开新代 —— 由 generation 纯函数契约保证。
  assert.notEqual(jobArtifactRunGeneration("plan", "command1", { [`${OUT}/model.pth`]: H.alpha }),
    jobArtifactRunGeneration("plan", "command0", { [`${OUT}/model.pth`]: H.alpha }));
  // r9 返修控制（正常面，真实 host patch 落点）：queue.artifacts 恰为 V1 产物全集——
  // host 逐字 {...job.artifacts, ...result.files}，禁止后缀侧的控制见 rootBinding files/generation/传输三层断言。
  const hostRun = await completedJobEntry(V1).runWithReport();
  assert.equal(hostRun.report.synced, 1);
  assert.deepEqual(Object.keys(hostRun.jobs[0].artifacts || {}).sort(), Object.keys(V1).sort(),
    "queue.artifacts 必须恰为本次产物清单（不含禁止后缀、不缺正常产物）");
});

// r9（真实 host 消费面，纯 JS 可移植）：冻结保护命中必须显式 partial，
// 严禁把受保护文件过滤成空 files/空 errors 后让 CompletedJobSyncHost 写 synced/全 mirrored。
test("r9: a frozen-protected destination never receives bytes and the real host records partial, never synced/mirrored", async () => {
  const entry = completedJobEntry(V1, { freezeGuard: t => (t.id === "b" ? { prefixes: ["work_dirs"], unknown: false } : { prefixes: [], unknown: false }) });
  const { report, transfers, jobs } = await entry.runWithReport();
  assert.equal(transfers.length, 0, "唯一目标端点 b 被冻结保护：不得有任何 fpsync 字节发出");
  assert.equal(report.synced, 0, "受保护 job 绝不允许计为 synced");
  assert.equal(report.errors.length, 1);
  assert.match(report.errors[0], /冻结机器状态映射均保护/);
  assert.equal(jobs[0].latestArtifactSync.state, "partial");
  assert.ok(!jobs[0].mirroredWorkerIds, "受保护 job 不得写 mirroredWorkerIds 全量成功证明");
});

test("r9: a frozen-protected source refuses with an explicit error instead of an empty success", async () => {
  const entry = completedJobEntry(V1, { freezeGuard: t => (t.id === "a" ? { prefixes: ["work_dirs/p"], unknown: false } : { prefixes: [], unknown: false }) });
  const { report, transfers, jobs } = await entry.runWithReport();
  assert.equal(transfers.length, 0, "来源清单被冻结保护污染时不得上传任何文件");
  assert.equal(report.synced, 0);
  assert.match(report.errors[0], /来源 a 的本次冻结机器状态映射保护/);
  assert.equal(jobs[0].latestArtifactSync.state, "partial");
  assert.ok(!jobs[0].mirroredWorkerIds);
});
