export const DELETED_EXPERIMENTS_PATH = "simple_cluster/deleted_experiments.jsonl";
export const DELETED_SCHEDULER_ROWS_PATH = "simple_cluster/deleted_scheduler_rows.jsonl";
export const ARTIFACT_REGISTRY_PATH = "simple_cluster/artifact_registry.json";

export interface SchedulerEntryDeleteMatcher {
  suite?: string;
  plan?: string;
  experimentIndex: string;
  workerId?: string;
  workerHost?: string;
  schedulerSession?: string;
  session?: string;
  logPath?: string;
  startedAt?: string;
  finishedAt?: string;
  processPids?: Array<string | number>;
  stateUpdatedAt?: string;
  affectsPending?: boolean;
  deleteMode?: "row" | "log_fields";
  deletedAt?: string;
}

export interface ExperimentIndexEntry {
  global_job_id: string;
  run_id: string;
  suite: string;
  case: string;
  seed: string;
  hub_job_dir: string;
  worker_id: string;
  worker_host: string;
  worker_job_dir: string;
  synced_at: string;
  source?: string;
  native_job_dir?: string;
  config_path?: string;
  checkpoint_path?: string;
  results_csv?: string;
  hub_console_log?: string;
  status?: string;
  started_at?: string;
  finished_at?: string;
  deleted_at?: string;
  local_archive_status?: string;
  hub_archive_status?: string;
  worker_archive_status?: string;
  local_archive_state?: "archived" | "not_archived" | "unknown" | "error";
  hub_archive_state?: "archived" | "not_archived" | "unknown" | "error";
  worker_archive_state?: "archived" | "not_archived" | "unknown" | "error";
  archive_any_archived?: boolean;
  archive_all_archived?: boolean;
  archive_status_text?: string;
  local_archived?: boolean;
  hub_archived?: boolean;
  worker_archived?: boolean;
  archive_key?: string;
  artifact_state?: ArtifactRecordState;
  delete_error?: string;
}

export type ArtifactRecordState = "archived" | "delete_requested" | "deleting" | "delete_failed" | "deleted";
export type EndpointDeleteState = "archived" | "delete_requested" | "deleting" | "deleted" | "delete_failed" | "unknown";

export interface EndpointState {
  state: EndpointDeleteState;
  paths: string[];
  error?: string;
  verifiedAt?: number;
}

export interface ArtifactManifest {
  archiveKey: string;
  planName: string;
  experimentName: string;
  sourceServer: string;
  localLogPaths: string[];
  localArtifactDirs: string[];
  hubArtifactDirs: string[];
  hubLogPaths: string[];
  hubIndexPaths: string[];
  hubMarkerPaths: string[];
  workerArtifactDirs: string[];
  workerLogPaths: string[];
  workerIndexPaths: string[];
  workerMarkerPaths: string[];
  markerPaths?: string[];
  registryPaths: string[];
}

export interface ArtifactRecord {
  archiveKey: string;
  planName: string;
  experimentName: string;
  sourceServer: string;
  state: ArtifactRecordState;
  manifest: ArtifactManifest;
  endpoints: {
    local: EndpointState;
    hub: EndpointState;
    worker: EndpointState;
  };
  finalizers: string[];
  version: number;
  updatedAt: number;
  deletedAt?: number;
  deleteError?: string;
}

export function normalizeComparablePath(value: string): string {
  return String(value || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/$/, "");
}

