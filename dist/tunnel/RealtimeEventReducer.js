"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compactRealtimeLogs = compactRealtimeLogs;
exports.createRealtimeState = createRealtimeState;
exports.validateRealtimeEvent = validateRealtimeEvent;
exports.applyRealtimeEvent = applyRealtimeEvent;
exports.applySnapshot = applySnapshot;
function compactRealtimeLogs(logs) {
    const entries = Object.entries(logs).slice(-20);
    return Object.fromEntries(entries.map(([key, item]) => [key, { ...item, text: item.text.slice(-20000) }]));
}
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
function createRealtimeState(snapshot) {
    return {
        lastSeq: 0,
        gpu: snapshot?.gpu || {},
        schedulerStates: snapshot?.schedulerStates || [],
        experimentTraces: snapshot?.experimentTraces || [],
        logs: {},
        operations: {},
        fileTransfers: {},
        warnings: [],
        lastKnownGood: snapshot,
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
    if (!knownTypes.has(event.type)) {
        return { ok: false, warning: `unknown event type=${String(event.type)}`, event: item };
    }
    return { ok: true, event: event };
}
function applyRealtimeEvent(state, input) {
    const valid = validateRealtimeEvent(input);
    if (valid.ok === false)
        return { ...state, warnings: [...state.warnings.slice(-20), valid.warning] };
    const event = valid.event;
    if (event.seq <= state.lastSeq)
        return state;
    const next = { ...state, lastSeq: event.seq };
    if (event.type === "agent_heartbeat")
        next.lastHeartbeatAt = event.generatedAt;
    if (event.type === "gpu_snapshot") {
        const serverId = event.workerId || event.serverId || "hub";
        next.gpu = { ...state.gpu, [serverId]: Array.isArray(event.payload) ? event.payload : event.payload?.gpus || [] };
    }
    if (event.type === "scheduler_snapshot") {
        next.schedulerStates = Array.isArray(event.payload) ? event.payload : event.payload?.schedulerStates || [];
    }
    if (event.type === "experiment_lifecycle" || event.type === "experiment_trace") {
        const incoming = Array.isArray(event.payload) ? event.payload : [event.payload];
        next.experimentTraces = mergeByKey(state.experimentTraces, incoming, event.seq);
    }
    if (event.type === "log_tail" && event.runKey) {
        const payload = event.payload;
        next.logs = { ...state.logs, [event.runKey]: { text: payload.text || "", offset: payload.offset, seq: event.seq } };
    }
    if (event.operationId && event.type.startsWith("operation_")) {
        next.operations = { ...state.operations, [event.operationId]: { ...event.payload, type: event.type, seq: event.seq } };
    }
    if (event.type === "diagnostics_updated")
        next.diagnostics = event.payload;
    if (event.type === "worker_health") {
        const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
        const workerId = event.workerId || event.serverId || String(payload.workerId || payload.worker_id || "worker");
        next.workerHealth = { ...(state.workerHealth || {}), [workerId]: { ...payload, updatedAt: event.generatedAt } };
    }
    if (event.type === "worker_task_snapshot") {
        const payload = event.payload && typeof event.payload === "object" ? event.payload : {};
        const workerId = event.workerId || event.serverId || String(payload.workerId || payload.worker_id || "worker");
        const rows = Array.isArray(event.payload) ? event.payload : Array.isArray(payload.tasks) ? payload.tasks : Array.isArray(payload.workerTasks) ? payload.workerTasks : Array.isArray(payload.worker_tasks) ? payload.worker_tasks : Array.isArray(payload.rows) ? payload.rows : [];
        next.workerTasks = { ...(state.workerTasks || {}), [workerId]: rows };
    }
    if (event.type === "file_transfer_progress" && event.transferId) {
        next.fileTransfers = { ...state.fileTransfers, [event.transferId]: { ...event.payload, seq: event.seq } };
    }
    next.lastKnownGood = { gpu: next.gpu, schedulerStates: next.schedulerStates, experimentTraces: next.experimentTraces, diagnostics: next.diagnostics };
    return next;
}
function applySnapshot(state, snapshot) {
    return {
        ...state,
        gpu: snapshot.gpu || state.gpu,
        schedulerStates: snapshot.schedulerStates || state.schedulerStates,
        experimentTraces: snapshot.experimentTraces || state.experimentTraces,
        diagnostics: snapshot.diagnostics || state.diagnostics,
        lastKnownGood: snapshot,
    };
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
function safeJson(text) {
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
