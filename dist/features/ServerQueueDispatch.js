"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.remainingQueueJobs = void 0;
exports.serverQueueCards = serverQueueCards;
exports.quotaQueuePlacements = quotaQueuePlacements;
const GpuQuotaScheduling_1 = require("./GpuQuotaScheduling");
// r82：隔离暂停 job 不是"剩余可排队 job"——服务器队列只在安全准入子集上重算配额，
// 暂停 job 保持可见 pending 且不占用任何派发身份（标记不得被派发路径清除）。
const remainingQueueJobs = (plan) => plan.resultPathPolicy === "declared" && !plan.executionModeBlocked && !plan.recoveryConflict
    ? plan.jobs.filter(job => job.status === "pending" && !job.workerId && !job.commandId && !job.manualDispatch && !job.automaticWorkerId && !job.recallRequested
        && !job.stopIntent && !job.unavailable && !job.retainExistingOutputs && !job.outputIsolationBlocked) : [];
exports.remainingQueueJobs = remainingQueueJobs;
/** Queue weights are configured per-card quotas, independent of today's free slots. */
function serverQueueCards(settings, workers, gpu) {
    return workers.flatMap(worker => {
        const rows = gpu?.[worker.id];
        if (!Array.isArray(rows) || !rows.length)
            throw Error("服务器 GPU 尚未查完，未分配排队任务：" + worker.id);
        const policy = (0, GpuQuotaScheduling_1.quotaSettings)(settings, worker, rows);
        if (policy.gpuMaxConcurrentCards === 0)
            return [];
        const ids = [...new Set(rows.map(row => String(row.index ?? row.gpu_id ?? row.gpuId ?? row.id ?? "")))];
        if (ids.some(id => !/^(0|[1-9][0-9]*)$/.test(id)))
            throw Error("GPU 身份无效：" + worker.id);
        return ids.map(gpuId => ({ workerId: worker.id, gpuId, weight: (0, GpuQuotaScheduling_1.cardSettings)(policy, gpuId).gpuJobsPerCard })).filter(card => card.weight > 0);
    }).sort((a, b) => a.workerId.localeCompare(b.workerId) || Number(a.gpuId) - Number(b.gpuId));
}
/** Largest remainders preserve 1:6 exactly for seven-job multiples; stable rounding otherwise. */
function quotaQueuePlacements(count, cards) {
    if (!Number.isSafeInteger(count) || count < 0 || !cards.length || cards.some(card => !Number.isInteger(card.weight) || card.weight <= 0))
        throw Error("没有可用的逐卡 job 配额，未派发服务器队列。");
    const total = cards.reduce((sum, card) => sum + card.weight, 0);
    const allocations = cards.map((card, index) => ({ ...card, index, count: Math.floor(count * card.weight / total), remainder: count * card.weight % total, used: 0 }));
    const order = [...allocations].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
    const extra = count - allocations.reduce((sum, card) => sum + card.count, 0);
    for (const card of order.slice(0, extra))
        card.count++;
    const placements = [];
    for (let index = 0; index < count; index++) {
        const card = allocations.filter(card => card.used < card.count).sort((a, b) => a.used / a.weight - b.used / b.weight || a.index - b.index)[0];
        card.used++;
        placements.push({ workerId: card.workerId, gpuId: card.gpuId, weight: card.weight });
    }
    return { placements, allocations: allocations.map(({ workerId, gpuId, weight, count }) => ({ workerId, gpuId, weight, count })) };
}
