"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBranchRoute = resolveBranchRoute;
exports.branchRpc = branchRpc;
exports.listBranchPlans = listBranchPlans;
exports.previewBranchRun = previewBranchRun;
exports.submitBranchRun = submitBranchRun;
exports.branchRunProgress = branchRunProgress;
const LocalApiClient_1 = require("../cli/LocalApiClient");
/** 唯一存活实例解析：歧义/离线/超预算一律如实抛错（继承 LocalApiClient 的拒绝语义）。 */
async function resolveBranchRoute(workspace) {
    const row = await (0, LocalApiClient_1.resolveInstanceByWorkspace)("experiment", workspace);
    return { instanceId: String(row.instanceId), workspace, discoveryPath: row.discoveryPath };
}
/** 绑定路由的 RPC 通道：每条请求都做真实握手并核对 pin 与工作区一致。 */
function branchRpc(route) {
    return (method, params) => (0, LocalApiClient_1.callPluginRpc)("experiment", method, params, route.instanceId, { discoveryPath: route.discoveryPath, workspace: route.workspace });
}
/** 分支窗口的本地 PLAN 元数据（plans.list 原样行 → 选择所需的最小字段）。 */
async function listBranchPlans(rpc) {
    const value = await rpc("plans.list", {});
    const rows = Array.isArray(value?.plans) ? value.plans : [];
    const out = new Map();
    for (const raw of rows) {
        const row = (raw && typeof raw === "object" ? raw : {});
        const planFile = String(row.planFile || row.file || "");
        if (!planFile || out.has(planFile))
            continue;
        out.set(planFile, { planFile, planId: String(row.planId || planFile), updatedAt: String(row.updatedAt || ""), metadataTruncated: row.metadataTruncated === true });
    }
    return [...out.values()];
}
/** workflow.plan（不带 autoPrepare/confirm）= 只读路由预览；本模块绝不代为 prepare。 */
async function previewBranchRun(rpc, workspace, plan) {
    const value = await rpc("workflow.plan", { workspace, planFile: plan.planFile, planId: plan.planId });
    const blocker = (value && typeof value.blocker === "object" && value.blocker) || {};
    if (value?.ok === true)
        return { ready: true, guidance: "", needsValidation: false, raw: value };
    const code = String(blocker.code || "");
    const guidance = String(blocker.recommendedAction || value?.nextAction || code || "分支窗口未给出可执行结论。");
    // workflow.run(forRun=true) 不要求先跑 plan.validate；其余缺件（基础设施/PLAN 未选定）在 run 里同样拒绝。
    const needsValidation = code === "VALIDATION_REQUIRED";
    return { ready: needsValidation, guidance: needsValidation ? `该 PLAN 尚未校验：提交后由分支窗口执行校验流程（${guidance}）` : guidance, needsValidation, raw: value };
}
/**
 * workflow.run 的真实参数形状来自其实现（workspace/planFile/planId/debugMode）。
 * JSON-RPC 业务错误=确定未启动（可复述原因）；传输层失败/超时=结果未知，本模块绝不重发，
 * 调用方必须提示到分支窗口或稍后用运行状态核实。
 */
async function submitBranchRun(rpc, workspace, plan) {
    let value;
    try {
        value = await rpc("workflow.run", { workspace, planFile: plan.planFile, planId: plan.planId, debugMode: false });
    }
    catch (error) {
        const deterministic = Boolean(error && typeof error === "object" && error.apiCode !== undefined);
        const text = error instanceof Error ? error.message : String(error);
        if (deterministic)
            return { kind: "notStarted", reason: text || "分支窗口拒绝了本次提交。", raw: error?.apiData };
        return { kind: "unknown", error: text };
    }
    const row = (value && typeof value === "object" ? value : {});
    if (row.ok === true && row.started === true && String(row.operationId || ""))
        return { kind: "started", operationId: String(row.operationId), raw: value };
    const blocker = (row.blocker && typeof row.blocker === "object" && row.blocker) || {};
    return { kind: "notStarted", reason: String(blocker.code || blocker.recommendedAction || row.message || "分支窗口未启动该 PLAN。"), raw: value };
}
/** 该分支实例最近的操作记录（operations.list 已按时间倒序）；只取有界前若干条展示。 */
async function branchRunProgress(rpc, limit = 8) {
    const value = await rpc("operations.list", { limit: 200 });
    const rows = Array.isArray(value?.records) ? value.records : [];
    return rows.slice(0, Math.max(1, Math.min(50, limit))).map((raw) => {
        const row = (raw && typeof raw === "object" ? raw : {});
        return {
            operationId: String(row.operationId || ""),
            type: String(row.type || ""),
            status: String(row.status ?? row.state ?? ""),
            message: String(row.message || "").slice(0, 200),
            planFile: String(row.planFile || ""),
            startedAt: String(row.startedAt || ""),
            finishedAt: String(row.finishedAt || ""),
        };
    });
}
