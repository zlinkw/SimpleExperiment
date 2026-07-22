"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REALTIME_WORKER_TASK_RECORD_LIMIT = exports.REALTIME_FILE_TRANSFER_RECORD_LIMIT = exports.REALTIME_OPERATION_RECORD_LIMIT = exports.REALTIME_TRACE_RECORD_LIMIT = exports.REALTIME_SCHEDULER_RECORD_LIMIT = exports.REALTIME_LOG_TEXT_LIMIT = exports.REALTIME_LOG_RECORD_LIMIT = void 0;
exports.createRealtimeState = createRealtimeState;
exports.validateRealtimeEvent = validateRealtimeEvent;
exports.applyRealtimeEvent = applyRealtimeEvent;
exports.compactRealtimeLogs = compactRealtimeLogs;
exports.compactRealtimeState = compactRealtimeState;
exports.compactClusterSnapshot = compactClusterSnapshot;
exports.applySnapshot = applySnapshot;
exports.REALTIME_LOG_RECORD_LIMIT = 40;
exports.REALTIME_LOG_TEXT_LIMIT = 8000;
exports.REALTIME_SCHEDULER_RECORD_LIMIT = 240;
exports.REALTIME_TRACE_RECORD_LIMIT = 240;
exports.REALTIME_OPERATION_RECORD_LIMIT = 160;
exports.REALTIME_FILE_TRANSFER_RECORD_LIMIT = 80;
exports.REALTIME_WORKER_TASK_RECORD_LIMIT = 160;
const knownTypes = new Set([
    "agent_heartbeat",
    "gpu_snapshot",
    "scheduler_snapshot",
    "experiment_lifecycle",
    "experiment_trace",
    "log_tail",
    "result_parsed",
    "quality_gate_updated",
    "statistics_updated",
    "paper_table_updated",
    "file_transfer_progress",
    "file_changed",
    "diagnostics_updated",
    "worker_health",
    "worker_task_snapshot",
    "agent_warning",
    "operation_started",
    "operation_progress",
    "operation_completed",
    "operation_failed",
]);
const resultSummaryDirtyTypes = new Set([
    "result_parsed",
    "quality_gate_updated",
    "statistics_updated",
    "paper_table_updated",
]);
const resultFileNames = new Set([
    "metrics_summary.csv", "metrics_case.csv", "results.csv", "result.csv", "metrics.csv", "summary.csv", "scores.csv", "score.csv",
    "classification_report.csv", "detailed_metrics.csv", "test_metrics.csv", "metrics.json", "summary.json", "result.json", "results.json",
    "classification_report.json",
]);
const resultTextNames = new Set([
    "summary.txt", "result.txt", "results.txt", "classification_report.txt", "stdout.log", "stderr.log", "train.log", "test.log", "console.log", "output.out",
]);
const resultRootPrefixes = [
    "experiments/results/", "results/", "outputs/", "runs/", "logs/", "test_results/", "lightning_logs/", "custom_results/",
    "reports/", "artifacts/", "zlk_cluster/results/", "paper/tables/",
];
const resultDirectorySegments = resultRootPrefixes.map((prefix) => `/${prefix}`);
function createRealtimeState(snapshot) {
    const compactSnapshot = compactClusterSnapshot(snapshot);
    return {
        lastSeq: 0,
        gpu: compactSnapshot?.gpu || {},
        schedulerStates: compactSnapshot?.schedulerStates || [],
        experimentTraces: compactSnapshot?.experimentTraces || [],
        logs: {},
        operations: operationsRecord(compactSnapshot?.operations) || {},
        fileTransfers: {},
        workerHealth: {},
        workerTasks: {},
        warnings: [],
        lastKnownGood: compactSnapshot,
    };
}
function validateRealtimeEvent(input) {
    const item = typeof input === "string" ? safeJson(input) : input;
    if (!item || typeof item !== "object")
        return { ok: false, warning: "malformed event" };
    const event = item;
    if (Number(event.schemaVersion) !== 1 || !Number.isFinite(Number(event.seq)) || !event.generatedAt || (event.source !== "hub_agent" && event.source !== "worker_telemetry")) {
        return { ok: false, warning: "bad event schema", event: item };
    }
    if (!knownTypes.has(event.type))
        return { ok: false, warning: `unknown event type=${String(event.type)}`, event: item };
    return { ok: true, event: event };
}
function applyRealtimeEvent(state, input) {
    const valid = validateRealtimeEvent(input);
    if (valid.ok === false)
        return { ...state, warnings: [...state.warnings.slice(-20), valid.warning] };
    const event = valid.event;
    if (event.seq <= state.lastSeq) {
        if (isResultSummaryDirtyEvent(event) && shouldAcceptDirtyEvent(state, event))
            return markResultsSummaryDirty(state, event);
        return state;
    }
    const next = { ...state, lastSeq: event.seq };
    const payload = objectRecord(event.payload);
    if (event.type === "agent_heartbeat")
        next.lastHeartbeatAt = event.generatedAt;
    if (event.type === "gpu_snapshot") {
        const serverId = event.workerId || event.serverId || "hub";
        const rows = Array.isArray(event.payload)
            ? event.payload
            : Array.isArray(payload.gpus) ? payload.gpus : Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.gpu) ? payload.gpu : [];
        next.gpu = { ...state.gpu, [serverId]: rows };
    }
    if (event.type === "scheduler_snapshot") {
        next.schedulerStates = Array.isArray(event.payload)
            ? event.payload
            : payload.schedulerStates || payload.scheduler_states || payload.scheduler || payload.rows || [];
    }
    if (event.type === "experiment_lifecycle" || event.type === "experiment_trace") {
        const incoming = Array.isArray(event.payload) ? event.payload : [event.payload];
        next.experimentTraces = mergeByKey(state.experimentTraces, incoming, event.seq);
    }
    if (event.type === "log_tail") {
        const runKey = event.runKey || payload.runKey || payload.run_key || payload.key;
        if (runKey)
            next.logs = compactRealtimeLogs({ ...state.logs, [String(runKey)]: { text: String(payload.text || ""), offset: payload.offset, seq: event.seq } });
    }
    if (event.type.startsWith("operation_")) {
        const operationId = event.operationId || payload.operationId || payload.operation_id || payload.opId || payload.id;
        if (operationId) {
            const previous = state.operations[String(operationId)];
            next.operations = isTerminalOperation(previous) && !isTerminalOperationType(event.type)
                ? state.operations
                : { ...state.operations, [String(operationId)]: { ...payload, type: event.type, seq: event.seq } };
        }
    }
    if (event.type === "diagnostics_updated")
        next.diagnostics = event.payload;
    if (event.type === "worker_health") {
        const workerId = event.workerId || event.serverId || String(payload.workerId || payload.worker_id || "worker");
        next.workerHealth = { ...(state.workerHealth || {}), [workerId]: { ...payload, updatedAt: event.generatedAt } };
    }
    if (event.type === "worker_task_snapshot") {
        const workerId = event.workerId || event.serverId || String(payload.workerId || payload.worker_id || "worker");
        const rows = Array.isArray(event.payload)
            ? event.payload
            : payload.tasks || payload.workerTasks || payload.worker_tasks || payload.rows || [];
        next.workerTasks = { ...(state.workerTasks || {}), [workerId]: rows };
    }
    if (event.type === "file_transfer_progress") {
        const transferId = event.transferId || payload.transferId || payload.transfer_id || payload.id;
        if (transferId)
            next.fileTransfers = { ...state.fileTransfers, [String(transferId)]: { ...payload, seq: event.seq } };
    }
    if (isResultSummaryDirtyEvent(event))
        return markResultsSummaryDirty(next, event);
    next.lastKnownGood = compactClusterSnapshot({
        gpu: next.gpu,
        schedulerStates: next.schedulerStates,
        experimentTraces: next.experimentTraces,
        diagnostics: next.diagnostics,
    });
    return compactRealtimeState(next);
}
function compactRealtimeLogs(logs, limit = exports.REALTIME_LOG_RECORD_LIMIT, textLimit = exports.REALTIME_LOG_TEXT_LIMIT, protectedKeys = []) {
    const entries = Object.entries(logs || {})
        .map(([key, value]) => [key, compactRealtimeLogValue(value, textLimit)])
        .sort((a, b) => logRecordTime(b[1]) - logRecordTime(a[1]) || String(a[0]).localeCompare(String(b[0])));
    const protectedSet = new Set((protectedKeys || []).map((key) => String(key || "").trim()).filter(Boolean));
    if (!protectedSet.size)
        return Object.fromEntries(entries.slice(0, limit));
    const protectedEntries = entries.filter(([key]) => protectedSet.has(key)).slice(0, limit);
    const selectedKeys = new Set(protectedEntries.map(([key]) => key));
    for (const [key] of entries) {
        if (selectedKeys.size >= limit)
            break;
        selectedKeys.add(key);
    }
    return Object.fromEntries(entries.filter(([key]) => selectedKeys.has(key)));
}
function compactRealtimeLogValue(value, textLimit) {
    if (typeof value === "string")
        return { text: clipLogText(value, textLimit), seq: 0 };
    const item = objectRecord(value);
    const offset = numberFromUnknown(item.offset);
    const updatedAt = stringValue(item.updatedAt) || stringValue(item.updated_at) || stringValue(item.generatedAt) || stringValue(item.generated_at);
    return {
        ...item,
        text: clipLogText(firstLogText(item), textLimit),
        ...(offset === undefined ? {} : { offset }),
        seq: numberFromUnknown(item.seq) || 0,
        ...(updatedAt ? { updatedAt } : {}),
    };
}
function firstLogText(item) {
    for (const key of ["text", "output", "tail", "log", "stdout", "stderr"]) {
        const value = item[key];
        if (typeof value === "string" && value)
            return value;
    }
    return "";
}
function clipLogText(text, limit) {
    if (!text || text.length <= limit)
        return text || "";
    return `[已截断较早日志 ${text.length - limit} 字符]\n${text.slice(-limit)}`;
}
function logRecordTime(item) {
    const parsed = Date.parse(String(item.updatedAt || ""));
    return Number.isFinite(parsed) ? parsed : Number(item.seq || item.offset || 0);
}
function markResultsSummaryDirty(state, event) {
    const next = {
        ...state,
        resultSummaryDirtySeq: event.seq,
        resultSummaryDirtyAt: event.generatedAt,
        resultSummaryDirtyType: event.type,
        resultSummaryDirtyKey: resultSummaryDirtyKey(event),
        resultSummaryDirtyPlanFile: resultSummaryDirtyPlanFile(event),
    };
    next.lastKnownGood = compactClusterSnapshot({
        gpu: next.gpu,
        schedulerStates: next.schedulerStates,
        experimentTraces: next.experimentTraces,
        diagnostics: next.diagnostics,
    });
    return compactRealtimeState(next);
}
function shouldAcceptDirtyEvent(state, event) {
    if (resultSummaryDirtyKey(event) === state.resultSummaryDirtyKey)
        return false;
    const incomingAt = Date.parse(event.generatedAt || "");
    const currentAt = Date.parse(state.resultSummaryDirtyAt || "");
    if (!Number.isFinite(currentAt))
        return true;
    return Number.isFinite(incomingAt) && incomingAt >= currentAt;
}
function resultSummaryDirtyKey(event) {
    return `${event.source}:${event.type}:${event.seq}:${event.generatedAt}:${resultSummaryDirtyPlanFile(event) || ""}`;
}
function resultSummaryDirtyPlanFile(event) {
    const payload = objectRecord(event.payload);
    const direct = stringValue(payload.planFile || payload.plan || payload.selectedPlanId || payload.plan_file || "");
    if (direct)
        return normalizePlanPath(direct);
    if (event.type === "file_changed") {
        return planFileFromResultPath(String(payload.path || payload.file || payload.relativePath || payload.relPath || payload.remotePath || ""));
    }
    if (event.type === "scheduler_snapshot") {
        const states = Array.isArray(event.payload) ? event.payload : payload.schedulerStates || payload.scheduler_states || payload.scheduler || payload.rows || [];
        const plans = states.flatMap((state) => {
            const plan = stringValue(objectRecord(state).planFile || objectRecord(state).plan || objectRecord(state).plan_file || "");
            return plan ? [normalizePlanPath(plan)] : [];
        });
        const unique = Array.from(new Set(plans.filter(Boolean)));
        return unique.length === 1 ? unique[0] : "";
    }
    return "";
}
function planFileFromResultPath(value) {
    const normalized = normalizePlanPath(value);
    const marker = "zlk_cluster/results/by_plan/";
    const index = normalized.toLowerCase().indexOf(marker);
    if (index < 0)
        return "";
    const slug = (normalized.slice(index + marker.length).split("/")[0] || "").trim();
    const candidate = slug.replace(/___/g, "/").replace(/__/g, "/").replace(/_/g, "/");
    return /\.(ya?ml|json)$/i.test(candidate) ? normalizePlanPath(candidate) : "";
}
function normalizePlanPath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
}
function isResultSummaryDirtyEvent(event) {
    if (resultSummaryDirtyTypes.has(event.type))
        return true;
    if (event.type !== "file_changed")
        return false;
    const payload = objectRecord(event.payload);
    return isResultFilePath(String(payload.path || payload.file || payload.relativePath || ""));
}
function isResultFilePath(value) {
    const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
    if (!normalized)
        return false;
    const name = normalized.split("/").pop() || normalized;
    if (resultFileNames.has(name) || resultTextNames.has(name) || name.endsWith(".metrics.json"))
        return true;
    if (resultRootPrefixes.some((prefix) => normalized.startsWith(prefix)))
        return /\.(csv|json|txt|log|out)$/.test(normalized);
    if (resultDirectorySegments.some((segment) => normalized.includes(segment)))
        return /\.(csv|json|txt|log|out)$/.test(normalized);
    return false;
}
function isTerminalOperation(value) {
    if (!value || typeof value !== "object")
        return false;
    const item = value;
    const status = String(item.status || item.state || item.type || "").toLowerCase();
    return ["completed", "failed", "cancelled", "canceled"].some((terminal) => status.includes(terminal));
}
function isTerminalOperationType(type) {
    return type === "operation_completed" || type === "operation_failed";
}
function compactRealtimeState(state, options = {}) {
    return {
        ...state,
        schedulerStates: compactSchedulerRows(state.schedulerStates),
        experimentTraces: compactRows(state.experimentTraces, exports.REALTIME_TRACE_RECORD_LIMIT, genericRowKey, genericRowRank, genericRowTime),
        logs: compactRealtimeLogs(state.logs, exports.REALTIME_LOG_RECORD_LIMIT, exports.REALTIME_LOG_TEXT_LIMIT, options.protectedLogKeys || []),
        operations: compactRecord(state.operations, exports.REALTIME_OPERATION_RECORD_LIMIT, realtimeRecordRank, realtimeRecordTime),
        fileTransfers: compactRecord(state.fileTransfers, exports.REALTIME_FILE_TRANSFER_RECORD_LIMIT, realtimeRecordRank, realtimeRecordTime),
        workerTasks: compactWorkerTasks(state.workerTasks),
        warnings: state.warnings.slice(-50),
        lastKnownGood: compactClusterSnapshot(state.lastKnownGood),
    };
}
function compactClusterSnapshot(snapshot) {
    if (!snapshot)
        return undefined;
    const operations = compactRecord(operationsRecord(snapshot.operations), exports.REALTIME_OPERATION_RECORD_LIMIT, realtimeRecordRank, realtimeRecordTime);
    return {
        ...snapshot,
        schedulerStates: compactSchedulerRows(snapshot.schedulerStates || []),
        experimentTraces: compactRows(snapshot.experimentTraces || [], exports.REALTIME_TRACE_RECORD_LIMIT, genericRowKey, genericRowRank, genericRowTime),
        ...(Object.keys(operations).length ? { operations: Object.values(operations) } : {}),
    };
}
const schedulerBucketKeys = [
    "running_experiments", "testing_experiments", "queued_experiments", "pending_experiments", "failed_experiments", "stopped_experiments", "completed_experiments",
];
function compactSchedulerRows(rows) {
    const input = Array.isArray(rows) ? rows : [];
    if (!input.length)
        return [];
    const hasBuckets = input.some((row) => row && typeof row === "object" && schedulerBucketKeys.some((key) => Array.isArray(row[key])));
    if (!hasBuckets)
        return compactRows(input, exports.REALTIME_SCHEDULER_RECORD_LIMIT, genericRowKey, genericRowRank, genericRowTime);
    return input.slice(-16).map((row) => {
        if (!row || typeof row !== "object")
            return row;
        const item = row;
        const out = { ...item };
        for (const key of schedulerBucketKeys) {
            if (!Array.isArray(item[key]))
                continue;
            const limit = key === "completed_experiments" ? 80 : 160;
            const compacted = compactRows(item[key], limit, genericRowKey, genericRowRank, genericRowTime);
            out[key] = compacted;
            if (item[key].length > compacted.length)
                out[`${key}_omitted`] = item[key].length - compacted.length;
        }
        return out;
    });
}
function compactWorkerTasks(tasks) {
    const out = {};
    for (const [workerId, rows] of Object.entries(tasks || {})) {
        out[workerId] = compactRows(rows, exports.REALTIME_WORKER_TASK_RECORD_LIMIT, genericRowKey, genericRowRank, genericRowTime);
    }
    return out;
}
function compactRows(rows, limit, keyOf, rankOf, timeOf) {
    const input = Array.isArray(rows) ? rows : [];
    if (input.length <= limit)
        return input;
    const map = new Map();
    input.forEach((row, index) => {
        const key = keyOf(row) || `row-${index}`;
        map.set(key, { ...(map.get(key) || {}), ...row });
    });
    return [...map.values()].sort((a, b) => rankOf(a) - rankOf(b) || timeOf(b) - timeOf(a)).slice(0, limit);
}
function compactRecord(record, limit, rankOf, timeOf) {
    const entries = Object.entries(record || {});
    if (entries.length <= limit)
        return { ...(record || {}) };
    return Object.fromEntries([...entries].sort((a, b) => rankOf(a[1]) - rankOf(b[1]) || timeOf(b[1]) - timeOf(a[1])).slice(0, limit));
}
function operationsRecord(value) {
    if (!value)
        return undefined;
    if (!Array.isArray(value))
        return value;
    return Object.fromEntries(value.map((item, index) => {
        const row = objectRecord(item);
        return [String(row.operationId || row.operation_id || row.opId || row.id || `operation-${index}`), item];
    }));
}
function mergeSnapshotOperations(current, incoming) {
    if (!incoming)
        return current || {};
    const merged = { ...(current || {}) };
    for (const [operationId, operation] of Object.entries(incoming)) {
        if (isTerminalOperation(merged[operationId]) && !isTerminalOperation(operation))
            continue;
        merged[operationId] = operation;
    }
    return merged;
}
function realtimeRecordRank(row) {
    const status = genericStatus(row);
    if (["running", "queued", "pending", "progress", "accepted"].includes(status))
        return 0;
    if (["failed", "stalled", "cancelled", "canceled", "error"].includes(status))
        return 1;
    if (["completed", "done", "archived", "deleted"].includes(status))
        return 3;
    return 2;
}
function genericRowRank(row) {
    const status = genericStatus(row);
    if (["running", "testing", "queued", "pending", "progress"].includes(status))
        return 0;
    if (["failed", "stalled", "stopped", "cancelled", "canceled", "error", "missing", "residue"].includes(status))
        return 1;
    if (["completed", "done", "archived", "deleted"].includes(status))
        return 3;
    return 2;
}
function genericStatus(row) {
    if (!row || typeof row !== "object")
        return "";
    return stringFromRecord(row, ["status", "state", "type", "runStatus", "run_status", "archiveStatus", "archive_status", "deleteStatus", "delete_status"]).toLowerCase();
}
function genericRowKey(row) {
    if (!row || typeof row !== "object")
        return "";
    return stringFromRecord(row, [
        "runKey", "run_key", "experimentId", "experiment_id", "archiveKey", "archive_key", "operationId", "operation_id", "opId", "jobId", "job_id",
        "taskId", "task_id", "session", "id", "key",
    ]);
}
function realtimeRecordTime(row) {
    return genericRowTime(row);
}
function genericRowTime(row) {
    if (!row || typeof row !== "object")
        return 0;
    const item = row;
    const raw = stringFromRecord(item, ["updatedAt", "updated_at", "generatedAt", "generated_at", "finishedAt", "finished_at", "startedAt", "started_at", "createdAt", "created_at", "lastSeenAt", "last_seen_at"]);
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Number(item.seq || item.index || 0);
}
function stringFromRecord(item, keys) {
    for (const key of keys) {
        const value = item[key];
        if (typeof value === "string" && value.trim())
            return value.trim();
        if (typeof value === "number" && Number.isFinite(value))
            return String(value);
    }
    return "";
}
function applySnapshot(state, snapshot) {
    const compactSnapshot = compactClusterSnapshot(snapshot);
    return compactRealtimeState({
        ...state,
        gpu: compactSnapshot?.gpu || state.gpu,
        schedulerStates: compactSnapshot?.schedulerStates || state.schedulerStates,
        experimentTraces: compactSnapshot?.experimentTraces || state.experimentTraces,
        operations: mergeSnapshotOperations(state.operations, operationsRecord(compactSnapshot?.operations)),
        diagnostics: compactSnapshot?.diagnostics || state.diagnostics,
        lastKnownGood: compactSnapshot,
    });
}
function mergeByKey(previous, incoming, seq) {
    const map = new Map();
    for (const row of previous || [])
        map.set(rowKey(row), row);
    for (const row of incoming || []) {
        const item = { ...row, seq };
        map.set(rowKey(item), { ...(map.get(rowKey(item)) || {}), ...item });
    }
    return [...map.values()];
}
function rowKey(row) {
    const item = row;
    return String(item.runKey || item.run_key || item.experimentId || item.experiment_id || item.id || JSON.stringify(row));
}
function objectRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function numberFromUnknown(value) {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "";
}
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
