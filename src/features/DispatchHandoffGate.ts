/**
 * 代码写入／派发交接 gate。
 *
 * 这里只放纯状态与纯函数：既不等待整轮 tick，也不把 `distributedQueueWritePromise`
 * 或“准入保存已完成”当成安全证据。所有权规则：
 * - 同步请求在任何 await 之前登记“禁止新派发”意图，派发侧进入 gate 时重新查询该意图；
 * - 交接所有权从准入意图落盘开始，覆盖代码证明准备、真实发送或明确未发送、本机回执提交；
 * - 已开始发送或结果未知的所有权只有真实提交或明确未发送证据才能释放，等待超时不释放；
 * - 每个 Worker 的上传状态独立记录，不折叠成“全部成功”的单一布尔。
 * tick 阶段账本与交接所有权分别记录，不混为“派发中”。
 */

export type WorkerUploadState = "uploading" | "uploaded" | "unknown-failed";
export type DispatchHandoffPhase = "admission-intent-save" | "code-proof-prepare" | "transmission" | "local-receipt-commit";
export type HandoffOutcome = "committed" | "unsent-released" | "round-ended";

export const HANDOFF_PHASES: DispatchHandoffPhase[] = [
  "admission-intent-save", "code-proof-prepare", "transmission", "local-receipt-commit",
];

export interface CodeUploadIntent {
  uploadId: string;
  root: string;
  scope: string;
  startedAtMs: number;
  /** 本次上传要写入的目标；只有本次上传中确认写入完成的 Worker 才重新放行新派发。 */
  workerIds: string[];
}

export interface WorkerUploadRecord {
  uploadId: string;
  root: string;
  workerId: string;
  state: WorkerUploadState;
  startedAtMs: number;
  updatedAtMs: number;
  error?: string;
  /** 上一轮未确认写入的失败详情；新一轮可以推进真实证据，但旧失败不会被抹掉。 */
  previousUnknownError?: string;
}

export interface DispatchHandoff {
  handoffId: string;
  tickId: string;
  generation: number;
  root: string;
  projectId: string;
  workerId: string;
  planId: string;
  planFile: string;
  jobIndex: number;
  commandId: string;
  gpuId: string;
  attempt: number;
  startedAtMs: number;
  phase: DispatchHandoffPhase;
  phaseIndex: number;
  phaseStartedAtMs: number;
  /** 越过真实传输边界后为真；此后只能由真实提交或明确未发送证据释放。 */
  transmissionStarted: boolean;
}

export interface TickPhaseRecord {
  tickId: string;
  root: string;
  generation: number;
  startedAtMs: number;
  updatedAtMs: number;
  phase: string;
  phaseIndex: number;
  phaseStartedAtMs: number;
  phases: string[];
  workerId: string;
  planId: string;
  jobIndex: number;
  commandId: string;
  sent: boolean;
  outcome: string;
  error: string;
}

export interface HandoffGate {
  /** 同步侧已登记的“禁止新派发”意图，按登记顺序排列。 */
  uploads: CodeUploadIntent[];
  /** 每 Worker 独立上传状态，键为 `<root>\0<workerId>`。 */
  workerUploads: Map<string, WorkerUploadRecord>;
  /** 活跃交接所有权，键为 `<root>\0<commandId>`。 */
  handoffs: Map<string, DispatchHandoff>;
  /** 已结束交接的有界近期记录（最新在前）。 */
  recentHandoffs: Array<{ handoffId: string; commandId: string; workerId: string; phase: string; outcome: string; sent: boolean; endedAtMs: number }>;
  /** 有界近期 tick 账本（最新在前），与交接状态分开。 */
  ticks: Map<string, TickPhaseRecord>;
  recentTicks: Array<{ tickId: string; generation: number; phase: string; phaseIndex: number; elapsedMs: number; outcome: string }>;
  waiters: Set<{ notify: () => void }>;
}

const RECENT_LIMIT = 8;
const IDENTITY_LIMIT = 16;

