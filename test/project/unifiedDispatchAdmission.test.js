/**
 * 块B：本机统一派发准入（纯判定模块 + 真实两进程资源锁互斥 + 临时 Git/登记表隔离）。
 *
 * 变更前的缺失行为（先记录，再断言新行为）：
 * - 每个项目窗口只按自己的队列分配 GPU；跨项目/跨分支的同卡并发申请互不知晓，同一物理名额
 *   可被重复许诺；手动/服务器队列在“忙卡可用”下可无限绕过任何本机统一口径。
 * - 没有任何“先持久化同意、后唯一 POST”的跨项目共同入口，也没有防旁路的发送前身份核对。
 *
 * 本文件断言的最小行为集合（与批准方案§1/§3/§4/§5/§6 一一对应）：
 * 1) 逻辑服务器身份与 withRemoteActionResource 同构：不同别名同机同端口=同一服务器（会冲突）。
 * 2) 新意图=“盘上基线 vs 即将写入”差异；同 commandId 重试零新意图（不双计数）。
 * 3) 同 GPU 单槽并发只发放一个；多槽/多卡允许并行；已同意未决与 Worker 可自启的 queued 占槽
 *    （不照抄 memoryCounts 排除 queued 的口径）；手动 stage=ready 未消费槽位。
 * 4) 阻断项（损坏成员/缺策略/未映射别名）整批如实拒绝，绝不静默当零占用。
 * 5) 被拒意图剥回 pending/ready：保留所选放置与 nextCommandId（同命令重试），无伪造发送。
 * 6) 策略快照：损坏拒绝解析；合并不覆盖已有服务器条目并报告冲突；漂移按原始输入判定。
 * 7) 真实两进程对固定“统一派发”资源目标的互斥（各自独立进程，同临时登记目录，不写科研内容）。
 * 8) 登记表库存（registryInventory）在真实临时 Git 夹具上工作且不动任何提交。
 *
 * 需要真实 git 子进程与两 node 进程（互斥/隔离语义本身是被测行为），因此作为新功能域新建本文件；
 * 手动通道对回执的响应扩在 test/features/manualJobDispatch.test.js。Linux 端不运行本套件。
 */
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { after, test } = require("node:test");

const admission = require("../../dist/project/UnifiedDispatchAdmission.js");
const { quotaSettings } = require("../../dist/features/GpuQuotaScheduling.js");
const { ResourceOperationLeaseManager } = require("../../dist/core/ResourceOperationLease.js");
const { BranchProjectStore } = require("../../dist/project/BranchProjectStore.js");
const { BranchProjectService } = require("../../dist/project/BranchProjectService.js");
const DPQ = require("../../dist/features/DistributedPlanQueue.js");

const tempDirs = [];
function tempDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}
// FIXTURE POLICY: zero cleanup — retained for audit（与仓库 2026-10-23 策略一致）。
after(() => {
  for (const dir of tempDirs) console.log(`[fixtures retained, no cleanup] ${dir}`);
});

const gpuRows = (ids) => ids.map((id) => ({ index: String(id), memoryTotalMb: 40960, memoryUsedMb: 1024 }));
const settings = (jobsPerCard, extra = {}) => quotaSettings({ gpuJobsPerCard: jobsPerCard }, { gpuQuotaConfigured: true, gpuJobsPerCard: jobsPerCard, ...extra }, gpuRows([0, 1]));

