"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pick = pick;
exports.selectWebviewStateFields = selectWebviewStateFields;
exports.normalizeGpuRow = normalizeGpuRow;
exports.normalizeServerGpu = normalizeServerGpu;
exports.normalizeSchedulerRows = normalizeSchedulerRows;
exports.normalizeTaskRow = normalizeTaskRow;
exports.taskStatusRank = taskStatusRank;
exports.normalizeExperimentTraceRows = normalizeExperimentTraceRows;
exports.normalizeOperationRows = normalizeOperationRows;
exports.normalizeFileTransferRows = normalizeFileTransferRows;
exports.percent = percent;
exports.formatDuration = formatDuration;
function pick(obj, keys, fallback) {
    if (!obj || typeof obj !== "object")
        return fallback;
    const item = obj;
    for (const key of keys) {
        const value = item[key];
        if (value !== undefined && value !== null && value !== "")
            return value;
    }
    return fallback;
}
function selectWebviewStateFields(sources) {
    const input = objectRecord(sources);
    const realtime = objectRecord(input.realtimeState);
    const snapshot = objectRecord(input.lastSnapshot);
    const offline = objectRecord(input.offlineSnapshot);
    return {
        gpu: firstNonEmptyRecord(realtime.gpu, snapshot.gpu, offline.gpu),
        schedulerStates: firstNonEmptyArray(realtime.schedulerStates, snapshot.schedulerStates, offline.schedulerStates),
        experimentTraces: firstNonEmptyArray(realtime.experimentTraces, snapshot.experimentTraces, offline.experimentTraces),
        logs: firstNonEmptyRecord(realtime.logs, snapshot.logs, offline.logs),
        operations: firstNonEmptyRecord(realtime.operations, snapshot.operations, offline.operations),
        fileTransfers: firstNonEmptyRecord(realtime.fileTransfers, snapshot.fileTransfers, offline.fileTransfers),
    };
}
function normalizeGpuRow(row) {
    const memoryUsedMb = numberOrUndefined(pick(row, ["memoryUsedMb", "memory_used_mb", "memoryUsed", "used"], undefined));
    const memoryTotalMb = numberOrUndefined(pick(row, ["memoryTotalMb", "memory_total_mb", "memoryTotal", "total"], undefined));
    return {
        index: pick(row, ["index", "gpu_index", "gpuId", "gpu_id", "id"], "-"),
        name: pick(row, ["name", "gpu_name", "model"], "-"),
        memoryUsedMb,
        memoryTotalMb,
        memoryPercent: percent(memoryUsedMb, memoryTotalMb),
        utilizationPercent: numberOrUndefined(pick(row, ["utilizationPercent", "utilization", "gpu_util", "utilization_gpu"], undefined)),
        temperature: numberOrUndefined(pick(row, ["temperature", "temperatureGpu", "temperature_gpu", "temp"], undefined)),
        processCount: normalizeArray(pick(row, ["processes", "procs"], [])).length,
        runKey: pick(row, ["runKey", "run_key", "assignedRunKey", "experiment", "experimentId"], "-"),
    };
}
function normalizeServerGpu(serverId, rows) {
    const sourceRows = Array.isArray(rows) ? rows : normalizeArray(pick(rows, ["gpus", "gpu", "rows"], []));
    const gpuRows = sourceRows.map(normalizeGpuRow);
    return {
        serverId,
        workerId: pick(rows, ["workerId", "worker_id", "worker"], serverId),
        gpuRows,
        gpuCount: gpuRows.length,
        status: pick(rows, ["status", "state"], gpuRows.length ? "online" : "stale"),
        updatedAt: pick(rows, ["generatedAt", "generated_at", "updatedAt", "updated_at", "timestamp"], "-"),
    };
}
function normalizeSchedulerRows(rows) {
    return normalizeArray(rows)
        .flatMap((row) => expandSchedulerRow(row))
        .map((row, index) => normalizeTaskRow(row, index))
        .filter((row) => row.status !== "deleted")
        .sort((a, b) => taskStatusRank(String(a.status)) - taskStatusRank(String(b.status)) || String(a.uiKey || "").localeCompare(String(b.uiKey || "")));
}
function normalizeTaskRow(row, index = 0) {
    const startedAt = pick(row, ["startedAt", "started_at"], "");
    const updatedAt = pick(row, ["updatedAt", "updated_at", "finishedAt", "finished_at"], "");
    const status = String(pick(row, ["status", "state", "runStatus", "run_status"], "unknown")).toLowerCase();
    const experimentId = pick(row, ["experimentId", "experiment_id", "id", "jobId", "job_id", "taskId", "task_id", "global_job_id", "session"], "-");
    const archiveKey = pick(row, ["archiveKey", "archive_key", "artifactKey", "artifact_key", "global_job_id", "session", "hub_job_dir", "worker_job_dir", "native_job_dir", "artifactPath", "artifact_path"], experimentId);
    const normalized = {
        status,
        plan: pick(row, ["planName", "plan_name", "plan", "suite", "file"], "-"),
        experimentName: pick(row, ["experimentName", "experiment_name", "name", "case", "experiment"], "-"),
        runKey: pick(row, ["runKey", "run_key", "runId", "run_id", "jobId", "job_id", "taskId", "task_id", "id", "experimentId", "experiment_id", "global_job_id", "session", "hub_console_log", "schedulerLog", "log_path"], "-"),
        experimentId,
        archiveKey,
        serverId: pick(row, ["serverId", "workerId", "worker_id", "worker", "server"], "-"),
        gpuIds: pick(row, ["gpuIds", "gpu_ids", "gpuId", "gpu_id"], "-"),
        startedAt: startedAt || "-",
        updatedAt: updatedAt || "-",
        duration: formatDuration(startedAt, updatedAt),
        progress: pick(row, ["progress", "epoch", "step"], "-"),
        primaryMetric: pick(row, ["primaryMetric", "primary_metric", "metric", "score"], "-"),
    };
    normalized.uiKey = taskUiKeyFromRow(normalized, index);
    return normalized;
}
function taskUiKeyFromRow(row, index) {
    const values = [row.runKey, row.experimentId, row.archiveKey, row.plan, row.experimentName, row.serverId, row.gpuIds, row.startedAt, row.updatedAt, index]
        .map((value) => String(value || "").trim())
        .filter((value) => value && value !== "-");
    return Array.from(new Set(values)).join("|") || `task-ui-${index}`;
}
function taskStatusRank(status) {
    const map = { running: 0, testing: 1, queued: 2, pending: 2, failed: 3, completed: 4, done: 4, stopped: 5, unknown: 6 };
    return map[String(status || "unknown").toLowerCase()] ?? 6;
}
function normalizeExperimentTraceRows(rows) {
    return normalizeArray(rows).map((row) => ({
        id: pick(row, ["id", "experimentId", "experiment_id", "runKey", "run_key"], "-"),
        status: pick(row, ["status", "state", "archiveStatus", "archive_status"], "-"),
        resultStatus: pick(row, ["resultStatus", "result_status", "parseStatus", "parse_status"], "-"),
        deleteStatus: pick(row, ["deleteStatus", "delete_status", "deleted", "residue"], "-"),
        tags: normalizeArray(pick(row, ["tags"], [])).join(", "),
        updatedAt: pick(row, ["updatedAt", "updated_at", "synced_at"], "-"),
        artifactPath: pick(row, ["artifactPath", "artifact_path", "hub_job_dir", "worker_job_dir"], "-"),
        resultPath: pick(row, ["resultPath", "result_path", "results_csv"], "-"),
    }));
}
function normalizeOperationRows(operations) {
    const rows = Array.isArray(operations) ? operations : Object.entries((operations || {})).map(([id, value]) => ({ id, ...value }));
    return rows.map((row) => {
        const payload = operationPayload(row);
        const manifest = operationPayload(row.archiveManifest || row.syncManifest || payload.archiveManifest || payload.syncManifest);
        const threeWay = operationPayload(row.threeWay || payload.threeWay);
        const type = pick(row, ["type", "action"], pick(payload, ["type", "action"], "-"));
        return {
            operationId: pick(row, ["operationId", "operation_id", "opId", "id"], pick(payload, ["operationId", "operation_id", "opId", "id"], "-")),
            type,
            status: pick(row, ["status", "state"], pick(payload, ["status", "state"], operationStatusFromType(type))),
            progress: pick(row, ["progress", "percent"], "-"),
            message: pick(row, ["message", "detail"], pick(payload, ["message", "error"], "-")),
            startedAt: pick(row, ["startedAt", "started_at"], pick(payload, ["startedAt", "started_at"], "-")),
            updatedAt: pick(row, ["updatedAt", "updated_at", "generatedAt"], pick(payload, ["updatedAt", "updated_at", "generatedAt"], "-")),
            error: pick(row, ["error", "lastError"], pick(payload, ["error"], "-")),
            seq: Number(pick(row, ["seq"], 0)),
            targetCount: pick(row, ["targetCount", "target_count"], pick(payload, ["targetCount", "target_count"], pick(manifest, ["targetCount", "target_count"], pick(threeWay, ["targetCount", "target_count"], "-")))),
            fileCount: pick(row, ["fileCount", "file_count"], pick(payload, ["fileCount", "file_count"], pick(manifest, ["fileCount", "file_count"], "-"))),
            deletedCount: pick(row, ["deletedCount", "deleted_count"], pick(payload, ["deletedCount", "deleted_count"], "-")),
            skippedCount: pick(row, ["skippedCount", "skipped_count"], pick(payload, ["skippedCount", "skipped_count"], "-")),
            residueCount: pick(row, ["residueCount", "residue_count"], pick(payload, ["residueCount", "residue_count"], "-")),
            missingCount: pick(row, ["missingCount", "missing_count"], pick(payload, ["missingCount", "missing_count"], pick(manifest, ["missingCount", "missing_count"], pick(threeWay, ["missingCount", "missing_count"], "-")))),
            unarchivedCount: pick(row, ["unarchivedCount", "unarchived_count"], pick(payload, ["unarchivedCount", "unarchived_count"], pick(threeWay, ["unarchivedCount", "unarchived_count"], "-"))),
            workerId: pick(row, ["workerId", "worker_id"], pick(payload, ["workerId", "worker_id"], "-")),
            manifestPath: pick(row, ["manifestPath", "archiveManifestPath", "syncManifestPath", "threeWayPath", "path"], pick(payload, ["manifestPath", "archiveManifestPath", "syncManifestPath", "threeWayPath", "path"], "-")),
        };
    }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)) || Number(b.seq) - Number(a.seq)).slice(0, 20);
}
function operationPayload(row) {
    if (!row || typeof row !== "object")
        return {};
    const item = row;
    if (item.payload && typeof item.payload === "object")
        return item.payload;
    const latest = item.latestEvent;
    if (latest && typeof latest === "object" && latest.payload && typeof latest.payload === "object")
        return latest.payload;
    return item;
}
function normalizeFileTransferRows(fileTransfers) {
    const rows = Array.isArray(fileTransfers) ? fileTransfers : Object.entries((fileTransfers || {})).map(([id, value]) => ({ id, ...value }));
    return rows.map((row) => ({
        transferId: pick(row, ["transferId", "transfer_id", "id"], "-"),
        direction: pick(row, ["direction", "type"], "-"),
        remotePath: pick(row, ["remotePath", "remote_path", "path"], "-"),
        localPath: pick(row, ["localPath", "local_path"], "-"),
        status: pick(row, ["status", "state"], "-"),
        transferredBytes: pick(row, ["transferredBytes", "transferred_bytes", "receivedBytes", "sentBytes", "doneBytes"], 0),
        totalBytes: pick(row, ["totalBytes", "total_bytes", "size", "bytes"], 0),
        speed: pick(row, ["speed", "speedBytesPerSecond", "speed_bytes_per_second", "bytesPerSecond"], "-"),
        eta: pick(row, ["eta", "etaSeconds", "eta_seconds"], "-"),
        error: pick(row, ["error", "lastError"], "-"),
    }));
}
function percent(used, total) {
    const usedNumber = numberOrUndefined(used);
    const totalNumber = numberOrUndefined(total);
    if (usedNumber === undefined || !totalNumber)
        return undefined;
    return Math.round((usedNumber / totalNumber) * 1000) / 10;
}
function formatDuration(startedAt, updatedAt) {
    const start = Date.parse(String(startedAt || ""));
    const end = Date.parse(String(updatedAt || "")) || Date.now();
    if (!Number.isFinite(start))
        return "-";
    const seconds = Math.max(0, Math.round((end - start) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}
function expandSchedulerRow(row) {
    if (!row || typeof row !== "object")
        return [];
    const item = row;
    const buckets = ["queued_experiments", "pending_experiments", "running_experiments", "testing_experiments", "completed_experiments", "failed_experiments", "stopped_experiments"];
    const parentPlanFile = item.planFile || item.plan_file || item.planPath || item.plan_path || item.file || item.path || item.plan;
    const expanded = buckets.flatMap((key) => normalizeArray(item[key]).map((child) => {
        const childRecord = child && typeof child === "object" ? child : {};
        return { ...childRecord, status: bucketStatus(key), plan: item.plan || item.planName || item.suite || item.file, planFile: childRecord.planFile || childRecord.plan_file || childRecord.file || childRecord.path || parentPlanFile };
    }));
    return expanded.length ? expanded : [row];
}
function bucketStatus(bucket) {
    return bucket.replace("_experiments", "").replace("pending", "queued");
}
function operationStatusFromType(type) {
    const value = String(type || "");
    if (value.includes("completed"))
        return "completed";
    if (value.includes("failed"))
        return "failed";
    if (value.includes("cancelled") || value.includes("canceled"))
        return "cancelled";
    if (value.includes("stalled"))
        return "stalled";
    if (value.includes("started") || value.includes("progress"))
        return "running";
    return "-";
}
function normalizeArray(value) {
    if (Array.isArray(value))
        return value;
    if (!value || typeof value !== "object")
        return [];
    return Object.values(value);
}
function numberOrUndefined(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
}
function objectRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
}
function firstNonEmptyRecord(...values) {
    for (const value of values) {
        const record = objectRecord(value);
        if (Object.keys(record).length)
            return record;
    }
    return {};
}
function firstNonEmptyArray(...values) {
    for (const value of values) {
        if (Array.isArray(value) && value.length)
            return value;
    }
    return [];
}
