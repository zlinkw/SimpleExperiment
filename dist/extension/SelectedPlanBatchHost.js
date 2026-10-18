"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSelectedPlans = runSelectedPlans;
exports.runAllPlans = runAllPlans;
const node_crypto_1 = require("node:crypto");
const PlanCleanup_1 = require("../features/PlanCleanup");
const PlanSubmissionBatch_1 = require("../features/PlanSubmissionBatch");
const running = new WeakSet();
/** A disposable batch of explicit inputs; every item uses the ordinary run flow. */
async function runSelectedPlans(host, params) {
    if (!Array.isArray(params.planFiles) || !params.planFiles.length)
        throw Error("请先勾选需要运行的 PLAN；未运行全部计划。");
    return runPlanBatch(host, params, false);
}
/** Snapshot all current PLANs inside the same lock as explicit selections. */
async function runAllPlans(host, params = {}) {
    return runPlanBatch(host, params, true);
}
async function runPlanBatch(host, params, allPlans) {
    const canonicalFiles = (files) => [...new Set(files.map((file) => {
            if (typeof file !== "string")
                throw Error("PLAN 路径必须是字符串。");
            return (0, PlanCleanup_1.cleanupRelative)(file);
        }))];
    const selectedFiles = allPlans ? [] : canonicalFiles(params.planFiles);
    const label = allPlans ? "全部 PLAN" : "所选 PLAN";
    if (running.has(host))
        throw Error("已有一批 PLAN 正在确认或提交，请等待本批结果。");
    const context = host.captureProjectContext();
    const targetKey = () => JSON.stringify([host.effectiveConnectionMode?.(), (host.workerActionTargets?.() || []).map((row) => [row.id, row.host, row.port, row.user, row.project_dir, row.local_agent_url, row.agent_runtime_dir, row.conda_env])]);
    const targets = targetKey();
    running.add(host);
    const current = () => {
        if (!host.projectContextIsCurrent(context) || targetKey() !== targets)
            throw Error("工作区或连接已变化；后续 PLAN 未提交。");
    };
    const rows = [];
    let batch;
    try {
        current();
        await host.refreshLocalPlanMetadataForAction(undefined, { allPlans: true });
        current();
        const known = new Set(canonicalFiles((host.localPlanMetadata.plans || []).map((plan) => plan.planFile || plan.file)));
        const files = allPlans ? [...known] : selectedFiles;
        if (!files.length)
            throw Error("没有可运行的计划文件。");
        const missing = files.filter(file => !known.has(file));
        if (missing.length)
            throw Error("所选 PLAN 已不在当前工作区扫描结果中；整批未提交：" + missing.join("、"));
        const unsupported = files.filter(file => !host.distributedPlanEligible(file));
        if (unsupported.length)
            throw Error("以下 PLAN 不支持自动排队；整批未提交，请检查运行协议与项目配置：" + unsupported.join("、"));
        batch = new PlanSubmissionBatch_1.PlanSubmissionBatch(host, context, host.localPlanMetadata.plans, current, text => host.postUiCommandStatus?.(params.clientActionId, "running", "runAllPlans", text));
        await batch.start();
        const submit = async (planFile, index) => {
            const message = { command: "runPlan", planFile, planId: planFile, selectedPlanId: planFile,
                debugMode: false, clientActionId: "selected-plan-" + (0, node_crypto_1.randomUUID)() };
            batch.bind(message);
            const operationId = host.planSubmissionOperationId(message);
            let status = "unknown", detail = "";
            try {
                current();
                host.postUiCommandStatus?.(params.clientActionId, "running", "runAllPlans", `${label} 并发提交 ${index + 1}/${files.length}：${planFile}`);
                await host.runActionCommand("runPlan", message);
                current();
                const progress = host.localOperations?.[operationId];
                status = String(progress?.status || "unknown");
                detail = String(progress?.message || "未取得本次提交流程的明确结果；请查询原操作，未重复提交。");
            }
            catch (error) {
                const progress = host.localOperations?.[operationId];
                const code = error?.apiData?.code || error?.code;
                status = progress?.status === "cancelled" || ["REPLACEMENT_CANCELLED", "USER_CANCELLED"].includes(code) || error?.name === "UiCommandCancelled" ? "cancelled"
                    : code === "REMOTE_OUTCOME_UNKNOWN" || error?.outcomeUnknown ? "unknown" : "failed";
                detail = error instanceof Error ? error.message : String(error);
                if (status !== "unknown" && host.projectContextIsCurrent(context) && targetKey() === targets)
                    host.finishPlanSubmissionProgress?.(message, status, detail);
            }
            return { planFile, operationId, status, message: detail };
        };
        let dispatchNote = "";
        for (let offset = 0; offset < files.length; offset += 4) {
            current();
            const wave = await Promise.all(files.slice(offset, offset + 4).map((file, index) => submit(file, offset + index).catch(error => ({ planFile: file, operationId: "", status: "failed", message: error instanceof Error ? error.message : String(error) }))));
            rows.push(...wave);
            if (wave.some(row => ["succeeded", "queued", "submitted"].includes(row.status)) && host.tickDistributedQueue) {
                try {
                    current();
                    await host.tickDistributedQueue();
                }
                catch (error) {
                    dispatchNote = "队列已保留，本轮派发查询未完成：" + (error instanceof Error ? error.message : String(error));
                }
            }
            if (wave.some(row => !["succeeded", "queued", "submitted"].includes(row.status)))
                break;
        }
        const processed = rows.filter(row => ["succeeded", "queued", "submitted"].includes(row.status)).length;
        const last = rows.find(row => !["succeeded", "queued", "submitted"].includes(row.status)), complete = processed === files.length;
        return { status: complete ? "completed" : last?.status === "cancelled" ? "cancelled" : "failed",
            message: `${label} 已完成并发排队提交流程 ${processed}/${files.length}。` + (complete ? "运行状态以任务卡片的实时查询为准。"
                : `${last?.planFile || ""}：${last?.message || "结果未知"}；已发起项已等待本轮结果，后续 ${files.length - rows.length} 个未提交，已处理项保留，不自动回滚或重复提交。`) + dispatchNote,
            selectionOnly: !allPlans, rows, remaining: files.slice(rows.length) };
    }
    finally {
        await batch?.close();
        running.delete(host);
    }
}
