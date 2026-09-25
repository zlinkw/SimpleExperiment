"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyDistributedQueue = void 0;
exports.completedJobOutputs = completedJobOutputs;
exports.distributedQueuePath = distributedQueuePath;
exports.enqueuePlan = enqueuePlan;
exports.allocateAvailable = allocateAvailable;
exports.previewAvailable = previewAvailable;
exports.setJobState = setJobState;
exports.remoteTaskMatchesJob = remoteTaskMatchesJob;
exports.resetUnsentDispatch = resetUnsentDispatch;
exports.retryVerifiedJob = retryVerifiedJob;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const emptyDistributedQueue = () => ({ schemaVersion: 1, plans: [] });
exports.emptyDistributedQueue = emptyDistributedQueue;
function completedJobOutputs(queue, planFile, jobs) {
    const key = String(planFile || "").replace(/\\/g, "/").replace(/^\.\//, "");
    const matching = queue.plans.filter((plan) => String(plan.planFile || "").replace(/\\/g, "/").replace(/^\.\//, "") === key);
    return jobs.flatMap((job) => {
        const previous = matching.slice().reverse().flatMap((plan) => plan.jobs.slice().reverse())
            .find((item) => item.index === job.index && item.case === job.case && item.seed === job.seed
            && item.status === "completed" && item.outputDir);
        return previous ? [{ index: job.index, case: job.case, seed: job.seed, output_dir: previous.outputDir }] : [];
    });
}
function distributedQueuePath(storageRoot, projectRoot) {
    const root = path.resolve(projectRoot);
    const key = (0, node_crypto_1.createHash)("sha256").update(process.platform === "win32" ? root.toLowerCase() : root).digest("hex");
    return path.join(storageRoot, "distributed-plan-queues", key + ".json");
}
function enqueuePlan(queue, plan, id, enqueuedAt = new Date().toISOString()) {
    if (!plan.revision || !plan.codeFingerprint || !plan.planFile || !id)
        throw new Error("Plan identity and code fingerprint are required.");
    if (queue.plans.some((item) => item.id === id))
        return queue;
    const indices = new Set();
    const jobs = plan.jobs.map((job) => {
        if (!Number.isInteger(job.index) || job.index < 0 || indices.has(job.index) || !job.case || !Number.isInteger(job.seed) || !job.outputDir)
            throw new Error("Invalid or repeated Plan job.");
        indices.add(job.index);
        const previous = queue.plans.filter((item) => item.planFile === plan.planFile && item.revision === plan.revision)
            .flatMap((item) => item.jobs.filter((prior) => prior.case === job.case && prior.seed === job.seed).map((prior) => prior.attempt));
        return { ...job, attempt: Math.max(0, ...previous) + 1, status: "pending" };
    });
    if (!jobs.length)
        throw new Error("Plan has no jobs.");
    return { ...queue, plans: [...queue.plans, { ...plan, id, enqueuedAt, jobs }] };
}
function allocateAvailable(queue, workers) {
    const slots = new Map(workers.filter((row) => row.online).map((row) => [row.workerId, [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length))]));
    const plans = queue.plans.map((plan) => ({ ...plan, jobs: plan.jobs.map((job) => ({ ...job })) }));
    const dispatches = [];
    let activeFingerprint = plans.flatMap((plan) => plan.jobs.some((job) => ["dispatching", "running", "unknown"].includes(job.status)) ? [plan.codeFingerprint] : [])[0];
    for (const plan of plans) {
        if (activeFingerprint && plan.codeFingerprint !== activeFingerprint)
            continue;
        const pending = plan.jobs.filter((job) => job.status === "pending");
        if (!pending.length)
            continue;
        const ranked = () => [...slots].filter(([, gpuIds]) => gpuIds.length).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
        const assignedWorkerIds = [...new Set(plan.jobs.filter((job) => job.workerId).map((job) => job.workerId))];
        const primary = assignedWorkerIds.find((id) => (slots.get(id)?.length || 0) > 0) || ranked()[0]?.[0];
        if (!primary)
            break;
        activeFingerprint ||= plan.codeFingerprint;
        const cases = [...new Set(pending.map((job) => job.case))];
        for (const caseName of cases) {
            const caseJobs = pending.filter((job) => job.case === caseName).sort((a, b) => a.index - b.index);
            const whole = ranked().find(([workerId, ids]) => workerId === primary && ids.length >= caseJobs.length)
                || ranked().find(([, ids]) => ids.length >= caseJobs.length);
            for (const job of caseJobs) {
                const chosen = whole?.[0] && slots.get(whole[0])?.length ? whole[0]
                    : slots.get(primary)?.length ? primary : ranked()[0]?.[0];
                if (!chosen)
                    break;
                const gpuId = slots.get(chosen)?.shift();
                if (gpuId === undefined)
                    break;
                const commandId = (0, node_crypto_1.createHash)("sha256").update([plan.id, job.index, job.attempt].join("\0")).digest("hex").slice(0, 24);
                Object.assign(job, { status: "dispatching", workerId: chosen, gpuId, commandId });
                dispatches.push({ planId: plan.id, jobIndex: job.index, workerId: chosen, gpuId, attempt: job.attempt, commandId });
            }
        }
    }
    return { queue: { ...queue, plans }, dispatches };
}
function previewAvailable(queue, plan, workers) {
    const previewId = "distributed-preview";
    const candidate = enqueuePlan(queue, plan, previewId);
    const { dispatches } = allocateAvailable(candidate, workers);
    const selected = dispatches.filter((item) => item.planId === previewId);
    return { totalJobs: plan.jobs.length, dispatchableCount: selected.length,
        queuedCount: plan.jobs.length - selected.length,
        assignments: selected.map(({ jobIndex, workerId, gpuId }) => ({ jobIndex, workerId, gpuId })) };
}
function setJobState(queue, planId, jobIndex, status, commandId) {
    let found = false;
    const plans = queue.plans.map((plan) => plan.id !== planId ? plan : { ...plan, jobs: plan.jobs.map((job) => {
            if (job.index !== jobIndex || job.commandId !== commandId)
                return job;
            found = true;
            return { ...job, status };
        }) });
    if (!found)
        throw new Error("Job command identity does not match persisted queue.");
    return { ...queue, plans };
}
function remoteTaskMatchesJob(plan, job, task) {
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
function resetUnsentDispatch(queue, planId, jobIndex, commandId) {
    return { ...queue, plans: queue.plans.map((plan) => plan.id !== planId ? plan : { ...plan,
            jobs: plan.jobs.map((job) => job.index !== jobIndex || job.commandId !== commandId || job.status !== "dispatching"
                ? job : { ...job, status: "pending", workerId: undefined, gpuId: undefined, commandId: undefined }) }) };
}
function retryVerifiedJob(queue, planId, jobIndex, runId) {
    const plan = queue.plans.find((row) => row.id === planId);
    const job = plan?.jobs.find((row) => row.index === jobIndex);
    if (!job || !["failed", "unknown"].includes(job.status) || !/^[a-zA-Z0-9-]{8,80}$/.test(runId))
        throw new Error("Only a verified stopped job can be retried.");
    const prefix = job.outputDir.replace(/\\/g, "/");
    const marker = prefix.lastIndexOf("/attempts/");
    if (marker < 0)
        throw new Error("Job attempt directory is invalid.");
    const outputDir = prefix.slice(0, marker + "/attempts/".length) + runId;
    return { ...queue, plans: queue.plans.map((row) => row.id !== planId ? row : { ...row,
            jobs: row.jobs.map((item) => item.index !== jobIndex ? item : {
                index: item.index, case: item.case, seed: item.seed, outputDir, attempt: item.attempt + 1,
                status: "pending", history: [...(item.history || []), { attempt: item.attempt,
                        status: item.status, workerId: item.workerId, commandId: item.commandId, outputDir: item.outputDir,
                        finishedAt: item.finishedAt }],
            }) }) };
}