export function createGate(): HandoffGate {
  return {
    uploads: [], workerUploads: new Map(), handoffs: new Map(), recentHandoffs: [],
    ticks: new Map(), recentTicks: [], waiters: new Set(),
  };
}

const workerKey = (root: string, workerId: string) => `${String(root || "")}\u0000${String(workerId || "")}`;
const handoffKey = (root: string, commandId: string) => `${String(root || "")}\u0000${String(commandId || "")}`;
const terminal = (status: string) => status === "completed" || status === "succeeded" || status === "failed"
  || status === "cancelled" || status === "canceled";
const identityId = (row: { planId?: string, planFile?: string, jobIndex?: number, commandId?: string, workerId?: string }) => [
  String(row.planId || ""), String(row.planFile || ""), String(row.jobIndex ?? ""), String(row.commandId || ""), String(row.workerId || ""),
].join("\u0000");

function notify(gate: HandoffGate): void {
  for (const waiter of [...gate.waiters]) waiter.notify();
}

/** 在任何 await 之前同步登记“禁止新派发进入”的意图。 */
export function beginUpload(gate: HandoffGate, input: { uploadId: string; root: string; scope: string; workerIds: readonly string[]; startedAtMs?: number }): CodeUploadIntent {
  const intent: CodeUploadIntent = {
    uploadId: String(input.uploadId),
    root: String(input.root || ""),
    scope: String(input.scope || ""),
    startedAtMs: input.startedAtMs || Date.now(),
    workerIds: [...new Set((input.workerIds || []).map(String).filter(Boolean))],
  };
  gate.uploads.push(intent);
  for (const workerId of intent.workerIds) {
    const key = workerKey(intent.root, workerId);
    const previous = gate.workerUploads.get(key);
    gate.workerUploads.set(key, {
      uploadId: intent.uploadId, root: intent.root, workerId, state: "uploading",
      startedAtMs: previous && previous.uploadId === intent.uploadId ? previous.startedAtMs : intent.startedAtMs,
      updatedAtMs: intent.startedAtMs,
      // 上一轮「结果未知」只保留失败详情，不伪装成本轮结论：本轮仍需自己的真实证据才能放行新派发。
      ...(previous && previous.state === "unknown-failed" && previous.uploadId !== intent.uploadId
        ? { previousUnknownError: previous.error } : {}),
    });
  }
  return intent;
}

/** 本次上传结束：只回收本轮身份，其他身份的所有权（含未知）保持不变。 */
export function endUpload(gate: HandoffGate, uploadId: string): void {
  const index = gate.uploads.findIndex(intent => intent.uploadId === uploadId);
  if (index < 0) return;
  gate.uploads.splice(index, 1);
  for (const [key, record] of [...gate.workerUploads]) {
    if (record.uploadId !== uploadId) continue;
    // 结果未知的 Worker 保留原所有权记录，不被后续 Worker 的成功覆盖。
    if (record.state === "unknown-failed") continue;
    gate.workerUploads.delete(key);
  }
  notify(gate);
}

/** 只有本轮上传中确认写入完成的 Worker 才重新允许新派发。 */
export function uploadBlocksWorker(gate: HandoffGate, root: string, workerId: string): boolean {
  const record = gate.workerUploads.get(workerKey(root, workerId));
  // 未被本次写入针对的 Worker 不得被误锁；目标集合为空按失败关闭，不因未给出目标就当作无风险。
  return gate.uploads.some(intent => intent.root === String(root || "")
    && (!intent.workerIds.length || intent.workerIds.includes(String(workerId)))
    && !(record?.uploadId === intent.uploadId && record?.state === "uploaded"));
}

/** 本轮派发是否必须整体让路：所有候选 Worker 都仍被未完成的写入意图挡住。 */
export function uploadYieldsWholeRound(gate: HandoffGate, root: string, workerIds: readonly string[]): boolean {
  if (!workerIds.length) return false;
  return workerIds.every(workerId => uploadBlocksWorker(gate, root, workerId));
}

