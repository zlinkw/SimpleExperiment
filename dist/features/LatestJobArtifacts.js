"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.latestJobSyncKey = void 0;
exports.newestJobOutputs = newestJobOutputs;
exports.jobArtifactScopes = jobArtifactScopes;
const PlanCleanup_1 = require("./PlanCleanup");
const SyncResolution_1 = require("./SyncResolution");
const planKey = (value) => String(value || "").replace(/\\/g, "/").toLowerCase();
/** A newer submission owns each logical job even while it is incomplete. Never fall back to old outputs. */
function newestJobOutputs(queue) {
    const owners = new Map();
    const plans = (queue.plans || []).map((plan, index) => ({ plan, index }))
        .sort((a, b) => (Date.parse(a.plan.enqueuedAt) || 0) - (Date.parse(b.plan.enqueuedAt) || 0) || a.index - b.index);
    for (const { plan } of plans)
        for (const job of plan.jobs || [])
            owners.set(JSON.stringify([plan.projectId, planKey(plan.planFile), job.case, job.seed]), { plan, job });
    return [...owners.values()].filter(({ plan, job }) => !plan.cleanup && !job.cleanup && !job.outputRetiredAt);
}
/** Intersect only this job's declared artifacts with the saved Worker-to-Worker checkbox scope. */
function jobArtifactScopes(job, selected) {
    const owned = [job.outputDir, ...((job.actualExecutionMode || job.executionMode) !== "train" && job.collectionResultCsv ? [job.collectionResultCsv] : [])];
    for (const item of owned)
        (0, SyncResolution_1.safeSyncPath)(item);
    const paths = new Set();
    for (const scope of selected) {
        if (scope !== ".")
            (0, SyncResolution_1.safeSyncPath)(scope);
        for (const item of owned) {
            if (scope === "." || item === scope || item.startsWith(scope + "/"))
                paths.add(item);
            else if (item === job.outputDir && scope.startsWith(item + "/"))
                paths.add(scope);
        }
    }
    return [...paths].filter(item => ![...paths].some(parent => parent !== item && item.startsWith(parent + "/"))).sort();
}
const latestJobSyncKey = (plan, job, scopes, targets) => (0, PlanCleanup_1.cleanupDigest)([
    plan.projectId, plan.id, job.commandId, job.workerId, job.outputDir, job.collectionResultCsv, scopes,
    targets.map(row => [row.id, row.host, row.port, row.user, row.remotePath]).sort(),
]);
exports.latestJobSyncKey = latestJobSyncKey;
