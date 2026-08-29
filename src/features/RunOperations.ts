export const LONG_RUNNING_PLAN_ACTIONS = new Set(["run-plan", "reproduce-plan"]);
export const RUN_OPERATION_RECONCILE_GRACE_MS = 90_000;
export const RUN_OPERATION_CLOCK_SKEW_SECONDS = 300;

export interface RunOperationRecord {
  operationId?: unknown;
  type?: unknown;
  status?: unknown;
  state?: unknown;
  startedAt?: unknown;
  updatedAt?: unknown;
  reconciledAt?: unknown;
  reconcileCheckedAt?: unknown;
}

export interface RemoteRunEvidence {
  operation?: {
    status?: unknown;
    state?: unknown;
    message?: unknown;
    startedAt?: unknown;
    updatedAt?: unknown;
  };
  pidAlive?: unknown;
  tmuxSessionAlive?: unknown;
  checkedPid?: unknown;
  checkedTmuxSession?: unknown;
  schedulerStatesCount?: unknown;
  experimentTracesCount?: unknown;
  workerTasksCount?: unknown;
  liveLogCount?: unknown;
  liveLogTail?: unknown;
  logTail?: unknown;
}

// Hard error markers that, once present in a dead scheduler's log tail, should
// immediately move the operation to a terminal failed state instead of waiting
// out the reconciliation grace period.
export const RUN_OPERATION_ERROR_LOG_PATTERNS: RegExp[] = [
  /Traceback \(most recent call last\)/i,
  /调度器异常/i,
  /psutil\.AccessDenied/i,
  /No such file/i,
  /ModuleNotFoundError/i,
  /CondaValueError/i,
  /EnvironmentNotFound/i,
  /SyntaxError/i,
  /subprocess\.CalledProcessError/i,
  /returned non-zero exit status/i,
  /\bError\b/i,
  /\bException\b/i,
];

export function runOperationLogShowsError(evidence: RemoteRunEvidence): boolean {
  const tail = String((evidence as any).liveLogTail || (evidence as any).logTail || "");
  if (!tail) return false;
  return RUN_OPERATION_ERROR_LOG_PATTERNS.some((re) => re.test(tail));
}

export function isLongRunningPlanOperation(record: RunOperationRecord): boolean {
  return LONG_RUNNING_PLAN_ACTIONS.has(String(record?.type || "").toLowerCase())
    && !operationTerminalStatus(record?.status || record?.state);
}

export function operationTerminalStatus(value: unknown): boolean {
  return new Set([
    "completed", "operation_completed", "completed_with_errors", "failed", "operation_failed",
    "cancelled", "canceled", "stalled", "unsupported", "error", "stale",
  ]).has(String(value || "").trim().toLowerCase());
}

export function hasRemoteRunActivity(evidence: RemoteRunEvidence): boolean {
  return Boolean(
    evidence.pidAlive || evidence.tmuxSessionAlive
    || Number(evidence.schedulerStatesCount) > 0
    || Number(evidence.experimentTracesCount) > 0
    || Number(evidence.workerTasksCount) > 0
    || Number(evidence.liveLogCount) > 0,
  );
}