export function markWorkerUploadState(gate: HandoffGate, uploadId: string, root: string, workerId: string,
  state: WorkerUploadState, error?: string): void {
  const key = workerKey(root, workerId);
  const existing = gate.workerUploads.get(key);
  if (existing && existing.uploadId !== String(uploadId)) return;
  const now = Date.now();
  gate.workerUploads.set(key, {
    uploadId: String(uploadId), root: String(root || ""), workerId: String(workerId), state,
    startedAtMs: existing && existing.uploadId === String(uploadId) ? existing.startedAtMs : now,
    updatedAtMs: now, error: state === "unknown-failed" ? String(error || "结果未知") : undefined,
  });
  if (state !== "uploading") notify(gate);
}

export function beginHandoff(gate: HandoffGate, input: {
  tickId: string; generation: number; root: string; projectId?: string; workerId: string; planId: string;
  planFile?: string; jobIndex: number; commandId: string; gpuId?: string; attempt?: number; startedAtMs?: number;
}): DispatchHandoff {
  const key = handoffKey(input.root, input.commandId);
  const existing = gate.handoffs.get(key);
  if (existing && existing.tickId === String(input.tickId)) return existing;
  const now = input.startedAtMs || Date.now();
  const record: DispatchHandoff = {
    handoffId: key, tickId: String(input.tickId), generation: Number(input.generation), root: String(input.root || ""),
    projectId: String(input.projectId || ""), workerId: String(input.workerId || ""), planId: String(input.planId || ""),
    planFile: String(input.planFile || ""), jobIndex: Number(input.jobIndex), commandId: String(input.commandId || ""),
    gpuId: String(input.gpuId || ""), attempt: Number(input.attempt || 0), startedAtMs: now,
    phase: "admission-intent-save", phaseIndex: 0, phaseStartedAtMs: now, transmissionStarted: false,
  };
  gate.handoffs.set(key, record);
  return record;
}

export function hasHandoff(gate: HandoffGate, root: string, commandId: string): boolean {
  return gate.handoffs.has(handoffKey(root, commandId));
}

/** 只按顺序推进阶段，逆序说明所有权已被别的轮次接管，直接拒绝。 */
export function advanceHandoff(gate: HandoffGate, root: string, commandId: string, phase: DispatchHandoffPhase): DispatchHandoff | undefined {
  const record = gate.handoffs.get(handoffKey(root, commandId));
  if (!record) return undefined;
  const index = HANDOFF_PHASES.indexOf(phase);
  if (index < 0) return record;
  if (index < record.phaseIndex) return record;
  if (index > record.phaseIndex) {
    record.phase = phase;
    record.phaseIndex = index;
    record.phaseStartedAtMs = Date.now();
  }
  return record;
}

/** 真实传输边界：此后不得按超时释放所有权。 */
export function markHandoffTransmission(gate: HandoffGate, root: string, commandId: string): void {
  const record = gate.handoffs.get(handoffKey(root, commandId));
  if (!record) return;
  record.transmissionStarted = true;
  const index = HANDOFF_PHASES.indexOf("transmission");
  if (index >= record.phaseIndex) {
    record.phase = "transmission";
    record.phaseIndex = index;
    record.phaseStartedAtMs = Date.now();
  }
}

export function endHandoff(gate: HandoffGate, root: string, commandId: string, outcome: HandoffOutcome): boolean {
  const key = handoffKey(root, commandId);
  const record = gate.handoffs.get(key);
  if (!record) return false;
  gate.handoffs.delete(key);
  gate.recentHandoffs.unshift({
    handoffId: record.handoffId, commandId: record.commandId, workerId: record.workerId, phase: record.phase,
    outcome, sent: record.transmissionStarted, endedAtMs: Date.now(),
  });
  if (gate.recentHandoffs.length > RECENT_LIMIT) gate.recentHandoffs.length = RECENT_LIMIT;
  notify(gate);
  return true;
}

