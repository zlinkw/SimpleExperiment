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
exports.emptyDistributedQueue = exports.CODE_FINGERPRINT_WAITING = exports.CODE_FINGERPRINT_MISMATCH = void 0;
exports.unfinishedJobs = unfinishedJobs;
exports.fingerprintStillMounted = fingerprintStillMounted;
exports.queueOccupiesCodeVersion = queueOccupiesCodeVersion;
exports.completedJobOutputs = completedJobOutputs;
exports.distributedQueuePath = distributedQueuePath;
exports.enqueuePlan = enqueuePlan;
exports.allocateAvailable = allocateAvailable;
exports.previewAvailable = previewAvailable;
exports.setJobState = setJobState;
exports.remoteTaskMatchesJob = remoteTaskMatchesJob;
exports.resetUnsentDispatch = resetUnsentDispatch;
exports.distributedStopTargets = distributedStopTargets;
exports.removeConfirmedDistributedPlan = removeConfirmedDistributedPlan;
exports.stopIdentityMatchesJob = stopIdentityMatchesJob;
exports.retryVerifiedJob = retryVerifiedJob;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
exports.CODE_FINGERPRINT_MISMATCH = "代码指纹不匹配：Worker 当前代码版本与该 Plan 不一致。任务仍保留为排队，不会自动失败或重发。请用当前代码重新提交该 Plan，或恢复提交前的代码版本并重新同步 Worker 后再继续。";
exports.CODE_FINGERPRINT_WAITING = "等待当前代码版本的任务结束：已有其他代码版本占用 Worker，本 Plan 暂不派发。任务仍保留为排队。";
const UNFINISHED_JOB = ["pending", "dispatching", "running", "unknown"];
function unfinishedJobs(plan, states = UNFINISHED_JOB) {
    return plan.jobs.some((job) => states.includes(job.status));
}
function fingerprintStillMounted(queue, fingerprint, workerFingerprints) {
    const unfinished = queue.plans.filter((plan) => plan.codeFingerprint === fingerprint && unfinishedJobs(plan));
    if (!unfinished.length)
        return false;
    if (!workerFingerprints.length)
        return true;
    return workerFingerprints.includes(fingerprint);
}
/** Pending code only occupies the queue when a verified Worker still has that fingerprint. Running work always occupies it. Missing version evidence stays conservative. */
function queueOccupiesCodeVersion(queue, verifiedWorkerFingerprints) {
    const verified = verifiedWorkerFingerprints instanceof Map
        ? [...verifiedWorkerFingerprints.values()]
        : Object.values(verifiedWorkerFingerprints || {});
    const known = verified.filter(Boolean);
    return queue.plans.some((plan) => plan.jobs.some((job) => {
        if (["dispatching", "running", "unknown"].includes(job.status))
            return true;
        if (job.status !== "pending")
            return false;
        if (!known.length)
            return true;
        return known.includes(plan.codeFingerprint);
    }));
}
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
function usableSlots(row) {
    return row.online && [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length)).length > 0;
}
function noteFingerprintMismatch(plans, workers, activeFingerprint) {
    if (!workers.some((row) => row.codeFingerprint))
        return;
    const anyOnline = workers.some((row) => row.online);
    for (const plan of plans) {
        for (const job of plan.jobs) {
            if (job.status !== "pending")
                continue;
            const matched = workers.some((row) => row.online && row.codeFingerprint === plan.codeFingerprint);
            const held = plan.jobs.some((item) => ["dispatching", "running", "unknown"].includes(item.status));
            const waiting = Boolean(activeFingerprint && plan.codeFingerprint !== activeFingerprint && matched);
            if (waiting)
                job.blockReason = exports.CODE_FINGERPRINT_WAITING;
            else if (anyOnline && !matched && !held)
                job.blockReason = exports.CODE_FINGERPRINT_MISMATCH;
            else if (job.blockReason === exports.CODE_FINGERPRINT_MISMATCH || job.blockReason === exports.CODE_FINGERPRINT_WAITING)
                delete job.blockReason;
        }
    }
}
function allocateAvailable(queue, workers) {
    const versioned = workers.some((row) => row.codeFingerprint);
    const plans = queue.plans.map((plan) => ({ ...plan, jobs: plan.jobs.map((job) => ({ ...job })) }));
    const dispatches = [];
    const activeFingerprint = plans.find((plan) => plan.jobs.some((job) => ["dispatching", "running", "unknown"].includes(job.status)))?.codeFingerprint;
    const runnableFingerprint = activeFingerprint || plans.find((plan) => plan.jobs.some((job) => job.status === "pending")
        && (!versioned || workers.some((row) => usableSlots(row) && row.codeFingerprint === plan.codeFingerprint)))?.codeFingerprint;
    const slots = new Map(workers.filter((row) => row.online && (!versioned || !runnableFingerprint || row.codeFingerprint === runnableFingerprint))
        .map((row) => [row.workerId, [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length))]));
    for (const plan of plans) {
        if (!runnableFingerprint || plan.codeFingerprint !== runnableFingerprint)
            continue;
        const pending = plan.jobs.filter((job) => job.status === "pending");
        if (!pending.length)
            continue;
        const ranked = () => [...slots].filter(([, gpuIds]) => gpuIds.length).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
        const assignedWorkerIds = [...new Set(plan.jobs.filter((job) => job.workerId).map((job) => job.workerId))];
        const primary = assignedWorkerIds.find((id) => (slots.get(id)?.length || 0) > 0) || ranked()[0]?.[0];
        if (!primary)
            break;
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
                Object.assign(job, { status: "dispatching", workerId: chosen, gpuId, commandId, blockReason: undefined });
                dispatches.push({ planId: plan.id, jobIndex: job.index, workerId: chosen, gpuId, attempt: job.attempt, commandId });
            }
        }
    }
    noteFingerprintMismatch(plans, workers, activeFingerprint);
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
function samePlanFile(left, right) {
    const normalize = (value) => value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b)
        return false;
    if (a === b)
        return true;
    const absolute = (value) => /^(?:[a-z]:\/|\/)/i.test(value);
    return absolute(a) !== absolute(b) && (absolute(a) ? a.endsWith("/" + b) : b.endsWith("/" + a));
}
const ACTIVE_JOB = ["dispatching", "running", "unknown"];
function distributedStopTargets(queue, planFile) {
    const selected = String(planFile || "").trim();
    if (!selected)
        return [];
    const jobs = (queue?.plans || []).filter((plan) => samePlanFile(plan.planFile, selected)).flatMap((plan) => plan.jobs.map((job) => ({
        kind: "job",
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
        kind: "deferred",
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
function removeConfirmedDistributedPlan(queue, planFile, confirmed) {
    const selected = String(planFile || "").trim();
    const plans = (queue.plans || []).flatMap((plan) => {
        if (!samePlanFile(plan.planFile, selected))
            return [plan];
        const jobs = plan.jobs.filter((job) => !confirmed.jobKeys.has(`${plan.id}\0${job.index}\0${job.attempt}`));
        return jobs.length ? [{ ...plan, jobs }] : [];
    });
    const deferred = (queue.deferred || []).filter((row) => !samePlanFile(row.planFile, selected) || !confirmed.deferredIds.has(row.id));
    return { ...queue, plans, deferred };
}
function stopIdentityMatchesJob(plan, job, identity) {
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
