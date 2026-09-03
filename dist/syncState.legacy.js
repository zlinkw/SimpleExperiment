"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGED_ARTIFACT_PREFIXES = exports.ARTIFACT_REGISTRY_PATH = void 0;
exports.normalizeComparablePath = normalizeComparablePath;
exports.comparablePathVariants = comparablePathVariants;
exports.isManagedArtifactPath = isManagedArtifactPath;
exports.normalizedPathSet = normalizedPathSet;
exports.pathMatchesAny = pathMatchesAny;
exports.experimentEntryMatchesDeletion = experimentEntryMatchesDeletion;
exports.filterExperimentIndex = filterExperimentIndex;
exports.collectDeletedPaths = collectDeletedPaths;
exports.cleanManagedArtifactPaths = cleanManagedArtifactPaths;
exports.schedulerEntryDeleteMatcher = schedulerEntryDeleteMatcher;
exports.schedulerRowIdentity = schedulerRowIdentity;
exports.inferExperimentIndexFromEntry = inferExperimentIndexFromEntry;
exports.filterSchedulerState = filterSchedulerState;
exports.schedulerMatcherMatchesPlan = schedulerMatcherMatchesPlan;
exports.schedulerMatcherMatchesPending = schedulerMatcherMatchesPending;
exports.schedulerMatcherMatchesItem = schedulerMatcherMatchesItem;
exports.ARTIFACT_REGISTRY_PATH = "simple_cluster/artifact_registry.json";
function normalizeComparablePath(value) {
    return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/^\.\//, "")
        .replace(/\/$/, "");
}
function comparablePathVariants(value) {
    const normalized = normalizeComparablePath(value);
    if (!normalized)
        return [];
    const variants = new Set([normalized]);
    const markerIndex = normalized.indexOf("/simple_cluster/");
    if (markerIndex >= 0)
        variants.add(normalized.slice(markerIndex + 1));
    if (/(?:^|\/)simple_cluster\/archive\//.test(normalized))
        return Array.from(variants).filter(Boolean);
    for (const prefix of ["/work_dirs/", "/cluster_runs/", "/experiments/"]) {
        const index = normalized.indexOf(prefix);
        if (index >= 0)
            variants.add(normalized.slice(index + 1));
    }
    return Array.from(variants).filter(Boolean);
}
// tmp/ 为主，simple_cluster/tmp 仅过渡兼容，下版本移除（与 clusterAgentRuntime.py:safe_project_path 强绑定，共13前缀）
exports.MANAGED_ARTIFACT_PREFIXES = [
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
function isManagedArtifactPath(value) {
    const normalized = normalizeComparablePath(value);
    if (!normalized || normalized.startsWith("[simple]"))
        return false;
    if (/^\[[^\]]+\]/.test(normalized))
        return false;
    return comparablePathVariants(normalized).some((variant) => exports.MANAGED_ARTIFACT_PREFIXES.some((prefix) => variant.startsWith(prefix)));
}
function normalizedPathSet(paths) {
    const out = new Set();
    for (const item of paths) {
        for (const variant of comparablePathVariants(item))
            out.add(variant);
    }
    return out;
}
function pathMatchesAny(value, candidates) {
    for (const variant of comparablePathVariants(value)) {
        for (const candidate of candidates) {
            const variantArchived = /(?:^|\/)simple_cluster\/archive\//.test(variant);
            const candidateArchived = /(?:^|\/)simple_cluster\/archive\//.test(candidate);
            if (variantArchived !== candidateArchived)
                continue;
            if (variant === candidate)
                return true;
            if (variant.startsWith(candidate + "/"))
                return true;
            if (candidate.startsWith(variant + "/"))
                return true;
            if (variant.endsWith("/" + candidate))
                return true;
            if (candidate.endsWith("/" + variant))
                return true;
        }
    }
    return false;
}
function experimentEntryMatchesDeletion(_entry, _matcher) {
    return false;
}
function filterExperimentIndex(entries, _blocklist) {
    return entries;
}
function collectDeletedPaths(_blocklist) {
    return [];
}
function cleanManagedArtifactPaths(paths) {
    const out = new Set();
    for (const value of paths) {
        const normalized = normalizeComparablePath(value);
        if (normalized && isManagedArtifactPath(normalized))
            out.add(normalized);
    }
    return Array.from(out);
}
function schedulerEntryDeleteMatcher(entry) {
    const experimentIndex = inferExperimentIndexFromEntry(entry);
    if (!experimentIndex)
        return undefined;
    return {
        suite: String(entry.suite || "").trim() || undefined,
        experimentIndex,
        workerId: String(entry.worker_id || "").trim() || undefined,
        workerHost: String(entry.worker_host || "").trim() || undefined,
        deleteMode: "row",
    };
}
function schedulerRowIdentity(state, row) {
    const experimentIndex = String(row.experiment_index ?? row.experiment ?? "").trim();
    if (!/^\d+$/.test(experimentIndex))
        return undefined;
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
function inferExperimentIndexFromEntry(entry) {
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
        if (match)
            return match[1];
    }
    return "";
}
function filterSchedulerState(state, _matchers) {
    return { state, changed: false };
}
function schedulerMatcherMatchesPlan(_plan, _matcher) {
    return false;
}
function schedulerMatcherMatchesPending(_plan, _state, _index, _matcher) {
    return false;
}
function schedulerMatcherMatchesItem(_plan, _item, _matcher, _state) {
    return false;
}
// 服务器去重收敛说明（提交二）：服务器列表唯一收敛入口为
// tunnel/XshellTunnelSetup.dedupeWorkerTunnels（按 host|user|port + savedSessionPath 合并）；
// GPU 侧 normalizeServerGpu/mergeGpuServers 与诊断侧 dedupeAnomalies 各自保留，
// 本文件通用 JSON 去重已删除，避免多源去重打架（删除台账合并改走调用方显式 Map 去重）。
function schedulerRowKeys() {
    return ["running_experiments", "testing_experiments", "completed_experiments", "failed_experiments", "stopped_experiments"];
}
function normalizePidList(value) {
    const raw = Array.isArray(value) ? value : String(value || "").split(/[,\s]+/);
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
}
function parseTime(value) {
    const text = String(value || "").trim();
    if (!text)
        return undefined;
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function rowComparableTime(item, state) {
    const values = [item.finished_at, item.finishedAt, item.testing_started_at, item.started_at, item.startedAt, state?.updated_at];
    for (const value of values) {
        const parsed = parseTime(value);
        if (parsed !== undefined)
            return parsed;
    }
    return undefined;
}
function inferSuiteFromPlan(plan) {
    const normalized = normalizeComparablePath(plan);
    const base = normalized.split("/").pop() || "";
    return base.replace(/\.(ya?ml|json)$/i, "");
}
function basename(value) {
    const normalized = normalizeComparablePath(value);
    const parts = normalized.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
}
function dirname(value) {
    const normalized = normalizeComparablePath(value);
    const parts = normalized.split("/").filter(Boolean);
    parts.pop();
    return parts.join("/");
}
