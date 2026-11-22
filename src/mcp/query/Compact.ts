

const NOISY_KEYS = new Set(["raw", "logs", "recentLogs", "runtimeLog", "log", "content", "yaml", "evidence", "debug", "trace", "history", "children"]);


export function compactJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => compactJsonValue(item));
  if (!value || typeof value !== "object") return value;
  const source = value as Record<string, unknown>;
  if (isExperimentLike(source)) return compactExperiment(source);
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (NOISY_KEYS.has(key)) continue;
    const next = compactJsonValue(item);
    if (!isEmptyCompact(next)) out[key] = next;
  }
  return out;
}


export function isExperimentLike(source: Record<string, unknown>): boolean {
  const type = String(source.type || "");
  return type === "workflow" || type === "worker_run" || "experiment_case" in source || "parent_id" in source;
}


export function compactExperiment(source: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of ["id", "type", "status", "parent_id", "plan", "tmux", "stage", "experiment_case", "seed"]) {
    if (!isEmptyCompact(source[key])) out[key] = source[key];
  }
  const worker = pick(source.worker, ["id"]);
  const gpu = pick(source.gpu, ["id"]);
  const progress = pick(source.progress, ["epoch", "max_epoch", "percent", "loss"]);
  if (worker) out.worker = worker;
  if (gpu) out.gpu = gpu;
  if (progress) out.progress = progress;
  out.observation_source = source.native_state || source.native_summary ? "active_query" : "legacy_or_history";
  if (source.native_summary) {
    out.status_source = source.status_source;
    out.native_summary = source.native_summary;
  }
  if (source.native_state) {
    out.status_source = source.status_source;
    // Empty lanes mean unknown/not checked; retain them consistently with status/inspect.
    out.native_state = source.native_state;
  }
  return out;
}


function pick(value: unknown, keys: string[]): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) if (!isEmptyCompact(source[key])) out[key] = source[key];
  return Object.keys(out).length ? out : undefined;
}


function isEmptyCompact(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}