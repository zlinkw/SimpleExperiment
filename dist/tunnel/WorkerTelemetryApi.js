"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultMultiWorkerRealtimePolicy = exports.workerTelemetryForbiddenFileEndpointKeys = exports.workerTelemetryReadOnlyFileEndpointKeys = exports.workerTelemetryForbiddenEndpoints = exports.workerTelemetryAllowedActions = exports.workerResultActionNames = exports.workerLocalSchedulerActionNames = exports.workerTelemetryActionNames = exports.workerTelemetryRequiredEndpoints = exports.workerTelemetryAllowedEvents = void 0;
exports.isWorkerTelemetryAction = isWorkerTelemetryAction;
exports.isWorkerDirectAction = isWorkerDirectAction;
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
    "/api/results/summary",
    "/api/live-output?runKey=<key>&since=<offset>",
    "/api/diagnostics",
    "GET /api/events/sse?since=<seq>",
];
exports.workerTelemetryActionNames = [
    "start-worker-task",
    "rebuild-distributed-results",
    "retry-worker-task",
    "stop-worker-task",
    "stop-worker-task-exact-pane",
    "delete-worker-artifacts",
    "archive-worker-artifacts",
    "start-tensorboard",
    "stop-tensorboard",
    "get-tensorboard-status",
    "install-rich",
    "save-result-policy",
];
exports.workerLocalSchedulerActionNames = [
    "validate-plan",
    "dry-run-plan",
    "run-plan",
    "reproduce-plan",
    "stop-scheduler-operation",
];
exports.workerResultActionNames = [
    "refresh-results",
    "rescan-results",
    "parse-results",
    "run-quality-gate",
    "run-statistics",
    "export-paper-table",
    "check-claim-evidence",
    "check-output-contract",
    "parse-case-level",
    "run-leakage-check",
    "run-subgroup-analysis",
    "export-case-analysis",
    "plan-checkpoint-retention",
    "inspect-dataset",
    "export-plotting-contract",
    "infer-config-from-run",
    "recover-plan-from-run",
    "diagnose-result-anomaly",
    "compare-with-best-config",
    "archive-artifacts",
    "archive-plan-copy",
    "exclude-results",
    "sync-artifacts",
    "complete-three-way",
];
exports.workerTelemetryAllowedActions = exports.workerTelemetryActionNames.map((action) => `POST /api/actions/${action}`);
exports.workerTelemetryForbiddenEndpoints = [
    "GET /api/files/list",
    "POST /api/files/*",
    "POST /api/actions/delete-artifacts",
];
/** Worker telemetry may advertise read-only download. Listing and writes stay forbidden. */
exports.workerTelemetryReadOnlyFileEndpointKeys = ["fileDownload", "fileRangeDownload", "fileStat"];
exports.workerTelemetryForbiddenFileEndpointKeys = [
    "fileList",
    "fileUploadChunk",
    "fileUploadInit",
    "fileUploadComplete",
];
function isWorkerTelemetryAction(action) {
    return exports.workerTelemetryActionNames.includes(action);
}
function isWorkerDirectAction(action) {
    return isWorkerTelemetryAction(action)
        || exports.workerLocalSchedulerActionNames.includes(action)
        || exports.workerResultActionNames.includes(action);
}
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
            if (!isWorkerDirectAction(action) && actions[action]) {
                warnings.push(`Worker Telemetry 暴露了不允许的控制动作：${action}`);
            }
        }
    }
    const endpoints = caps.endpoints;
    const readOnlyFiles = new Set(exports.workerTelemetryReadOnlyFileEndpointKeys);
    const forbiddenFiles = exports.workerTelemetryForbiddenFileEndpointKeys.filter((key) => Boolean(endpoints[key]) && !readOnlyFiles.has(key));
    if (forbiddenFiles.length) {
        warnings.push(`Worker Telemetry 暴露了不允许的文件写入或列表端点：${forbiddenFiles.join("、")}。`);
    }
    return { ok: warnings.every((warning) => !warning.includes("缺少端点") && !warning.includes("不允许")), warnings };
}
