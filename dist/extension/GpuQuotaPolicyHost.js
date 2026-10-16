"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncGpuQuotaPolicies = syncGpuQuotaPolicies;
const GpuQuotaScheduling_1 = require("../features/GpuQuotaScheduling");
/** Current scheduling configuration only; never starts, recalls or recreates a job. */
async function syncGpuQuotaPolicies(h, root) {
    const entries = h.gpuQuotaPolicyWrites ||= new Map();
    await Promise.all(h.workerActionTargets().map(async (worker) => {
        if (h.lastWorkerProbes?.[worker.id]?.capabilities?.endpoints?.gpuQuotaScheduling !== 1)
            return;
        const configured = h.enabledWorkerConfigs().find((row) => row.id === worker.id);
        const policy = (0, GpuQuotaScheduling_1.quotaSettings)(h.schedulerSettings(), configured, h.lastRealtimeState?.gpu?.[worker.id] || []);
        if (policy.gpuCardOverrides && h.lastWorkerProbes?.[worker.id]?.capabilities?.endpoints?.gpuCardQuotaScheduling !== 1)
            return;
        if (policy.gpuMaxConcurrentCards !== undefined && h.lastWorkerProbes?.[worker.id]?.capabilities?.endpoints?.gpuCardLimitScheduling !== 1)
            return;
        const key = JSON.stringify([root, worker.id, worker.project_dir]);
        const signature = JSON.stringify(policy);
        const prior = entries.get(key);
        if (prior?.client === h.client && prior.signature === signature && (prior.promise || Date.now() < prior.retryAt))
            return;
        const entry = { client: h.client, signature, done: false, retryAt: Date.now() + 30000, promise: undefined };
        entries.set(key, entry);
        const context = h.captureProjectContext?.();
        entry.promise = Promise.resolve(prior?.promise).catch(() => { }).then(() => {
            if (entries.get(key) !== entry || h.client !== entry.client || context && !h.projectContextIsCurrent(context))
                return;
            return entry.client.postWorkerAction(worker.id, "configure-gpu-quota", { workerId: worker.id, ...policy });
        })
            .then(() => { entry.done = true; }, (error) => { entry.error = String(error.message || error); })
            .finally(() => { entry.promise = undefined; });
        await entry.promise;
    }));
    while (entries.size > 128)
        entries.delete(entries.keys().next().value);
}