/** 整轮结束或换代：本轮未提交的交接按真实结局回收，不改写为已提交。 */
export function endRoundHandoffs(gate: HandoffGate, tickId: string, outcome: HandoffOutcome): number {
  const stale = [...gate.handoffs.values()].filter(record => record.tickId === String(tickId));
  for (const record of stale) endHandoff(gate, record.root, record.commandId, outcome);
  return stale.length;
}

export function blockingHandoffs(gate: HandoffGate, root: string, workerIds: readonly string[]): DispatchHandoff[] {
  const wanted = new Set((workerIds || []).map(String));
  return [...gate.handoffs.values()]
    .filter(record => record.root === String(root || "") && (!wanted.size || wanted.has(record.workerId)))
    .sort((a, b) => a.startedAtMs - b.startedAtMs);
}

export function waitForBlockingClear(gate: HandoffGate, root: string, workerIds: readonly string[], timeoutMs: number): Promise<{
  safe: boolean; waitedMs: number; timedOut: boolean; blocking: DispatchHandoff[];
}> {
  const startedAt = Date.now();
  const initial = blockingHandoffs(gate, root, workerIds);
  if (!initial.length) return Promise.resolve({ safe: true, waitedMs: 0, timedOut: false, blocking: [] });
  return new Promise(resolve => {
    let settled = false;
    const waiter = { notify: () => { void check(); } };
    const timer = setTimeout(() => finish(false, true), Math.max(0, Number(timeoutMs) || 0));
    timer.unref?.();
    const finish = (safe: boolean, timedOut: boolean) => {
      if (settled) return;
      settled = true;
      gate.waiters.delete(waiter);
      clearTimeout(timer);
      resolve({ safe, waitedMs: Math.max(0, Date.now() - startedAt), timedOut, blocking: blockingHandoffs(gate, root, workerIds) });
    };
    const check = () => { if (!blockingHandoffs(gate, root, workerIds).length) finish(true, false); };
    gate.waiters.add(waiter);
    check();
  });
}

export function beginTick(gate: HandoffGate, input: { tickId: string; root: string; generation: number; startedAtMs?: number }): TickPhaseRecord {
  const now = input.startedAtMs || Date.now();
  const record: TickPhaseRecord = {
    tickId: String(input.tickId), root: String(input.root || ""), generation: Number(input.generation),
    startedAtMs: now, updatedAtMs: now, phase: "begin", phaseIndex: 0, phaseStartedAtMs: now,
    phases: ["begin"], workerId: "", planId: "", jobIndex: 0, commandId: "", sent: false, outcome: "in-flight", error: "",
  };
  gate.ticks.set(record.tickId, record);
  for (const [tickId, stale] of [...gate.ticks]) {
    if (stale.outcome !== "in-flight" && tickId !== record.tickId) gate.ticks.delete(tickId);
  }
  while (gate.ticks.size > IDENTITY_LIMIT) {
    const oldest = [...gate.ticks.values()].sort((a, b) => a.startedAtMs - b.startedAtMs)[0];
    if (!oldest || oldest.tickId === record.tickId) break;
    gate.ticks.delete(oldest.tickId);
  }
  return record;
}

export function setTickPhase(gate: HandoffGate, tickId: string, phase: string, detail?: {
  workerId?: string; planId?: string; planFile?: string; jobIndex?: number; commandId?: string; sent?: boolean;
}): void {
  const record = gate.ticks.get(String(tickId));
  if (!record) return;
  const now = Date.now();
  if (record.phase !== String(phase)) {
    record.phase = String(phase);
    record.phaseIndex += 1;
    record.phaseStartedAtMs = now;
    record.phases.push(record.phase);
    if (record.phases.length > 40) record.phases.splice(0, record.phases.length - 40);
  }
  record.updatedAtMs = now;
  if (detail?.workerId !== undefined) record.workerId = String(detail.workerId || "");
  if (detail?.planId !== undefined) record.planId = String(detail.planId || "");
  if (detail?.jobIndex !== undefined) record.jobIndex = Number(detail.jobIndex) || 0;
  if (detail?.commandId !== undefined) record.commandId = String(detail.commandId || "");
  if (detail?.sent !== undefined) record.sent = detail.sent === true;
}

