/**
 * src/project/UnifiedDispatchAdmission.ts - 块B：本机统一派发准入的纯计算模块。
 *
 * 唯一同意入口的语义在这里成形，但本模块不做任何 IO/RPC/用户交互：调用方（legacy.ts 保存事务）
 * 在持有本项目队列写资源 + 统一派发逻辑资源锁的同一临界区内，传入自己即将落盘的队列、
 * 从登记表读到的成员队列快照与本机遥测/策略；本模块只回答“这批新意图里哪些能同意”，
 * 拒绝必须带真实原因。损坏成员队列/策略缺失一律不得当零占用或静默放行（主控批准方案§1/§3/§6）。
 *
 * 新意图的判定以“盘上基线 vs 即将写入”为唯一渠道，因此自动/旧兼容/pinned 同命令重试/
 * ready-manual/服务器队列共用同一入口且同命令重试天然不双计数（同 commandId 已在盘上=非新意图）。
 */
import { DistributedQueue, QueuedJob, QueuedPlan, jobHasLiveExecution } from "../features/DistributedPlanQueue";
import { GpuQuotaSettings, quotaPlacement } from "../features/GpuQuotaScheduling";

export type DispatchIntent = { planId: string; jobIndex: number; attempt: number; commandId: string; workerId: string; gpuId: string; manual: boolean };
export type DeniedIntent = DispatchIntent & { reason: string };
export type UnifiedAdmissionReceipt = { dispatchAdmission: true; intents: number; approved: DispatchIntent[]; denied: DeniedIntent[]; blockers: string[] };

export type UnifiedResourceTarget = { server: "local"; project: string; target: string };

/** 所有管理项目共用同一规范目标：本机 API 登记目录下的固定“统一派发”逻辑资源。 */
export function unifiedDispatchResource(apiDir: string): UnifiedResourceTarget {
  return { server: "local", project: apiDir, target: apiDir + "/unified-dispatch" };
}

/**
 * 逻辑服务器身份与 withRemoteActionResource 完全同构（host 小写 + SSH 端口），
 * 保证跨项目不同 worker 别名指向同一物理机时冲突判定一致；无 host 可解析时退回 workerId
 * （与既有资源锁语义一致），调用方对无法在别名表映射的 workerId 必须按未就绪拒绝而非猜测。
 */
export function logicalServerKey(setup: { workerHost?: string; hubHost?: string; host?: string; workerSshPort?: number; hubSshPort?: number; port?: number } | undefined,
  workerIdFallback: string): string {
  const host = String(setup?.workerHost || setup?.hubHost || setup?.host || workerIdFallback || "hub").toLowerCase();
  const port = Number(setup?.workerSshPort || setup?.hubSshPort || setup?.port || 22);
  return host + ":" + (Number.isFinite(port) ? port : 22);
}

const dispatchKey = (row: { planId: string; jobIndex: number; commandId: string }) => `${row.planId}|${row.jobIndex}|${row.commandId}`;

/** 回执中该意图是否被拒（调用方发送前过滤用；同 plan/job/command 精确匹配）。 */
export function dispatchAdmissionDenied(receipt: unknown, planId: string, jobIndex: number, commandId: string): boolean {
  const entry = receipt as { dispatchAdmission?: boolean; denied?: DeniedIntent[] } | undefined;
  if (!entry || entry.dispatchAdmission !== true || !Array.isArray(entry.denied)) return false;
  return entry.denied.some((row) => dispatchKey(row) === dispatchKey({ planId, jobIndex, commandId }));
}

function diskConsentMatches(diskJob: QueuedJob | undefined, job: QueuedJob): boolean {
  // 同 commandId 已在盘上处于 dispatching（或 p2 已核实未决的 unknown+startIntent）＝ 同命令重试，
  // 不消费新槽位；未知接收不重派/不释放的既有围栏负责其生命周期。
  if (!diskJob || !job.commandId) return false;
  if (diskJob.commandId !== job.commandId || diskJob.attempt !== job.attempt) return false;
  return diskJob.status === "dispatching"
    || job.lifecycleProtocol === 2 && diskJob.status === "unknown" && diskJob.startIntent?.commandId === job.commandId;
}

