import { ClusterSnapshot } from "./TunnelClient";

export type RealtimeEventType =
  | "agent_heartbeat"
  | "gpu_snapshot"
  | "scheduler_snapshot"
  | "experiment_lifecycle"
  | "experiment_trace"
  | "log_tail"
  | "result_parsed"
  | "quality_gate_updated"
  | "statistics_updated"
  | "paper_table_updated"
  | "file_transfer_progress"
  | "file_changed"
  | "diagnostics_updated"
  | "worker_health"
  | "agent_warning"
  | "operation_started"
  | "operation_progress"
  | "operation_completed"
  | "operation_failed";

export interface RealtimeEventError {
  code: string;
  message: string;
  serverId?: string;
  retryable?: boolean;
}

export interface RealtimeEvent {
  schemaVersion: 1;
  seq: number;
  type: RealtimeEventType;
  generatedAt: string;
  source: "hub_agent" | "worker_telemetry";
  serverId?: string;
  workerId?: string;
  runKey?: string;
  experimentId?: string;
  operationId?: string;
  transferId?: string;
  payload: unknown;
  partialFailure?: boolean;
  errors?: RealtimeEventError[];
}

export interface FileChangedEvent {
  type: "file_changed";
  path: string;
  changeType: "created" | "modified" | "deleted";
  size?: number;
  mtime?: string;
  relatedExperimentId?: string;
  relatedRunKey?: string;
}

export interface RealtimeState {
  lastSeq: number;
  lastHeartbeatAt?: string;
  gpu: Record<string, unknown[]>;
  schedulerStates: unknown[];
  experimentTraces: unknown[];
  logs: Record<string, { offset?: number; text: string; seq: number }>;
  operations: Record<string, unknown>;
  diagnostics?: unknown;
  fileTransfers: Record<string, unknown>;
  warnings: string[];
  lastKnownGood?: ClusterSnapshot;
  resultSummaryDirtySeq?: number;
  resultSummaryDirtyAt?: string;
  resultSummaryDirtyType?: string;
  workerTasks?: Record<string, unknown[]>;
  workerHealth?: Record<string, unknown>;
}

export function compactRealtimeLogs(logs: RealtimeState["logs"]): RealtimeState["logs"] {
  const entries = Object.entries(logs).slice(-20);
  return Object.fromEntries(entries.map(([key, item]) => [key, { ...item, text: item.text.slice(-20000) }]));
}

const knownTypes = new Set<RealtimeEventType>([
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
  "agent_warning",
  "operation_started",
  "operation_progress",
  "operation_completed",
  "operation_failed",
]);

export function createRealtimeState(snapshot?: ClusterSnapshot): RealtimeState {
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

export function validateRealtimeEvent(input: unknown): { ok: true; event: RealtimeEvent } | { ok: false; warning: string; event?: unknown } {
  const item = typeof input === "string" ? safeJson(input) : input;
  if (!item || typeof item !== "object") return { ok: false, warning: "malformed event" };
  const event = item as Partial<RealtimeEvent>;
  if (Number(event.schemaVersion) !== 1 || !Number.isFinite(Number(event.seq)) || !event.generatedAt || (event.source !== "hub_agent" && event.source !== "worker_telemetry")) {
    return { ok: false, warning: "bad event schema", event: item };
  }
  if (!knownTypes.has(event.type as RealtimeEventType)) {
    return { ok: false, warning: `unknown event type=${String(event.type)}`, event: item };
  }
  return { ok: true, event: event as RealtimeEvent };
}

export function applyRealtimeEvent(state: RealtimeState, input: unknown): RealtimeState {
  const valid = validateRealtimeEvent(input);
  if (valid.ok === false) return { ...state, warnings: [...state.warnings.slice(-20), valid.warning] };
  const event = valid.event;
  if (event.seq <= state.lastSeq) return state;
  const next: RealtimeState = { ...state, lastSeq: event.seq };
  if (event.type === "agent_heartbeat") next.lastHeartbeatAt = event.generatedAt;
  if (event.type === "gpu_snapshot") {
    const serverId = event.workerId || event.serverId || "hub";
    next.gpu = { ...state.gpu, [serverId]: Array.isArray(event.payload) ? event.payload : (event.payload as { gpus?: unknown[] })?.gpus || [] };
  }
  if (event.type === "scheduler_snapshot") {
    next.schedulerStates = Array.isArray(event.payload) ? event.payload : (event.payload as { schedulerStates?: unknown[] })?.schedulerStates || [];
  }
  if (event.type === "experiment_lifecycle" || event.type === "experiment_trace") {
    const incoming = Array.isArray(event.payload) ? event.payload : [event.payload];
    next.experimentTraces = mergeByKey(state.experimentTraces, incoming, event.seq);
  }
  if (event.type === "log_tail" && event.runKey) {
    const payload = event.payload as { text?: string; offset?: number };
    next.logs = { ...state.logs, [event.runKey]: { text: payload.text || "", offset: payload.offset, seq: event.seq } };
  }
  if (event.operationId && event.type.startsWith("operation_")) {
    next.operations = { ...state.operations, [event.operationId]: { ...(event.payload as object), type: event.type, seq: event.seq } };
  }
  if (event.type === "diagnostics_updated") next.diagnostics = event.payload;
  if (event.type === "file_transfer_progress" && event.transferId) {
    next.fileTransfers = { ...state.fileTransfers, [event.transferId]: { ...(event.payload as object), seq: event.seq } };
  }
  next.lastKnownGood = { gpu: next.gpu, schedulerStates: next.schedulerStates, experimentTraces: next.experimentTraces, diagnostics: next.diagnostics as Record<string, unknown> };
  return next;
}

export function applySnapshot(state: RealtimeState, snapshot: ClusterSnapshot): RealtimeState {
  return {
    ...state,
    gpu: snapshot.gpu || state.gpu,
    schedulerStates: snapshot.schedulerStates || state.schedulerStates,
    experimentTraces: snapshot.experimentTraces || state.experimentTraces,
    diagnostics: snapshot.diagnostics || state.diagnostics,
    lastKnownGood: snapshot,
  };
}

function mergeByKey(previous: unknown[], incoming: unknown[], seq: number): unknown[] {
  const map = new Map<string, any>();
  for (const row of previous || []) map.set(rowKey(row), row);
  for (const row of incoming || []) {
    const item = { ...(row as object), seq };
    map.set(rowKey(item), { ...(map.get(rowKey(item)) || {}), ...item });
  }
  return [...map.values()];
}

function rowKey(row: unknown): string {
  const item = row as Record<string, unknown>;
  return String(item.runKey || item.run_key || item.experimentId || item.experiment_id || item.id || JSON.stringify(row));
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