const intent = (over = {}) => ({ planId: "plan-a", jobIndex: 0, attempt: 0, commandId: "cmd-0", workerId: "w1", gpuId: "0", manual: false, ...over });
const queueWith = (jobs) => ({ schemaVersion: 1, plans: [{ id: "plan-a", planFile: "experiments/plans/a.yaml", revision: "r", codeFingerprint: "f",
  resultPathPolicy: "declared", jobs: jobs.map((job, index) => ({ index, attempt: 0, status: "pending", case: "c", seed: 1, outputDir: "work/j" + index, ...job }))] });
const dispatched = (over = {}) => ({ status: "dispatching", workerId: "w1", gpuId: "0", commandId: "cmd-0", lifecycleProtocol: 2, startIntent: { commandId: "cmd-0", workerId: "w1", gpuId: "0" }, ...over });

test("逻辑服务器身份：不同别名同机同端口=同一服务器；端口/主机不同则不同；大小写无关", () => {
  const a = admission.logicalServerKey({ workerHost: "GPU-SERVER-A", workerSshPort: 22 }, "workerX");
  const b = admission.logicalServerKey({ workerHost: "gpu-server-a", workerSshPort: 22 }, "workerY");
  const c = admission.logicalServerKey({ workerHost: "gpu-server-a", workerSshPort: 2222 }, "workerX");
  assert.equal(a, b, "跨项目别名不同但物理机相同必须映射为同一逻辑服务器");
  assert.notEqual(a, c);
  assert.equal(a, "gpu-server-a:22");
  const resource = admission.unifiedDispatchResource("C:/Users/x/AppData/Roaming/SimpleExperiment");
  assert.equal(resource.server, "local");
  assert.match(resource.target, /unified-dispatch$/);
});

test("新意图以盘上基线差异为唯一渠道：首发计 1，同命令重试计 0，手动 sent 标记 manual", () => {
  const disk = queueWith([{ status: "pending" }]);
  const outgoing = queueWith([dispatched()]);
  let intents = admission.diffNewDispatchIntents(disk, outgoing);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].commandId, "cmd-0");
  // 同命令重试：盘上已 dispatching 同 commandId → 不再生成新意图，天然不双计数。
  intents = admission.diffNewDispatchIntents(outgoing, DPQ.cloneDistributedQueue(outgoing, "sig"));
  assert.deepEqual(intents, []);
  // p2 unknown+startIntent 同命令（pinned 重试）同样不是新意图。
  const unresolved = queueWith([{ status: "unknown", workerId: "w1", gpuId: "0", commandId: "cmd-0", lifecycleProtocol: 2, startIntent: { commandId: "cmd-0", workerId: "w1", gpuId: "0" } }]);
  assert.deepEqual(admission.diffNewDispatchIntents(unresolved, DPQ.cloneDistributedQueue(unresolved, "sig")), []);
  const manual = queueWith([dispatched({ manualDispatch: { workerId: "w1", gpuId: "0", stage: "sent" } })]);
  const manualIntents = admission.diffNewDispatchIntents(disk, manual);
  assert.equal(manualIntents.length, 1);
  assert.equal(manualIntents[0].manual, true);
});

test("同 GPU 单槽两个并发申请只发放一个；多槽与多卡允许并行；等待原因带真实配额事实", () => {
  const base = { serverOf: () => "srv:22", settingsForServer: () => ({ settings: settings(1), rows: gpuRows([0, 1]) }), blockers: [], occupancy: new Map() };
  const two = [intent(), intent({ planId: "plan-b", jobIndex: 3, commandId: "cmd-3" })];
  let receipt = admission.admitDispatchIntents({ ...base, intents: two });
  assert.equal(receipt.approved.length, 1);
  assert.equal(receipt.denied.length, 1);
  assert.match(receipt.denied[0].reason, /配额已满（1\/1）/);
  // 第二个批准后，占用被计入：再来一发同样被拒（不会把同一槽重复许诺）。
  receipt = admission.admitDispatchIntents({ ...base, intents: [intent({ commandId: "cmd-9", jobIndex: 9 })],
    occupancy: new Map([["srv:22", new Map([["0", 1]])]]) });
  assert.equal(receipt.approved.length, 0);
  // 多槽（jobsPerCard=2）：同卡两个并行。
  const parallel = admission.admitDispatchIntents({ ...base, intents: two, settingsForServer: () => ({ settings: settings(2), rows: gpuRows([0, 1]) }) });
  assert.equal(parallel.approved.length, 2);
  // 不同 GPU：单槽也允许并行。
  const spread = admission.admitDispatchIntents({ ...base, intents: [intent(), intent({ jobIndex: 1, commandId: "cmd-1", gpuId: "1" })] });
  assert.equal(spread.approved.length, 2);
  // 无遥测行 → 不猜容量，如实全部等待。
  const blind = admission.admitDispatchIntents({ ...base, intents: [intent()], settingsForServer: () => ({ settings: settings(1), rows: [] }) });
  assert.equal(blind.approved.length, 0);
  assert.match(blind.denied[0].reason, /遥测未见卡/);
});

