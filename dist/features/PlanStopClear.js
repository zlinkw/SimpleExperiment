"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCleanupTargets = planCleanupTargets;
exports.planEvidenceMatchesFile = planEvidenceMatchesFile;
exports.remotePlanIdentityConflict = remotePlanIdentityConflict;
exports.planRecoveryConflicts = planRecoveryConflicts;
exports.trustedRemotePlanOperations = trustedRemotePlanOperations;
exports.mergeTrustedPlanOperations = mergeTrustedPlanOperations;
exports.planStopIdentityConflictMessage = planStopIdentityConflictMessage;
exports.planStopMissingEvidenceMessage = planStopMissingEvidenceMessage;
exports.planStopClearPreview = planStopClearPreview;
const PLAN_RUN_TYPES = new Set(["run-plan", "reproduce-plan"]);
function text(value) {
    return String(value || "").trim();
}
function samePlan(left, right) {
    const normalize = (value) => value.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b)
        return false;
    if (a === b)
        return true;
    const absolute = (value) => /^(?:[a-z]:\/|\/)/i.test(value);
    return absolute(a) !== absolute(b) && (absolute(a) ? a.endsWith("/" + b) : b.endsWith("/" + a));
}
function planCleanupTargets(operations, planFile, terminal) {
    const selected = text(planFile);
    return Object.values(operations || {}).flatMap((row) => {
        if (!row || typeof row !== "object")
            return [];
        const type = text(row.type || row.action).toLowerCase();
        if (!PLAN_RUN_TYPES.has(type))
            return [];
        const file = text(row.planFile || row.plan);
        if (selected && !samePlan(file, selected))
            return [];
        const operationId = text(row.operationId || row.id);
        if (!operationId || !file)
            return [];
        const tmuxSession = text(row.tmuxSession || row.session || row.checkedTmuxSession);
        const tmuxTarget = text(row.tmuxTarget || row.tmuxWindow || row.window);
        return [{
                operationId,
                planFile: file,
                workerId: text(row.schedulerOwnerWorkerId || row.resultOwnerWorkerId || row.workerId),
                active: !terminal(row),
                tmuxSession,
                tmuxTarget: tmuxTarget.includes(":") ? tmuxTarget : (tmuxSession.includes(":") ? tmuxSession : ""),
            }];
    });
}
function planEvidenceMatchesFile(left, right) {
    return samePlan(left, right);
}
function remoteTaskRows(snapshot) {
    if (Array.isArray(snapshot))
        return snapshot.filter((row) => row && typeof row === "object");
    if (!snapshot || typeof snapshot !== "object")
        return [];
    const record = snapshot;
    for (const key of ["tasks", "workerTasks", "worker_tasks", "rows"]) {
        if (Array.isArray(record[key]))
            return record[key].filter((row) => row && typeof row === "object");
    }
    return [];
}
function declaredWorkerIds(record) {
    return [record.schedulerOwnerWorkerId, record.resultOwnerWorkerId, record.workerId].map(text).filter(Boolean);
}
function remotePlanIdentityConflict(previous, incoming) {
    if (!previous || typeof previous !== "object")
        return "";
    const record = previous;
    const previousId = text(record.operationId || record.id);
    if (previousId && previousId !== incoming.operationId)
        return "operation";
    const previousFile = text(record.planFile || record.plan);
    if (previousFile && !samePlan(previousFile, incoming.planFile))
        return "plan";
    const workers = declaredWorkerIds(record);
    if (workers.some((id) => id.toLowerCase() !== text(incoming.workerId).toLowerCase()))
        return "worker";
    return "";
}
function planRecoveryConflicts(existing, recovered) {
    const conflicts = [];
    const seen = new Map();
    for (const row of recovered || []) {
        const prior = seen.get(row.operationId);
        if (prior) {
            const reason = remotePlanIdentityConflict({
                operationId: prior.operationId,
                planFile: prior.planFile,
                schedulerOwnerWorkerId: prior.workerId,
            }, row);
            if (reason && reason !== "operation")
                conflicts.push({ operationId: row.operationId, reason });
        }
        else {
            seen.set(row.operationId, row);
        }
        const reason = remotePlanIdentityConflict(existing?.[row.operationId], row);
        if (reason)
            conflicts.push({ operationId: row.operationId, reason });
    }
    return conflicts;
}
function trustedRemotePlanOperations(snapshot, workerId, planFile) {
    const owner = text(workerId);
    const selected = text(planFile);
    if (!owner || !selected)
        return [];
    const out = [];
    for (const task of remoteTaskRows(snapshot)) {
        if (text(task.kind).toLowerCase() !== "scheduler")
            continue;
        const type = text(task.action || task.type).toLowerCase();
        if (!PLAN_RUN_TYPES.has(type))
            continue;
        const operationId = text(task.operationId || task.opId);
        const file = text(task.planFile || task.plan);
        const declared = [text(task.workerId), text(task.schedulerOwnerWorkerId)].filter(Boolean);
        if (!operationId || !file || !samePlan(file, selected) || !declared.length || declared.some((id) => id.toLowerCase() !== owner.toLowerCase()))
            continue;
        const rawStatus = text(task.status || "running").toLowerCase() || "running";
        const status = rawStatus === "stopped" ? "cancelled" : rawStatus;
        const tmuxSession = text(task.tmuxSession || task.session);
        const tmuxTarget = text(task.tmuxTarget || task.tmuxWindow || task.window);
        const pid = Number(task.pid || 0);
        out.push({
            operationId,
            planFile: file,
            type,
            status,
            workerId: owner,
            ...(Number.isFinite(pid) && pid > 0 ? { pid } : {}),
            ...(tmuxSession ? { tmuxSession } : {}),
            ...(tmuxTarget.includes(":") ? { tmuxTarget } : {}),
            ...(text(task.logPath) ? { logPath: text(task.logPath) } : {}),
            ...(text(task.startedAt) ? { startedAt: text(task.startedAt) } : {}),
            ...(text(task.updatedAt || task.finishedAt || task.startedAt) ? { updatedAt: text(task.updatedAt || task.finishedAt || task.startedAt) } : {}),
            ...(text(task.finishedAt) ? { finishedAt: text(task.finishedAt) } : {}),
            source: "worker-task",
        });
    }
    return out;
}
function mergeTrustedPlanOperations(operations, recovered) {
    if (planRecoveryConflicts(operations, recovered).length)
        return { ...(operations || {}) };
    const merged = { ...(operations || {}) };
    for (const row of recovered) {
        const previous = merged[row.operationId];
        if (previous && typeof previous === "object") {
            if (remotePlanIdentityConflict(previous, row))
                continue;
            const previousFile = text(previous.planFile || previous.plan);
            merged[row.operationId] = {
                ...previous,
                ...row,
                operationId: row.operationId,
                planFile: previousFile || row.planFile,
                type: text(previous.type || previous.action) || row.type,
                schedulerOwnerWorkerId: text(previous.schedulerOwnerWorkerId) || row.workerId,
                resultOwnerWorkerId: text(previous.resultOwnerWorkerId) || row.workerId,
                workerId: text(previous.workerId) || row.workerId,
            };
            continue;
        }
        merged[row.operationId] = {
            operationId: row.operationId,
            type: row.type,
            status: row.status,
            planFile: row.planFile,
            schedulerOwnerWorkerId: row.workerId,
            resultOwnerWorkerId: row.workerId,
            workerId: row.workerId,
            ...(row.pid ? { pid: row.pid } : {}),
            ...(row.tmuxSession ? { tmuxSession: row.tmuxSession } : {}),
            ...(row.tmuxTarget ? { tmuxTarget: row.tmuxTarget } : {}),
            ...(row.logPath ? { logPath: row.logPath } : {}),
            ...(row.startedAt ? { startedAt: row.startedAt } : {}),
            ...(row.updatedAt ? { updatedAt: row.updatedAt } : {}),
            ...(row.finishedAt ? { finishedAt: row.finishedAt } : {}),
            restoredFrom: row.source,
        };
    }
    return merged;
}
function planStopIdentityConflictMessage(planFile, conflicts) {
    const label = text(planFile) || "所选 Plan";
    const lines = (conflicts || []).map((item) => `${item.operationId}：${item.reason === "worker" ? "Worker 归属不一致" : item.reason === "plan" ? "Plan 路径不一致" : "operationId 不一致"}`);
    return [
        `不能中止 ${label}：同一 operationId 的本机进度与远端 scheduler 身份冲突。`,
        ...lines,
        "未发送停止命令，也未用冲突的远端状态覆盖本机进度。",
    ].join("\n");
}
function planStopMissingEvidenceMessage(planFile, detail) {
    const label = text(planFile) || "所选 Plan";
    const reasons = [
        `没有找到 ${label} 的本机运行进度条目。`,
        detail.realtime
            ? `已向 ${detail.workersChecked} 个已启用 Worker 查询实时调度任务，没有同时具备 operationId、Plan 路径和 Worker 归属的记录。`
            : "当前不是实时连接，不能读取远端 Worker 任务，因此不能凭 Plan 路径中止。",
        "未发送停止命令。可恢复动作：确认对应 Worker 隧道在线后点「刷新状态」，或在该 Plan 的操作记录恢复后再点一次「一键中止并清除 Plan」。",
    ];
    if (detail.failures.length)
        reasons.splice(2, 0, `查询失败：${detail.failures.join("；")}`);
    return reasons.join("\n");
}
function planStopClearPreview(planFile, targets, distributed = []) {
    const label = text(planFile) || "所选 Plan";
    const lines = targets.map((target) => `${target.planFile} · ${target.operationId}${target.active ? " · 仍在运行，将先中止" : " · 已结束"}${target.tmuxTarget ? " · tmux " + target.workerId + ":" + target.tmuxTarget : (target.tmuxSession ? " · tmux 窗口未定位：" + target.tmuxSession : "")}`);
    const queueLines = distributed.map((row) => `${row.planFile} · ${row.planId} · ${row.label}${row.active ? " · 将先按 job 身份停止，并只关闭该 job 的 tmux 标签" : " · 将取消排队"}`);
    return [
        `一键中止并清除 ${label}`,
        `将处理 ${targets.length} 条运行进度、${distributed.length} 条分布式调度：仍在运行的先向对应 Worker 发送停止，再从本机进度和队列清除已确认条目。`,
        "远端审计、日志和训练产物保留。关闭对应 tmux 标签前会再次确认完整目标。未确认停止的 job、deferred 和进度保持可见。",
        ...lines,
        ...queueLines,
    ].filter(Boolean).join("\n");
}
