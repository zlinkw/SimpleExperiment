"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pendingIsolationJob = pendingIsolationJob;
exports.transferBusyIsolation = transferBusyIsolation;
exports.isolationIdentity = isolationIdentity;
exports.refreshOutputIsolation = refreshOutputIsolation;
const PlanCleanup_1 = require("./PlanCleanup");
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
function pendingIsolationJob(plan, job) {
    return plan.resultPathPolicy === "declared" && !plan.recoveryConflict && !plan.executionModeBlocked
        && job.status === "pending" && !!job.outputIsolationBlocked && !job.commandId && !job.workerId
        && !job.startIntent && !job.dispatchConsent && !job.manualDispatch && !job.stopIntent && !job.recallRequested
        && !job.verifiedCompletion && !job.unavailable && !job.retainExistingOutputs
        && job.outputIsolationBlocked.declarationKey === job.outputDir;
}
function transferBusyIsolation(job) {
    const block = job.outputIsolationBlocked;
    if (!block || block.busyOnly === false || block.codes?.some(code => code !== "ACTIVE_TRANSFER"))
        return false;
    if (block.code)
        return block.code === "ACTIVE_TRANSFER";
    // Older execute rejections retained only this exact protocol message.
    return /^SimpleSFTP files[.]cleanup[.](?:preview|execute)：?\s*\[ACTIVE_TRANSFER\][.。]?$/u.test(block.reason);
}
function isolationIdentity(plan, job) {
    const { recovery: _recovery, ...block } = job.outputIsolationBlocked || {};
    return (0, PlanCleanup_1.cleanupDigest)([plan.id, plan.projectId, plan.planFile, plan.revision, plan.codeFingerprint, plan.executionMode,
        job.index, job.case, job.seed, job.outputDir, job.collectionResultCsv, block]);
}
/** Rechecks only. Never confirms, executes, moves, deletes, stops or submits a job. */
async function refreshOutputIsolation(ports, selection) {
    const now = ports.now?.() ?? Date.now();
    ports.assertCurrent();
    const queue = await ports.load();
    const candidates = queue.plans.flatMap(plan => plan.jobs.filter(job => pendingIsolationJob(plan, job) && transferBusyIsolation(job) && ports.canRecover?.(plan, job) !== false
        && (!selection || plan.id === selection.planId && job.index === selection.index)
        && (selection || !(Date.parse(job.outputIsolationBlocked.recovery?.nextCheckAt || "") > now)))
        .map(job => ({ plan, job, identity: isolationIdentity(plan, job) })))
        .sort((a, b) => String(a.job.outputIsolationBlocked.recovery?.checkedAt || "").localeCompare(String(b.job.outputIsolationBlocked.recovery?.checkedAt || "")))
        .slice(0, selection ? 1 : 2);
    if (!candidates.length)
        return [];
    let busy;
    try {
        busy = await ports.busy();
    }
    catch (error) {
        busy = { state: "unknown", detail: String(error.message || error) };
    }
    const outcomes = [];
    for (const { plan, job, identity } of candidates) {
        ports.assertCurrent();
        let observed = { state: "unknown", detail: busy.detail };
        if (busy.state === "idle") {
            try {
                observed = await ports.inspect(plan, job);
            }
            catch (error) {
                observed = { state: "unknown", detail: String(error.message || error) };
            }
        }
        ports.assertCurrent();
        const state = busy.state === "busy" ? "waiting_transfer" : observed.state === "absent" ? "resumed"
            : observed.state === "present" ? "review_required" : "unknown";
        const checkedAt = new Date(ports.now?.() ?? Date.now()).toISOString();
        let applied = false;
        await ports.save(latest => {
            ports.assertCurrent();
            const currentPlan = latest.plans.find(row => row.id === plan.id);
            const current = currentPlan?.jobs.find(row => row.index === job.index);
            if (!currentPlan || !current || !pendingIsolationJob(currentPlan, current) || ports.canRecover?.(currentPlan, current) === false || isolationIdentity(currentPlan, current) !== identity)
                return latest;
            applied = true;
            return { ...latest, plans: latest.plans.map(p => p !== currentPlan ? p : { ...p, jobs: p.jobs.map(j => j !== current ? j : state === "resumed"
                        ? { ...j, outputIsolationBlocked: undefined, gpuMemoryWaitReason: undefined, gpuMemoryReservation: undefined,
                            blockReason: undefined, localQueueOnly: true }
                        : (() => {
                            const next = { ...j, outputIsolationBlocked: { ...j.outputIsolationBlocked, recovery: {
                                        state: state, checkedAt,
                                        nextCheckAt: new Date(Date.parse(checkedAt) + 30000).toISOString(), detail: String(observed.detail || busy.detail || "").slice(0, 500)
                                    } } };
                            next.blockReason = (0, DistributedPlanQueue_1.outputIsolationNotice)(next);
                            return next;
                        })()) }) };
        });
        if (applied)
            outcomes.push({ planId: plan.id, index: job.index, state });
    }
    return outcomes;
}