/** 即将写入的队列相对盘上基线新增的派发意图（含手动 stage=sent 与自动/pinned 重派候选）。 */
export function diffNewDispatchIntents(diskQueue: DistributedQueue, outgoingQueue: DistributedQueue): DispatchIntent[] {
  const diskPlans = new Map(diskQueue.plans.map((plan) => [plan.id, plan]));
  const intents: DispatchIntent[] = [];
  for (const plan of outgoingQueue.plans) {
    const diskPlan = diskPlans.get(plan.id);
    for (const job of plan.jobs) {
      if (job.status !== "dispatching" || !job.commandId || !job.workerId) continue;
      const diskJob = diskPlan?.jobs.find((row) => row.index === job.index && row.attempt === job.attempt);
      if (diskConsentMatches(diskJob, job)) continue;
      intents.push({ planId: plan.id, jobIndex: job.index, attempt: job.attempt, commandId: job.commandId,
        workerId: job.workerId, gpuId: String(job.gpuId ?? ""), manual: Boolean(job.manualDispatch) });
    }
  }
  return intents;
}

export type OccupancyResult = { occupancy: Map<string, Map<string, number>>;
  unmapped: Array<{ label: string; workerId: string; planId: string; jobIndex: number }> };

/**
 * 跨成员队列按逻辑服务器统计每卡占用。计入一切仍可能启动/运行/未核实的 job（含 Worker 可自启的
 * queued 与手动已同意 stage=sent 的未核实项）——不得照抄 memoryCounts 排除 queued 的口径，
 * 否则同一物理名额会被重复许给另一分支。手动 stage=ready（尚无 commandId）尚未消费槽位，不计。
 */
export function computeServerOccupancy(queues: Array<{ label: string; queue: DistributedQueue }>,
  aliasOf: (label: string, workerId: string) => string | undefined): OccupancyResult {
  const occupancy = new Map<string, Map<string, number>>();
  const unmapped: OccupancyResult["unmapped"] = [];
  for (const entry of queues) {
    for (const plan of entry.queue.plans) for (const job of plan.jobs) {
      if (!job.workerId || job.gpuId === undefined) continue;
      if (!jobHasLiveExecution(job)) continue;
      const server = aliasOf(entry.label, job.workerId);
      if (!server) { unmapped.push({ label: entry.label, workerId: job.workerId, planId: plan.id, jobIndex: job.index }); continue; }
      const perCard = occupancy.get(server) || new Map<string, number>();
      perCard.set(String(job.gpuId), (perCard.get(String(job.gpuId)) || 0) + 1);
      occupancy.set(server, perCard);
    }
  }
  return { occupancy, unmapped };
}

export type AdmitInput = {
  intents: DispatchIntent[];
  occupancy: Map<string, Map<string, number>>;
  /** worker 别名 → 逻辑服务器；undefined 表示本机当前配置映射不出来（该意图按未就绪拒绝）。 */
  serverOf: (intent: DispatchIntent) => string | undefined;
  /** 服务器 → 现有用户配额策略的已解析设置（quotaSettings 产物）；缺失=策略不可用，全拒。 */
  settingsForServer: (serverKey: string) => { settings: GpuQuotaSettings; rows: any[] } | undefined;
  blockers: string[];
};

/**
 * 逐服务器发放：以 quotaPlacement 的剩余槽位为准（保持现有 gpuJobsPerCard/逐卡 override/
 * gpuMaxConcurrentCards/gpuMinFreeMemoryGb 本义），按稳定顺序逐个发放并把已发意图计入占用，
 * 因此同 GPU 单槽并发申请只会同意一个；不同 GPU/多槽允许多个并行。任何阻断项存在时整批拒绝。
 */
