"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotaDefaults = void 0;
exports.quotaSettings = quotaSettings;
exports.quotaOverrides = quotaOverrides;
exports.quotaPlacement = quotaPlacement;
exports.quotaPreview = quotaPreview;
const GpuMemoryScheduling_1 = require("./GpuMemoryScheduling");
exports.quotaDefaults = { gpuJobsPerCard: 1, gpuMinFreeMemoryGb: 22 };
const present = (value) => value !== undefined && value !== null && value !== "";
function quotaSettings(global = {}, worker = {}, rows = []) {
    // Convert an unsaved legacy override into an explicit quota for migration.
    // New values always win; legacy utilization and used-memory gates never run.
    const legacy = rows.find(row => (0, GpuMemoryScheduling_1.gpuMemoryNumbers)(row));
    const migrated = !worker.gpuQuotaConfigured && worker.gpuMemoryRatioEnabled === true && legacy
        ? (0, GpuMemoryScheduling_1.gpuMemoryJobLimit)(legacy, (0, GpuMemoryScheduling_1.memorySchedulingSettings)(global, worker))
        : !worker.gpuQuotaConfigured && worker.gpuMemoryRatioEnabled === false ? 1 : undefined;
    const jobs = Number(present(worker.gpuJobsPerCard) ? worker.gpuJobsPerCard : migrated ?? global.gpuJobsPerCard ?? 1);
    const free = Number(present(worker.gpuMinFreeMemoryGb) ? worker.gpuMinFreeMemoryGb : global.gpuMinFreeMemoryGb ?? 22);
    return { gpuJobsPerCard: Number.isFinite(jobs) ? Math.max(1, Math.min(1024, Math.floor(jobs))) : 1,
        gpuMinFreeMemoryGb: Number.isFinite(free) ? Math.max(0, Math.min(1024, free)) : 22 };
}
function quotaOverrides(input) {
    const value = quotaSettings({}, input);
    return { ...Object.fromEntries(Object.keys(exports.quotaDefaults).map(key => [key, present(input[key]) ? value[key] : undefined])),
        gpuQuotaConfigured: input.gpuQuotaConfigured === true || Object.keys(exports.quotaDefaults).some(key => Object.hasOwn(input, key) && input[key] !== undefined) || undefined };
}
function quotaPlacement(rows, counts, settings) {
    const limits = {}, slots = [], seen = new Set();
    for (const row of rows) {
        const id = String(row.index ?? row.gpu_id ?? row.gpuId ?? row.id ?? "");
        if (!id || seen.has(id))
            continue;
        seen.add(id);
        limits[id] = settings.gpuJobsPerCard;
        const memory = (0, GpuMemoryScheduling_1.gpuMemoryNumbers)(row);
        if (!memory || memory.free < settings.gpuMinFreeMemoryGb * 1024)
            continue;
        for (let n = Math.max(0, counts.get(id) || 0); n < settings.gpuJobsPerCard; n++)
            slots.push(id);
    }
    // Spread the first round across physical cards, then fill their quotas.
    const ordered = [];
    for (let round = 0; round < settings.gpuJobsPerCard; round++)
        for (const id of seen)
            if (slots.filter(value => value === id).length > round)
                ordered.push(id);
    return { slots: ordered, limits, weight: Object.keys(limits).length * settings.gpuJobsPerCard };
}
function quotaPreview(global, workers, gpu) {
    return { global: quotaSettings(global), workers: Object.fromEntries(workers.map(worker => {
            const rows = gpu?.[worker.id]?.status === "ok" && Array.isArray(gpu[worker.id].gpus) ? gpu[worker.id].gpus : [];
            const settings = quotaSettings(global, worker, rows);
            return [worker.id, { ...settings, cards: rows.map((row) => ({ gpuId: String(row.index ?? row.gpuId ?? row.id),
                        jobs: settings.gpuJobsPerCard, freeGb: (0, GpuMemoryScheduling_1.gpuMemoryNumbers)(row) ? (0, GpuMemoryScheduling_1.gpuMemoryNumbers)(row).free / 1024 : undefined })) }];
        })) };
}
