const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs/promises"), path = require("node:path"), os = require("node:os"), crypto = require("node:crypto");
require("../_helpers/registerTsRequire");
const { runAllPlans } = require("../../src/extension/SelectedPlanBatchHost.ts");
const { planSubmissionBatchFor } = require("../../src/features/PlanSubmissionBatch.ts");

// 2026-10-21 09:04 真实故障回放（RUN_OUTPUTS_TRANSFER_BUSY，后续 8 个未提交）。根因在配套侧把只读观测算成忙
// （见 B 仓库 test/cleanupReadObserverAdmission.test.js 与跨仓探针），本文件只管 A 的批次边界：
// 同一批同源代码对每个实际 Worker 目标只同步一次、跨 PLAN 校验与身份互不借用、
// 失败/取消/切项目/换目标根或范围后尚未启动的 PLAN 停止，已在途的如实保留，不自动回滚也不重放。

const fingerprintA = "a".repeat(64);
const fingerprintB = "b".repeat(64);

async function makeHost(planFiles, { workers = ["nwpu3", "nwpu5"], fingerprint = fingerprintA } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "plan-batch-"));
  const plans = [];
  for (const file of planFiles) {
    const content = "plan: " + file + "\njobs: []\n";
    await fs.mkdir(path.join(root, path.dirname(file)), { recursive: true });
    await fs.writeFile(path.join(root, file), content, "utf8");
    plans.push({ planFile: file, revision: crypto.createHash("sha256").update(content).digest("hex") });
  }
  const revisionOf = file => (plans.find(plan => plan.planFile === file) || {}).revision || "";
  const host = {
    root, plans, workers, fingerprint,
    localPlanMetadata: { plans },
    localOperations: {},
    syncCalls: [], workerSyncs: [], submitted: [], order: [], reports: [],
    active: 0, peak: 0,
    contextChanged: false, syncFails: false, failOn: "", cancelOn: "", changeFingerprintAfter: "", changeTargetsAfter: "", gateOn: "",
    lastCodeSyncState: undefined,
    enabledWorkerConfigs: () => host.workers.map(id => ({ id })),
    captureProjectContext: () => ({ root }),
    projectContextIsCurrent: context => context.root === root && !host.contextChanged,
    effectiveConnectionMode: () => "worker",
    workerActionTargets: () => host.workers.map(id => ({ id, host: id + ".invalid", port: 22, user: "u",
      project_dir: host.targetsSuffix ? "/remote/" + id + "/moved" : "/remote/" + id,
      local_agent_url: "http://127.0.0.1:19766", agent_runtime_dir: "/rt", conda_env: "lab" })),
    targetsSuffix: false,
    refreshLocalPlanMetadataForAction: async () => {},
    distributedPlanEligible: () => true,
    postUiCommandStatus: (_id, _state, _command, text) => { host.reports.push(String(text)); },
    planSubmissionOperationId: message => "op:" + message.planFile,
    finishPlanSubmissionProgress: () => {},
    localDistributedCodeFingerprint: async () => host.fingerprint,
    // 生产里这一次调用会把同一份代码同步到全部已启用 Worker；这里逐 Worker 记账，供“每个实际目标只同步一次”计数。
    ensureCodeReadyForRun: async (_context, bodies) => {
      host.syncCalls.push({ bodies: Array.isArray(bodies) ? bodies.length : 0 });
      if (host.syncFails) throw new Error("SimpleSFTP upload.workspace：传输已取消");
      for (const worker of host.workers) host.workerSyncs.push({ worker, fingerprint: host.fingerprint });
      host.lastCodeSyncState = { fingerprint: host.fingerprint,
        workerVersions: Object.fromEntries(host.workers.map(id => [id, { fingerprint: host.fingerprint }])) };
    },
    planSubmissionBatchFor,
    runActionCommand: async (_command, message) => {
      host.active += 1;
      host.peak = Math.max(host.peak, host.active);
      host.order.push(message.planFile);
      try {
        const batch = planSubmissionBatchFor(message);
        const body = { planFile: message.planFile, planRevision: revisionOf(message.planFile) };
        const code = batch ? await batch.prepareCode(body) : await host.localDistributedCodeFingerprint(root);
        host.submitted.push({ planFile: message.planFile, code });
        if (host.changeFingerprintAfter === message.planFile) host.fingerprint = fingerprintB;
        if (host.changeTargetsAfter === message.planFile) host.targetsSuffix = true;
        if (host.cancelOn === message.planFile) {
          const error = new Error("用户已取消本次替换"); error.apiData = { code: "REPLACEMENT_CANCELLED" }; throw error;
        }
        if (host.failOn === message.planFile) throw new Error("该 PLAN 的远端核对失败");
        host.localOperations[host.planSubmissionOperationId(message)] = { status: "queued", message: "已进入队列" };
        // 门殫：只有“触发变化的那个 PLAN”跑完并设好标记后，其余在途 PLAN 才放行。
        // 没这道门时，5 个 PLAN × 有限泳道下“谁先跑完”是调度随机事件（Linux 上恰好 a 先完成，
        // Windows 上不保证），“尾部 PLAN 不得提交”就变成赌时间的假回归。
        if (host.gateOn && message.planFile !== host.gateOn) await host.gate;
        await new Promise(resolve => setImmediate(resolve));
        return { status: "queued" };
      } finally {
        host.active -= 1;
        if (host.contextAfter === message.planFile) host.contextChanged = true;
        if (host.gateOn === message.planFile) host.releaseGate();
      }
    },
  };
  host.gate = new Promise(resolve => { host.releaseGate = resolve; });
  return host;
}

