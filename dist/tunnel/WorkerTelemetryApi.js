"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMultiWorkerRealtimePolicy = exports.workerTelemetryForbiddenEndpoints = exports.workerTelemetryAllowedActions = exports.workerTelemetryRequiredEndpoints = exports.workerTelemetryAllowedEvents = void 0;
exports.isWorkerTelemetryEventType = isWorkerTelemetryEventType;
exports.validateWorkerTelemetryCapabilities = validateWorkerTelemetryCapabilities;
exports.workerTelemetryAllowedEvents = [
    "agent_heartbeat",
    "gpu_snapshot",
    "worker_health",
    "worker_task_snapshot",
    "log_tail",
    "diagnostics_updated",
];
exports.workerTelemetryRequiredEndpoints = [
    "/api/health",
    "/api/capabilities",
    "/api/gpu",
    "/api/worker/tasks",
    "/api/live-output?runKey=<key>&since=<offset>",
    "/api/diagnostics",
    "WS /api/events?since=<seq>",
    "GET /api/events/sse?since=<seq>",
];
exports.workerTelemetryAllowedActions = [
    "POST /api/actions/stop-worker-task",
    "POST /api/actions/delete-worker-artifacts",
    "POST /api/actions/archive-worker-artifacts",
];
exports.workerTelemetryForbiddenEndpoints = [
    "GET /api/files/*",
    "POST /api/files/*",
    "POST /api/actions/archive-artifacts",
    "POST /api/actions/delete-artifacts",
    "POST /api/actions/parse-results",
    "POST /api/actions/run-plan",
];
exports.defaultMultiWorkerRealtimePolicy = {
    connectHubOnStartup: true,
    connectWorkersOnStartup: true,
    keepHubStreamAlive: true,
    keepWorkerStreamsAlive: true,
    workerGpuRealtime: true,
    workerTaskTelemetryRealtime: true,
    workerHealthRealtime: true,
    logTailMode: "selected_run_only",
    maxConcurrentLogTails: 1,
    workerReconnectInitialDelaySeconds: 3,
    workerReconnectMaxDelaySeconds: 60,
    staleWorkerTelemetrySeconds: 180,
};
function isWorkerTelemetryEventType(type) {
    return exports.workerTelemetryAllowedEvents.includes(type);
}
function validateWorkerTelemetryCapabilities(value) {
    const caps = value;
    const warnings = [];
    if (!caps || caps.schemaVersion !== 1 || caps.mode !== "worker_telemetry" || !caps.endpoints) {
        return { ok: false, warnings: ["Worker Telemetry capability schema 无效。"] };
    }
    for (const key of ["health", "gpu", "workerTasks", "diagnostics"]) {
        if (!caps.endpoints[key])
            warnings.push(`Worker Telemetry 缺少端点：${key}`);
    }
    if (caps.endpoints.actions) {
        const actions = caps.actionEndpoints || {};
        for (const action of Object.keys(actions)) {
            if (!["stop-worker-task", "delete-worker-artifacts", "archive-worker-artifacts"].includes(action) && actions[action]) {
                warnings.push(`Worker Telemetry 暴露了不允许的控制动作：${action}`);
            }
        }
    }
    if (caps.endpoints.fileList || caps.endpoints.fileDownload || caps.endpoints.fileUploadChunk) {
        warnings.push("Worker Telemetry 暴露了文件 API；插件会忽略它。");
    }
    return { ok: warnings.every((warning) => !warning.includes("缺少端点") && !warning.includes("不允许")), warnings };
}
