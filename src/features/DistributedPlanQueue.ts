import { createHash } from "node:crypto";
import * as path from "node:path";

export type JobState = "pending" | "dispatching" | "running" | "completed" | "failed" | "unknown";
export type QueuedJob = {
  index: number;
  case: string;
  seed: number;
  outputDir: string;
  attempt: number;
  status: JobState;
  workerId?: string;
  gpuId?: string;
  commandId?: string;
  logPath?: string;
  error?: string;
  finishedAt?: string;
  artifacts?: Record<string, string>;
  fragmentWorkerIds?: string[];
  mirroredWorkerIds?: string[];
  artifactError?: string;
  artifactRetryAfter?: string;
  reconciliationAttempts?: number;
  lastReconciliationAt?: string;
  blockReason?: string;
  history?: Array<{ attempt: number; status: JobState; workerId?: string; commandId?: string; outputDir: string; finishedAt?: string }>;
};
export type QueuedPlan = {
  id: string;
  planFile: string;
  revision: string;
  codeFingerprint: string;
  enqueuedAt: string;
  overwriteExisting?: boolean;
  jobs: QueuedJob[];
};
export type DeferredPlan = { id: string; planFile: string; revision: string; codeFingerprint: string;
  body: Record<string, unknown>; enqueuedAt: string; status: "pending" | "processing" | "blocked"; error?: string; retryAfter?: string };
export type DistributedQueue = { schemaVersion: 1; plans: QueuedPlan[]; deferred?: DeferredPlan[]; publishedSignature?: string; previewSignature?: string;
  publishedWorkerId?: string; publishedWorkerIds?: string[]; publishedPaths?: string[];
  previewWorkerId?: string; previewWorkerIds?: string[]; previewPaths?: string[] };
export type WorkerSlots = { workerId: string; idleGpuIds: string[]; online: boolean; capacity?: number; codeFingerprint?: string };
export const CODE_FINGERPRINT_MISMATCH = "代码指纹不匹配：Worker 当前代码版本与该 Plan 不一致。任务仍保留为排队，不会自动失败或重发。请用当前代码重新提交该 Plan，或恢复提交前的代码版本并重新同步 Worker 后再继续。";
export const CODE_FINGERPRINT_WAITING = "等待当前代码版本的任务结束：已有其他代码版本占用 Worker，本 Plan 暂不派发。任务仍保留为排队。";
const UNFINISHED_JOB: readonly JobState[] = ["pending", "dispatching", "running", "unknown"];

export function unfinishedJobs(plan: QueuedPlan, states: readonly JobState[] = UNFINISHED_JOB): boolean {
  return plan.jobs.some((job) => states.includes(job.status));
}

export function fingerprintStillMounted(queue: DistributedQueue, fingerprint: string, workerFingerprints: readonly string[]): boolean {
  const unfinished = queue.plans.filter((plan) => plan.codeFingerprint === fingerprint && unfinishedJobs(plan));
  if (!unfinished.length) return false;
  if (!workerFingerprints.length) return true;
  return workerFingerprints.includes(fingerprint);
}

/** Pending code only occupies the queue when a verified Worker still has that fingerprint. Running work always occupies it. Missing version evidence stays conservative. */
export function queueOccupiesCodeVersion(queue: DistributedQueue, verifiedWorkerFingerprints: ReadonlyMap<string, string> | Record<string, string>): boolean {
  const verified = verifiedWorkerFingerprints instanceof Map
    ? [...verifiedWorkerFingerprints.values()]
    : Object.values(verifiedWorkerFingerprints || {});
  const known = verified.filter(Boolean);
  return queue.plans.some((plan) => plan.jobs.some((job) => {
    if (["dispatching", "running", "unknown"].includes(job.status)) return true;
    if (job.status !== "pending") return false;
    if (!known.length) return true;
    return known.includes(plan.codeFingerprint);
  }));
}
export type Dispatch = { planId: string; jobIndex: number; workerId: string; gpuId: string; attempt: number; commandId: string };

export const emptyDistributedQueue = (): DistributedQueue => ({ schemaVersion: 1, plans: [] });

