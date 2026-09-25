"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCleanupTargets = planCleanupTargets;
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
function planStopClearPreview(planFile, targets) {
    const label = text(planFile) || "所选 Plan";
    const lines = targets.map((target) => `${target.planFile} · ${target.operationId}${target.active ? " · 仍在运行，将先中止" : " · 已结束"}${target.tmuxTarget ? " · tmux " + target.workerId + ":" + target.tmuxTarget : (target.tmuxSession ? " · tmux 窗口未定位：" + target.tmuxSession : "")}`);
    return [
        `一键中止并清除 ${label}`,
        `将处理 ${targets.length} 条运行进度：仍在运行的先向 Worker 发送停止，再从本机进度视图清除对应条目。`,
        "远端审计、日志和训练产物保留。关闭对应报错 tmux 窗口前会再次显示完整目标。",
        ...lines,
    ].filter(Boolean).join("\n");
}
