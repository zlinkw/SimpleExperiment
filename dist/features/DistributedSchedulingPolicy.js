"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROGRESS_FRESHNESS_MS = void 0;
exports.schedulingMode = schedulingMode;
exports.prequeueGpuWeight = prequeueGpuWeight;
exports.allocateServerPrequeue = allocateServerPrequeue;
exports.serverAuthoritativeProgress = serverAuthoritativeProgress;
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
exports.PROGRESS_FRESHNESS_MS = 5_000;
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
    const users = new Set([owner.currentUser || fallbackUser, ...(owner.currentUserAliases || [])]
        .map((user) => String(user).trim().toLowerCase()).filter(Boolean));
    const keywords = (owner.myCommandKeywords || []).map((word) => word.toLowerCase()).filter(Boolean);
    for (const row of rows) {
        const processes = Array.isArray(row.processes) ? row.processes : Array.isArray(row.procs) ? row.procs : [];
        const count = Number(row.processCount ?? row.process_count ?? processes.length);
        if (!processes.length || count > processes.length)
            continue;
        const own = (process) => {
            if (process.pluginManaged === true)
                return true;
            const user = String(process.username ?? process.user ?? process.userName ?? "").trim().toLowerCase();
            const command = String(process.command ?? process.cmdline ?? process.cmd ?? "").toLowerCase();
            const userMatch = Boolean(user && users.has(user));
            const commandMatch = keywords.some((word) => command.includes(word));
            // A keyword cannot turn another user's or an unidentified process into our capacity.
            return userMatch && (owner.myProcessMatchMode === "command_contains" ? commandMatch : true);
        };
        if (processes.every((process) => process && typeof process === "object" && own(process)))
            ids.add(String(row.index ?? row.gpu_id ?? row.gpuId ?? row.id));
    }
    return Number.isInteger(capacity) && Number(capacity) > 0 ? Math.min(ids.size, Number(capacity)) : ids.size;
}
function allocateServerPrequeue(queue, workers) {
    const next = { ...queue, plans: queue.plans.map((plan) => ({ ...plan,
            jobs: plan.jobs.map((job) => ({ ...job })) })) };
    const assigned = [];
    let activeFingerprint = next.plans.find((plan) => plan.jobs.some((job) => ["dispatching", "queued", "running", "unknown"].includes(job.status)))?.codeFingerprint;
    for (const plan of next.plans) {
        if (schedulingMode(plan.schedulingMode) !== "server_prequeue" || plan.localDispatchOverride === true || plan.recoveryConflict
            || activeFingerprint && plan.codeFingerprint !== activeFingerprint)
            continue;
        const eligible = workers.filter((worker) => worker.online && worker.weight > 0
            && worker.codeFingerprint === plan.codeFingerprint);
        if (!eligible.length)
            continue;
        const weights = plan.prequeueWeights || Object.fromEntries(eligible.map((worker) => [worker.workerId, worker.weight]));
        plan.prequeueWeights = weights;
        const loads = new Map();
        for (const job of plan.jobs)
            if (job.workerId)
                loads.set(job.workerId, (loads.get(job.workerId) || 0) + 1);
        for (const job of plan.jobs.filter((job) => job.status === "pending" && !job.workerId && !job.commandId
            && job.localQueueOnly !== true && job.recallRequested !== true)) {
            const target = eligible.filter((worker) => Number(weights[worker.workerId]) > 0).sort((a, b) => ((loads.get(a.workerId) || 0) + 1) / weights[a.workerId]
                - ((loads.get(b.workerId) || 0) + 1) / weights[b.workerId] || a.workerId.localeCompare(b.workerId))[0];
            if (!target)
                break;
            activeFingerprint ||= plan.codeFingerprint;
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