export function admitDispatchIntents(input: AdmitInput): UnifiedAdmissionReceipt {
  const blockers = input.blockers.filter(Boolean);
  const approved: DispatchIntent[] = [];
  const denied: DeniedIntent[] = [];
  const ordered = [...input.intents].sort((a, b) => a.planId.localeCompare(b.planId) || a.jobIndex - b.jobIndex || a.commandId.localeCompare(b.commandId));
  if (blockers.length) {
    for (const intent of ordered) denied.push({ ...intent, reason: `统一派发域存在阻断项：${blockers.join("；")}` });
    return { dispatchAdmission: true, intents: ordered.length, approved, denied, blockers };
  }
  const granted = new Map<string, Map<string, number>>();
  const countsFor = (serverKey: string): Map<string, number> => {
    let live = granted.get(serverKey);
    if (!live) {
      live = new Map(input.occupancy.get(serverKey) || []);
      granted.set(serverKey, live);
    }
    return live;
  };
  for (const intent of ordered) {
    const serverKey = input.serverOf(intent);
    if (!serverKey) { denied.push({ ...intent, reason: `本机配置无法把 Worker「${intent.workerId}」映射为已配置的服务器身份；该分支未就绪，不猜测、不探测。` }); continue; }
    const placement = input.settingsForServer(serverKey);
    if (!placement) { denied.push({ ...intent, reason: `服务器 ${serverKey} 缺少已登记的统一配额策略；请先刷新统一策略。` }); continue; }
    const counts = countsFor(serverKey);
    const { slots, limits } = quotaPlacement(placement.rows, counts, placement.settings);
    if (slots.includes(intent.gpuId)) {
      counts.set(intent.gpuId, (counts.get(intent.gpuId) || 0) + 1);
      approved.push(intent);
      continue;
    }
    const limit = limits[intent.gpuId];
    const inUse = counts.get(intent.gpuId) || 0;
    const reason = limit === undefined
      ? `服务器 ${serverKey} 当前 GPU 遥测未见卡 ${intent.gpuId}（离线或配置已变）；留在本地等待重新核实。`
      : inUse >= limit
        ? `服务器 ${serverKey} GPU ${intent.gpuId} 的每卡配额已满（${inUse}/${limit}）；留在本地队列等待。`
        : `服务器 ${serverKey} 达到并发用卡上限或该卡暂不满足最低空闲显存要求；留在本地队列等待。`;
    denied.push({ ...intent, reason });
  }
  return { dispatchAdmission: true, intents: ordered.length, approved, denied, blockers };
}

function deniedResetFields(denied: DeniedIntent): Partial<QueuedJob> {
  // 与 resetUnsentDispatch 同形：pending + 保留 commandId 为 nextCommandId（同命令重试不换新身份），
  // 并清掉所有会伪装“已启动”的观察字段；绝不伪造发送或释放。
  return { status: "pending", workerId: undefined, gpuId: undefined, commandId: undefined, startIntent: undefined,
    runKey: undefined, lastDispatchAttemptAt: undefined, executionState: undefined, statusQueryError: undefined,
    lastObservedAt: undefined, nextCommandId: denied.commandId, blockReason: "统一派发等待配额：" + denied.reason };
}

function applyDeniedToJob(job: QueuedJob, plan: QueuedPlan, denied: DeniedIntent): QueuedJob | undefined {
  if (job.index !== denied.jobIndex || job.attempt !== denied.attempt || job.commandId !== denied.commandId) return undefined;
  if (job.status !== "dispatching") return undefined;
  const fields: Partial<QueuedJob> = { ...deniedResetFields(denied) };
  if (denied.manual) {
    // 手动/服务器队列：保留用户选定的 worker/GPU 放置，回到 stage=ready 等下一次统一准入。
    const placement = job.manualDispatch;
    if (placement) return { ...job, ...fields, manualDispatch: { ...placement, stage: "ready" },
      manualDispatchNotice: "已在统一队列中等待配额，保留所选服务器/GPU。" };
  }
  return { ...job, ...fields };
}

/** 把被拒意图从队列里剥回本地等待态（纯函数；用于即将序列化的最终队列对象）。 */
export function applyDeniedIntents(queue: DistributedQueue, denied: DeniedIntent[]): DistributedQueue {
  if (!denied.length) return queue;
  return { ...queue, plans: queue.plans.map((plan) => {
    const rows = denied.filter((row) => row.planId === plan.id);
    if (!rows.length) return plan;
    return { ...plan, jobs: plan.jobs.map((job) => {
      for (const deniedRow of rows) {
        const reset = applyDeniedToJob(job, plan, deniedRow);
        if (reset) return reset;
      }
      return job;
    }) };
  }) };
}

/**
 * 同一拒绝同步回调用方在内存里持有的队列对象（调用方发送循环与后续 save 继续用它）。
 * 逐对象定位后原地改写，避免“盘上已剥回、内存还写着 dispatching”的分裂状态。
 */
export function syncDeniedIntentsInPlace(liveQueue: DistributedQueue | undefined, denied: DeniedIntent[]): void {
  if (!liveQueue || !denied.length) return;
  for (const plan of liveQueue.plans) {
    const rows = denied.filter((row) => row.planId === plan.id);
    if (!rows.length) continue;
    for (const job of plan.jobs) for (const deniedRow of rows) {
      if (job.index !== deniedRow.jobIndex || job.attempt !== deniedRow.attempt || job.commandId !== deniedRow.commandId || job.status !== "dispatching") continue;
      const reset = applyDeniedToJob(job, plan, deniedRow);
      if (reset) Object.assign(job, reset);
    }
  }
}

/* ------------------------------------------------------------------ 策略/别名快照 */