test("同批 3 个 PLAN：同一份代码对每个实际 Worker 只同步一次，跨 PLAN 不重传", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml"];
  const host = await makeHost(host_files(files));
  const result = await runAllPlans(host, { clientActionId: "batch-1" });
  assert.equal(host.syncCalls.length, 1, "同批同源代码只能触发一次批量同步，不能每 PLAN 重传");
  assert.equal(host.workerSyncs.length, 2, "一次批次要覆盖全部已启用 Worker，且每个目标各一次");
  assert.deepEqual(host.workerSyncs.map(row => row.worker).sort(), ["nwpu3", "nwpu5"], "不能只同步第一个 Worker");
  assert.equal(new Set(host.workerSyncs.map(row => row.fingerprint)).size, 1, "同一批只能同步同一份代码指纹");
  assert.equal(host.peak <= 4 && host.peak >= 1, true, "保持既有有界并发派发");
  assert.deepEqual(result.rows.map(row => row.planFile), files, "行必须按 PLAN 快照顺序回报");
  assert.equal(result.status, "completed");
  assert.deepEqual([...new Set(host.submitted.map(row => row.code))], [fingerprintA], "混版本一律不允许");
  assert.equal(new Set(host.order).size, files.length, "同一 PLAN 不得重复提交");
});

test("多 Worker 目标数与同步次数解耦：6 个 PLAN、3 个 Worker 仍只 1 次批量同步", async () => {
  const files = Array.from({ length: 6 }, (_unused, index) => "plans/p" + index + ".yaml");
  const host = await makeHost(host_files(files), { workers: ["nwpu3", "nwpu5", "nwpu216"] });
  const result = await runAllPlans(host, { clientActionId: "batch-2" });
  assert.equal(host.syncCalls.length, 1);
  assert.equal(host.workerSyncs.length, 3, "每个 Worker 目标各一次，不多不少");
  assert.equal(host.peak <= 4, true);
  assert.equal(result.status, "completed");
  assert.equal(result.rows.length, 6);
});

test("代码指纹中途变化：未启动的 PLAN 停止，已在途如实保留，绝不混版本也不重复同步", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml", "plans/d.yaml", "plans/e.yaml"];
  const host = await makeHost(host_files(files));
  host.changeFingerprintAfter = "plans/a.yaml";
  host.gateOn = "plans/a.yaml";
  const result = await runAllPlans(host, { clientActionId: "batch-3" });
  assert.deepEqual([...new Set(host.submitted.map(row => row.code))], [fingerprintA], "变化后不得再提交旧批 PLAN");
  const changed = result.rows.filter(row => row.status === "failed");
  assert.ok(changed.length >= 1, "指纹变化必须显式失败，不能静默跳过");
  for (const row of changed) assert.match(row.message, /代码或同步范围已变化/);
  assert.equal(host.syncCalls.length, 1, "中途变化不能顺手再同步一次");
  assert.equal(result.rows.some(row => row.status === "succeeded" || row.status === "queued"), true, "已在途的 PLAN 如实保留，不自动回滚");
});

