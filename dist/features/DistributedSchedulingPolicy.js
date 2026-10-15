"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRESS_FRESHNESS_MS = void 0;
exports.dispatchPreparationAllowsWorker = dispatchPreparationAllowsWorker;
exports.progressRefreshWorkerIds = progressRefreshWorkerIds;
exports.schedulingMode = schedulingMode;
exports.prequeueGpuWeight = prequeueGpuWeight;
exports.allocateServerPrequeue = allocateServerPrequeue;
exports.serverAuthoritativeProgress = serverAuthoritativeProgress;
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
const LatestJobArtifacts_1 = require("./LatestJobArtifacts");
const RuntimeDiagnostics_1 = require("./RuntimeDiagnostics");
// The live pull is bounded at 15s; a 2s polling interval must not expire it mid-query.
exports.PROGRESS_FRESHNESS_MS = 20_000;
/** Preparation restricts writers only while the current upload is in flight. */
function dispatchPreparationAllowsWorker(workerId, root, preparation, uploads) {
    return !uploads || preparation?.root === root && preparation.preparation.ready.has(workerId);
}
/** Historical completion is stable; background telemetry only follows unresolved ownership. */
function progressRefreshWorkerIds(queue, configuredIds, snapshots) {
    const needed = new Set();
    for (const plan of queue.plans) {
        if ((0, DistributedPlanQueue_1.hasUnresolvedPlanRecovery)(plan))
            return [...new Set(configuredIds)];
        for (const job of plan.jobs || []) {
            if (["completed", "failed", "cancelled"].includes(job.status) && !job.recallRequested)
                continue;
            if (job.workerId)
                needed.add(job.workerId);
            else if (job.status !== "pending")
                return [...new Set(configuredIds)];
        }
    }
    if (snapshots)
        for (const { plan, job } of (0, LatestJobArtifacts_1.newestJobOutputs)(queue)) {
            if (job.lifecycleProtocol !== 2 || job.status !== "completed" || !plan.projectId || !job.commandId || !job.workerId || !job.outputDir)
                continue;
            const snapshot = snapshots.find(row => row.workerId === job.workerId);
            const received = Date.parse(String(snapshot?.fetchedAt || ""));
            const task = snapshot?.tasks?.find((row) => row.projectId === plan.projectId && row.commandId === job.commandId);
            if (snapshot?.error || snapshot?.queryComplete !== true || Number.isFinite(received) && Date.now() - received >= exports.PROGRESS_FRESHNESS_MS - 4_000
                || !(0, RuntimeDiagnostics_1.runtimeEvidence)(task?.runtimeDiagnostics || task?.observation?.runtimeDiagnostics, job.commandId).scanComplete)
                needed.add(job.workerId);
        }
    return [...new Set(configuredIds)].filter(id => needed.has(id));
}
function schedulingMode(value) {
    return value === "server_prequeue" ? "server_prequeue" : "local_idle";
}
/** A GPU counts once. Other users' processes never increase the hosted share. */
function prequeueGpuWeight(rows, idleUtil, idleMem, owner, fallbackUser = "", capacity) {
    if (!Array.isArray(rows) || !rows.length)
        return 0;
    const evidence = (0, DistributedPlanQueue_1.freshIdleGpuEvidence)({ worker: rows }, ["worker"], idleUtil, idleMem);
    if (!evidence.complete)
        return 0;
    const ids = new Set(evidence.idleGpuIdsByWorker.get("worker") || []);
    for (const row of rows) {
        const processes = Array.isArray(row.processes) ? row.processes : Array.isArray(row.procs) ? row.procs : [];
        const count = Number(row.processCount ?? row.process_count ?? processes.length);
        if (!processes.length || count > processes.length)
            continue;
        const own = (process) => process.submittedByThisClient === true;
        if (processes.every((process) => process && typeof process === "object" && own(process)))
            ids.add(String(row.index ?? row.gpu_id ?? row.gpuId ?? row.id));
    }
    return Number.isInteger(capacity) && Number(capacity) > 0 ? Math.min(ids.size, Number(capacity)) : ids.size;
}
function allocateServerPrequeue(queue, workers) {
    const next = { ...queue, plans: queue.plans.map((plan) => ({ ...plan,
            jobs: plan.jobs.map((job) => ({ ...job })) })) };
    const assigned = [];
    for (const plan of next.plans) {
        if (plan.resultPathPolicy !== "declared")
            continue;
        if (plan.executionModeBlocked || schedulingMode(plan.schedulingMode) !== "server_prequeue" || plan.localDispatchOverride === true || plan.recoveryConflict)
            continue;
        const eligible = workers.filter((worker) => worker.declaredJobPaths === true && worker.online && worker.weight > 0
            && (0, DistributedPlanQueue_1.workerCanRunPlan)(next, worker, plan));
        if (!eligible.length)
            continue;
        const weights = { ...(plan.prequeueWeights || {}) };
        // Servers can finish preparation independently. Preserve accepted ownership
        // and existing weights, while letting a newly ready server take new jobs.
        for (const worker of eligible)
            if (!(worker.workerId in weights))
                weights[worker.workerId] = worker.weight;
        plan.prequeueWeights = weights;
        const loads = new Map();
        for (const job of plan.jobs)
            if (job.workerId)
                loads.set(job.workerId, (loads.get(job.workerId) || 0) + 1);
        for (const job of plan.jobs.filter((job) => !job.manualDispatch && job.status === "pending" && !job.workerId && !job.commandId
            && job.localQueueOnly !== true && job.recallRequested !== true)) {
            const target = eligible.filter((worker) => Number(weights[worker.workerId]) > 0).sort((a, b) => ((loads.get(a.workerId) || 0) + 1) / weights[a.workerId]
                - ((loads.get(b.workerId) || 0) + 1) / weights[b.workerId] || a.workerId.localeCompare(b.workerId))[0];
            if (!target)
                break;
            const commandId = (0, DistributedPlanQueue_1.durableCommandId)(plan, job, target.workerId);
            Object.assign(job, { workerId: target.workerId, commandId, runKey: commandId,
                status: "dispatching", gpuId: undefined, blockReason: undefined });
            loads.set(target.workerId, (loads.get(target.workerId) || 0) + 1);
            assigned.push({ planId: plan.id, jobIndex: job.index, workerId: target.workerId, commandId, attempt: job.attempt });
        }
    }
    return { queue: next, dispatches: assigned };
}
/** Display projection only: it never changes scheduling identities or starts work. */
function serverAuthoritativeProgress(queue, snapshots, projectId, now = Date.now()) {
    return (0, DistributedPlanQueue_1.mergeDurableWorkerSnapshots)(queue, snapshots, projectId, now, exports.PROGRESS_FRESHNESS_MS).plans;
}