export const UNIFIED_POLICY_FILE_NAME = "unified-dispatch-policy.json";
export const UNIFIED_SERVER_MAP_FILE_NAME = "unified-dispatch-servers.json";
export const UNIFIED_SNAPSHOT_MAX_BYTES = 4 * 1024 * 1024;

export type UnifiedPolicy = { schemaVersion: 1; savedAt: string; savedFromRoot: string;
  servers: Record<string, { workerId: string; inputs: UnifiedPolicyInputs }> };
export type UnifiedPolicyInputs = { global: Record<string, unknown>; worker: Record<string, unknown> };
export type UnifiedServerMap = { schemaVersion: 1; savedAt: string;
  roots: Record<string, { savedAt: string; aliases: Record<string, string> }> };

/** 配额策略的原始输入（未经 telemetry 迁移的输出比较会产生假漂移，必须比输入）。 */
export function buildPolicyInputs(globalConfig: Record<string, unknown>, workerConfig: Record<string, unknown>): UnifiedPolicyInputs {
  const pick = (row: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((key) => row[key] !== undefined).map((key) => [key, row[key]]));
  return { global: pick(globalConfig, ["gpuJobsPerCard", "gpuMinFreeMemoryGb"]),
    worker: pick(workerConfig, ["gpuQuotaConfigured", "gpuMemoryRatioEnabled", "gpuJobsPerCard", "gpuMinFreeMemoryGb", "gpuCardOverrides", "gpuMaxConcurrentCards"]) };
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const entries = Object.keys(value as Record<string, unknown>).sort().map((key) => JSON.stringify(key) + ":" + stableStringify((value as Record<string, unknown>)[key]));
  return "{" + entries.join(",") + "}";
}

export function policyInputsDrift(existing: UnifiedPolicyInputs | undefined, current: UnifiedPolicyInputs): boolean {
  if (!existing) return true;
  return stableStringify(existing) !== stableStringify(current);
}

export type PolicyMergeResult = { policy: UnifiedPolicy; conflicts: string[] };

/** 登记/刷新时的合并：已有服务器条目输入不同即记冲突并保留原条目（漂移会在准入时如实阻断）。 */
export function mergePolicyServers(existing: UnifiedPolicy | null, incoming: UnifiedPolicy): PolicyMergeResult {
  const servers: UnifiedPolicy["servers"] = { ...(existing?.servers || {}) };
  const conflicts: string[] = [];
  for (const [key, row] of Object.entries(incoming.servers)) {
    const prior = servers[key];
    if (!prior) { servers[key] = row; continue; }
    if (policyInputsDrift(prior.inputs, row.inputs)) conflicts.push(`服务器 ${key} 已有策略快照与当前配置不同（保留原快照；如需换策略请显式刷新统一策略）`);
  }
  return { policy: { schemaVersion: 1, savedAt: existing?.savedAt || incoming.savedAt, savedFromRoot: existing?.savedFromRoot || incoming.savedFromRoot, servers }, conflicts };
}

export function mergeServerMapRoots(existing: UnifiedServerMap | null, rootKey: string, aliases: Record<string, string>, now: string): UnifiedServerMap {
  const roots = { ...(existing?.roots || {}) };
  roots[rootKey] = { savedAt: now, aliases };
  return { schemaVersion: 1, savedAt: now, roots };
}

/** 只接受形状正确的快照；损坏/未知结构按 corrupt 处理，绝不当空表放行。 */
export function parseUnifiedPolicy(text: string): UnifiedPolicy | "corrupt" | null {
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.servers !== "object" || parsed.servers === null || Array.isArray(parsed.servers)) return "corrupt";
    for (const [key, row] of Object.entries(parsed.servers as Record<string, any>)) {
      if (!key || !row || typeof row !== "object" || typeof row.workerId !== "string" || !row.inputs || typeof row.inputs !== "object") return "corrupt";
    }
    return parsed as UnifiedPolicy;
  } catch { return "corrupt"; }
}

export function parseUnifiedServerMap(text: string): UnifiedServerMap | "corrupt" | null {
  if (!text.trim()) return null;
  try {
    const parsed = JSON.parse(text);
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.roots !== "object" || parsed.roots === null || Array.isArray(parsed.roots)) return "corrupt";
    for (const row of Object.values(parsed.roots as Record<string, any>))
      if (!row || typeof row !== "object" || !row.aliases || typeof row.aliases !== "object" || Array.isArray(row.aliases)) return "corrupt";
    return parsed as UnifiedServerMap;
  } catch { return "corrupt"; }
}
