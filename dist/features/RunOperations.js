"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RUN_OPERATION_CLOCK_SKEW_SECONDS = exports.RUN_OPERATION_RECONCILE_GRACE_MS = exports.LONG_RUNNING_PLAN_ACTIONS = void 0;
exports.isLongRunningPlanOperation = isLongRunningPlanOperation;
exports.operationTerminalStatus = operationTerminalStatus;
exports.hasRemoteRunActivity = hasRemoteRunActivity;
exports.reconcileRunOperation = reconcileRunOperation;
exports.runOperationMatchesTarget = runOperationMatchesTarget;
exports.LONG_RUNNING_PLAN_ACTIONS = new Set(["run-plan", "reproduce-plan"]);
exports.RUN_OPERATION_RECONCILE_GRACE_MS = 90_000;
exports.RUN_OPERATION_CLOCK_SKEW_SECONDS = 300;
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
    const base = { ...record, ...counts, reconcileEvidenceActive: hasRemoteRunActivity(evidence), lastReconciledAt: checkedAt };
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
    if (hasRemoteRunActivity(evidence)) {
        return { terminal: false, patch: { ...base, status: remoteStatus || "running" } };
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
                message: "远端无 pid、tmux、调度状态、trace 或日志证据；本地提交操作已标记 stale。",
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
