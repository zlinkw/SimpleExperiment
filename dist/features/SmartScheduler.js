"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dryRunScheduling = dryRunScheduling;
function dryRunScheduling(experimentKey, gpus, policies, requiredMemoryMb = 0) {
    const warnings = [];
    const scored = gpus.flatMap((gpu) => {
        const policy = policies.find((item) => item.serverId === gpu.serverId);
        if (!policy?.enabled)
            return [];
        if ((gpu.runningJobs || 0) >= policy.maxConcurrentJobs)
            return [];
        if (policy.blockedGpuIds?.includes(gpu.gpuId))
            return [];
        if (policy.reservedGpuIds?.length && !policy.reservedGpuIds.includes(gpu.gpuId))
            warnings.push(`${gpu.serverId}:${gpu.gpuId} not reserved for this policy`);
        if (gpu.freeMemoryMb < Math.max(policy.minFreeMemoryMb, requiredMemoryMb))
            return [];
        if (gpu.utilizationPercent > policy.maxUtilizationPercent)
            return [];
        const score = gpu.freeMemoryMb / 1024 + (gpu.healthScore || 50) / 10 + (policy.priorityWeight || 1) * 10 - gpu.utilizationPercent / 10;
        return [{ gpu, score, policy }];
    }).sort((a, b) => b.score - a.score);
    const best = scored[0];
    if (!best)
        return { experimentKey, serverId: "", gpuIds: [], reason: "no eligible GPU after policy filtering", score: 0, warnings };
    return {
        experimentKey,
        serverId: best.gpu.serverId,
        gpuIds: [best.gpu.gpuId],
        reason: `selected ${best.gpu.serverId}:${best.gpu.gpuId}; free=${best.gpu.freeMemoryMb}MB util=${best.gpu.utilizationPercent}% health=${best.gpu.healthScore ?? "unknown"}`,
        score: Number(best.score.toFixed(3)),
        warnings,
    };
}