test("占用统计：queued 可自启与手动 sent 占槽；手动 ready 未消费；损坏/未映射不得静默当零", () => {
  const own = queueWith([dispatched({ executionState: "queued" }),
    { status: "pending", nextCommandId: "n1", manualDispatch: { workerId: "w1", gpuId: "1", stage: "ready" } }]);
  const member = queueWith([{ status: "dispatching", workerId: "wM", gpuId: "0", commandId: "m-1", manualDispatch: { workerId: "wM", gpuId: "0", stage: "sent" } },
    { status: "running", workerId: "wUnknown", gpuId: "1", commandId: "m-2" }]);
  const result = admission.computeServerOccupancy(
    [{ label: "own", queue: own }, { label: "member", queue: member }],
    (label, workerId) => label === "own" && workerId === "w1" ? "srv:22" : label === "member" && workerId === "wM" ? "srv:22" : undefined);
  assert.equal(result.occupancy.get("srv:22").get("0"), 2, "own queued(可自启) + member 手动 sent 都占槽");
  assert.equal(result.occupancy.get("srv:22").get("1"), undefined, "手动 ready 未消费槽位");
  assert.equal(result.unmapped.length, 1);
  assert.equal(result.unmapped[0].workerId, "wUnknown");
  // 存在未映射/阻断项时整批拒绝，绝不按零占用放行。
  const receipt = admission.admitDispatchIntents({ intents: [intent()], occupancy: result.occupancy,
    serverOf: () => "srv:22", settingsForServer: () => ({ settings: settings(1), rows: gpuRows([0, 1]) }),
    blockers: ["成员队列不可读/已损坏（repo-b）；相关派发已拒绝。"] });
  assert.equal(receipt.approved.length, 0);
  assert.equal(receipt.denied.length, 1);
  assert.match(receipt.denied[0].reason, /阻断项/);
  // 别名映射不出来的意图按未就绪拒绝，不猜测。
  const unmapped = admission.admitDispatchIntents({ intents: [intent()], occupancy: new Map(),
    serverOf: () => undefined, settingsForServer: () => ({ settings: settings(1), rows: gpuRows([0, 1]) }), blockers: [] });
  assert.match(unmapped.denied[0].reason, /未就绪，不猜测/);
});

test("被拒意图剥回 pending/ready：保留放置与 nextCommandId，同命令重试不换新身份，绝不伪造发送", () => {
  const denied = [{ ...intent({ manual: true }), reason: "GPU 0 配额已满" }];
  const queue = queueWith([dispatched({ lifecycleProtocol: 2,
    manualDispatch: { workerId: "w1", gpuId: "0", stage: "sent", origin: "server_queue", batchId: "b1" } })]);
  const stripped = admission.applyDeniedIntents(queue, denied);
  const job = stripped.plans[0].jobs[0];
  assert.equal(job.status, "pending");
  assert.equal(job.commandId, undefined);
  assert.equal(job.nextCommandId, "cmd-0", "保留原命令身份供同命令重试");
  assert.equal(job.manualDispatch.stage, "ready", "手动/服务器队列回到 ready，保留所选服务器/GPU");
  assert.equal(job.manualDispatch.workerId, "w1");
  assert.match(job.blockReason, /统一派发等待配额/);
  // 原地同步（发送方继续持有的同一队列对象）。
  admission.syncDeniedIntentsInPlace(queue, denied);
  assert.equal(queue.plans[0].jobs[0].status, "pending");
  assert.equal(queue.plans[0].jobs[0].manualDispatch.stage, "ready");
  // 身份不匹配的 job 绝不被动。
  const other = queueWith([{ status: "dispatching", workerId: "w1", gpuId: "0", commandId: "other-cmd", lifecycleProtocol: 2 }]);
  assert.equal(admission.applyDeniedIntents(other, denied).plans[0].jobs[0].status, "dispatching");
  // 非手动剥回清 startIntent 并保留 nextCommandId（与 resetUnsentDispatch 同形）。
  const auto = admission.applyDeniedIntents(queueWith([dispatched()]), [intent()]);
  assert.equal(auto.plans[0].jobs[0].startIntent, undefined);
  assert.equal(auto.plans[0].jobs[0].nextCommandId, "cmd-0");
  // 回执过滤语义。
  assert.equal(admission.dispatchAdmissionDenied({ dispatchAdmission: true, denied }, "plan-a", 0, "cmd-0"), true);
  assert.equal(admission.dispatchAdmissionDenied({ dispatchAdmission: true, denied }, "plan-a", 0, "other"), false);
  assert.equal(admission.dispatchAdmissionDenied(undefined, "plan-a", 0, "cmd-0"), false);
});