export function endTick(gate: HandoffGate, tickId: string, outcome: string, error?: string): void {
  const record = gate.ticks.get(String(tickId));
  if (!record) return;
  const now = Date.now();
  record.outcome = String(outcome || "completed");
  record.error = error ? String(error) : "";
  record.updatedAtMs = now;
  gate.recentTicks.unshift({
    tickId: record.tickId, generation: record.generation, phase: record.phase, phaseIndex: record.phaseIndex,
    elapsedMs: Math.max(0, now - record.startedAtMs), outcome: record.outcome,
  });
  if (gate.recentTicks.length > RECENT_LIMIT) gate.recentTicks.length = RECENT_LIMIT;
}

/** 交接 gate 快照：有界、无密钥、无文件清单。 */
export function gateSnapshot(gate: HandoffGate, root?: string) {
  const scoped = (value: string) => !root || value === String(root);
  const workerUploads = [...gate.workerUploads.values()].filter(record => scoped(record.root)).slice(-IDENTITY_LIMIT)
    .map(record => ({ workerId: record.workerId, uploadId: record.uploadId, state: record.state,
      ageMs: Math.max(0, Date.now() - record.updatedAtMs), ...(record.error ? { error: record.error.slice(0, 240) } : {}) }));
  const active = [...gate.handoffs.values()].filter(record => scoped(record.root))
    .map(record => ({ handoffId: record.handoffId, tickId: record.tickId, generation: record.generation, workerId: record.workerId,
      planId: record.planId, planFile: record.planFile, jobIndex: record.jobIndex, commandId: record.commandId,
      gpuId: record.gpuId, attempt: record.attempt, phase: record.phase, phaseIndex: record.phaseIndex,
      phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
      sent: record.transmissionStarted }))
    .sort((a, b) => b.elapsedMs - a.elapsedMs);
  return {
    status: active.length ? "handoff-in-flight" : gate.uploads.length ? "upload-in-flight" : "idle",
    uploadIntents: gate.uploads.filter(intent => scoped(intent.root)).slice(0, IDENTITY_LIMIT)
      .map(intent => ({ uploadId: intent.uploadId, scope: intent.scope, workerCount: intent.workerIds.length,
        workerIds: intent.workerIds.slice(0, 8), ageMs: Math.max(0, Date.now() - intent.startedAtMs) })),
    workerUploads,
    activeHandoffs: active.slice(0, IDENTITY_LIMIT),
    activeHandoffCount: active.length,
    recentHandoffs: gate.recentHandoffs.slice(0, RECENT_LIMIT),
  };
}

/** tick 阶段账本快照：与 gate 状态分开，不折叠成“派发中”。 */
export function tickSnapshot(gate: HandoffGate, root?: string) {
  const records = [...gate.ticks.values()].filter(record => scopedRoot(record.root, root))
    .sort((a, b) => b.startedAtMs - a.startedAtMs).slice(0, IDENTITY_LIMIT)
    .map(record => ({ tickId: record.tickId, generation: record.generation, phase: record.phase, phaseIndex: record.phaseIndex,
      phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
      phases: record.phases.slice(-24), workerId: record.workerId, planId: record.planId, jobIndex: record.jobIndex,
      commandId: record.commandId, sent: record.sent, outcome: record.outcome, ...(record.error ? { error: record.error.slice(0, 240) } : {}) }));
  return { status: records.some(record => record.outcome === "in-flight") ? "ticking" : "idle",
    ticks: records, recent: gate.recentTicks.slice(0, RECENT_LIMIT) };
}

const scopedRoot = (value: string, root?: string) => !root || value === String(root);

