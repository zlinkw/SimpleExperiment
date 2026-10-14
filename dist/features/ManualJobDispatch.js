"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchManualJobs = dispatchManualJobs;
exports.dispatchReadyManualJobs = dispatchReadyManualJobs;
/** One placement intent; transport responses never prove acceptance or permit a second launch. */
async function dispatchManualJobs(ports, request) {
    ports.assertCurrent();
    const indices = [...new Set(request.indices)];
    if (!indices.length || indices.some(index => !Number.isInteger(index) || index < 0) || !request.workerId || !String(request.gpuId).trim())
        throw new Error("请选择任务、服务器和 GPU。");
    let queue = await ports.load();
    const plan = queue.plans.find(row => row.id === request.workflowId);
    if (!plan || plan.resultPathPolicy !== "declared")
        throw new Error("当前正式 PLAN 不存在；历史任务只供查看。");
    const jobs = indices.map(index => plan.jobs.find(row => row.index === index));
    if (jobs.some(job => !job || job.status === "completed"))
        throw new Error("请选择尚未完成的任务；已完成任务请使用重跑入口。");
    const selected = jobs;
    if (ports.online(request.workerId) && !ports.supports(request.workerId))
        throw new Error("目标 Worker 尚不支持手动派发，请更新其 Agent/Scheduler。");
    if (!ports.online(request.workerId) && selected.every(job => job.status === "pending" && !job.commandId)) {
        for (const job of selected) {
            job.manualDispatch = undefined;
            job.manualDispatchNotice = "目标服务器未连接，已回到自动派发队列。";
        }
        await ports.save(queue);
        return { status: "submitted", fallbackToAutomatic: true, indices };
    }
    const identities = new Map(selected.map(job => [job.index, job.commandId || ""]));
    for (const job of selected) {
        if (request.expectedCommands && request.expectedCommands[job.index] !== (job.commandId || ""))
            throw new Error("任务已变化，请刷新后重新选择；未重复派发。");
        if (job.status === "dispatching" || job.status === "unknown" && job.commandId && !["missing", "failed", "exited"].includes(job.executionState || ""))
            throw new Error("原请求接收情况尚未核实；请刷新原任务，不能另行派发。");
        if (["running", "queued"].includes(job.status) && !request.stopRunning)
            throw new Error("请使用“停止后派发”撤出原任务。");
    }
    for (const job of selected)
        job.manualDispatch = { workerId: request.workerId, gpuId: String(request.gpuId), stage: "preparing" };
    await ports.save(queue); // Reserve before sync/stop: automatic allocation must skip this batch.
    let committed = false;
    try {
        if (ports.online(request.workerId))
            await ports.prepare(plan);
        for (const job of selected)
            if (job.commandId && job.workerId) {
                ports.assertCurrent();
                await ports.stop(plan, job);
                job.status = "cancelled";
                job.executionState = "missing";
            }
        ports.assertCurrent();
        await ports.save(queue);
        if (!await ports.review(plan, selected))
            return { status: "cancelled", message: "文件审核已取消，未启动本批任务。" };
        const online = ports.online(request.workerId);
        if (online) {
            if (!ports.supports(request.workerId))
                throw new Error("目标 Worker 尚不支持手动派发，请更新其 Agent/Scheduler。");
        }
        ports.assertCurrent();
        const latest = await ports.load(), current = latest.plans.find(row => row.id === plan.id);
        if (!current || current.revision !== plan.revision)
            throw new Error("PLAN 已变化，未派发。");
        for (const original of selected) {
            const job = current.jobs.find(row => row.index === original.index);
            if (!job || (job.commandId || "") !== identities.get(job.index))
                throw new Error("任务已变化，未派发。");
            job.history = [...(job.history || []), ...(job.commandId ? [{ attempt: 0, status: job.status, commandId: job.commandId,
                        workerId: job.workerId, outputDir: job.outputDir, stopReason: "manual-dispatch" }] : [])];
            Object.assign(job, { nextCommandId: ports.newCommandId(), commandId: undefined, workerId: undefined, gpuId: undefined,
                runKey: undefined, status: "pending", lifecycleProtocol: 2, actualExecutionMode: current.executionMode,
                executionState: undefined, resultState: undefined, finishedAt: undefined, error: undefined,
                stopIntent: undefined, automaticRetry: undefined, recallRequested: undefined, reassignmentPending: undefined,
                unavailable: undefined, cleanup: undefined, outputRetiredAt: undefined, trainingRecovery: undefined,
                trustedTerminalStatus: undefined, admissionRejection: undefined, formalConflictEvidence: undefined, originalExecution: undefined,
                statusQueryError: undefined, lastObservedAt: undefined, tmuxWindowId: undefined, tmuxPane: undefined, tmuxSession: undefined,
                artifacts: undefined, artifactError: undefined, artifactRetryAfter: undefined, mirroredWorkerIds: undefined, fragmentWorkerIds: undefined,
                manualDispatchNotice: online ? undefined : "目标服务器未连接，已回到自动派发队列。",
                checkpointTestOnly: undefined, localQueueOnly: true, blockReason: online ? undefined : "目标服务器未连接，已回到自动派发队列。",
                manualDispatch: online ? { workerId: request.workerId, gpuId: String(request.gpuId), stage: "ready" } : undefined });
        }
        await ports.save(latest);
        committed = true;
        // A later disconnect before sending can still fall back. Once marked sent it can only be queried.
        await ports.tick();
        return { status: "submitted", fallbackToAutomatic: !online, indices };
    }
    finally {
        if (!committed) {
            const latest = await ports.load();
            for (const p of latest.plans)
                if (p.id === plan.id)
                    for (const job of p.jobs)
                        if (identities.get(job.index) === (job.commandId || "") && job.manualDispatch?.stage === "preparing")
                            job.manualDispatch = undefined;
            await ports.save(latest);
        }
    }
}
async function dispatchReadyManualJobs(ports) {
    const queue = await ports.load();
    for (const plan of queue.plans)
        for (const job of plan.jobs) {
            if (job.manualDispatch?.stage !== "ready" || job.commandId || job.status !== "pending")
                continue;
            ports.assertCurrent();
            const placement = job.manualDispatch;
            if (!ports.online(placement.workerId)) {
                job.manualDispatch = undefined;
                job.manualDispatchNotice = job.blockReason = "目标服务器未连接，已回到自动派发队列。";
                await ports.save(queue);
                continue;
            }
            if (!ports.supports(placement.workerId)) {
                job.manualDispatchNotice = job.blockReason = "请更新目标 Worker 的 Agent/Scheduler 后继续手动派发。";
                await ports.save(queue);
                continue;
            }
            Object.assign(job, { workerId: placement.workerId, gpuId: placement.gpuId, commandId: job.nextCommandId || ports.newCommandId(),
                status: "dispatching", manualDispatch: { ...placement, stage: "sent" } });
            job.runKey = job.commandId;
            job.nextCommandId = undefined;
            await ports.save(queue); // Persist exact identity before the one and only POST.
            try {
                await ports.send(plan, job);
            }
            catch (error) {
                job.blockReason = "派发请求状态待查询：" + String(error.message || error);
            }
            await ports.save(queue);
        }
}
