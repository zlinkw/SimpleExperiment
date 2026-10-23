"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertIsolatedReviewBinding = assertIsolatedReviewBinding;
exports.recordIsolatedReviewEventFor = recordIsolatedReviewEventFor;
exports.verifyIsolatedTargetsAbsence = verifyIsolatedTargetsAbsence;
exports.openIsolatedBatchReviewFlow = openIsolatedBatchReviewFlow;
const PlanCleanup_1 = require("../features/PlanCleanup");
const PlanIsolatedBatchLedger_1 = require("../features/PlanIsolatedBatchLedger");
const PlanIsolatedReview_1 = require("../features/PlanIsolatedReview");
async function assertIsolatedReviewBinding(ctx, id) {
    ctx.assertWorkspace();
    const file = ctx.host.isolatedReplacementLedgerFileLocal?.();
    if (!file)
        (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
    const queue = await ctx.host.loadDistributedQueue(ctx.root);
    const binding = await (0, PlanIsolatedReview_1.resolveIsolatedBatchReview)(file, ctx.root, id, queue, operationId => ctx.service.status(operationId));
    const original = binding?.operation || await ctx.service.status(id);
    if (original.preview.action !== "isolate" || !original.preview.rows.some(row => row.disposition === "isolate"))
        (0, PlanCleanup_1.cleanupError)("NOT_ISOLATED_OPERATION");
    for (const row of original.preview.rows.filter(row => row.disposition === "isolate")) {
        const current = ctx.currentNode(row.node.id);
        if ((0, PlanCleanup_1.cleanupDigest)({ ...current, error: undefined }) !== (0, PlanCleanup_1.cleanupDigest)({ ...row.node, error: undefined }))
            (0, PlanCleanup_1.cleanupError)("SERVER_IDENTITY_CHANGED");
    }
    ctx.assertWorkspace();
    return binding;
}
async function recordIsolatedReviewEventFor(ctx, originalId, kind, reviewId, detail) {
    const file = ctx.host.isolatedReplacementLedgerFileLocal?.();
    if (!file)
        (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
    const batches = await (0, PlanIsolatedBatchLedger_1.loadIsolatedBatchLedger)(file);
    const matches = batches.filter(batch => batch.projectRoot === ctx.root && batch.plans.some(plan => plan.cleanup.some(record => record.cleanupOperationId === originalId)));
    if (!matches.length)
        return; // Standalone isolation keeps its ordinary operation history.
    if (matches.length !== 1)
        (0, PlanCleanup_1.cleanupError)("ISOLATED_OPERATION_BATCH_CONFLICT");
    await (0, PlanIsolatedReview_1.recordIsolatedReviewEvent)(file, matches[0].batchId, originalId, { kind, reviewOperationId: reviewId, detail });
}
async function verifyIsolatedTargetsAbsence(ctx, originalId) {
    const binding = await assertIsolatedReviewBinding(ctx, originalId);
    const original = binding?.operation || await ctx.service.status(originalId);
    for (const row of original.preview.rows.filter(row => row.disposition === "isolate")) {
        const proof = await ctx.host.simpleSftpApiCall("files.cleanup.inspect", { node: row.node,
            target: { relativePath: row.destination, type: row.type }, allowMissing: true, presenceOnly: true, observeExecutors: true });
        if (proof?.ok !== true || proof.executorsChecked !== true || !Array.isArray(proof.executors) || proof.executors.length
            || proof.target?.missing !== true || !row.rootIdentity || !proof.rootIdentity || (0, PlanCleanup_1.cleanupDigest)(proof.rootIdentity) !== (0, PlanCleanup_1.cleanupDigest)(row.rootIdentity))
            (0, PlanCleanup_1.cleanupError)("ISOLATED_DELETE_UNVERIFIED", "隔离目标仍存在、执行窗口未退出或身份未知；保留记录，不自动重发。");
    }
}
async function openIsolatedBatchReviewFlow(ctx) {
    ctx.assertWorkspace();
    const file = ctx.host.isolatedReplacementLedgerFileLocal?.();
    if (!file)
        (0, PlanCleanup_1.cleanupError)("ISOLATED_BATCH_LEDGER_UNAVAILABLE");
    const batches = await (0, PlanIsolatedBatchLedger_1.loadIsolatedBatchLedger)(file);
    const queue = await ctx.host.loadDistributedQueue(ctx.root);
    const items = [];
    for (const batch of (0, PlanIsolatedBatchLedger_1.eligibleIsolatedReviews)(batches, ctx.root)) {
        try {
            (0, PlanIsolatedReview_1.assertLiveIsolatedBoundary)(batch, ctx.root, queue);
        }
        catch {
            continue;
        }
        for (const plan of batch.plans)
            for (const record of plan.cleanup) {
                const events = batch.reviews?.filter(event => event.cleanupOperationId === record.cleanupOperationId) || [];
                const last = events.at(-1);
                if (events.some(event => event.kind === "completed"))
                    continue;
                // Explicitly opening this review queries only the registered destinations.
                // External removal has no delete receipt; fresh per-target absence still consumes it.
                let absent = false;
                try {
                    await verifyIsolatedTargetsAbsence(ctx, record.cleanupOperationId);
                    absent = true;
                }
                catch { /* Present or unknown: retain for review. */ }
                if (absent) {
                    await recordIsolatedReviewEventFor(ctx, record.cleanupOperationId, "completed");
                    continue;
                }
                const labels = { opened: "已打开", preview: "待确认", confirmed1: "等待第二次确认", confirmed2: "已确认待执行",
                    executing: "执行结果待核实", busy: "服务器忙，未自动重试", failed: "审核失败", cancelled: "已取消", unknown: "结果待核实" };
                items.push({ label: plan.planFile, description: `${record.targets.length} 项隔离产物 · ${last ? labels[last.kind] || "待审核" : "待审核"}`,
                    detail: record.targets.map(target => target.nodeId + ":" + target.isolationRelativePath).join("；"),
                    operationId: record.cleanupOperationId, initialId: [...events].reverse().find(event => event.reviewOperationId)?.reviewOperationId || record.cleanupOperationId, planFile: plan.planFile });
            }
    }
    if (!items.length) {
        await ctx.vscode.window.showInformationMessage("暂无已核实全部初始 PLAN 启动且仍待审核的隔离产物；未删除任何文件。");
        return;
    }
    const selected = await ctx.vscode.window.showQuickPick(items, { title: "隔离产物独立永久删除审核", placeHolder: "选择已登记隔离操作；下一页显示精确节点与完整路径，删除须另行两次确认" });
    if (!selected)
        return;
    await assertIsolatedReviewBinding(ctx, selected.operationId);
    await recordIsolatedReviewEventFor(ctx, selected.operationId, "opened");
    return ctx.open(selected.planFile, selected.initialId, undefined, selected.operationId);
}