test("策略快照：损坏拒绝、合并不覆盖已有条目、漂移按原始输入判定（不受遥测迁移输出影响）", () => {
  assert.equal(admission.parseUnifiedPolicy(""), null);
  assert.equal(admission.parseUnifiedPolicy("{not json"), "corrupt");
  assert.equal(admission.parseUnifiedPolicy(JSON.stringify({ schemaVersion: 2, servers: {} })), "corrupt");
  const inputs = admission.buildPolicyInputs({ gpuJobsPerCard: 2, gpuMinFreeMemoryGb: 30, unrelated: "x" },
    { gpuQuotaConfigured: true, gpuJobsPerCard: 2, gpuMaxConcurrentCards: 4, unrelated: "y" });
  assert.deepEqual(Object.keys(inputs.global).sort(), ["gpuJobsPerCard", "gpuMinFreeMemoryGb"]);
  assert.equal(inputs.worker.unrelated, undefined);
  const policy = { schemaVersion: 1, savedAt: "t", savedFromRoot: "R", servers: { "gpu-a:22": { workerId: "w1", inputs } } };
  assert.deepEqual(admission.parseUnifiedPolicy(JSON.stringify(policy)), policy);
  const changed = admission.buildPolicyInputs({ gpuJobsPerCard: 3 }, { gpuQuotaConfigured: true });
  assert.equal(admission.policyInputsDrift(inputs, inputs), false);
  assert.equal(admission.policyInputsDrift(inputs, changed), true);
  const merged = admission.mergePolicyServers(policy, { schemaVersion: 1, savedAt: "t2", savedFromRoot: "R2",
    servers: { "gpu-a:22": { workerId: "w1", inputs: changed }, "gpu-b:22": { workerId: "w2", inputs: changed } } });
  assert.deepEqual(merged.policy.servers["gpu-a:22"].inputs, inputs, "已有条目保留，不被静默覆盖");
  assert.equal(merged.policy.servers["gpu-b:22"].workerId, "w2");
  assert.equal(merged.conflicts.length, 1);
  const map = admission.mergeServerMapRoots(null, "d:/repo-a", { workerX: "gpu-a:22" }, "t");
  const map2 = admission.mergeServerMapRoots(map, "d:/repo-b", { workerY: "gpu-a:22" }, "t2");
  assert.deepEqual(map2.roots["d:/repo-a"].aliases, { workerX: "gpu-a:22" });
  assert.deepEqual(admission.parseUnifiedServerMap(JSON.stringify(map2)), map2);
  assert.equal(admission.parseUnifiedServerMap("[]"), "corrupt");
});

