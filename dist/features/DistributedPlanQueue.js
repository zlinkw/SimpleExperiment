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
exports.AUTOMATIC_JOB_RETRY_BASE_DELAY_MS = exports.AUTOMATIC_JOB_RETRY_MAX_FAILURES = exports.emptyDistributedQueue = exports.DISPATCH_RECONCILIATION_DELAY_MS = exports.CODE_FINGERPRINT_WAITING = exports.CODE_FINGERPRINT_MISMATCH = void 0;
exports.distributedQueueDiskSignature = distributedQueueDiskSignature;
exports.distributedQueueBaseSignature = distributedQueueBaseSignature;
exports.setDistributedQueueBaseSignature = setDistributedQueueBaseSignature;
exports.cloneDistributedQueue = cloneDistributedQueue;
exports.queueMetadataAdvanceRecorded = queueMetadataAdvanceRecorded;
exports.terminalHistoryLogBinding = terminalHistoryLogBinding;
exports.workerTaskLogBinding = workerTaskLogBinding;
exports.hasFreshDurableSnapshot = hasFreshDurableSnapshot;
exports.dispatchReconciliationDue = dispatchReconciliationDue;
exports.canonicalProjectId = canonicalProjectId;
exports.durableCommandId = durableCommandId;
exports.freshIdleGpuEvidence = freshIdleGpuEvidence;
exports.distributedPlanRecoveryMissingCount = distributedPlanRecoveryMissingCount;
exports.hasUnresolvedPlanRecovery = hasUnresolvedPlanRecovery;
exports.mergeDurableWorkerSnapshots = mergeDurableWorkerSnapshots;
exports.unfinishedJobs = unfinishedJobs;
exports.distributedSubmissionDisposition = distributedSubmissionDisposition;
exports.distributedSubmissionResult = distributedSubmissionResult;
exports.distributedSubmissionProgress = distributedSubmissionProgress;
exports.fingerprintStillMounted = fingerprintStillMounted;
exports.queueOccupiesCodeVersion = queueOccupiesCodeVersion;
exports.workerCodeVersionAvailable = workerCodeVersionAvailable;
exports.completedJobOutputs = completedJobOutputs;
exports.distributedQueuePath = distributedQueuePath;
exports.enqueuePlan = enqueuePlan;
exports.pinnedRetryPlanAllowed = pinnedRetryPlanAllowed;
exports.hostedRetryCandidates = hostedRetryCandidates;
exports.allocateAvailable = allocateAvailable;
exports.previewAvailable = previewAvailable;
exports.setJobState = setJobState;
exports.remoteTaskMatchesJob = remoteTaskMatchesJob;
exports.hasLegacyOwnership = hasLegacyOwnership;
exports.resetUnsentDispatch = resetUnsentDispatch;
exports.resetBusyRejectedDispatch = resetBusyRejectedDispatch;
exports.retryPinnedDispatch = retryPinnedDispatch;
exports.releaseQueuedForReassignment = releaseQueuedForReassignment;
exports.isExactQueuedReleaseProof = isExactQueuedReleaseProof;
exports.recallResponseMatchesJob = recallResponseMatchesJob;
exports.historicalRecallIdentityMatchesJob = historicalRecallIdentityMatchesJob;
exports.historicalRecallTaskMatchesJob = historicalRecallTaskMatchesJob;
exports.nextAttemptOutputDir = nextAttemptOutputDir;
exports.sameDeferredPlanFile = sameDeferredPlanFile;
exports.sameDistributedPlanFile = sameDistributedPlanFile;
exports.matchingActiveDeferred = matchingActiveDeferred;
exports.jobClearableWithoutRemoteReceipt = jobClearableWithoutRemoteReceipt;
exports.distributedStopTargets = distributedStopTargets;
exports.removeConfirmedDistributedPlan = removeConfirmedDistributedPlan;
exports.stopIdentityMatchesJob = stopIdentityMatchesJob;
exports.retryVerifiedJob = retryVerifiedJob;
exports.scheduleAutomaticJobRetries = scheduleAutomaticJobRetries;
exports.disableAutomaticJobRetries = disableAutomaticJobRetries;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const QUEUE_BASE_DISK_SIGNATURE = Symbol("distributedQueueBaseDiskSignature");
function distributedQueueDiskSignature(source) {
    return (0, node_crypto_1.createHash)("sha256").update(source, "utf8").digest("hex");
}
function distributedQueueBaseSignature(queue) {
    const signature = queue?.[QUEUE_BASE_DISK_SIGNATURE];
    return typeof signature === "string" ? signature : undefined;
}
function setDistributedQueueBaseSignature(queue, signature) {
    Object.defineProperty(queue, QUEUE_BASE_DISK_SIGNATURE, { value: signature, enumerable: true, configurable: true, writable: true });
    return queue;
}
function cloneDistributedQueue(queue, baseSignature = distributedQueueBaseSignature(queue)) {
    const copy = JSON.parse(JSON.stringify(queue));
    if (typeof baseSignature === "string")
        setDistributedQueueBaseSignature(copy, baseSignature);
    return copy;
}
/** Only our recorded metadata-only commits can advance a business working copy's base. */
function queueMetadataAdvanceRecorded(writes, root, from, to) {
    let signature = from;
    for (const write of writes) {
        if (write.root === root && write.from === signature)
            signature = write.to;
        if (signature === to)
            return true;
    }
    return false;
}
function terminalHistoryLogBinding(plan, job) {
    const status = String(job?.status || "").toLowerCase();
    if (!["completed", "failed", "cancelled"].includes(status))
        return undefined;
    const outputDir = String(job?.outputDir || "").replace(/\\/g, "/").trim();
    if (!outputDir || outputDir.startsWith("/") || /^[A-Za-z]:/.test(outputDir)
        || outputDir.split("/").some((part) => !part || part === "." || part === ".."))
        return undefined;
    const runId = String(plan?.id || "").trim();
    const commandId = String(job?.commandId || "").trim();
    if (!runId || !commandId)
        return undefined;
    return {
        logPath: `${outputDir}/${status === "completed" ? "stdout.log" : "stderr.log"}`,
        historyLogIdentity: { commandId, outputDir, runId },
    };
}
function workerTaskLogBinding(plan, job, taskLogPath) {
    const status = String(job?.status || "").toLowerCase();
    if (["completed", "failed", "cancelled"].includes(status))
        return terminalHistoryLogBinding(plan, job) || { logPath: "" };
    const logPath = typeof taskLogPath === "string" ? taskLogPath.replace(/\\/g, "/").trim() : "";
    if (!logPath || logPath.startsWith("/") || /^[A-Za-z]:/.test(logPath)
        || logPath.split("/").some((part) => !part || part === "." || part === ".."))
        return undefined;
    return { logPath };
}
function hasFreshDurableSnapshot(snapshot, now = Date.now(), maxAgeMs = 180_000) {
    const generatedAt = Date.parse(String(snapshot?.generatedAt || ""));
    const fetchedAt = Date.parse(String(snapshot?.fetchedAt || ""));
    return Boolean(snapshot && !snapshot.error && snapshot.capabilities?.durablePlanQueue === true
        && snapshot.capabilities.schemaVersion === 1 && Number.isFinite(generatedAt) && Number.isFinite(fetchedAt)
        && now - generatedAt <= maxAgeMs && now - fetchedAt <= maxAgeMs
        && generatedAt <= now + 30_000 && fetchedAt <= now + 30_000);
}
exports.CODE_FINGERPRINT_MISMATCH = "代码指纹不匹配：Worker 当前代码版本与该 Plan 不一致。任务仍保留为排队，不会自动失败或重发。请用当前代码重新提交该 Plan，或恢复提交前的代码版本并重新同步 Worker 后再继续。";
exports.CODE_FINGERPRINT_WAITING = "等待当前代码版本的任务结束：匹配的 Worker 上旧版本仍有活动或待核实任务。仅这些 Worker 保留版本锁，其他匹配版本的 Worker 可并行派发。任务仍保留为排队。";
const UNFINISHED_JOB = ["pending", "dispatching", "queued", "running", "unknown"];
exports.DISPATCH_RECONCILIATION_DELAY_MS = 10_000;
function dispatchReconciliationDue(job, now = Date.now()) {
    const attemptedAt = Date.parse(String(job.lastDispatchAttemptAt || ""));
    return !Number.isFinite(attemptedAt) || now - attemptedAt >= exports.DISPATCH_RECONCILIATION_DELAY_MS;
}
function canonicalProjectId(projectRoot) {
    const resolved = path.resolve(String(projectRoot || "")).replace(/\\/g, "/").replace(/\/$/, "");
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function durableCommandId(plan, job, workerId, gpuId) {
    return (0, node_crypto_1.createHash)("sha256").update([plan.projectId || "", plan.id, plan.planFile,
        plan.revision, plan.codeFingerprint, job.index, job.case, job.seed, job.attempt, job.outputDir, workerId, gpuId || ""].join("\0")).digest("hex").slice(0, 32);
}
function freshIdleGpuEvidence(gpuSnapshot, workerIds, idleUtilThreshold, idleMemThresholdMb) {
    const idleGpuIdsByWorker = new Map();
    for (const workerId of workerIds) {
        const rows = gpuSnapshot?.[workerId];
        if (!Array.isArray(rows) || rows.length === 0)
            return { complete: false, idleGpuIdsByWorker };
        const idle = [];
        for (const raw of rows) {
            if (!raw || typeof raw !== "object")
                return { complete: false, idleGpuIdsByWorker };
            const item = raw;
            const gpuId = String(item.index ?? item.gpu_id ?? item.gpuId ?? item.id ?? "").trim();
            const utilRaw = item.utilizationPercent ?? item.utilization ?? item.gpu_util;
            const memRaw = item.memoryUsedMb ?? item.memory_used_mb ?? item.memoryUsed;
            const util = Number(utilRaw);
            const mem = Number(memRaw);
            const processes = Array.isArray(item.processes) ? item.processes : Array.isArray(item.procs) ? item.procs : undefined;
            const processCountRaw = item.processCount ?? item.process_count ?? processes?.length;
            const processCount = Number(processCountRaw);
            if (!gpuId || utilRaw == null || memRaw == null || processCountRaw == null
                || typeof utilRaw === "string" && !utilRaw.trim() || typeof memRaw === "string" && !memRaw.trim()
                || typeof processCountRaw === "string" && !processCountRaw.trim()
                || !Number.isFinite(util) || util < 0 || !Number.isFinite(mem) || mem < 0
                || !Number.isInteger(processCount) || processCount < 0)
                return { complete: false, idleGpuIdsByWorker };
            if (!(processes?.length) && processCount === 0 && util < idleUtilThreshold && mem < idleMemThresholdMb)
                idle.push(gpuId);
        }
        idleGpuIdsByWorker.set(workerId, [...new Set(idle)]);
    }
    return { complete: workerIds.length > 0, idleGpuIdsByWorker };
}
function durableStatus(value) {
    const status = String(value || "").toLowerCase();
    if (status === "queued" || status === "pending")
        return "queued";
    if (status === "running" || status === "starting")
        return "running";
    if (status === "completed")
        return "completed";
    if (status === "failed" || status === "stopped")
        return "failed";
    if (status === "cancelled" || status === "canceled")
        return "cancelled";
    if (status === "unknown" || status === "dispatching")
        return "unknown";
    return undefined;
}
/** Missing recovery is a gap in job identities, not the absence of a terminal receipt from this snapshot. */
function distributedPlanRecoveryMissingCount(plan, acceptedIndices = new Set()) {
    const expected = Number(plan.planJobCount);
    if (!Number.isInteger(expected) || expected < 1)
        return Math.max(0, Number(plan.recoveryMissingCount) || 0);
    const known = new Set(acceptedIndices);
    const latestAttempts = new Map();
    for (const job of plan.jobs) {
        if (Number.isInteger(job.index) && job.index >= 0 && Number.isInteger(job.attempt) && job.attempt > 0)
            latestAttempts.set(job.index, Math.max(latestAttempts.get(job.index) || 0, job.attempt));
    }
    for (const job of plan.jobs) {
        if (job.recoveryConflict || !Number.isInteger(job.index) || job.index < 0
            || !Number.isInteger(job.attempt) || job.attempt < 1 || job.attempt !== latestAttempts.get(job.index))
            continue;
        const localPending = job.status === "pending" && !job.workerId && !job.commandId;
        const terminalReceipt = ["completed", "failed", "cancelled"].includes(job.status)
            && (!job.trustedTerminalStatus || job.trustedTerminalStatus === job.status)
            && Boolean(job.workerId && job.commandId && job.outputDir && job.case) && Number.isInteger(job.seed);
        if (localPending || terminalReceipt)
            known.add(job.index);
    }
    return Math.max(0, expected - known.size);
}
function hasUnresolvedPlanRecovery(plan) {
    return Boolean(plan.recoveryConflict || plan.jobs.some(job => job.recoveryConflict)
        || Number(plan.recoveryMissingCount) > 0 && distributedPlanRecoveryMissingCount(plan) > 0);
}
/** Merge only fresh, capability-bearing server snapshots for this exact project. */
function mergeDurableWorkerSnapshots(queue, snapshots, projectId, now = Date.now(), maxAgeMs = 180_000) {
    const acceptedRows = [];
    for (const snapshot of snapshots) {
        if (snapshot.error || snapshot.capabilities?.durablePlanQueue !== true || snapshot.capabilities.schemaVersion !== 1)
            continue;
        const generatedAt = Date.parse(String(snapshot.generatedAt || ""));
        const fetchedAt = Date.parse(String(snapshot.fetchedAt || ""));
        if (!Number.isFinite(generatedAt) || !Number.isFinite(fetchedAt) || now - generatedAt > maxAgeMs || now - fetchedAt > maxAgeMs
            || generatedAt > now + 30_000 || fetchedAt > now + 30_000)
            continue;
        for (const task of snapshot.tasks || []) {
            const status = durableStatus(task.status);
            if (!status || String(task.projectId || "") !== projectId || String(task.workerId || snapshot.workerId) !== snapshot.workerId)
                continue;
            if (!String(task.workflowId || "") || !String(task.planFile || "") || !String(task.planRevision || "")
                || !String(task.codeFingerprint || "") || !String(task.commandId || "") || !String(task.outputDir || "")
                || String(task.runKey || "") !== String(task.commandId || "") || !String(task.enqueuedAt || "")
                || !String(task.case || "") || task.seed == null || !Number.isInteger(Number(task.seed))
                || task.experimentIndex == null || !Number.isInteger(Number(task.experimentIndex)) || Number(task.experimentIndex) < 0
                || task.attempt == null || !Number.isInteger(Number(task.attempt)) || Number(task.attempt) < 1
                || !Number.isInteger(Number(task.planJobCount)) || Number(task.planJobCount) < 1)
                continue;
            acceptedRows.push({ workerId: snapshot.workerId, task, status });
        }
    }
    const legacyReceipt = (plan, job) => job.legacyOwnership === true
        ? snapshots.filter((snapshot) => snapshot.workerId === job.workerId && hasFreshDurableSnapshot(snapshot, now, maxAgeMs))
            .flatMap((snapshot) => (snapshot.tasks || []).map((task) => ({ ...task, workerId: task.workerId || snapshot.workerId })))
            .find((task) => historicalRecallTaskMatchesJob(plan, job, task)) : undefined;
    const plans = queue.plans.map((plan) => plan.projectId !== projectId ? plan : { ...plan, jobs: plan.jobs.map((job) => {
            const legacy = legacyReceipt(plan, job);
            const legacyStatus = legacy && durableStatus(legacy.status);
            if (legacyStatus) {
                const terminal = job.trustedTerminalStatus || (["completed", "failed", "cancelled"].includes(job.status) ? job.status : undefined);
                if (terminal && terminal !== legacyStatus)
                    return { ...job, status: "unknown", recoveryConflict: true,
                        blockReason: "Fresh historical server state contradicts a trusted terminal receipt." };
                return { ...job, status: legacyStatus, blockReason: undefined };
            }
            if (!job.workerId || !job.commandId || !UNFINISHED_JOB.includes(job.status)
                || acceptedRows.some((row) => remoteTaskMatchesJob(plan, job, row.task)))
                return job;
            const receiptAt = Date.parse(String(job.status === "queued" ? job.dispatchAcknowledgedAt
                : job.status === "dispatching" ? job.lastDispatchAttemptAt : ""));
            const owner = snapshots.find((snapshot) => snapshot.workerId === job.workerId
                && hasFreshDurableSnapshot(snapshot, now, Math.min(maxAgeMs, 5_000)));
            // A cached poll taken before this RPC cannot revoke its just-verified receipt.
            // Errors, expired snapshots and a newer authoritative poll still require reconciliation.
            if (owner && Number.isFinite(receiptAt) && receiptAt <= now && now - receiptAt < exports.DISPATCH_RECONCILIATION_DELAY_MS
                && Date.parse(String(owner.fetchedAt)) <= receiptAt
                && !(owner.tasks || []).some((task) => String(task.commandId || "") === job.commandId))
                return job;
            return { ...job, status: "unknown",
                blockReason: "Current server receipt is unavailable; the original owner and command identity are retained." };
        }) });
    const grouped = new Map();
    for (const row of acceptedRows) {
        const task = row.task;
        const key = [projectId, task.workflowId, task.planFile, task.planRevision, task.codeFingerprint].join("\0");
        grouped.set(key, [...(grouped.get(key) || []), row]);
    }
    for (const [key, rows] of grouped) {
        const first = rows[0].task;
        const planIndex = plans.findIndex((plan) => (!plan.projectId || plan.projectId === projectId) && plan.id === String(first.workflowId)
            && plan.planFile === String(first.planFile) && plan.revision === String(first.planRevision)
            && plan.codeFingerprint === String(first.codeFingerprint));
        const declaredCounts = [...new Set([...rows.map((row) => Number(row.task.planJobCount)),
                ...(planIndex >= 0 && plans[planIndex].planJobCount ? [Number(plans[planIndex].planJobCount)] : [])])];
        const acceptedIndices = new Set(rows.map((row) => Number(row.task.experimentIndex)));
        const countConflict = declaredCounts.length !== 1 || acceptedIndices.size > Math.max(...declaredCounts);
        const jobCount = Math.max(...declaredCounts);
        const plan = planIndex >= 0 ? { ...plans[planIndex], jobs: [...plans[planIndex].jobs] } : {
            id: String(first.workflowId), projectId, planFile: String(first.planFile), revision: String(first.planRevision),
            codeFingerprint: String(first.codeFingerprint), enqueuedAt: String(first.enqueuedAt || ""), planJobCount: jobCount, jobs: [],
        };
        plan.projectId = projectId;
        if (!plan.schedulingMode && !plan.localDispatchOverride && (first.schedulingMode === "server_prequeue" || first.schedulingMode === "local_idle"))
            plan.schedulingMode = first.schedulingMode;
        plan.planJobCount = jobCount;
        const fullCounts = [...new Set([...rows.map((row) => Number(row.task.fullPlanJobCount)), Number(plan.fullPlanJobCount)]
                .filter((count) => Number.isInteger(count) && count >= jobCount))];
        if (fullCounts.length === 1)
            plan.fullPlanJobCount = fullCounts[0];
        if (fullCounts.length > 1)
            plan.recoveryConflict = "Server summaries disagree on the full configured Plan job count.";
        else if (plan.recoveryConflict === "Server summaries disagree on the full configured Plan job count.")
            delete plan.recoveryConflict;
        if (countConflict)
            plan.recoveryConflict = `Server summaries disagree on expected Plan job count: ${declaredCounts.join(", ")}.`;
        const terminalStates = new Set(["completed", "failed", "cancelled"]);
        const latestAttempts = new Map();
        for (const job of plan.jobs)
            latestAttempts.set(job.index, Math.max(latestAttempts.get(job.index) || 0, job.attempt));
        for (const row of rows) {
            const index = Number(row.task.experimentIndex);
            latestAttempts.set(index, Math.max(latestAttempts.get(index) || 0, Number(row.task.attempt)));
        }
        const olderRows = rows.filter((row) => Number(row.task.attempt) < latestAttempts.get(Number(row.task.experimentIndex)));
        const contradictoryHistory = olderRows.some((row) => plan.jobs.some((job) => {
            const terminal = job.trustedTerminalStatus || (terminalStates.has(job.status) ? job.status : undefined);
            return terminal && remoteTaskMatchesJob(plan, job, row.task) && terminal !== row.status;
        }));
        const changedSeedIdentity = rows.some((row) => rows.some((other) => Number(other.task.experimentIndex) === Number(row.task.experimentIndex)
            && (String(other.task.case) !== String(row.task.case) || Number(other.task.seed) !== Number(row.task.seed))));
        const overlappingAttempts = olderRows.some((row) => !terminalStates.has(row.status)) || contradictoryHistory || changedSeedIdentity;
        if (!countConflict && overlappingAttempts)
            plan.recoveryConflict = "Server summaries show overlapping or contradictory job attempts.";
        if (!overlappingAttempts && plan.recoveryConflict === "Server summaries show overlapping or contradictory job attempts.")
            delete plan.recoveryConflict;
        const historicalRows = overlappingAttempts ? [] : olderRows;
        // A verified older terminal attempt remains provenance, rather than another current job.
        plan.jobs = plan.jobs.filter((job) => !historicalRows.some((row) => remoteTaskMatchesJob(plan, job, row.task)));
        plan.jobs = plan.jobs.map((job) => {
            const history = historicalRows.filter((row) => Number(row.task.experimentIndex) === job.index);
            if (!history.length)
                return job;
            const entries = [...(job.history || []), ...history.map((row) => ({ attempt: Number(row.task.attempt), status: row.status,
                    workerId: row.workerId, commandId: String(row.task.commandId), outputDir: String(row.task.outputDir),
                    ...(typeof row.task.error === "string" ? { error: String(row.task.error) } : {}),
                    ...(typeof row.task.finishedAt === "string" ? { finishedAt: String(row.task.finishedAt) } : {}),
                    ...(typeof row.task.stopReason === "string" ? { stopReason: String(row.task.stopReason) } : {}) }))];
            return { ...job, history: entries.filter((entry, index) => entries.findIndex((other) => other.commandId === entry.commandId
                    && other.workerId === entry.workerId && other.attempt === entry.attempt) === index) };
        });
        const byJob = new Map();
        for (const row of rows) {
            if (historicalRows.includes(row))
                continue;
            const task = row.task;
            const key = `${Number(task.experimentIndex)}\0${Number(task.attempt)}`;
            byJob.set(key, [...(byJob.get(key) || []), row]);
        }
        for (const [jobKey, jobRows] of byJob) {
            const task = jobRows[0].task;
            const index = Number(task.experimentIndex);
            const attempt = Number(task.attempt);
            const existing = plan.jobs.findIndex((job) => job.index === index && job.attempt === attempt);
            const identities = new Set(jobRows.map(({ workerId, task: item }) => [workerId, item.commandId, item.case, item.seed, item.outputDir].join("\0")));
            const statuses = new Set(jobRows.map((row) => row.status));
            const conflict = countConflict || overlappingAttempts || identities.size !== 1 || statuses.size > 1;
            const source = jobRows.sort((a, b) => a.workerId.localeCompare(b.workerId))[0];
            const terminalStatus = !conflict && terminalStates.has(source.status) ? source.status : undefined;
            const taskLogPath = typeof task.logPath === "string" ? task.logPath : undefined;
            const logBinding = terminalStatus
                ? terminalHistoryLogBinding(plan, { status: terminalStatus, outputDir: String(task.outputDir), commandId: String(task.commandId) })
                : workerTaskLogBinding(plan, { status: "running", outputDir: String(task.outputDir), commandId: String(task.commandId) }, taskLogPath);
            const merged = {
                index, case: String(task.case || ""), seed: Number(task.seed), attempt, outputDir: String(task.outputDir),
                status: conflict ? "unknown" : source.status, workerId: source.workerId,
                commandId: String(task.commandId), runKey: String(task.runKey), projectId,
                ...(task.gpuId !== undefined && task.gpuId !== null ? { gpuId: String(task.gpuId) } : {}),
                ...(logBinding || {}),
                ...(typeof task.finishedAt === "string" ? { finishedAt: task.finishedAt } : {}),
                ...(typeof task.error === "string" ? { error: task.error } : {}),
                ...(typeof task.stopReason === "string" ? { stopReason: task.stopReason } : {}),
                ...(terminalStatus ? { trustedTerminalStatus: terminalStatus } : {}),
                ...(historicalRows.some((row) => Number(row.task.experimentIndex) === index) ? {
                    history: historicalRows.filter((row) => Number(row.task.experimentIndex) === index).map((row) => ({
                        attempt: Number(row.task.attempt), status: row.status, workerId: row.workerId,
                        commandId: String(row.task.commandId), outputDir: String(row.task.outputDir),
                        ...(typeof row.task.error === "string" ? { error: String(row.task.error) } : {}),
                        ...(typeof row.task.stopReason === "string" ? { stopReason: String(row.task.stopReason) } : {}),
                        ...(typeof row.task.finishedAt === "string" ? { finishedAt: row.task.finishedAt } : {}),
                    })),
                } : {}),
                ...(conflict ? { recoveryConflict: true } : {}),
                ...(conflict ? { blockReason: "Conflicting fresh server summaries for the same durable job identity." } : {}),
            };
            if (existing >= 0) {
                const local = plan.jobs[existing];
                const localIdentity = [local.workerId, local.commandId, local.case, local.seed, local.outputDir].join("\0");
                const remoteIdentity = [merged.workerId, merged.commandId, merged.case, merged.seed, merged.outputDir].join("\0");
                const sameJob = local.index === merged.index && local.attempt === merged.attempt && local.case === merged.case
                    && local.seed === merged.seed && local.outputDir === merged.outputDir;
                const unassignedLocalIntent = !local.workerId && !local.commandId && ["pending", "dispatching"].includes(local.status);
                const terminal = local.trustedTerminalStatus || (["completed", "failed", "cancelled"].includes(local.status)
                    ? local.status : undefined);
                const terminalConflict = Boolean(terminal && merged.status !== terminal);
                plan.jobs[existing] = (localIdentity === remoteIdentity || unassignedLocalIntent && sameJob) && !conflict && !terminalConflict ? {
                    ...local, ...merged, localQueueOnly: local.localQueueOnly, recallRequested: local.recallRequested,
                    ...(merged.history ? { history: [...(local.history || []), ...merged.history].filter((entry, index, entries) => entries.findIndex(other => other.commandId === entry.commandId && other.workerId === entry.workerId
                            && other.attempt === entry.attempt) === index) } : {}),
                    recallOperationId: local.recallOperationId, reassignmentPending: local.reassignmentPending,
                    recoveryConflict: undefined, blockReason: undefined,
                    ...(terminal ? { trustedTerminalStatus: terminal } : {}),
                } : {
                    ...local, status: "unknown", recoveryConflict: true,
                    ...(terminal ? { trustedTerminalStatus: terminal } : {}),
                    blockReason: terminalConflict ? "Fresh server state contradicts a trusted terminal receipt; redispatch is blocked."
                        : "Server and local durable job identities conflict.",
                };
            }
            else
                plan.jobs.push(merged);
        }
        plan.planJobCount = jobCount;
        const currentAcceptedIndices = new Set(rows.filter((row) => Number(row.task.attempt) === latestAttempts.get(Number(row.task.experimentIndex)))
            .map((row) => Number(row.task.experimentIndex)));
        for (const job of plan.jobs)
            if (legacyReceipt(plan, job))
                currentAcceptedIndices.add(job.index);
        plan.remoteAcceptedJobCount = currentAcceptedIndices.size;
        plan.recoveryMissingCount = distributedPlanRecoveryMissingCount(plan, currentAcceptedIndices);
        if (!countConflict && plan.recoveryConflict?.startsWith("Server summaries disagree on expected Plan job count"))
            delete plan.recoveryConflict;
        if (planIndex < 0)
            plans.push(plan);
        else
            plans[planIndex] = plan;
    }
    return { ...queue, plans };
}
function unfinishedJobs(plan, states = UNFINISHED_JOB) {
    return plan.jobs.some((job) => states.includes(job.status));
}
/** Local persistence retains unassigned jobs offline for later realtime scheduling; durableAccepted means server acceptance only. */
function distributedSubmissionDisposition(plan) {
    const acceptedStatuses = new Set(["queued", "running", "completed", "failed", "cancelled"]);
    return { localQueued: Boolean(plan), durableAccepted: Boolean(plan && plan.jobs.length > 0
            && plan.jobs.length === Number(plan.planJobCount || plan.jobs.length) && !plan.recoveryConflict
            && plan.jobs.every((job) => acceptedStatuses.has(job.status))),
        pendingCount: plan?.jobs.filter((job) => job.status === "pending" && !job.workerId && !job.commandId).length || 0 };
}
function distributedSubmissionResult(plan, dispatchError = "") {
    const disposition = distributedSubmissionDisposition(plan);
    const unresolved = plan?.jobs.find((job) => !["queued", "running", "completed", "failed", "cancelled"].includes(job.status)
        && !(job.status === "pending" && !job.workerId && !job.commandId && !job.blockReason));
    return { ...disposition, dispatchError: dispatchError || (!disposition.durableAccepted && unresolved
            ? unresolved.blockReason || "持久接收状态仍待核对" : "") };
}
function distributedSubmissionProgress(submission) {
    if (!submission)
        return { status: "failed", waiting: false, message: "本机未能确认保存调度意图：未返回提交记录。" };
    if (submission.enqueued === false)
        return { status: "succeeded", waiting: false,
            message: "已有产物覆盖本次全部任务；按所选“跳过已有”处理，未创建新调度任务。" };
    if (submission.localQueued !== true)
        return { status: "failed", waiting: false,
            message: `本机未能确认保存调度意图：${submission.dispatchError || "状态未知"}。` };
    if (Number(submission.pendingCount || 0) > 0 || Boolean(submission.dispatchError)) {
        const pending = Number(submission.pendingCount || 0) > 0 ? ` ${submission.pendingCount} 个 job 保持未绑定，等待新鲜空闲 GPU。` : "";
        const detail = submission.dispatchError ? ` 状态核对仍有待处理项：${submission.dispatchError}。` : "";
        return { status: "succeeded", waiting: true,
            message: `本机调度队列已保存。${pending}${detail}实时连接恢复后继续派发；刷新状态可查看进度。` };
    }
    return { status: "succeeded", waiting: false,
        message: "调度队列已接收；面板继续显示 Worker 回传的任务状态。" };
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
        if (["dispatching", "queued", "running", "unknown"].includes(job.status))
            return true;
        if (job.status !== "pending")
            return false;
        if (!known.length)
            return true;
        return known.includes(plan.codeFingerprint);
    }));
}
/** A project root on one Worker may host only one live code version. Other Workers are independent. */
function workerCodeVersionAvailable(queue, workerId, fingerprint) {
    return Boolean(workerId && fingerprint) && !queue.plans.some((plan) => {
        if (plan.recoveryConflict && plan.codeFingerprint !== fingerprint)
            return true;
        return plan.jobs.some((job) => {
            if (!["dispatching", "queued", "running", "unknown"].includes(job.status))
                return false;
            if (job.workerId && job.workerId !== workerId)
                return false;
            return !plan.codeFingerprint || plan.codeFingerprint !== fingerprint;
        });
    });
}
const emptyDistributedQueue = () => ({ schemaVersion: 1, plans: [] });
exports.emptyDistributedQueue = emptyDistributedQueue;
function completedJobOutputs(queue, planFile, jobs) {
    const key = String(planFile || "").replace(/\\/g, "/").replace(/^\.\//, "");
    const matching = queue.plans.filter((plan) => String(plan.planFile || "").replace(/\\/g, "/").replace(/^\.\//, "") === key);
    return jobs.flatMap((job) => {
        const previous = matching.slice().reverse().flatMap((plan) => plan.jobs.slice().reverse())
            .find((item) => item.index === job.index && item.case === job.case && item.seed === job.seed
            && item.status === "completed" && item.outputDir && !item.outputRetiredAt);
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
    const planJobCount = Number(plan.planJobCount || plan.jobs.length);
    if (!Number.isInteger(planJobCount) || planJobCount < jobs.length)
        throw new Error("Plan expected job count is invalid.");
    return { ...queue, plans: [...queue.plans, { ...plan, planJobCount, id, enqueuedAt,
                automaticRetry: { enabledAt: enqueuedAt }, jobs }] };
}
function usableSlots(row) {
    return row.online && [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length)).length > 0;
}
function pinnedRetryPlanAllowed(plan) {
    return plan.schedulingMode !== "server_prequeue" || plan.localDispatchOverride === true
        || plan.jobs.some((job) => job.localQueueOnly === true && ["dispatching", "unknown"].includes(job.status));
}
function hostedRetryCandidates(plan, now = Date.now()) {
    if (plan.schedulingMode !== "server_prequeue" || plan.localDispatchOverride === true || plan.recoveryConflict)
        return [];
    return plan.jobs.filter((job) => job.localQueueOnly !== true && job.recallRequested !== true
        && Boolean(job.workerId && job.commandId) && ["dispatching", "unknown"].includes(job.status)
        && dispatchReconciliationDue(job, now));
}
function noteFingerprintMismatch(plans, workers) {
    if (!workers.some((row) => row.codeFingerprint))
        return;
    const anyOnline = workers.some((row) => row.online);
    for (const plan of plans) {
        const matched = workers.some((row) => row.online && row.codeFingerprint === plan.codeFingerprint);
        const held = plan.jobs.some((item) => ["dispatching", "queued", "running", "unknown"].includes(item.status));
        const waiting = matched && !workers.some((row) => row.online && row.codeFingerprint === plan.codeFingerprint
            && workerCodeVersionAvailable({ schemaVersion: 1, plans }, row.workerId, plan.codeFingerprint));
        for (const job of plan.jobs) {
            if (job.status !== "pending")
                continue;
            if (waiting)
                job.blockReason = exports.CODE_FINGERPRINT_WAITING;
            else if (anyOnline && !matched && !held)
                job.blockReason = exports.CODE_FINGERPRINT_MISMATCH;
            else if (job.blockReason === exports.CODE_FINGERPRINT_MISMATCH || String(job.blockReason || "").startsWith("等待当前代码版本"))
                delete job.blockReason;
        }
    }
}
function allocateAvailable(queue, workers, options = {}) {
    const versioned = workers.some((row) => row.codeFingerprint);
    const plans = queue.plans.map((plan) => ({ ...plan, jobs: plan.jobs.map((job) => ({ ...job })) }));
    const dispatches = [];
    const activeFingerprint = plans.find((plan) => plan.jobs.some((job) => ["dispatching", "queued", "running", "unknown"].includes(job.status)))?.codeFingerprint;
    const runnableFingerprint = !versioned && (activeFingerprint || plans.find((plan) => (!options.localIdleOnly || plan.schedulingMode !== "server_prequeue" || plan.localDispatchOverride === true
        || plan.jobs.some((job) => job.status === "pending" && job.localQueueOnly === true && !job.recallRequested))
        && plan.jobs.some((job) => job.status === "pending" && !job.recallRequested
            && (!options.localIdleOnly || plan.schedulingMode !== "server_prequeue" || plan.localDispatchOverride === true || job.localQueueOnly === true))
        && (!versioned || workers.some((row) => usableSlots(row)
            && (!options.requireIdleGpuAdmission || row.idleGpuAdmission === true) && row.codeFingerprint === plan.codeFingerprint)))?.codeFingerprint);
    const slots = new Map(workers.filter((row) => row.online && (!options.requireIdleGpuAdmission || row.idleGpuAdmission === true)
        && (!versioned || Boolean(row.codeFingerprint)))
        .map((row) => [row.workerId, [...new Set(row.idleGpuIds)].slice(0, Math.max(0, row.capacity ?? row.idleGpuIds.length))]));
    for (const plan of plans) {
        if (options.localIdleOnly && plan.schedulingMode === "server_prequeue" && plan.localDispatchOverride !== true
            && !plan.jobs.some((job) => job.status === "pending" && job.localQueueOnly === true && !job.recallRequested))
            continue;
        if (!versioned && (!runnableFingerprint || plan.codeFingerprint !== runnableFingerprint))
            continue;
        const pending = plan.jobs.filter((job) => job.status === "pending" && !job.recallRequested
            && (!options.localIdleOnly || plan.schedulingMode !== "server_prequeue" || plan.localDispatchOverride === true || job.localQueueOnly === true));
        if (!pending.length)
            continue;
        const eligibleWorkerIds = new Set(workers.filter(row => (!versioned || row.codeFingerprint === plan.codeFingerprint)
            && workerCodeVersionAvailable({ ...queue, plans }, row.workerId, plan.codeFingerprint)).map(row => row.workerId));
        const ranked = () => [...slots].filter(([id, gpuIds]) => gpuIds.length && eligibleWorkerIds.has(id))
            .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
        const assignedWorkerIds = [...new Set(plan.jobs.filter((job) => job.workerId).map((job) => job.workerId))];
        const primary = assignedWorkerIds.find((id) => eligibleWorkerIds.has(id) && (slots.get(id)?.length || 0) > 0) || ranked()[0]?.[0];
        if (!primary)
            continue;
        const cases = [...new Set(pending.map((job) => job.case))];
        for (const caseName of cases) {
            const caseJobs = pending.filter((job) => job.case === caseName).sort((a, b) => a.index - b.index);
            const whole = ranked().find(([workerId, ids]) => workerId === primary && ids.length >= caseJobs.length)
                || ranked().find(([, ids]) => ids.length >= caseJobs.length);
            for (const job of caseJobs) {
                const chosen = job.reassignmentWorkerId ? eligibleWorkerIds.has(job.reassignmentWorkerId)
                    && slots.get(job.reassignmentWorkerId)?.length ? job.reassignmentWorkerId : undefined
                    : whole?.[0] && slots.get(whole[0])?.length ? whole[0]
                        : slots.get(primary)?.length ? primary : ranked()[0]?.[0];
                if (!chosen)
                    continue;
                const gpuId = slots.get(chosen)?.shift();
                if (gpuId === undefined)
                    break;
                const commandId = durableCommandId(plan, job, chosen, gpuId);
                Object.assign(job, { status: "dispatching", workerId: chosen, gpuId, commandId, blockReason: undefined,
                    reassignmentWorkerId: undefined });
                dispatches.push({ planId: plan.id, jobIndex: job.index, workerId: chosen, gpuId, attempt: job.attempt, commandId });
            }
        }
    }
    noteFingerprintMismatch(plans, workers);
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
    const gpuMatches = job.gpuId === undefined || plan.schedulingMode === "server_prequeue" && job.gpuId === ""
        || String(task.gpuId ?? "") === String(job.gpuId);
    return Boolean(job.commandId && job.workerId && gpuMatches
        && String(task.commandId || "") === job.commandId
        && String(task.workflowId || "") === plan.id
        && (!plan.projectId || String(task.projectId || "") === plan.projectId)
        && (!plan.projectId || String(task.planFile || "") === plan.planFile)
        && String(task.planRevision || "") === plan.revision
        && (!plan.projectId || String(task.codeFingerprint || "") === plan.codeFingerprint)
        && (!plan.projectId || Number(task.planJobCount) === Number(plan.planJobCount))
        && (!plan.projectId || Number(task.experimentIndex) === job.index)
        && (!plan.projectId || String(task.runKey || "") === String(job.runKey || job.commandId))
        && String(task.case || "") === job.case
        && Number(task.seed) === job.seed
        && Number(task.attempt) === job.attempt
        && String(task.outputDir || "") === job.outputDir
        && String(task.workerId || "") === job.workerId);
}
function hasLegacyOwnership(job) {
    return job.legacyOwnership === true && Boolean(job.workerId && job.commandId);
}
function resetUnsentDispatch(queue, planId, jobIndex, commandId) {
    return { ...queue, plans: queue.plans.map((plan) => plan.id !== planId ? plan : { ...plan,
            jobs: plan.jobs.map((job) => job.index !== jobIndex || job.commandId !== commandId || job.status !== "dispatching"
                ? job : { ...job, status: "pending", workerId: undefined, gpuId: undefined, commandId: undefined }) }) };
}
function resetBusyRejectedDispatch(queue, dispatch, receipt) {
    if (receipt?.durableAccepted !== false || receipt?.admissionRejected !== true || String(receipt?.status || "") !== "pending"
        || String(receipt?.reason || "") !== "gpu_busy" || String(receipt?.commandId || "") !== dispatch.commandId
        || String(receipt?.workerId || "") !== dispatch.workerId || String(receipt?.gpuId || "") !== dispatch.gpuId)
        return queue;
    const plan = queue.plans.find((row) => row.id === dispatch.planId);
    const job = plan?.jobs.find((row) => row.index === dispatch.jobIndex && row.attempt === dispatch.attempt);
    if (!plan || !job || !remoteTaskMatchesJob(plan, job, receipt))
        return queue;
    return { ...queue, plans: queue.plans.map((plan) => plan.id !== dispatch.planId ? plan : { ...plan,
            jobs: plan.jobs.map((job) => job.index !== dispatch.jobIndex || job.attempt !== dispatch.attempt
                || job.commandId !== dispatch.commandId || job.workerId !== dispatch.workerId || job.gpuId !== dispatch.gpuId
                || !["dispatching", "unknown"].includes(job.status) ? job : { ...job, status: "pending", workerId: undefined,
                gpuId: undefined, commandId: undefined, runKey: undefined, lastDispatchAttemptAt: undefined, dispatchAcknowledgedAt: undefined,
                blockReason: "Worker confirmed the requested GPU was busy; awaiting fresh availability." }) }) };
}
function retryPinnedDispatch(queue, planId, jobIndex, snapshot, idleGpuIds, now = Date.now()) {
    const plan = queue.plans.find((row) => row.id === planId);
    const job = plan?.jobs.find((row) => row.index === jobIndex);
    if (!plan || !job || plan.recoveryConflict || job.recoveryConflict || job.recallRequested === true || !["dispatching", "unknown"].includes(job.status)
        || !job.workerId || !job.commandId || !String(job.gpuId || "").trim()
        || !dispatchReconciliationDue(job, now)
        || !snapshotAllowsPinnedRetry(snapshot, job, now))
        return undefined;
    const occupiedByOther = queue.plans.some((candidatePlan) => candidatePlan.jobs.some((candidate) => !(candidatePlan.id === planId && candidate.index === jobIndex && candidate.attempt === job.attempt)
        && candidate.workerId === job.workerId && String(candidate.gpuId ?? "") === String(job.gpuId)
        && ["dispatching", "queued", "running", "unknown"].includes(candidate.status)));
    if (occupiedByOther || !idleGpuIds.some((id) => String(id) === String(job.gpuId)))
        return undefined;
    return { planId, jobIndex, workerId: job.workerId, gpuId: job.gpuId, attempt: job.attempt, commandId: job.commandId };
}
function snapshotAllowsPinnedRetry(snapshot, job, now) {
    if (!snapshot || !hasFreshDurableSnapshot(snapshot, now) || snapshot.workerId !== job.workerId
        || snapshot.capabilities?.idleGpuAdmission !== true)
        return false;
    const sameCommand = (snapshot.tasks || []).find((task) => String(task.commandId || "") === job.commandId);
    return !sameCommand;
}
function releaseQueuedForReassignment(queue, planId, jobIndex, receipt, nextRunId) {
    const plan = queue.plans.find((row) => row.id === planId);
    const job = plan?.jobs.find((row) => row.index === jobIndex);
    if (!plan || !job || !["queued", "cancelled", "unknown"].includes(job.status) || job.reassignmentPending !== true
        || !isExactQueuedReleaseProof(plan, job, receipt)
        || String(receipt?.status || "").toLowerCase() !== "cancelled" || String(receipt?.stopReason || "") !== "requeue"
        || !/^[a-zA-Z0-9-]{8,80}$/.test(nextRunId))
        throw new Error("Queued job release proof does not match the exact persisted job identity.");
    const outputDir = nextAttemptOutputDir(job.outputDir, nextRunId);
    return { ...queue, plans: queue.plans.map((row) => row.id !== planId ? row : { ...row,
            jobs: row.jobs.map((item) => item.index !== jobIndex ? item : {
                index: item.index, case: item.case, seed: item.seed, outputDir, attempt: item.attempt + 1,
                status: "pending", projectId: item.projectId, localQueueOnly: true, recallRequested: undefined,
                recallOperationId: undefined, reassignmentPending: undefined,
                reassignmentWorkerId: item.reassignmentWorkerId,
                automaticRetry: item.automaticRetry,
                history: [...(item.history || []), { attempt: item.attempt,
                        status: "cancelled", workerId: item.workerId, commandId: item.commandId, outputDir: item.outputDir,
                        finishedAt: typeof receipt.finishedAt === "string" ? receipt.finishedAt : item.finishedAt, stopReason: "requeue" }],
            }) }) };
}
function isExactQueuedReleaseProof(plan, job, proof) {
    if (proof.durableReleased !== true || proof.neverStarted !== true || !recognizedNeverStartedEvidence(proof.neverStartedEvidence))
        return false;
    if (proof.legacyReleased === true)
        return historicalRecallIdentityMatchesJob(plan, job, proof);
    const modernIdentity = [proof.projectId, proof.codeFingerprint, proof.workflowId, proof.planRevision,
        proof.planFile, proof.experimentIndex, proof.runKey, proof.case, proof.seed, proof.attempt,
        proof.outputDir, proof.workerId, proof.targetCommandId, proof.planJobCount];
    if (modernIdentity.some((value) => value === undefined || value === null || value === ""))
        return false;
    return proof.durableAccepted === true && recallResponseMatchesJob(plan, job, proof)
        && stopIdentityMatchesJob(plan, job, { ...proof, commandId: proof.targetCommandId })
        && Number(proof.planJobCount) === Number(plan.planJobCount || plan.jobs.length);
}
function recallResponseMatchesJob(plan, job, identity) {
    const targetCommandId = String(identity.targetCommandId || "");
    if (!targetCommandId || targetCommandId !== job.commandId)
        return false;
    const normalized = { ...identity, commandId: targetCommandId };
    return identityAliasesMatchJob(plan, job, identity) && (stopIdentityMatchesJob(plan, job, normalized)
        || historicalRecallTaskMatchesJob(plan, job, normalized));
}
function identityAliasesMatchJob(plan, job, identity) {
    const equalsAll = (keys, expected, normalize = (value) => String(value ?? "")) => keys.every((key) => identity[key] === undefined || identity[key] === null || normalize(identity[key]) === normalize(expected));
    return equalsAll(["workflowId", "planId"], plan.id)
        && ["planFile", "plan"].every((key) => identity[key] === undefined || identity[key] === null
            || samePlanFile(String(identity[key]), plan.planFile))
        && equalsAll(["projectId"], plan.projectId)
        && equalsAll(["planRevision"], plan.revision)
        && equalsAll(["codeFingerprint"], plan.codeFingerprint)
        && equalsAll(["experimentIndex", "jobIndex"], job.index)
        && equalsAll(["case", "caseName"], job.case)
        && equalsAll(["seed"], job.seed)
        && equalsAll(["attempt"], job.attempt)
        && equalsAll(["outputDir"], job.outputDir)
        && equalsAll(["workerId"], job.workerId)
        && equalsAll(["runKey"], job.runKey || job.commandId)
        && (job.gpuId !== undefined ? equalsAll(["gpuId"], job.gpuId) : equalsAll(["gpuId"], ""));
}
function historicalRecallIdentityMatchesJob(plan, job, identity) {
    const commandId = String(identity.targetCommandId || "");
    const workerId = String(identity.workerId || "");
    if (!job.commandId || commandId !== job.commandId || !job.workerId || workerId !== job.workerId)
        return false;
    const planId = String(identity.workflowId || identity.planId || "");
    const planFile = String(identity.planFile || identity.plan || "");
    if (!identityAliasesMatchJob(plan, job, identity))
        return false;
    if (!planId && !planFile || !planId || !planFile)
        return false;
    const required = [identity.planRevision, identity.case ?? identity.caseName, identity.seed, identity.attempt, identity.outputDir];
    if (required.some((value) => value === undefined || value === null || value === ""))
        return false;
    if (String(identity.planRevision || "") !== String(plan.revision || "")
        || String(identity.case ?? identity.caseName) !== job.case
        || Number(identity.seed) !== job.seed || Number(identity.attempt) !== job.attempt
        || String(identity.outputDir) !== job.outputDir
        || identity.planJobCount !== undefined && Number(identity.planJobCount) !== Number(plan.planJobCount || plan.jobs.length))
        return false;
    if (job.gpuId !== undefined && String(identity.gpuId ?? "") !== String(job.gpuId))
        return false;
    if (job.gpuId === undefined && identity.gpuId !== undefined && identity.gpuId !== null && String(identity.gpuId) !== "")
        return false;
    return true;
}
function historicalRecallTaskMatchesJob(plan, job, task) {
    const commandId = String(task.commandId || task.operationId || task.opId || "");
    const workerId = String(task.workerId || "");
    if (!job.commandId || commandId !== job.commandId || !job.workerId || workerId !== job.workerId)
        return false;
    const planId = String(task.workflowId || task.planId || "");
    const planFile = String(task.planFile || task.plan || "");
    if (planId && planId !== plan.id || planFile && !samePlanFile(planFile, plan.planFile))
        return false;
    if (!planId && !planFile)
        return false;
    if (!identityAliasesMatchJob(plan, job, task))
        return false;
    const checks = [
        [task.projectId, plan.projectId], [task.codeFingerprint, plan.codeFingerprint], [task.planRevision, plan.revision],
        [task.experimentIndex ?? task.jobIndex, job.index], [task.runKey, job.runKey || job.commandId],
        [task.case ?? task.caseName, job.case], [task.seed, job.seed], [task.attempt, job.attempt],
        [task.outputDir, job.outputDir], [task.gpuId, job.gpuId],
    ];
    return checks.every(([observed, expected]) => observed === undefined || observed === null
        || String(observed) === String(expected ?? ""));
}
function recognizedNeverStartedEvidence(value) {
    return ["durable_queued_row", "worker_task_queued", "worker_task_pending", "worker_command_queued"].includes(String(value || ""));
}
function nextAttemptOutputDir(outputDir, runId) {
    if (!/^[a-zA-Z0-9-]{8,80}$/.test(runId))
        throw new Error("Job attempt id is invalid.");
    const prefix = String(outputDir || "").replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");
    const parts = prefix.split("/");
    if (!prefix || prefix.startsWith("/") || /^[a-zA-Z]:/.test(prefix)
        || parts.some((part) => part === ".." || part === "." || !part || part.includes(":")))
        throw new Error("Job output directory is invalid.");
    const marker = prefix.lastIndexOf("/attempts/");
    const relativeMarker = prefix.startsWith("attempts/") ? 0 : -1;
    const base = marker >= 0 ? prefix.slice(0, marker) : relativeMarker === 0 ? "" : prefix;
    return `${base ? `${base}/` : ""}attempts/${runId}`;
}
function sameDeferredPlanFile(left, right) {
    return samePlanFile(left, right);
}
function sameDistributedPlanFile(left, right) {
    return samePlanFile(left, right);
}
function matchingActiveDeferred(queue, identity) {
    const rows = queue.deferred || [];
    const id = String(identity.id || "");
    if (id) {
        const row = rows.find((item) => item.id === id);
        if (!row)
            return null;
        const same = samePlanFile(row.planFile, identity.planFile)
            && row.revision === identity.revision
            && row.codeFingerprint === identity.codeFingerprint
            && row.confirmedOutputChoice !== true
            && (row.status === "pending" || row.status === "blocked");
        return same ? row : null;
    }
    return rows.find((item) => samePlanFile(item.planFile, identity.planFile)
        && item.revision === identity.revision
        && item.codeFingerprint === identity.codeFingerprint
        && item.confirmedOutputChoice !== true
        && (item.status === "pending" || item.status === "blocked"));
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
const ACTIVE_JOB = ["dispatching", "queued", "running", "unknown"];
const LOCAL_CLEAR_JOB = new Set(["pending", "blocked"]);
/** A job can leave the queue without a Worker receipt only while it has never been assigned. */
function jobClearableWithoutRemoteReceipt(job) {
    return LOCAL_CLEAR_JOB.has(String(job?.status || ""))
        && !String(job?.workerId || "").trim()
        && !String(job?.commandId || "").trim()
        && job?.gpuId === undefined;
}
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
    const gpuMatches = job.gpuId === undefined || String(identity.gpuId ?? "") === String(job.gpuId);
    return Boolean(job.commandId && job.workerId && gpuMatches
        && String(identity.commandId || identity.targetCommandId || "") === job.commandId
        && String(identity.workflowId || identity.planId || "") === plan.id
        && (!plan.projectId || String(identity.projectId || "") === plan.projectId)
        && (!plan.projectId || String(identity.codeFingerprint || "") === plan.codeFingerprint)
        && (!plan.projectId || Number(identity.experimentIndex) === job.index)
        && (!plan.projectId || String(identity.runKey || "") === String(job.runKey || job.commandId))
        && String(identity.planRevision || "") === plan.revision
        && String(identity.planFile || identity.plan || "") === plan.planFile
        && String(identity.case || identity.caseName || "") === job.case
        && Number(identity.seed) === job.seed
        && Number(identity.attempt) === job.attempt
        && String(identity.outputDir || "") === job.outputDir
        && String(identity.workerId || "") === job.workerId);
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
                        finishedAt: item.finishedAt, stopReason: item.stopReason, error: item.error }],
            }) }) };
}
exports.AUTOMATIC_JOB_RETRY_MAX_FAILURES = 5;
exports.AUTOMATIC_JOB_RETRY_BASE_DELAY_MS = 30_000;
/** A stopped or unverified process must never be launched again by this policy. */
function scheduleAutomaticJobRetries(queue, snapshots, projectId, options) {
    const now = options.now ?? Date.now();
    if (!Number.isFinite(now))
        return queue;
    const at = new Date(now).toISOString();
    const next = { ...queue, plans: [...queue.plans] };
    let changed = false;
    const latest = new Map();
    for (const plan of next.plans) {
        if (plan.projectId !== projectId || !Number.isFinite(Date.parse(plan.enqueuedAt)))
            continue;
        const key = plan.planFile.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
        const prior = latest.get(key);
        if (!prior || Date.parse(plan.enqueuedAt) >= Date.parse(prior.enqueuedAt))
            latest.set(key, plan);
    }
    const freshTasks = new Map();
    for (const snapshot of snapshots) {
        if (!hasFreshDurableSnapshot(snapshot, now))
            continue;
        for (const task of snapshot.tasks || []) {
            const key = `${snapshot.workerId}\0${task.commandId}`;
            freshTasks.set(key, [...(freshTasks.get(key) || []), task]);
        }
    }
    const proof = (plan, job) => (freshTasks.get(`${job.workerId}\0${job.commandId}`) || [])
        .find(task => remoteTaskMatchesJob(plan, job, task) && !task.identityConflict && !task.manualStopType
        && !task.stopReason && !job.stopReason && !job.recallRequested && !job.recoveryConflict);
    for (const original of latest.values()) {
        if (hasUnresolvedPlanRecovery(original) || original.automaticRetry?.disabledAt
            || options.excludedPlanFiles?.some(file => samePlanFile(file, original.planFile)))
            continue;
        const plan = { ...original, automaticRetry: original.automaticRetry ? { ...original.automaticRetry } : undefined,
            jobs: original.jobs.map(job => ({ ...job })) };
        next.plans[next.plans.indexOf(original)] = plan;
        // Upgrade only live/current runs. Old abandoned history is not revived on reload.
        if (!plan.automaticRetry) {
            const active = plan.jobs.some(job => UNFINISHED_JOB.includes(job.status));
            if (!active && !samePlanFile(options.selectedPlanFile || "", plan.planFile))
                continue;
            plan.automaticRetry = { enabledAt: at };
            changed = true;
        }
        const evidence = new Map(plan.jobs.map(job => [job.index, proof(plan, job)]));
        if (!plan.automaticRetry.healthyAt) {
            const completed = plan.jobs.some(job => job.status === "completed" && evidence.get(job.index)?.status === "completed");
            const running = plan.jobs.filter(job => job.status === "running" && evidence.get(job.index)?.status === "running"
                && !evidence.get(job.index)?.error).length;
            const total = Math.max(plan.jobs.length, Number(plan.fullPlanJobCount || plan.planJobCount || plan.jobs.length));
            if (completed || running > total / 2) {
                plan.automaticRetry.healthyAt = at;
                plan.automaticRetry.healthyReason = completed ? "completed" : "majority_running";
                changed = true;
            }
        }
        if (!plan.automaticRetry.healthyAt)
            continue;
        for (let index = 0; index < plan.jobs.length; index++) {
            const job = plan.jobs[index], task = evidence.get(job.index);
            if (job.status === "completed" && task?.status === "completed") {
                if (job.automaticRetry) {
                    delete job.automaticRetry;
                    changed = true;
                }
                continue;
            }
            if (job.status !== "failed" || task?.status !== "failed"
                || !(Number.isFinite(Date.parse(String(task.finishedAt || "")))
                    || typeof task.exitCode === "number" && task.exitCode !== 0))
                continue;
            let retry = job.automaticRetry;
            if (!retry || retry.failedAttempt !== job.attempt) {
                const count = Math.min(exports.AUTOMATIC_JOB_RETRY_MAX_FAILURES, Math.max(0, retry?.failureCount || 0) + 1);
                retry = job.automaticRetry = { failureCount: count, failedAttempt: job.attempt,
                    lastError: job.error || String(task.error || ""),
                    ...(count >= exports.AUTOMATIC_JOB_RETRY_MAX_FAILURES ? { exhausted: true }
                        : { retryAt: new Date(now + exports.AUTOMATIC_JOB_RETRY_BASE_DELAY_MS * 2 ** (count - 1)).toISOString() }) };
                changed = true;
            }
            if (retry.exhausted || !retry.retryAt || !Number.isFinite(Date.parse(retry.retryAt)) || Date.parse(retry.retryAt) > now)
                continue;
            const attemptId = options.makeAttemptId();
            const outputDir = nextAttemptOutputDir(job.outputDir, attemptId);
            if (outputDir === job.outputDir || job.history?.some(row => row.outputDir === outputDir))
                throw new Error("Automatic retry attempt directory is already in use.");
            plan.jobs[index] = { index: job.index, case: job.case, seed: job.seed, outputDir,
                attempt: job.attempt + 1, status: "pending", projectId: job.projectId,
                automaticRetry: { ...retry, retryAt: undefined },
                history: [...(job.history || []), { attempt: job.attempt, status: job.status, workerId: job.workerId,
                        commandId: job.commandId, outputDir: job.outputDir, finishedAt: job.finishedAt,
                        stopReason: job.stopReason, error: retry.lastError }] };
            changed = true;
        }
    }
    return changed ? next : queue;
}
/** Explicit stop intent persists even if a remote cleanup fails partway through. */
function disableAutomaticJobRetries(queue, planFile, at = new Date().toISOString()) {
    return { ...queue, plans: queue.plans.map(plan => !samePlanFile(plan.planFile, planFile) ? plan : { ...plan,
            automaticRetry: { ...plan.automaticRetry, enabledAt: plan.automaticRetry?.enabledAt || at, disabledAt: at },
            jobs: plan.jobs.map(job => job.automaticRetry?.retryAt ? { ...job,
                automaticRetry: { ...job.automaticRetry, retryAt: undefined } } : job) }) };
}