test("同步失败不冒充已同步、不缓存成功、不自动重发", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml"];
  const host = await makeHost(host_files(files));
  host.syncFails = true;
  const result = await runAllPlans(host, { clientActionId: "batch-4" });
  assert.deepEqual(host.submitted, [], "代码同步没成功就不能提交任何 PLAN");
  assert.equal(host.syncCalls.length, 1, "同一批不自动重发");
  assert.equal(result.rows.every(row => row.status === "failed"), true, "不能把失败写成排队或成功");
  assert.equal(result.status, "failed");
  assert.match(result.rows[0].message, /传输已取消/);
});

test("用户取消按取消回报，不伪称成功，也不再启动后续 PLAN", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml", "plans/d.yaml", "plans/e.yaml"];
  const host = await makeHost(host_files(files));
  host.cancelOn = "plans/a.yaml";
  const result = await runAllPlans(host, { clientActionId: "batch-5" });
  const cancelled = result.rows.filter(row => row.status === "cancelled");
  assert.ok(cancelled.length >= 1, "取消必须回报为 cancelled");
  assert.equal(result.status, "cancelled");
  assert.equal(result.rows.some(row => row.status === "succeeded" && row.planFile === "plans/a.yaml"), false, "被取消的 PLAN 不得记成功");
});

test("切换工作区后未启动的 PLAN 不提交，已在途的如实保留", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml", "plans/d.yaml", "plans/e.yaml"];
  const host = await makeHost(host_files(files));
  host.contextAfter = "plans/a.yaml";
  host.gateOn = "plans/a.yaml";
  const result = await runAllPlans(host, { clientActionId: "batch-6" });
  const stopped = result.rows.find(row => row.status === "failed");
  assert.match(stopped.message, /工作区或连接已变化/);
  assert.equal(host.order.includes("plans/e.yaml"), false, "变化后尚未启动的 PLAN 不得提交");
  assert.equal(new Set(host.order).size, host.order.length, "停止后不得重复提交同一 PLAN");
  assert.equal(host.submitted.includes ? host.submitted.length >= 1 : true, true, "已在途的 PLAN 不会被撤销或重放");
  assert.match(String(result.message), /未提交/);
});

test("Worker 目标根变化同样停止后续，不复用已确认的目标", async () => {
  const files = ["plans/a.yaml", "plans/b.yaml", "plans/c.yaml", "plans/d.yaml", "plans/e.yaml"];
  const host = await makeHost(host_files(files));
  host.changeTargetsAfter = "plans/a.yaml";
  host.gateOn = "plans/a.yaml";
  const result = await runAllPlans(host, { clientActionId: "batch-7" });
  assert.match(result.rows.find(row => row.status === "failed").message, /工作区或连接已变化/);
  assert.equal(host.syncCalls.length, 1, "目标根变化后不再补一次同步，只停批");
});

test("下一个独立批次重新核验并重新同步，不复用上一批的成功证明", async () => {
  const files = ["plans/a.yaml"];
  const first = await makeHost(host_files(files));
  await runAllPlans(first, { clientActionId: "batch-8a" });
  const second = await makeHost(host_files(files), { fingerprint: fingerprintB });
  await runAllPlans(second, { clientActionId: "batch-8b" });
  assert.equal(first.syncCalls.length, 1);
  assert.equal(second.syncCalls.length, 1, "新批次必须重新核验同一目标");
  assert.deepEqual(second.workerSyncs.map(row => row.fingerprint), [fingerprintB, fingerprintB], "不同代码版本不得复用上一批证明");
});

function host_files(files) { return files; }