test("真实两进程：同一固定统一派发资源目标上的保存临界区互斥（独立进程，同临时登记目录）", async () => {
  const dir = tempDir("se-unified-lease-");
  const leasePath = path.join(dir, "host-operation-lease.json");
  const apiDir = path.join(dir, "api");
  fs.mkdirSync(apiDir, { recursive: true });
  const logFile = path.join(dir, "interleave.log");
  const childScript = path.join(dir, "child.js");
  fs.writeFileSync(childScript, [
    "const fs = require('node:fs');",
    "const os = require('node:os');",
    "const [leasePath, apiDir, id, holdMs, logFile, leaseMod, admissionMod] = process.argv.slice(1);",
    "const { ResourceOperationLeaseManager } = require(leaseMod);",
    "const { unifiedDispatchResource } = require(admissionMod);",
    "(async () => {",
    "  const manager = new ResourceOperationLeaseManager({ leasePath, windowId: os.hostname() + ':' + process.pid + ':t-' + id, ttlMs: 30000, heartbeatMs: 1000 });",
    "  await manager.run({ pluginId: 'p.test', workspaceUri: 'ws', hostProjectPath: apiDir, actionType: 'unified-dispatch', actionLabel: 'test', waitForConflict: true,",
    "    resources: [unifiedDispatchResource(apiDir)] }, async () => {",
    "    fs.appendFileSync(logFile, 'hold ' + id + '\\n');",
    "    await new Promise(resolve => setTimeout(resolve, Number(holdMs)));",
    "    fs.appendFileSync(logFile, 'exit ' + id + '\\n');",
    "  });",
    "})().catch(error => { fs.appendFileSync(logFile, 'error ' + id + ' ' + error.message + '\\n'); process.exitCode = 1; });",
    ""].join("\n"), "utf8");
  const distDir = path.join(__dirname, "..", "..", "dist");
  const start = (id) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [childScript, leasePath, apiDir, id, "600", logFile,
      path.join(distDir, "core/ResourceOperationLease.js"), path.join(distDir, "project/UnifiedDispatchAdmission.js")], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => resolve({ id, code, stderr }));
  });
  const results = await Promise.all([start("A"), start("B")]);
  for (const row of results) assert.equal(row.code, 0, `子进程 ${row.id} 异常退出：${row.stderr}`);
  const lines = fs.readFileSync(logFile, "utf8").trim().split(/\r?\n/).filter((line) => !line.startsWith("error"));
  const holds = lines.filter((line) => line.startsWith("hold"));
  assert.equal(holds.length, 2, "两个进程都必须进入临界区（waitForConflict 排队而不是失败）");
  // 互斥证明：hold 与 exit 必须严格成对，不得交错。
  const pairs = lines.map((line) => line.split(" ")[0] + ":" + line.split(" ")[1]).join(",");
  assert.ok(/^hold:[AB],exit:[AB],hold:[AB],exit:[AB]$/.test(pairs)
    && pairs.split(",")[0].split(":")[1] === pairs.split(",")[1].split(":")[1]
    && pairs.split(",")[2].split(":")[1] === pairs.split(",")[3].split(":")[1],
  `统一派发资源上的两进程临界区不得交错：${pairs}`);
});

test("登记表库存在真实临时 Git 夹具上工作：两个登记根=统一域基数，且不动任何提交", async () => {
  const { execFileSync } = require("node:child_process");
  const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_ATTR_NOSYSTEM: "1" } });
  const makeRepo = (name) => {
    const dir = tempDir(`se-unified-${name}-`);
    git(["init", "-q", dir], dir);
    git(["checkout", "-q", "-B", "main"], dir);
    git(["-c", "user.email=t@example.invalid", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "base"], dir);
    return dir;
  };
  const ancestor = makeRepo("ancestor");
  const branch = makeRepo("branch");
  const beforeHead = git(["rev-parse", "HEAD"], ancestor).trim();
  const service = new BranchProjectService(new BranchProjectStore(path.join(tempDir("se-unified-store-"), "branch-projects.json")), () => ancestor);
  const ancestorRecord = await service.registerAncestor({ label: "", gitRoot: ancestor });
  const ancestorRow = service.registryInventory();
  assert.deepEqual(ancestorRow.ancestors.map((row) => path.normalize(row)), [path.normalize(ancestor)]);
  assert.deepEqual(ancestorRow.branches, []);
  await service.registerBranch({ ancestorId: ancestorRecord.id, label: "", workspaceRoot: branch });
  const inventory = service.registryInventory();
  assert.equal(inventory.ancestors.length + inventory.branches.length, 2, "两登记根=≥2 的统一域基数");
  assert.equal(git(["rev-parse", "HEAD"], ancestor).trim(), beforeHead, "库存读取绝不动提交");
});
