"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeRuntimeLog = analyzeRuntimeLog;
const node_crypto_1 = require("node:crypto");
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
const RuntimeDiagnostics_1 = require("../features/RuntimeDiagnostics");
/** Explicit, read-only historical analysis. Nothing is written back to task history. */
async function analyzeRuntimeLog(h, root, params, signal) {
    signal = signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
    const context = h.captureProjectContext();
    const queue = await h.loadDistributedQueue(root);
    const job = queue.plans.flatMap((plan) => plan.jobs.map((job) => ({ ...job, workflowId: plan.id })))
        .find((job) => params.commandId ? job.commandId === params.commandId
        : job.workflowId === (params.workflowId || params.planId) && job.index === Number(params.index ?? params.jobIndex));
    const workerId = String(params.workerId || job?.workerId || ""), commandId = String(params.commandId || job?.commandId || "");
    const outputDir = String(params.outputDir || params.artifactPath || job?.outputDir || "");
    if (!commandId || !outputDir || !h.workerCodeSyncTargets().some((row) => row.id === workerId))
        throw Error("请选择已启用 Worker 的原 commandId 和声明输出目录。");
    if (job && (job.workerId !== workerId || job.outputDir !== outputDir))
        throw Error("任务目标与原执行身份不符。");
    const query = { commandId, projectId: (0, DistributedPlanQueue_1.canonicalProjectId)(root), workerId, outputDir,
        collectionResultCsv: job?.collectionResultCsv, executionMode: job?.executionMode, runtimeLogAnalysisId: (0, node_crypto_1.randomUUID)() };
    let task;
    for (let pass = 0; pass < 32; pass++) {
        signal?.throwIfAborted();
        if (!h.projectContextIsCurrent(context))
            throw Error("工作区已变化，已停止本轮日志分析。");
        const response = await h.client.getWorkerTasks(workerId, { queries: [query], signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000) });
        if (response.queryComplete !== true || response.capabilities?.runtimeDiagnostics !== 1)
            throw Error("请更新该 Worker 的 Agent/Scheduler：需要 runtimeDiagnostics=1；未改写历史。");
        task = response.tasks?.find((row) => row.commandId === commandId && row.projectId === query.projectId && row.workerId === workerId);
        if (!task || task.observation?.queryError)
            throw Error(task?.observation?.queryError || "未取得原任务的主动查询结果");
        const evidence = (0, RuntimeDiagnostics_1.runtimeEvidence)(task.runtimeDiagnostics, commandId);
        if (evidence.scanComplete || evidence.bytesRead == null || evidence.totalBytes == null || evidence.bytesRead >= evidence.totalBytes)
            break;
    }
    await h.readWorkerTaskSnapshot?.(workerId, { fresh: true, signal });
    h.postState?.();
    return { commandId, workerId, executionState: task.executionState, resultState: task.resultState, exitCode: task.exitCode,
        completionState: (0, RuntimeDiagnostics_1.completionState)(task.runtimeDiagnostics, commandId), runtimeDiagnostics: (0, RuntimeDiagnostics_1.runtimeEvidence)(task.runtimeDiagnostics, commandId),
        readOnly: true, historyRewritten: false };
}