export function comparablePathVariants(value: string): string[] {
  const normalized = normalizeComparablePath(value);
  if (!normalized) return [];
  const variants = new Set([normalized]);
  const markerIndex = normalized.indexOf("/simple_cluster/");
  if (markerIndex >= 0) variants.add(normalized.slice(markerIndex + 1));
  if (/(?:^|\/)simple_cluster\/archive\//.test(normalized)) return Array.from(variants).filter(Boolean);
  for (const prefix of ["/work_dirs/", "/cluster_runs/", "/experiments/"]) {
    const index = normalized.indexOf(prefix);
    if (index >= 0) variants.add(normalized.slice(index + 1));
  }
  return Array.from(variants).filter(Boolean);
}

// tmp/ 为主，simple_cluster/tmp 仅过渡兼容，下版本移除（与 clusterAgentRuntime.py:safe_project_path 强绑定，共13前缀）
export const MANAGED_ARTIFACT_PREFIXES = [
  "tmp/cluster_scheduler/logs/",
  "tmp/cluster_scheduler/",
  "tmp/tmux_logs/",
  "tmp/console_logs/",
  "tmp/",
  "work_dirs/",
  "cluster_runs/",
  "experiments/runs/",
  "experiments/results/",
  "simple_cluster/console_logs/",
  "simple_cluster/tmux_logs/",
  "simple_cluster/tmp/cluster_scheduler/logs/",
  "simple_cluster/tmp/cluster_scheduler/",
  "simple_cluster/tmp/tmux_logs/",
  "simple_cluster/tmp/console_logs/",
  "simple_cluster/tmp/",
];

export function isManagedArtifactPath(value: string): boolean {
  const normalized = normalizeComparablePath(value);
  if (!normalized || normalized.startsWith("[simple]")) return false;
  if (/^\[[^\]]+\]/.test(normalized)) return false;
  return comparablePathVariants(normalized).some((variant) =>
    MANAGED_ARTIFACT_PREFIXES.some((prefix) => variant.startsWith(prefix))
  );
}

export function normalizedPathSet(paths: string[]): Set<string> {
  const out = new Set<string>();
  for (const item of paths) {
    for (const variant of comparablePathVariants(item)) out.add(variant);
  }
  return out;
}

export function pathMatchesAny(value: string, candidates: Set<string>): boolean {
  for (const variant of comparablePathVariants(value)) {
    for (const candidate of candidates) {
      const variantArchived = /(?:^|\/)simple_cluster\/archive\//.test(variant);
      const candidateArchived = /(?:^|\/)simple_cluster\/archive\//.test(candidate);
      if (variantArchived !== candidateArchived) continue;
      if (variant === candidate) return true;
      if (variant.startsWith(candidate + "/")) return true;
      if (candidate.startsWith(variant + "/")) return true;
      if (variant.endsWith("/" + candidate)) return true;
      if (candidate.endsWith("/" + variant)) return true;
    }
  }
  return false;
}

export function experimentEntryMatchesDeletion(entry: ExperimentIndexEntry, deleted: Partial<ExperimentIndexEntry>): boolean {
  const entryIds = [entry.run_id, entry.global_job_id].map((item) => String(item || "").trim()).filter(Boolean);
  const deletedIds = [deleted.run_id, deleted.global_job_id].map((item) => String(item || "").trim()).filter(Boolean);
  if (entryIds.length && deletedIds.some((id) => entryIds.includes(id))) return true;
  const deletedPaths = normalizedPathSet([
    deleted.hub_job_dir,
    deleted.worker_job_dir,
    deleted.native_job_dir,
    deleted.hub_console_log,
    deleted.results_csv,
    deleted.checkpoint_path,
  ].map((item) => String(item || "")).filter((item) => item && isManagedArtifactPath(item)));
  if (!deletedPaths.size) return false;
  return [entry.hub_job_dir, entry.worker_job_dir, entry.native_job_dir, entry.hub_console_log, entry.results_csv, entry.checkpoint_path]
    .some((item) => item && pathMatchesAny(String(item), deletedPaths));
}

export function filterExperimentIndex(entries: ExperimentIndexEntry[], deleted: Partial<ExperimentIndexEntry>[]): ExperimentIndexEntry[] {
  return entries.filter((entry) => !deleted.some((matcher) => experimentEntryMatchesDeletion(entry, matcher)));
}

export function collectDeletedPaths(deleted: Partial<ExperimentIndexEntry>[]): string[] {
  const out = new Set<string>();
  for (const entry of deleted) {
    for (const value of [entry.hub_console_log, entry.hub_job_dir, entry.results_csv, entry.checkpoint_path]) {
      const normalized = normalizeComparablePath(String(value || ""));
      if (normalized && isManagedArtifactPath(normalized)) out.add(normalized);
    }
  }
  return Array.from(out);
}