/** 超时证据：只描述 gate 与本轮阶段，供既有可持久化错误通道记录。 */
export function handoffEvidence(gate: HandoffGate, root: string, blocking: readonly DispatchHandoff[]) {
  return {
    waitedFor: "dispatch-handoff",
    reason: blocking.length ? "active-handoff" : "no-progress",
    blocking: blocking.slice(0, 8).map(record => ({ tickId: record.tickId, generation: record.generation, workerId: record.workerId,
      planFile: record.planFile, jobIndex: record.jobIndex, commandId: record.commandId, phase: record.phase,
      phaseElapsedMs: Math.max(0, Date.now() - record.phaseStartedAtMs), elapsedMs: Math.max(0, Date.now() - record.startedAtMs),
      sent: record.transmissionStarted })),
    tick: tickSnapshot(gate, root),
    gate: gateSnapshot(gate, root),
  };
}

/**
 * 同一实际写目标的代码写入互斥（与 Worker ID 无关）：
 * 两个不同 Worker ID 指向同一规范服务器与同一远端 root 时也必须互斥。
 */
export interface TargetLeaseTable { held: Map<string, { ownerId: string; startedAtMs: number }>; waiters: Map<string, Array<() => void>> }
export interface TargetLeaseToken { key: string; ownerId: string }

export function createTargetLeaseTable(): TargetLeaseTable {
  return { held: new Map(), waiters: new Map() };
}

export function acquireTargetLease(table: TargetLeaseTable, key: string, ownerId: string,
  waiters?: { signal?: AbortSignal }): Promise<TargetLeaseToken> {
  const claim = () => {
    if (table.held.has(key)) return undefined;
    table.held.set(key, { ownerId, startedAtMs: Date.now() });
    return { key, ownerId } as TargetLeaseToken;
  };
  const immediate = claim();
  if (immediate) return Promise.resolve(immediate);
  return new Promise((resolve, reject) => {
    let settled = false;
    const wake = () => {
      if (settled) return;
      const token = claim();
      if (!token) return;
      settled = true;
      const queue = table.waiters.get(key) || [];
      const next = queue.filter(item => item !== wake);
      if (next.length) table.waiters.set(key, next);
      else table.waiters.delete(key);
      waiters?.signal?.removeEventListener?.("abort", abort);
      resolve(token);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      const queue = (table.waiters.get(key) || []).filter(item => item !== wake);
      if (queue.length) table.waiters.set(key, queue);
      else table.waiters.delete(key);
      reject(Object.assign(new Error("代码写入目标租约等待已取消，未开始写入。"), { dispatchNotSent: true }));
    };
    const queue = table.waiters.get(key) || [];
    queue.push(wake);
    table.waiters.set(key, queue);
    if (waiters?.signal?.aborted) { abort(); return; }
    waiters?.signal?.addEventListener?.("abort", abort, { once: true });
  });
}

export function releaseTargetLease(table: TargetLeaseTable, token: TargetLeaseToken | undefined): boolean {
  if (!token) return false;
  const held = table.held.get(token.key);
  if (!held || held.ownerId !== token.ownerId) return false;
  table.held.delete(token.key);
  const queue = table.waiters.get(token.key) || [];
  const next = queue.shift();
  if (queue.length) table.waiters.set(token.key, queue);
  else table.waiters.delete(token.key);
  next?.();
  return true;
}

/**
 * 有界并发且逐项收敛：单个回调抛错或取消不会让其余在途分支失去登记，
 * 因此外层可以等全部分支真正结束之后再释放 gate 与写入计数。
 */
export async function runBoundedSettled<Item>(items: readonly Item[], limit: number,
  worker: (item: Item, index: number) => Promise<unknown>): Promise<{ outcomes: Array<{ status: "fulfilled" | "rejected"; value?: unknown; error?: unknown }> }> {
  const total = items.length;
  const outcomes: Array<{ status: "fulfilled" | "rejected"; value?: unknown; error?: unknown }> = new Array(total);
  let next = 0;
  const lanes = Math.max(1, Math.min(Math.max(1, Number(limit) || 1), total || 1));
  await Promise.all(Array.from({ length: lanes }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= total) return;
      try { outcomes[index] = { status: "fulfilled", value: await worker(items[index], index) }; }
      catch (error) { outcomes[index] = { status: "rejected", error }; }
    }
  }));
  return { outcomes };
}

export const __testOnly = { terminalStatus: terminal, identityId };
