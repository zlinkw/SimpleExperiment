"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareNativePlanRetry = prepareNativePlanRetry;
const Queue = __importStar(require("./DistributedPlanQueue"));
const PulledTaskControl_1 = require("./PulledTaskControl");
/** Only native windows and the original command fence can authorize another run. */
async function prepareNativePlanRetry(host, planFile, confirm, cancelled, assertWorkspace = () => { }) {
    const context = host.captureProjectContext(), client = host.client;
    let stopEpoch = 0;
    const current = () => {
        assertWorkspace();
        if (!host.projectContextIsCurrent(context) || client !== host.client)
            throw Error("工作区或连接已变化，未继续重新运行。");
        if (stopEpoch && host.distributedPlanStopEpoch !== stopEpoch)
            throw Error("停止操作已变化，未继续重新运行。");
    };
    current();
    const projectId = Queue.canonicalProjectId(context.root);
    const queue = await host.loadDistributedQueue(context.root);
    const plans = queue.plans.filter(plan => (!plan.projectId || plan.projectId === projectId) && Queue.sameDistributedPlanFile(plan.planFile, planFile));
    const deferred = (queue.deferred || []).filter(row => row.status !== "superseded" && Queue.sameDistributedPlanFile(row.planFile, planFile));
    const targets = host.workerActionTargets();
    const snapshots = await Promise.all(targets.map(async (worker) => {
        const value = await client.getWorkerTasks(worker.id, { queries: [], executionOnly: true, signal: AbortSignal.timeout(30000) })
            .catch((error) => { throw Error(`Worker ${worker.id}：当前窗口查询失败：${String(error.message || error)}；未重新运行。`); });
        if (value.queryComplete !== true || value.capabilities?.taskLifecycle !== 2 || value.error)
            throw Error(`Worker ${worker.id}：${value.error || "实时窗口查询未完成"}；未重新运行。`);
        return { ...value, workerId: worker.id };
    }));
    current();
    const controlled = new Map();
    const live = [];
    for (const snapshot of snapshots)
        for (const task of snapshot.tasks || []) {
            const observation = task.observation;
            if (task.projectId !== projectId || !Queue.sameDistributedPlanFile(task.planFile || "", planFile)
                || !observation?.tmux || observation.tmux.dead)
                continue;
            if (observation.projectId !== projectId || observation.workerId !== snapshot.workerId
                || observation.commandId !== task.commandId || !task.commandId || !task.workflowId)
                throw Error(`Worker ${snapshot.workerId} 的窗口绑定不完整，未关闭窗口或重新运行。`);
            const plan = { id: task.workflowId, projectId, planFile, jobs: [] };
            const job = { ...task, index: task.experimentIndex, workerId: snapshot.workerId, commandId: task.commandId, lifecycleProtocol: 2 };
            controlled.set(snapshot.workerId + "\0" + task.commandId, { plan, job });
            live.push({ ...task, workerId: snapshot.workerId });
        }
    const unassigned = plans.flatMap(plan => plan.jobs.filter(job => !job.workerId && !job.commandId && job.status === "pending"));
    if ((live.length || unassigned.length || deferred.length) && !await confirm(`Plan：${planFile}\n正在执行或服务器排队窗口：${live.length}；本机待派发：${unassigned.length}。\n关闭这些精确窗口并重新运行；保留全部产物。`))
        throw cancelled();
    current();
    // Old history cannot prove activity. Fence original unresolved start intents so a
    // delayed request cannot launch after this explicit new run, without a receipt gate.
    for (const plan of plans)
        for (const job of plan.jobs) {
            if (!job.workerId || !job.commandId || ["completed", "failed", "cancelled"].includes(job.status))
                continue;
            if (!targets.some((target) => target.id === job.workerId))
                throw Error(`原任务 Worker ${job.workerId} 未启用，尚不能核实原 commandId；未重新运行。`);
            const key = job.workerId + "\0" + job.commandId;
            if (!controlled.has(key))
                controlled.set(key, { plan: { ...plan, projectId: plan.projectId || projectId }, job });
        }
    if (!plans.length && !live.length && !deferred.length)
        return false;
    if (host.distributedPlanStopEpoch)
        throw Error("另一个停止操作尚未结束，请稍后重试。");
    const epoch = host.distributedPlanStopEpoch = (host.distributedQueueGeneration || 0) + 1;
    stopEpoch = epoch;
    host.distributedQueueGeneration = epoch;
    host.distributedTickAbort?.abort();
    host.detachStaleDistributedTick(host.distributedQueueTickPromise);
    const work = [...controlled.values()];
    try {
        // Bounded concurrency; no PID lookup, snapshot matching or version gate.
        let cursor = 0;
        let failure;
        const outcomes = await Promise.allSettled(Array.from({ length: Math.min(4, work.length) }, async () => {
            while (cursor < work.length) {
                if (failure)
                    return;
                const target = work[cursor++];
                current();
                try {
                    await (0, PulledTaskControl_1.stopPulledTask)(client, target.plan, target.job, "retry-stop-" + target.job.commandId);
                }
                catch (error) {
                    failure = error;
                    throw error;
                }
                current();
            }
        }));
        const rejected = outcomes.find((row) => row.status === "rejected");
        if (rejected)
            throw rejected.reason;
        const identities = new Map(plans.map(plan => [plan.id, new Set(plan.jobs.map(job => Queue.distributedJobControlKey(plan, job)))]));
        await host.saveDistributedQueue(context.root, undefined, { queueGeneration: epoch, mutateLatest: (latest) => ({ ...latest,
                plans: latest.plans.map(plan => ({ ...plan, jobs: plan.jobs.filter(job => !identities.get(plan.id)?.has(Queue.distributedJobControlKey(plan, job))) }))
                    .filter(plan => plan.jobs.length || !identities.has(plan.id)),
                deferred: (latest.deferred || []).filter(row => !deferred.some(old => old.id === row.id)),
            }) });
        current();
        host.postState();
        return true;
    }
    finally {
        if (host.distributedPlanStopEpoch === epoch)
            host.distributedPlanStopEpoch = 0;
    }
}