export function cleanManagedArtifactPaths(paths: string[]): string[] {
  const out = new Set<string>();
  for (const value of paths) {
    const normalized = normalizeComparablePath(value);
    if (normalized && isManagedArtifactPath(normalized)) out.add(normalized);
  }
  return Array.from(out);
}

export function schedulerEntryDeleteMatcher(entry: ExperimentIndexEntry): SchedulerEntryDeleteMatcher | undefined {
  const experimentIndex = inferExperimentIndexFromEntry(entry);
  if (!experimentIndex) return undefined;
  return {
    suite: String(entry.suite || "").trim() || undefined,
    experimentIndex,
    workerId: String(entry.worker_id || "").trim() || undefined,
    workerHost: String(entry.worker_host || "").trim() || undefined,
    deleteMode: "row",
  };
}

export function schedulerRowIdentity(state: any, row: any): SchedulerEntryDeleteMatcher | undefined {
  const experimentIndex = String(row.experiment_index ?? row.experiment ?? "").trim();
  if (!/^\d+$/.test(experimentIndex)) return undefined;
  const pids = normalizePidList(row.gpu_process_pids || row.process_pids || row.pids);
  return {
    suite: String(row.suite || inferSuiteFromPlan(String(state?.plan || row.plan || "")) || "").trim() || undefined,
    plan: String(state?.plan || row.plan || "").trim() || undefined,
    experimentIndex,
    workerId: String(row.worker_id || row.workerId || "").trim() || undefined,
    workerHost: String(row.worker_host || row.worker_name || row.server || "").trim() || undefined,
    schedulerSession: String(state?.scheduler_session || row.schedulerSession || "").trim() || undefined,
    session: String(row.session || "").trim() || undefined,
    logPath: String(row.log_path || row.logPath || "").trim() || undefined,
    startedAt: String(row.started_at || row.startedAt || row.testing_started_at || "").trim() || undefined,
    finishedAt: String(row.finished_at || row.finishedAt || "").trim() || undefined,
    processPids: pids.length ? pids : undefined,
    stateUpdatedAt: String(state?.updated_at || row.updated || "").trim() || undefined,
    deleteMode: "row",
  };
}

export function inferExperimentIndexFromEntry(entry: ExperimentIndexEntry): string {
  const values = [
    entry.run_id,
    entry.global_job_id,
    basename(String(entry.hub_job_dir || "")),
    basename(String(entry.worker_job_dir || "")),
    basename(String(entry.native_job_dir || "")),
    basename(dirname(String(entry.config_path || ""))),
  ];
  for (const value of values) {
    const match = String(value || "").match(/^(\d+)(?:[_-]|$)/);
    if (match) return match[1];
  }
  return "";
}

export function filterSchedulerState(state: any, matchers: SchedulerEntryDeleteMatcher[]): { state: any; changed: boolean } {
  let changed = false;
  const plan = String(state.plan || state.file || "");
  const logMatchers = matchers.filter((matcher) => matcher.deleteMode === "log_fields");
  if (logMatchers.length) {
    for (const key of schedulerRowKeys()) {
      for (const item of state[key] || []) {
        if (!logMatchers.some((matcher) => schedulerMatcherMatchesItem(plan, item, matcher, state))) continue;
        for (const field of ["hub_console_log", "console_tail", "log_tail", "log_synced_at", "log_sync_error", "sync_error"]) {
          if (field in item) {
            delete item[field];
            changed = true;
          }
        }
      }
    }
  }

  const rowMatchers = matchers.filter((matcher) => !matcher.deleteMode || matcher.deleteMode === "row");
  for (const key of schedulerRowKeys()) {
    const rows = Array.isArray(state[key]) ? state[key] : [];
    const kept = rows.filter((item: any) => !rowMatchers.some((matcher) => schedulerMatcherMatchesItem(plan, item, matcher, state)));
    if (kept.length !== rows.length) {
      state[key] = kept;
      changed = true;
    }
  }
  if (Array.isArray(state.pending_experiments)) {
    const kept = state.pending_experiments.filter((index: any) => !rowMatchers.some((matcher) => schedulerMatcherMatchesPending(plan, state, index, matcher)));
    if (kept.length !== state.pending_experiments.length) {
      state.pending_experiments = kept;
      changed = true;
    }
  }
  if (changed) state.updated_at = new Date().toISOString();
  return { state, changed };
}

