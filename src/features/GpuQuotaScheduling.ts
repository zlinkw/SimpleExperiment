import { gpuMemoryNumbers, gpuMemoryJobLimit, memorySchedulingSettings } from "./GpuMemoryScheduling";

export const quotaDefaults = { gpuJobsPerCard: 1, gpuMinFreeMemoryGb: 22 };
export type GpuQuotaSettings = typeof quotaDefaults;
const present = (value: any) => value !== undefined && value !== null && value !== "";
export function quotaSettings(global: any = {}, worker: any = {}, rows: any[] = []): GpuQuotaSettings {
  // Convert an unsaved legacy override into an explicit quota for migration.
  // New values always win; legacy utilization and used-memory gates never run.
  const legacy = rows.find(row => gpuMemoryNumbers(row));
  const migrated = !worker.gpuQuotaConfigured && worker.gpuMemoryRatioEnabled === true && legacy
    ? gpuMemoryJobLimit(legacy, memorySchedulingSettings(global, worker))
    : !worker.gpuQuotaConfigured && worker.gpuMemoryRatioEnabled === false ? 1 : undefined;
  const jobs = Number(present(worker.gpuJobsPerCard) ? worker.gpuJobsPerCard : migrated ?? global.gpuJobsPerCard ?? 1);
  const free = Number(present(worker.gpuMinFreeMemoryGb) ? worker.gpuMinFreeMemoryGb : global.gpuMinFreeMemoryGb ?? 22);
  return { gpuJobsPerCard: Number.isFinite(jobs) ? Math.max(1, Math.min(1024, Math.floor(jobs))) : 1,
    gpuMinFreeMemoryGb: Number.isFinite(free) ? Math.max(0, Math.min(1024, free)) : 22 };
}
export function quotaOverrides(input: any) {
  const value = quotaSettings({}, input);
  return { ...Object.fromEntries((Object.keys(quotaDefaults) as Array<keyof GpuQuotaSettings>).map(key => [key, present(input[key]) ? value[key] : undefined])),
    gpuQuotaConfigured: input.gpuQuotaConfigured === true || Object.keys(quotaDefaults).some(key => Object.hasOwn(input, key) && input[key] !== undefined) || undefined };
}
export function quotaPlacement(rows: any[], counts: Map<string, number>, settings: GpuQuotaSettings) {
  const limits: Record<string, number> = {}, slots: string[] = [], seen = new Set<string>();
  for (const row of rows) {
    const id = String(row.index ?? row.gpu_id ?? row.gpuId ?? row.id ?? "");
    if (!id || seen.has(id)) continue;
    seen.add(id); limits[id] = settings.gpuJobsPerCard;
    const memory = gpuMemoryNumbers(row);
    if (!memory || memory.free < settings.gpuMinFreeMemoryGb * 1024) continue;
    for (let n = Math.max(0, counts.get(id) || 0); n < settings.gpuJobsPerCard; n++) slots.push(id);
  }
  // Spread the first round across physical cards, then fill their quotas.
  const ordered: string[] = [];
  for (let round = 0; round < settings.gpuJobsPerCard; round++) for (const id of seen)
    if (slots.filter(value => value === id).length > round) ordered.push(id);
  return { slots: ordered, limits, weight: Object.keys(limits).length * settings.gpuJobsPerCard };
}
export function quotaPreview(global: any, workers: any[], gpu: any) {
  return { global: quotaSettings(global), workers: Object.fromEntries(workers.map(worker => {
    const rows = gpu?.[worker.id]?.status === "ok" && Array.isArray(gpu[worker.id].gpus) ? gpu[worker.id].gpus : [];
    const settings = quotaSettings(global, worker, rows);
    return [worker.id, { ...settings, cards: rows.map((row: any) => ({ gpuId: String(row.index ?? row.gpuId ?? row.id),
      jobs: settings.gpuJobsPerCard, freeGb: gpuMemoryNumbers(row) ? gpuMemoryNumbers(row)!.free / 1024 : undefined })) }];
  })) };
}