export function completedJobOutputs(queue: DistributedQueue, planFile: string, jobs: Array<Pick<QueuedJob, "index" | "case" | "seed">>) {
  const key = String(planFile || "").replace(/\\/g, "/").replace(/^\.\//, "");
  const matching = queue.plans.filter((plan) => String(plan.planFile || "").replace(/\\/g, "/").replace(/^\.\//, "") === key);
  return jobs.flatMap((job) => {
    const previous = matching.slice().reverse().flatMap((plan) => plan.jobs.slice().reverse())
      .find((item) => item.index === job.index && item.case === job.case && item.seed === job.seed
        && item.status === "completed" && item.outputDir);
    return previous ? [{ index: job.index, case: job.case, seed: job.seed, output_dir: previous.outputDir }] : [];
  });
}

export function distributedQueuePath(storageRoot: string, projectRoot: string): string {
  const root = path.resolve(projectRoot);
  const key = createHash("sha256").update(process.platform === "win32" ? root.toLowerCase() : root).digest("hex");
  return path.join(storageRoot, "distributed-plan-queues", key + ".json");
}

export function enqueuePlan(queue: DistributedQueue, plan: Omit<QueuedPlan, "id" | "enqueuedAt" | "jobs"> & { jobs: Array<Pick<QueuedJob, "index" | "case" | "seed" | "outputDir">> }, id: string, enqueuedAt = new Date().toISOString()): DistributedQueue {
  if (!plan.revision || !plan.codeFingerprint || !plan.planFile || !id) throw new Error("Plan identity and code fingerprint are required.");
  if (queue.plans.some((item) => item.id === id)) return queue;
  const indices = new Set<number>();
  const jobs = plan.jobs.map((job) => {
    if (!Number.isInteger(job.index) || job.index < 0 || indices.has(job.index) || !job.case || !Number.isInteger(job.seed) || !job.outputDir) throw new Error("Invalid or repeated Plan job.");
    indices.add(job.index);
    const previous = queue.plans.filter((item) => item.planFile === plan.planFile && item.revision === plan.revision)
      .flatMap((item) => item.jobs.filter((prior) => prior.case === job.case && prior.seed === job.seed).map((prior) => prior.attempt));
    return { ...job, attempt: Math.max(0, ...previous) + 1, status: "pending" as const };
  });
  if (!jobs.length) throw new Error("Plan has no jobs.");
  return { ...queue, plans: [...queue.plans, { ...plan, id, enqueuedAt, jobs }] };
}

function usableSlots(row: WorkerSlots) {
  return row.online && [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length)).length > 0;
}

function noteFingerprintMismatch(plans: QueuedPlan[], workers: readonly WorkerSlots[], activeFingerprint?: string) {
  if (!workers.some((row) => row.codeFingerprint)) return;
  const anyOnline = workers.some((row) => row.online);
  for (const plan of plans) {
    for (const job of plan.jobs) {
      if (job.status !== "pending") continue;
      const matched = workers.some((row) => row.online && row.codeFingerprint === plan.codeFingerprint);
      const held = plan.jobs.some((item) => ["dispatching", "running", "unknown"].includes(item.status));
      const waiting = Boolean(activeFingerprint && plan.codeFingerprint !== activeFingerprint && matched);
      if (waiting) job.blockReason = CODE_FINGERPRINT_WAITING;
      else if (anyOnline && !matched && !held) job.blockReason = CODE_FINGERPRINT_MISMATCH;
      else if (job.blockReason === CODE_FINGERPRINT_MISMATCH || job.blockReason === CODE_FINGERPRINT_WAITING) delete job.blockReason;
    }
  }
}

export function allocateAvailable(queue: DistributedQueue, workers: readonly WorkerSlots[]): { queue: DistributedQueue; dispatches: Dispatch[] } {
  const versioned = workers.some((row) => row.codeFingerprint);
  const plans = queue.plans.map((plan) => ({ ...plan, jobs: plan.jobs.map((job) => ({ ...job })) }));
  const dispatches: Dispatch[] = [];
  const activeFingerprint = plans.find((plan) => plan.jobs.some((job) => ["dispatching", "running", "unknown"].includes(job.status)))?.codeFingerprint;
  const runnableFingerprint = activeFingerprint || plans.find((plan) => plan.jobs.some((job) => job.status === "pending")
    && (!versioned || workers.some((row) => usableSlots(row) && row.codeFingerprint === plan.codeFingerprint)))?.codeFingerprint;
  const slots = new Map(workers.filter((row) => row.online && (!versioned || !runnableFingerprint || row.codeFingerprint === runnableFingerprint))
    .map((row) => [row.workerId, [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length))]));
  for (const plan of plans) {
    if (!runnableFingerprint || plan.codeFingerprint !== runnableFingerprint) continue;
    const pending = plan.jobs.filter((job) => job.status === "pending");
    if (!pending.length) continue;
    const ranked = () => [...slots].filter(([, gpuIds]) => gpuIds.length).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const assignedWorkerIds = [...new Set(plan.jobs.filter((job) => job.workerId).map((job) => job.workerId!))];
    const primary = assignedWorkerIds.find((id) => (slots.get(id)?.length || 0) > 0) || ranked()[0]?.[0];
    if (!primary) break;
    const cases = [...new Set(pending.map((job) => job.case))];
    for (const caseName of cases) {
      const caseJobs = pending.filter((job) => job.case === caseName).sort((a, b) => a.index - b.index);
      const whole = ranked().find(([workerId, ids]) => workerId === primary && ids.length >= caseJobs.length)
        || ranked().find(([, ids]) => ids.length >= caseJobs.length);
      for (const job of caseJobs) {
        const chosen = whole?.[0] && slots.get(whole[0])?.length ? whole[0]
          : slots.get(primary)?.length ? primary : ranked()[0]?.[0];
        if (!chosen) break;
        const gpuId = slots.get(chosen)?.shift();
        if (gpuId === undefined) break;
        const commandId = createHash("sha256").update([plan.id, job.index, job.attempt].join("\0")).digest("hex").slice(0, 24);
        Object.assign(job, { status: "dispatching", workerId: chosen, gpuId, commandId, blockReason: undefined });
        dispatches.push({ planId: plan.id, jobIndex: job.index, workerId: chosen, gpuId, attempt: job.attempt, commandId });
      }
    }
  }
  noteFingerprintMismatch(plans, workers, activeFingerprint);
  return { queue: { ...queue, plans }, dispatches };
}

export function previewAvailable(queue: DistributedQueue, plan: Omit<QueuedPlan, "id" | "enqueuedAt" | "jobs"> & { jobs: Array<Pick<QueuedJob, "index" | "case" | "seed" | "outputDir">> }, workers: readonly WorkerSlots[]) {
  const previewId = "distributed-preview";
  const candidate = enqueuePlan(queue, plan, previewId);
  const { dispatches } = allocateAvailable(candidate, workers);
  const selected = dispatches.filter((item) => item.planId === previewId);
  return { totalJobs: plan.jobs.length, dispatchableCount: selected.length,
    queuedCount: plan.jobs.length - selected.length,
    assignments: selected.map(({ jobIndex, workerId, gpuId }) => ({ jobIndex, workerId, gpuId })) };
}

export function setJobState(queue: DistributedQueue, planId: string, jobIndex: number, status: JobState, commandId: string): DistributedQueue {
  let found = false;
  const plans = queue.plans.map((plan) => plan.id !== planId ? plan : { ...plan, jobs: plan.jobs.map((job) => {
    if (job.index !== jobIndex || job.commandId !== commandId) return job;
    found = true;
    return { ...job, status };
  }) });
  if (!found) throw new Error("Job command identity does not match persisted queue.");
  return { ...queue, plans };
}

export function remoteTaskMatchesJob(plan: QueuedPlan, job: QueuedJob, task: Record<string, unknown>): boolean {
  return Boolean(job.commandId && job.workerId && job.gpuId !== undefined
    && String(task.commandId || "") === job.commandId
    && String(task.workflowId || "") === plan.id
    && String(task.planRevision || "") === plan.revision
    && String(task.case || "") === job.case
    && Number(task.seed) === job.seed
    && Number(task.attempt) === job.attempt
    && String(task.outputDir || "") === job.outputDir
    && String(task.workerId || "") === job.workerId
    && String(task.gpuId ?? "") === job.gpuId);
}

export function resetUnsentDispatch(queue: DistributedQueue, planId: string, jobIndex: number, commandId: string): DistributedQueue {
  return { ...queue, plans: queue.plans.map((plan) => plan.id !== planId ? plan : { ...plan,
    jobs: plan.jobs.map((job) => job.index !== jobIndex || job.commandId !== commandId || job.status !== "dispatching"
      ? job : { ...job, status: "pending" as const, workerId: undefined, gpuId: undefined, commandId: undefined }) }) };
}

function samePlanFile(left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const absolute = (value: string) => /^(?:[a-z]:\/|\/)/i.test(value);
  return absolute(a) !== absolute(b) && (absolute(a) ? a.endsWith("/" + b) : b.endsWith("/" + a));
}

export type DistributedStopTarget = {
  kind: "job" | "deferred";
  planId: string;
  planFile: string;
  revision: string;
  codeFingerprint: string;
  jobIndex?: number;
  attempt?: number;
  commandId?: string;
  workerId?: string;
  gpuId?: string;
  caseName?: string;
  seed?: number;
  outputDir?: string;
  status: string;
  active: boolean;
};

const ACTIVE_JOB: readonly JobState[] = ["dispatching", "running", "unknown"];

export function distributedStopTargets(queue: DistributedQueue, planFile: string): DistributedStopTarget[] {
  const selected = String(planFile || "").trim();
  if (!selected) return [];
  const jobs = (queue?.plans || []).filter((plan) => samePlanFile(plan.planFile, selected)).flatMap((plan) => plan.jobs.map((job) => ({
    kind: "job" as const,
    planId: plan.id,
    planFile: plan.planFile,
    revision: plan.revision,
    codeFingerprint: plan.codeFingerprint,
    jobIndex: job.index,
    attempt: job.attempt,
    commandId: job.commandId,
    workerId: job.workerId,
    gpuId: job.gpuId,
    caseName: job.case,
    seed: job.seed,
    outputDir: job.outputDir,
    status: job.status,
    active: ACTIVE_JOB.includes(job.status),
  })));
  const deferred = (queue?.deferred || []).filter((row) => samePlanFile(row.planFile, selected)).map((row) => ({
    kind: "deferred" as const,
    planId: row.id,
    planFile: row.planFile,
    revision: row.revision,
    codeFingerprint: row.codeFingerprint,
    status: row.status,
    active: row.status === "processing",
  }));
  return [...jobs, ...deferred];
}

/** Drop only confirmed plan runs. A partial stop keeps every unconfirmed job and deferred row. */
export function removeConfirmedDistributedPlan(queue: DistributedQueue, planFile: string, confirmed: { jobKeys: ReadonlySet<string>; deferredIds: ReadonlySet<string> }): DistributedQueue {
  const selected = String(planFile || "").trim();
  const plans = (queue.plans || []).flatMap((plan) => {
    if (!samePlanFile(plan.planFile, selected)) return [plan];
    const jobs = plan.jobs.filter((job) => !confirmed.jobKeys.has(`${plan.id}\0${job.index}\0${job.attempt}`));
    return jobs.length ? [{ ...plan, jobs }] : [];
  });
  const deferred = (queue.deferred || []).filter((row) => !samePlanFile(row.planFile, selected) || !confirmed.deferredIds.has(row.id));
  return { ...queue, plans, deferred };
}

export function stopIdentityMatchesJob(plan: QueuedPlan, job: QueuedJob, identity: Record<string, unknown>): boolean {
  return Boolean(job.commandId && job.workerId && job.gpuId !== undefined
    && String(identity.commandId || identity.targetCommandId || "") === job.commandId
    && String(identity.workflowId || identity.planId || "") === plan.id
    && String(identity.planRevision || "") === plan.revision
    && String(identity.planFile || identity.plan || "") === plan.planFile
    && String(identity.case || identity.caseName || "") === job.case
    && Number(identity.seed) === job.seed
    && Number(identity.attempt) === job.attempt
    && String(identity.outputDir || "") === job.outputDir
    && String(identity.workerId || "") === job.workerId
    && String(identity.gpuId ?? "") === String(job.gpuId));
}

export function retryVerifiedJob(queue: DistributedQueue, planId: string, jobIndex: number, runId: string): DistributedQueue {
  const plan = queue.plans.find((row) => row.id === planId);
  const job = plan?.jobs.find((row) => row.index === jobIndex);
  if (!job || !["failed", "unknown"].includes(job.status) || !/^[a-zA-Z0-9-]{8,80}$/.test(runId))
    throw new Error("Only a verified stopped job can be retried.");
  const prefix = job.outputDir.replace(/\\/g, "/");
  const marker = prefix.lastIndexOf("/attempts/");
  if (marker < 0) throw new Error("Job attempt directory is invalid.");
  const outputDir = prefix.slice(0, marker + "/attempts/".length) + runId;
  return { ...queue, plans: queue.plans.map((row) => row.id !== planId ? row : { ...row,
    jobs: row.jobs.map((item) => item.index !== jobIndex ? item : {
      index: item.index, case: item.case, seed: item.seed, outputDir, attempt: item.attempt + 1,
      status: "pending" as const, history: [...(item.history || []), { attempt: item.attempt,
        status: item.status, workerId: item.workerId, commandId: item.commandId, outputDir: item.outputDir,
        finishedAt: item.finishedAt }],
    }) }) };
}
