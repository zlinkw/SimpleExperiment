"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGpuRow = normalizeGpuRow;
exports.normalizeServerGpu = normalizeServerGpu;
exports.normalizeSchedulerRows = normalizeSchedulerRows;
exports.normalizeTaskRow = normalizeTaskRow;
exports.taskStatusRank = taskStatusRank;
// @ts-nocheck
/**
 * RenderStateMapper - Webview 渲染状态映射层
 * 拆分自 WebviewRenderState.ts
 * 职责：GPU / Scheduler / Task 归一化
 */
const RenderStateTypes_1 = require("./RenderStateTypes");
const RenderStateStore_1 = require("./RenderStateStore");
function isNumericGpuId(v) { return /^\d+$/.test(String(v ?? "").trim()); }
function extractNumericGpuId(v) {
    const s = String(v ?? "").trim();
    if (!s || s === "-")
        return "";
    if (/^\d+$/.test(s))
        return s;
    const g = s.match(/(?:gpu|GPU)[-_]?(\d+)\b/);
    if (g)
        return g[1];
    const n = s.match(/\b(\d+)\b/);
    if (n && Number(n[1]) < 64)
        return n[1];
    return "";
}
function normalizeGpuDisplayIndex(row) {
    const raw = String((0, RenderStateStore_1.pick)(row, ["index", "gpu_index"], "") ?? "").trim();
    if (raw && raw !== "-" && isNumericGpuId(raw))
        return raw;
    if (raw && raw !== "-") {
        const e = extractNumericGpuId(raw);
        if (e)
            return e;
    }
    for (const c of [(0, RenderStateStore_1.pick)(row, ["gpuId", "gpu_id", "id"], ""), (0, RenderStateStore_1.pick)(row, ["uuid"], "")]) {
        const e = extractNumericGpuId(c);
        if (e)
            return e;
    }
    return raw || "-";
}
function normalizeGpuDisplayId(row) {
    const raw = String((0, RenderStateStore_1.pick)(row, ["id", "gpuId", "gpu_id", "uuid"], "-") ?? "").trim();
    if (!raw || raw === "-")
        return "-";
    if (isNumericGpuId(raw))
        return raw;
    const e = extractNumericGpuId(raw);
    return e || raw;
}
function normalizeGpuRow(row) {
    const used = (0, RenderStateStore_1.numberOrUndefined)((0, RenderStateStore_1.pick)(row, ["memoryUsedMb", "memory_used_mb", "memoryUsed", "used"], undefined));
    const total = (0, RenderStateStore_1.numberOrUndefined)((0, RenderStateStore_1.pick)(row, ["memoryTotalMb", "memory_total_mb", "memoryTotal", "total"], undefined));
    return {
        index: normalizeGpuDisplayIndex(row), name: (0, RenderStateStore_1.pick)(row, ["name", "gpu_name", "model"], "-"),
        memoryUsedMb: used, memoryTotalMb: total, memoryPercent: (0, RenderStateStore_1.percent)(used, total),
        utilizationPercent: (0, RenderStateStore_1.numberOrUndefined)((0, RenderStateStore_1.pick)(row, ["utilizationPercent", "utilization", "gpu_util", "utilization_gpu"], undefined)),
        temperature: (0, RenderStateStore_1.numberOrUndefined)((0, RenderStateStore_1.pick)(row, ["temperature", "temperatureGpu", "temperature_gpu", "temp"], undefined)),
        processCount: (0, RenderStateStore_1.normalizeArray)((0, RenderStateStore_1.pick)(row, ["processes", "procs"], [])).length,
        runKey: (0, RenderStateStore_1.pick)(row, ["runKey", "run_key", "assignedRunKey", "experiment", "experimentId"], "-"),
    };
}
function normalizeServerGpu(serverId, rows) {
    const src = Array.isArray(rows) ? rows : (0, RenderStateStore_1.normalizeArray)((0, RenderStateStore_1.pick)(rows, ["gpus", "gpu", "rows"], []));
    const gpuRows = src.map(normalizeGpuRow);
    return { serverId, workerId: (0, RenderStateStore_1.pick)(rows, ["workerId", "worker_id", "worker"], serverId), gpuRows, gpuCount: gpuRows.length, status: (0, RenderStateStore_1.pick)(rows, ["status", "state"], gpuRows.length ? "online" : "stale"), updatedAt: (0, RenderStateStore_1.pick)(rows, ["generatedAt", "generated_at", "updatedAt", "updated_at", "timestamp"], "-") };
}
function normalizeSchedulerRows(rows) {
    return (0, RenderStateStore_1.normalizeArray)(rows).flatMap((r) => expandSchedulerRow(r)).map((r, i) => normalizeTaskRow(r, i)).filter((r) => r.status !== "deleted").sort((a, b) => taskStatusRank(String(a.status)) - taskStatusRank(String(b.status)) || String(a.uiKey || "").localeCompare(String(b.uiKey || "")));
}
function normalizeTaskRow(row, index = 0) {
    const startedAt = (0, RenderStateStore_1.pick)(row, ["startedAt", "started_at"], "");
    const updatedAt = (0, RenderStateStore_1.pick)(row, ["updatedAt", "updated_at", "finishedAt", "finished_at"], "");
    const status = String((0, RenderStateStore_1.pick)(row, ["status", "state", "runStatus", "run_status"], "unknown")).toLowerCase();
    const experimentId = (0, RenderStateStore_1.pick)(row, ["experimentId", "experiment_id", "id", "jobId", "job_id", "taskId", "task_id", "global_job_id", "session"], "-");
    const archiveKey = (0, RenderStateStore_1.pick)(row, ["archiveKey", "archive_key", "artifactKey", "artifact_key", "global_job_id", "session", "hub_job_dir", "worker_job_dir", "native_job_dir", "artifactPath", "artifact_path"], experimentId);
    const n = {
        status, plan: (0, RenderStateStore_1.pick)(row, ["planName", "plan_name", "plan", "suite", "file"], "-"),
        experimentName: (0, RenderStateStore_1.pick)(row, ["experimentName", "experiment_name", "name", "case", "experiment"], "-"),
        runKey: (0, RenderStateStore_1.pick)(row, ["runKey", "run_key", "runId", "run_id", "jobId", "job_id", "taskId", "task_id", "id", "experimentId", "experiment_id", "global_job_id", "session", "hub_console_log", "schedulerLog", "log_path"], "-"),
        experimentId, archiveKey, serverId: (0, RenderStateStore_1.pick)(row, ["serverId", "workerId", "worker_id", "worker", "server"], "-"),
        gpuIds: (0, RenderStateStore_1.pick)(row, ["gpuIds", "gpu_ids", "gpuId", "gpu_id"], "-"), startedAt: startedAt || "-", updatedAt: updatedAt || "-",
        duration: (0, RenderStateStore_1.formatDuration)(startedAt, updatedAt), progress: (0, RenderStateStore_1.pick)(row, ["progress", "epoch", "step"], "-"), primaryMetric: (0, RenderStateStore_1.pick)(row, ["primaryMetric", "primary_metric", "metric", "score"], "-"),
    };
    n.uiKey = taskUiKeyFromRow(n, index);
    return n;
}
function taskUiKeyFromRow(row, index) {
    const vals = [row.runKey, row.experimentId, row.archiveKey, row.plan, row.experimentName, row.serverId, row.gpuIds, row.startedAt, row.updatedAt, index].map((v) => String(v || "").trim()).filter((v) => v && v !== "-");
    return Array.from(new Set(vals)).join("|") || `task-ui-${index}`;
}
function taskStatusRank(status) { return RenderStateTypes_1.TASK_STATUS_RANKS[String(status || "unknown").toLowerCase()] ?? 6; }
function expandSchedulerRow(row) {
    if (!row || typeof row !== "object")
        return [];
    const item = row;
    const parentPlanFile = item.planFile || item.plan_file || item.planPath || item.plan_path || item.file || item.path || item.plan;
    const expanded = RenderStateTypes_1.SCHEDULER_BUCKETS.flatMap((key) => (0, RenderStateStore_1.normalizeArray)(item[key]).map((child) => {
        const cr = child && typeof child === "object" ? child : {};
        return { ...cr, status: bucketStatus(key), plan: item.plan || item.planName || item.suite || item.file, planFile: cr.planFile || cr.plan_file || cr.file || cr.path || parentPlanFile };
    }));
    return expanded.length ? expanded : [row];
}
function bucketStatus(bucket) { return RenderStateTypes_1.SCHEDULER_BUCKET_STATUSES[bucket] ?? bucket.replace("_experiments", "").replace("pending", "queued"); }
