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
  finishedAt?: string;
  artifacts?: Record<string, string>;
  fragmentWorkerIds?: string[];
  mirroredWorkerIds?: string[];
  artifactError?: string;
  history?: Array<{ attempt: number; status: JobState; workerId?: string; commandId?: string; outputDir: string; finishedAt?: string }>;
};
export type QueuedPlan = {
  id: string;
  planFile: string;
  revision: string;
  codeFingerprint: string;
  enqueuedAt: string;
  jobs: QueuedJob[];
};
export type DeferredPlan = { id: string; planFile: string; revision: string; codeFingerprint: string;
  body: Record<string, unknown>; enqueuedAt: string; status: "pending" | "processing" | "blocked"; error?: string; retryAfter?: string };
export type DistributedQueue = { schemaVersion: 1; plans: QueuedPlan[]; deferred?: DeferredPlan[]; publishedSignature?: string; previewSignature?: string;
  publishedWorkerId?: string; publishedWorkerIds?: string[]; publishedPaths?: string[] };
export type WorkerSlots = { workerId: string; idleGpuIds: string[]; online: boolean; capacity?: number };
export type Dispatch = { planId: string; jobIndex: number; workerId: string; gpuId: string; attempt: number; commandId: string };

export const emptyDistributedQueue = (): DistributedQueue => ({ schemaVersion: 1, plans: [] });

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

export function allocateAvailable(queue: DistributedQueue, workers: readonly WorkerSlots[]): { queue: DistributedQueue; dispatches: Dispatch[] } {
  const slots = new Map(workers.filter((row) => row.online).map((row) => [row.workerId, [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length))]));
  const plans = queue.plans.map((plan) => ({ ...plan, jobs: plan.jobs.map((job) => ({ ...job })) }));
  const dispatches: Dispatch[] = [];
  let activeFingerprint = plans.flatMap((plan) => plan.jobs.some((job) => ["dispatching", "running", "unknown"].includes(job.status)) ? [plan.codeFingerprint] : [])[0];
  for (const plan of plans) {
    if (activeFingerprint && plan.codeFingerprint !== activeFingerprint) continue;
    const pending = plan.jobs.filter((job) => job.status === "pending");
    if (!pending.length) continue;
    const ranked = () => [...slots].filter(([, gpuIds]) => gpuIds.length).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const assignedWorkerIds = [...new Set(plan.jobs.filter((job) => job.workerId).map((job) => job.workerId!))];
    const primary = assignedWorkerIds.find((id) => (slots.get(id)?.length || 0) > 0) || ranked()[0]?.[0];
    if (!primary) break;
    activeFingerprint ||= plan.codeFingerprint;
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
        Object.assign(job, { status: "dispatching", workerId: chosen, gpuId, commandId });
        dispatches.push({ planId: plan.id, jobIndex: job.index, workerId: chosen, gpuId, attempt: job.attempt, commandId });
      }
    }
  }
  return { queue: { ...queue, plans }, dispatches };
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
