"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertLiveIsolatedBoundary = assertLiveIsolatedBoundary;
exports.assertFrozenIsolationOperation = assertFrozenIsolationOperation;
exports.resolveIsolatedBatchReview = resolveIsolatedBatchReview;
exports.recordIsolatedReviewEvent = recordIsolatedReviewEvent;
const node_crypto_1 = require("node:crypto");
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
const PlanCleanup_1 = require("./PlanCleanup");
const PlanIsolatedBatchLedger_1 = require("./PlanIsolatedBatchLedger");
const denied = (code) => { throw new Error(code); };
/** Local identity can revoke a prior native fact; it cannot create a startup fact. */
function assertLiveIsolatedBoundary(batch, root, queue) {
    const projectId = (0, DistributedPlanQueue_1.canonicalProjectId)(root);
    if (batch.projectRoot !== root || batch.canonicalProjectId !== projectId || !(0, PlanIsolatedBatchLedger_1.eligibleIsolatedReviews)([batch], root).length)
        denied("ISOLATED_BATCH_NOT_READY");
    for (const plan of batch.plans) {
        const card = queue.plans?.find((row) => row.id === plan.queuePlanId && row.projectId === projectId && row.planFile === plan.planFile);
        if (!card || !plan.jobs?.some(job => job.proof))
            denied("ISOLATED_BATCH_IDENTITY_CHANGED");
        for (const identity of plan.jobs || []) {
            const jobs = card.jobs.filter((job) => job.index === identity.jobIndex);
            if (jobs.length !== 1)
                denied("ISOLATED_BATCH_IDENTITY_CHANGED");
            const job = jobs[0];
            if (identity.proof && (job.commandId !== identity.expectedCommandId || job.workerId !== identity.proof.workerId))
                denied("ISOLATED_BATCH_IDENTITY_CHANGED");
            if (identity.expectedCommandId && (job.commandId || job.nextCommandId)
                && (job.commandId || job.nextCommandId) !== identity.expectedCommandId)
                denied("ISOLATED_BATCH_IDENTITY_CHANGED");
        }
    }
}
/** Resolve the registered operation. Ledger path strings alone never authorize deletion. */
function assertFrozenIsolationOperation(record, operation) {
    if (operation?.id !== record.cleanupOperationId || operation?.preview?.action !== "isolate" || operation.state !== "completed"
        || operation.continuedBy || operation.restoredBy)
        denied("ISOLATED_OPERATION_UNVERIFIED");
    const rows = operation.preview.rows.filter((row) => row.disposition === "isolate");
    if (!rows.length || rows.some((row) => operation.targets?.[row.id]?.state !== "completed"
        || !["file", "directory"].includes(row.type) || !row.node?.id || !row.node?.root
        || (0, PlanCleanup_1.cleanupRelative)(row.relativePath) !== row.relativePath || (0, PlanCleanup_1.cleanupRelative)(row.destination) !== row.destination))
        denied("ISOLATED_OPERATION_UNVERIFIED");
    const keys = (targets) => targets.map(target => JSON.stringify([target.nodeId, target.host || "", target.sourceRelativePath,
        target.isolationRelativePath, target.archiveBatch || ""])).sort();
    const actual = rows.map((row) => ({ nodeId: row.node.id, host: row.node.host || "", sourceRelativePath: row.relativePath,
        isolationRelativePath: row.destination, archiveBatch: row.archiveBatch }));
    if ((0, PlanCleanup_1.cleanupDigest)(keys(actual)) !== (0, PlanCleanup_1.cleanupDigest)(keys(record.targets)))
        denied("ISOLATED_OPERATION_TARGET_CHANGED");
}
async function resolveIsolatedBatchReview(file, root, operationId, queue, loadOperation) {
    const batches = await (0, PlanIsolatedBatchLedger_1.loadIsolatedBatchLedger)(file);
    const matches = batches.flatMap(batch => batch.plans.flatMap(plan => plan.cleanup
        .filter(record => record.cleanupOperationId === operationId).map(record => ({ batch, plan, record }))));
    if (!matches.length)
        return undefined; // Ordinary standalone file review retains its existing scope.
    if (matches.length !== 1)
        denied("ISOLATED_OPERATION_BATCH_CONFLICT");
    const { batch, plan, record } = matches[0];
    assertLiveIsolatedBoundary(batch, root, queue);
    const operation = await loadOperation(operationId);
    if (operation?.preview?.scope?.planFile !== plan.planFile)
        denied("ISOLATED_OPERATION_PLAN_CHANGED");
    assertFrozenIsolationOperation(record, operation);
    return { batch, operation };
}
/** Append independent events, including late replies. They never mutate PLAN state or schedule work. */
async function recordIsolatedReviewEvent(file, batchId, operationId, event) {
    await (0, PlanIsolatedBatchLedger_1.withIsolatedBatchLedger)(file, async (basis) => {
        const batches = basis.batches;
        const batch = batches.find(row => row.batchId === batchId);
        if (!batch?.plans.some(plan => plan.cleanup.some(record => record.cleanupOperationId === operationId)))
            denied("ISOLATED_OPERATION_BATCH_CONFLICT");
        (batch.reviews ||= []).push({ eventId: (0, node_crypto_1.randomUUID)(), cleanupOperationId: operationId, kind: event.kind,
            ...(event.reviewOperationId ? { reviewOperationId: event.reviewOperationId } : {}), at: new Date().toISOString(),
            ...(event.detail ? { detail: String(event.detail).slice(0, 1200) } : {}) });
        await (0, PlanIsolatedBatchLedger_1.saveIsolatedBatchLedger)(file, batches, basis);
    });
}