export function schedulerMatcherMatchesPlan(plan: string, matcher: SchedulerEntryDeleteMatcher): boolean {
  const suite = String(matcher.suite || "").trim();
  const explicitPlan = String(matcher.plan || "").trim();
  if (explicitPlan && !plan.includes(explicitPlan)) return false;
  if (suite && !plan.includes(suite)) return false;
  return true;
}

export function schedulerMatcherMatchesPending(plan: string, state: any, index: any, matcher: SchedulerEntryDeleteMatcher): boolean {
  if (!schedulerMatcherMatchesPlan(plan, matcher)) return false;
  if (String(index) !== String(matcher.experimentIndex ?? "")) return false;
  const schedulerSession = String(matcher.schedulerSession || "").trim();
  const stateSession = String(state?.scheduler_session || "").trim();
  if (schedulerSession && schedulerSession !== stateSession) return false;
  if (matcher.affectsPending) return true;
  return Boolean(schedulerSession && schedulerSession === stateSession);
}

export function schedulerMatcherMatchesItem(plan: string, item: any, matcher: SchedulerEntryDeleteMatcher, state?: any): boolean {
  if (!schedulerMatcherMatchesPlan(plan, matcher)) return false;
  if (String(item.experiment_index ?? "") !== String(matcher.experimentIndex ?? "")) return false;
  const workerId = String(matcher.workerId || "").trim();
  if (workerId && String(item.worker_id || "").trim() !== workerId) return false;
  const workerHost = String(matcher.workerHost || "").trim();
  if (workerHost) {
    const candidates = [item.worker_host, item.worker_name, item.worker_id, item.server].map((value) => String(value || "").trim()).filter(Boolean);
    if (!candidates.includes(workerHost)) return false;
  }
  const schedulerSession = String(matcher.schedulerSession || "").trim();
  const session = String(matcher.session || "").trim();
  const logPath = normalizeComparablePath(String(matcher.logPath || ""));
  const hasStrongIdentity = Boolean(schedulerSession || session || logPath);
  if (schedulerSession && schedulerSession !== String(state?.scheduler_session || item.scheduler_session || "").trim()) return false;
  if (session && session !== String(item.session || "").trim()) return false;
  if (logPath && normalizeComparablePath(String(item.log_path || item.logPath || "")) !== logPath) return false;
  if (hasStrongIdentity) return true;
  const deletedAt = parseTime(matcher.deletedAt);
  if (deletedAt !== undefined) {
    const rowAt = rowComparableTime(item, state);
    if (rowAt !== undefined && rowAt > deletedAt) return false;
  }
  return true;
}

export function dedupeJsonRecords<T extends Record<string, any>>(records: T[]): T[] {
  const out = new Map<string, T>();
  for (const record of records) {
    if (!record || !Object.keys(record).length) continue;
    out.set(JSON.stringify(record), record);
  }
  return Array.from(out.values());
}

function schedulerRowKeys(): string[] {
  return ["running_experiments", "testing_experiments", "completed_experiments", "failed_experiments", "stopped_experiments"];
}

function normalizePidList(value: any): string[] {
  const raw = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
  return raw.map((item) => String(item || "").trim()).filter(Boolean);
}

function parseTime(value: any): number | undefined {
  const text = String(value || "").trim();
  if (!text) return undefined;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function rowComparableTime(item: any, state?: any): number | undefined {
  const values = [item.finished_at, item.finishedAt, item.testing_started_at, item.started_at, item.startedAt, state?.updated_at];
  for (const value of values) {
    const parsed = parseTime(value);
    if (parsed !== undefined) return parsed;
  }
  return undefined;
}

function inferSuiteFromPlan(plan: string): string {
  const normalized = normalizeComparablePath(plan);
  const base = normalized.split("/").pop() || "";
  return base.replace(/\.(ya?ml|json)$/i, "");
}

function basename(value: string): string {
  const normalized = normalizeComparablePath(value);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function dirname(value: string): string {
  const normalized = normalizeComparablePath(value);
  const parts = normalized.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}
