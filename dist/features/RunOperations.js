"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUN_OPERATION_ERROR_LOG_PATTERNS = exports.RUN_OPERATION_CLOCK_SKEW_SECONDS = exports.RUN_OPERATION_RECONCILE_GRACE_MS = exports.LONG_RUNNING_PLAN_ACTIONS = void 0;
exports.runOperationLogShowsError = runOperationLogShowsError;
exports.isLongRunningPlanOperation = isLongRunningPlanOperation;
exports.operationTerminalStatus = operationTerminalStatus;
exports.hasRemoteRunActivity = hasRemoteRunActivity;
exports.reconcileRunOperation = reconcileRunOperation;
exports.runOperationMatchesTarget = runOperationMatchesTarget;
exports.LONG_RUNNING_PLAN_ACTIONS = new Set(["run-plan", "reproduce-plan"]);
exports.RUN_OPERATION_RECONCILE_GRACE_MS = 90_000;
exports.RUN_OPERATION_CLOCK_SKEW_SECONDS = 300;
// Hard error markers that, once present in a dead scheduler's log tail, should
// immediately move the operation to a terminal failed state instead of waiting
// out the reconciliation grace period.
exports.RUN_OPERATION_ERROR_LOG_PATTERNS = [
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
function runOperationLogShowsError(evidence) {
    const tail = String(evidence.liveLogTail || evidence.logTail || "");
    if (!tail)
        return false;
    return exports.RUN_OPERATION_ERROR_LOG_PATTERNS.some((re) => re.test(tail));
}
function isLongRunningPlanOperation(record) {
    return exports.LONG_RUNNING_PLAN_ACTIONS.has(String(record?.type || "").toLowerCase())
        && !operationTerminalStatus(record?.status || record?.state);
}
function operationTerminalStatus(value) {
    return new Set([
        "completed", "operation_completed", "completed_with_errors", "failed", "operation_failed",
        "cancelled", "canceled", "stalled", "unsupported", "error", "stale",
    ]).has(String(value || "").trim().toLowerCase());
}
function hasRemoteRunActivity(evidence) {
    return Boolean(evidence.pidAlive || evidence.tmuxSessionAlive
        || Number(evidence.schedulerStatesCount) > 0
        || Number(evidence.experimentTracesCount) > 0
        || Number(evidence.workerTasksCount) > 0
        || Number(evidence.liveLogCount) > 0);
}
function reconcileRunOperation(record, evidence, reason, nowMs = Date.now()) {
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
    const pidAlive = Boolean(evidence.pidAlive);
    const tmuxAlive = Boolean(evidence.tmuxSessionAlive);
    const hasActivity = Boolean(Number(evidence.schedulerStatesCount || 0) > 0
        || Number(evidence.experimentTracesCount || 0) > 0
        || Number(evidence.workerTasksCount || 0) > 0
        || Number(evidence.liveLogCount || 0) > 0);
    // A real worker/python pid proves the scheduler process is alive: keep waiting.
    if (pidAlive) {
        return { terminal: false, patch: { ...base, status: remoteStatus || "running", reconcileNoActivitySince: 0 } };
    }
    // tmux session alive but the only thing present is the scheduler shell, and it has
    // produced no real activity (no scheduler states, no experiment traces, no live log).
    // This is the "tmux 假存活" scenario: the command was dropped by a startup race and
    // the shell is just sitting at a prompt. Promote to stale once the no-activity window
    // exceeds the reconciliation grace, so the panel never hangs on "waiting for scheduler".
    if (tmuxAlive && !hasActivity) {
        const noActivitySince = Number(record.reconcileNoActivitySince) || nowMs;
        if (nowMs - noActivitySince > exports.RUN_OPERATION_RECONCILE_GRACE_MS) {
            return {
                terminal: true,
                patch: {
                    ...base,
                    status: "stale",
                    message: "tmux 会话存活但调度器长时间无任何活动证据，判定为启动失败（命令可能被启动竞态丢弃）。",
                    finishedAt: checkedAt,
                    reconciledAt: checkedAt,
                    reconcileReason: `${reason}:tmux_alive_no_activity`,
                    startedAt: record.startedAt || remote.startedAt || "",
                    updatedAt: record.updatedAt || remote.updatedAt || checkedAt,
                    reconcileNoActivitySince: noActivitySince,
                },
            };
        }
        return {
            terminal: false,
            patch: {
                ...base,
                status: remoteStatus || "running",
                reconcileNoActivitySince: noActivitySince,
                reconcileCheckedAt: checkedAt,
                reconcileGraceExpiresAt: new Date(nowMs + exports.RUN_OPERATION_RECONCILE_GRACE_MS).toISOString(),
            },
        };
    }
    if (tmuxAlive && hasActivity) {
        return { terminal: false, patch: { ...base, status: remoteStatus || "running", reconcileNoActivitySince: 0 } };
    }
    // Process is dead (no pid / no tmux session). If the log already shows a hard
    // error, promote to a terminal failed state immediately so the Operations panel
    // never stays stuck on "waiting for scheduler terminal".
    const logTail = String(evidence.liveLogTail || evidence.logTail || "");
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
    if (age > exports.RUN_OPERATION_RECONCILE_GRACE_MS) {
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
            reconcileGraceExpiresAt: new Date(nowMs + exports.RUN_OPERATION_RECONCILE_GRACE_MS).toISOString(),
        },
    };
}
function runOperationMatchesTarget(record, target) {
    const selectors = [
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
        if (!wanted)
            continue;
        matched = true;
        if ((key === "planFile" || key === "planId") ? !samePlanSelection(value, wanted) : value !== wanted)
            return false;
    }
    const status = String(record.status || record.state || "").trim().toLowerCase();
    return matched && (isLongRunningPlanOperation(record) || status === "stale");
}
function operationPlanFile(record) {
    return String(record.planFile || record.plan || record.options && record.options.planFile || "");
}
function samePlanSelection(left, right) {
    const normalize = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    return Boolean(left && right && normalize(left) === normalize(right));
}
