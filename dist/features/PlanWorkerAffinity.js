"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePlanWorkerAffinity = resolvePlanWorkerAffinity;
function planKey(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}
function resolvePlanWorkerAffinity(planFile, enabledWorkerIds, summary, registry, operations) {
    const workers = new Map(enabledWorkerIds.map((id) => [id.toLowerCase(), id]));
    const available = new Set((Array.isArray(summary?.availableWorkerIds) ? summary.availableWorkerIds : []).map((id) => String(id).toLowerCase()));
    const missing = enabledWorkerIds.filter((id) => !available.has(id.toLowerCase()));
    if (missing.length)
        throw new Error(`重跑 Plan 前无法检查全部 Worker 的历史结果：${missing.join("、")}。请恢复对应 Agent 后重试。`);
    const owners = new Set();
    const add = (id) => { const value = String(id || "").trim(); if (value)
        owners.add(value.toLowerCase()); };
    for (const row of Array.isArray(summary?.results) ? summary.results : [])
        add(row?.workerId || row?.resultOwnerWorkerId);
    for (const row of Array.isArray(summary?.workerSummaries) ? summary.workerSummaries : []) {
        if (Number(row?.resultCount || 0) > 0)
            add(row.workerId);
    }
    const plan = planKey(planFile);
    const historic = Object.entries(registry?.plans || {}).find(([key]) => planKey(key) === plan)?.[1];
    for (const row of Array.isArray(historic?.records) ? historic.records : [])
        add(row?.workerId);
    for (const row of Object.values(operations || {})) {
        if (!row || typeof row !== "object")
            continue;
        const operation = row;
        if (planKey(operation.planFile || operation.selectedPlanId) !== plan)
            continue;
        if (!/^(run-plan|reproduce-plan)$/.test(String(operation.type || operation.action || "")))
            continue;
        if (!/^(completed|interrupted|cancelled|running|started|waiting)$/.test(String(operation.status || "").toLowerCase()))
            continue;
        add(operation.schedulerOwnerWorkerId || operation.resultOwnerWorkerId || operation.workerId);
    }
    if (owners.size > 1)
        throw new Error(`该 Plan 已在多个 Worker 留下运行或结果记录：${[...owners].join("、")}。请先核对结果归属，禁止跨 Worker 重跑。`);
    const owner = [...owners][0];
    if (!owner)
        return undefined;
    if (!workers.has(owner))
        throw new Error(`该 Plan 的历史 Worker ${owner} 未启用；请先启用并检查该 Worker，禁止改派重跑。`);
    return workers.get(owner);
}
