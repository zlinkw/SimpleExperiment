export type WorkerTelemetryEventType =
  | "agent_heartbeat"
  | "gpu_snapshot"
  | "worker_health"
  | "worker_task_snapshot"
  | "log_tail"
  | "diagnostics_updated";

export const workerTelemetryAllowedEvents: readonly WorkerTelemetryEventType[] = [
  "agent_heartbeat",
  "gpu_snapshot",
  "worker_health",
  "worker_task_snapshot",
  "log_tail",
  "diagnostics_updated",
];

export const workerTelemetryRequiredEndpoints = [
  "/api/health",
  "/api/capabilities",
  "/api/gpu",
  "/api/worker/tasks",
  "/api/live-output?runKey=<key>&since=<offset>",
  "/api/diagnostics",
  "WS /api/events?since=<seq>",
  "GET /api/events/sse?since=<seq>",
] as const;

export const workerTelemetryAllowedActions = [
  "POST /api/actions/stop-worker-task",
  "POST /api/actions/delete-worker-artifacts",
  "POST /api/actions/archive-worker-artifacts",
] as const;

export const workerTelemetryForbiddenEndpoints = [
  "GET /api/files/*",
  "POST /api/files/*",
  "POST /api/actions/archive-artifacts",
  "POST /api/actions/delete-artifacts",
  "POST /api/actions/parse-results",
  "POST /api/actions/run-plan",
] as const;

export interface WorkerTaskTelemetry {
  schemaVersion: 1;
  workerId: string;
  runKey?: string;
  experimentId?: string;
  localStatus: "pid_alive" | "process_gone" | "gpu_process_alive" | "log_updating" | "unknown";
  pid?: number;
  gpuIds?: string[];
  gpuProcessInfo?: Array<{
    gpuId: string;
    pid?: number;
    usedMemoryMb?: number;
    command?: string;
  }>;
  logPath?: string;
  logOffset?: number;
  lastSeenAt: string;
}

export interface MultiWorkerRealtimePolicy {
  connectHubOnStartup: boolean;
  connectWorkersOnStartup: boolean;
  keepHubStreamAlive: boolean;
  keepWorkerStreamsAlive: boolean;
  workerGpuRealtime: boolean;
  workerTaskTelemetryRealtime: boolean;
  workerHealthRealtime: boolean;
  logTailMode: "selected_run_only" | "running_runs_limited" | "disabled";
  maxConcurrentLogTails: number;
  workerReconnectInitialDelaySeconds: number;
  workerReconnectMaxDelaySeconds: number;
  staleWorkerTelemetrySeconds: number;
}

export const defaultMultiWorkerRealtimePolicy: MultiWorkerRealtimePolicy = {
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

export interface WorkerTelemetryCapabilities {
  schemaVersion: 1;
  apiVersion: string;
  agentVersion: string;
  mode: "worker_telemetry";
  endpoints: {
    health: boolean;
    capabilities: boolean;
    gpu: boolean;
    workerTasks: boolean;
    liveOutput: boolean;
    diagnostics: boolean;
    websocketEvents: boolean;
    sseEvents: boolean;
    actions?: boolean;
    fileList?: boolean;
    fileDownload?: boolean;
    fileUploadChunk?: boolean;
  };
  actionEndpoints?: Record<string, boolean>;
}

export function isWorkerTelemetryEventType(type: unknown): type is WorkerTelemetryEventType {
  return workerTelemetryAllowedEvents.includes(type as WorkerTelemetryEventType);
}

export function validateWorkerTelemetryCapabilities(value: unknown): { ok: boolean; warnings: string[] } {
  const caps = value as Partial<WorkerTelemetryCapabilities>;
  const warnings: string[] = [];
  if (!caps || caps.schemaVersion !== 1 || caps.mode !== "worker_telemetry" || !caps.endpoints) {
    return { ok: false, warnings: ["Worker Telemetry capability schema 无效。"] };
  }
  for (const key of ["health", "gpu", "workerTasks", "diagnostics"] as const) {
    if (!caps.endpoints[key]) warnings.push(`Worker Telemetry 缺少端点：${key}`);
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