export function reconcileRunOperation(
  record: RunOperationRecord,
  evidence: RemoteRunEvidence,
  reason: string,
  nowMs = Date.now(),
) {
  const remote = evidence.operation || {};
  const remoteStatus = String(remote.status || remote.state || "").trim().toLowerCase();
  const checkedAt = new Date(nowMs).toISOString();
  const counts = {
    checkedWorkerId: "",
    checkedPid: Number(evidence.checkedPid ?? 0),
    checkedTmuxSession: String(evidence.checkedTmuxSession || ""),
    schedulerStatesCount: Number(evidence.schedulerStatesCount || 0),
    experimentTracesCount: Number(evidence.experimentTracesCount || 0),
    liveLogCount: Number(evidence.liveLogCount || 0),
  };
  const base = { ...record, ...counts, reconcileEvidenceActive: Boolean(evidence.pidAlive || evidence.tmuxSessionAlive || Number(evidence.schedulerStatesCount || 0) > 0 || Number(evidence.experimentTracesCount || 0) > 0), lastReconciledAt: checkedAt };
  if (operationTerminalStatus(remoteStatus)) {
    return {
      terminal: true,
      patch: {
        ...base,
        status: remoteStatus,
        message: String(remote.message || "远端操作已终态。"),
        finishedAt: checkedAt,
        reconciledAt: checkedAt,
        reconcileReason: `${reason}:remote_terminal`,
        startedAt: record.startedAt || remote.startedAt || "",
        updatedAt: record.updatedAt || remote.updatedAt || checkedAt,
      },
    };
  }
  const processAlive = Boolean(evidence.pidAlive || evidence.tmuxSessionAlive);
  if (processAlive) {
    return { terminal: false, patch: { ...base, status: remoteStatus || "running" } };
  }
  // Process is dead (no pid / no tmux session). If the log already shows a hard
  // error, promote to a terminal failed state immediately so the Operations panel
  // never stays stuck on "waiting for scheduler terminal".
  const logTail = String((evidence as any).liveLogTail || (evidence as any).logTail || "");
  if (runOperationLogShowsError(evidence)) {
    return {
      terminal: true,
      patch: {
        ...base,
        status: "failed",
        message: `远端调度进程已退出且日志含错误：${logTail.slice(-500).replace(/\n/g, " ").replace(/\r/g, " ")}`,
        finishedAt: checkedAt,
        reconciledAt: checkedAt,
        reconcileReason: `${reason}:dead_process_with_error_log`,
        startedAt: record.startedAt || remote.startedAt || "",
        updatedAt: record.updatedAt || remote.updatedAt || checkedAt,
      },
    };
  }
  const referenceRaw = String(record.reconcileCheckedAt || record.startedAt || "");
  const reference = Date.parse(referenceRaw);
  const age = Number.isFinite(reference) ? nowMs - reference : nowMs - (Date.parse(String(record.startedAt || "")) || 0);
  if (age > RUN_OPERATION_RECONCILE_GRACE_MS) {
    return {
      terminal: true,
      patch: {
        ...base,
        status: "stale",
        message: "远端调度进程已退出（pid/tmux 均不可见）且无活动证据；本地提交操作已标记 stale。",
        finishedAt: checkedAt,
        reconciledAt: checkedAt,
        reconcileReason: `${reason}:no_remote_activity`,
        startedAt: record.startedAt || remote.startedAt || "",
        updatedAt: record.updatedAt || remote.updatedAt || checkedAt,
      },
    };
  }
  return {
    terminal: false,
    patch: {
      ...base,
      reconcileCheckedAt: checkedAt,
      reconcileGraceExpiresAt: new Date(nowMs + RUN_OPERATION_RECONCILE_GRACE_MS).toISOString(),
    },
  };
}

export function runOperationMatchesTarget(record: Record<string, unknown>, target: Record<string, string>): boolean {
  const selectors: Array<[string, string]> = [
    ["planFile", String(operationPlanFile(record))],
    ["planId", String(record.planId || record.selectedPlanId || "")],
    ["operationId", String(record.operationId || record.opId || "")],
    ["runKey", String(record.runKey || record.operationId || record.opId || "")],
    ["remoteOperationId", String(record.remoteOperationId || record.operationId || "")],
    ["pid", String(record.pid || record.checkedPid || "")],
    ["tmuxSession", String(record.tmuxSession || record.session || record.checkedTmuxSession || "")],
  ];
  let matched = false;
  for (const [key, value] of selectors) {
    const wanted = String(target[key] || "").trim();
    if (!wanted) continue;
    matched = true;
    if ((key === "planFile" || key === "planId") ? !samePlanSelection(value, wanted) : value !== wanted) return false;
  }
  const status = String(record.status || record.state || "").trim().toLowerCase();
  return matched && (isLongRunningPlanOperation(record as RunOperationRecord) || status === "stale");
}

function operationPlanFile(record: Record<string, unknown>): string {
  return String(record.planFile || record.plan || record.options && (record.options as any).planFile || "");
}

function samePlanSelection(left: string, right: string): boolean {
  const normalize = (value: string) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
  return Boolean(left && right && normalize(left) === normalize(right));
}
