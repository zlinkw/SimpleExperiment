"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replacementJobGroups = replacementJobGroups;
exports.replacePlanOutputs = replacePlanOutputs;
const PlanCleanup_1 = require("./PlanCleanup");
const pathKey = (value) => String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
function replacementJobGroups(queue, planFile, jobs, projectId, stablePlanId = "") {
    return jobs.map(declaration => {
        const output = (0, PlanCleanup_1.cleanupRelative)(pathKey(declaration.output_dir)), csv = (0, PlanCleanup_1.cleanupRelative)(pathKey(declaration.result_csv));
        const matches = (queue.plans || []).filter(plan => plan.projectId === projectId && plan.resultPathPolicy === "declared"
            && (pathKey(plan.planFile).toLowerCase() === pathKey(planFile).toLowerCase() || stablePlanId && plan.stablePlanId === stablePlanId))
            .flatMap(plan => plan.jobs.filter(job => ["completed", "failed"].includes(job.status) && !job.reassignmentPending
            && job.case === declaration.case && Number(job.seed) === Number(declaration.seed)
            && pathKey(job.outputDir) === output && pathKey(job.collectionResultCsv) === csv
            && job.commandId && job.workerId && job.globalJobId === plan.id + ":" + job.index && !output.split("/").includes("attempts"))
            .map(job => ({ workflowId: plan.id, index: job.index, commandId: job.commandId, purpose: "replace_outputs" })));
        for (const plan of queue.plans || [])
            for (const job of plan.jobs || [])
                if (pathKey(job.outputDir) === output
                    && (job.cleanup?.state === "partial" || job.cleanup?.pendingNodes?.length))
                    (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_PENDING", "原清理尚未完成，请先核查操作：" + job.cleanup.operationId);
        if (!matches.length)
            (0, PlanCleanup_1.cleanupError)("OUTPUT_OWNER_UNVERIFIED", "没有当前声明对应的已停止正式 job 登记：" + output);
        return matches.reverse(); // Preference only; every candidate still needs current owner proof.
    });
}
/** One immutable batch, two user confirmations, then existing safe per-target executors. */
async function replacePlanOutputs(ports, planFile, groups) {
    const previews = [];
    for (const group of groups) {
        let selected;
        let reason = "";
        for (const job of group) {
            ports.assertCurrent();
            ports.progress?.("核对 job " + job.index + " 的精确产物及全部关联节点…");
            const candidate = await ports.service.preview({ planFile, action: "delete", verifiedOnly: false, job });
            if (candidate.scope.planHash !== ports.planRevision)
                (0, PlanCleanup_1.cleanupError)("PLAN_REVISION_CHANGED");
            const approved = candidate.rows.filter(row => row.disposition === "delete");
            const coversEveryTarget = candidate.scope.candidates.every(target => candidate.rows.some(row => row.nodeId === target.nodeId && row.relativePath === target.relativePath
                && (["delete", "absent"].includes(row.disposition) || row.disposition === "protected" && row.inode && row.fingerprint
                    && approved.some(other => other.inode === row.inode && other.device === row.device && other.fingerprint === row.fingerprint
                        && (0, PlanCleanup_1.cleanupDigest)(other.rootIdentity) === (0, PlanCleanup_1.cleanupDigest)(row.rootIdentity)))));
            if (candidate.scope.candidates.length && !candidate.blockers.length
                && coversEveryTarget && candidate.rows.every(row => !["unverified"].includes(row.disposition))) {
                selected = candidate;
                break;
            }
            reason = [...candidate.blockers.map(row => row.code + ": " + row.detail), ...candidate.rows.filter(row => ["protected", "unverified"].includes(row.disposition)).map(row => row.absolutePath + ": " + (row.protectedReason || row.error))].join("；");
        }
        if (!selected)
            (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_BLOCKED", "目标存在活动任务、共享依赖或缺少当前所有权；未删除任何产物。" + reason);
        if (selected.rows.some(row => row.disposition === "delete") && !previews.some(row => row.digest === selected.digest))
            previews.push(selected);
    }
    const exact = previews.flatMap(preview => preview.rows.filter(row => row.disposition === "delete").map(row => row.node.id + ":" + row.absolutePath));
    if (!exact.length)
        return [];
    if (new Set(exact).size !== exact.length)
        (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_OVERLAP");
    const rows = previews.flatMap(preview => preview.rows.filter(row => row.disposition === "delete"));
    const detail = "PLAN：" + planFile + "\n版本：" + ports.planRevision + "\n永久替换以下独占 job 产物（不可恢复）：\n" + rows.map(row => row.node.id + ": " + (row.node.kind === "remote" ? (row.node.user || "") + "@" + row.node.host + ":" + row.node.port : "本机")
        + "\n安全根：" + row.node.root + "\n精确目标：" + row.absolutePath + "\n类型：" + row.type + "；大小：" + row.size
        + "；指纹：" + row.fingerprint + "\n所有权证据：" + row.evidence.join("；")).join("\n\n")
        + "\nPLAN、配置、共享资产和本机汇总保留。活动任务不会自动停止。";
    await ports.review(detail);
    for (const phase of [1, 2]) {
        ports.assertCurrent();
        ports.progress?.("等待第 " + phase + " 次精确路径确认…");
        if (!await ports.confirm(detail, phase))
            (0, PlanCleanup_1.cleanupError)("REPLACEMENT_CANCELLED", "已取消覆盖；未删除产物或提交任务。");
        ports.assertCurrent();
        for (const preview of previews)
            await ports.service.confirm({ token: preview.token, digest: preview.digest, phase, confirm: true,
                exactTargets: preview.rows.filter(row => row.disposition === "delete").map(row => row.node.id + ":" + row.absolutePath) });
    }
    // All nodes/operations must pass before the first mutation.
    for (const preview of previews) {
        ports.assertCurrent();
        await ports.service.preflightConfirmed(preview.token);
    }
    const operationIds = previews.map(preview => preview.token);
    try {
        for (const id of operationIds) {
            ports.assertCurrent();
            ports.progress?.("执行已确认的精确产物替换：" + id);
            const result = await ports.execute(id);
            if (result.state !== "completed" || result.pendingNodes?.length)
                (0, PlanCleanup_1.cleanupError)("OUTPUT_REPLACEMENT_PARTIAL");
        }
    }
    catch (error) {
        throw Object.assign(new Error("覆盖未完成，未启动重跑。请在清理历史核查操作 " + operationIds.join("、") + "；" + String(error.message || error)), { apiData: { code: "OUTPUT_REPLACEMENT_PARTIAL", operationIds } });
    }
    return operationIds;
}
