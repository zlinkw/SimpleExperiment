"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rerunWorkflowBaseId = rerunWorkflowBaseId;
exports.selectRerunWorkflowInstance = selectRerunWorkflowInstance;
const TERMINAL_JOB_STATUSES = new Set(["cancelled", "canceled", "completed", "expired", "failed", "skipped", "success", "succeeded"]);
function rerunWorkflowBaseId(scopeKey) {
    return "distributed-plan-rerun-" + String(scopeKey || "").trim();
}
function jobIsTerminal(job) {
    const status = String(job?.status || "").trim().toLowerCase();
    return TERMINAL_JOB_STATUSES.has(status);
}
function selectRerunWorkflowInstance(queue, scopeKey) {
    const base = rerunWorkflowBaseId(scopeKey);
    const instancePattern = new RegExp("^" + base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:-r(0|[1-9][0-9]*))?$");
    const plans = Array.isArray(queue?.plans) ? queue.plans : [];
    let maxOrdinal = -1;
    let activeOrdinal = -1;
    let activeRunId = "";
    let familyRunCount = 0;
    for (const plan of plans) {
        // 真实队列的 cleanup 是对象记录（清理主机），不存在 cleanup===true 形态；清理卡照常计入族，
        // 是否挡新批只取决于族内 job 终态（清理进行中不阻断已终结批次的再次重跑）。
        if (!plan)
            continue;
        const id = String(plan.id || "");
        const match = instancePattern.exec(id);
        if (!match)
            continue;
        const ordinal = Number(match[1] ?? 0);
        familyRunCount += 1;
        if (ordinal > maxOrdinal)
            maxOrdinal = ordinal;
        const jobs = Array.isArray(plan.jobs) ? plan.jobs : [];
        // 空 job 列表无法证明终结，与未知状态一样保守视为未终结。
        const active = jobs.length === 0 || jobs.some(job => !jobIsTerminal(job));
        if (active && ordinal > activeOrdinal) {
            activeOrdinal = ordinal;
            activeRunId = id;
        }
    }
    const nextOrdinal = maxOrdinal + 1;
    return { workflowId: base + (nextOrdinal > 0 ? "-r" + nextOrdinal : ""), activeRunId, familyRunCount };
}
