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
exports.ServerQueueHost = void 0;
const node_crypto_1 = require("node:crypto");
const vscode = __importStar(require("vscode"));
const ServerQueueDispatch_1 = require("../features/ServerQueueDispatch");
const ManualDispatchHost_1 = require("./ManualDispatchHost");
const GpuQuotaScheduling_1 = require("../features/GpuQuotaScheduling");
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
/** An explicit button freezes remaining jobs; no PLAN-wide persistent prequeue switch. */
class ServerQueueHost {
    h;
    root;
    constructor(h, root) {
        this.h = h;
        this.root = root;
    }
    async dispatch(params, fromUi = false) {
        const h = this.h, context = h.captureProjectContext(), epoch = h.distributedPlanStopEpoch;
        if (!fromUi && params.confirm !== true)
            throw Error("CONFIRM_REQUIRED：请确认剩余 job 按逐卡配额进入服务器队列。");
        const ids = params.all === true ? undefined : [params.workflowId || params.planId, ...(Array.isArray(params.workflowIds) ? params.workflowIds : [])].filter(Boolean);
        if (ids && !ids.length)
            throw Error("请选择 PLAN 或明确指定全部剩余 job。");
        const targets = () => JSON.stringify([h.workerActionTargets(), h.schedulerSettings(), h.enabledWorkerConfigs().map((w) => [w.id, w.gpuJobsPerCard, w.gpuCardOverrides, w.gpuMaxConcurrentCards])]);
        const binding = targets(), key = this.root + "\0server-queue", reserved = [];
        const current = () => { if (!h.projectContextIsCurrent(context) || context.root !== this.root || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath !== this.root || targets() !== binding || h.distributedPlanStopEpoch !== epoch)
            throw Error("项目、GPU 配额或连接已变化，未继续派发服务器队列。"); };
        if (h.manualDispatchInFlight.size || h.manualDispatchReviewKeys?.size)
            throw Error("已有手动派发或产物审核正在处理，请等待本批结果。");
        h.manualDispatchInFlight.add(key);
        const batchId = (0, node_crypto_1.randomUUID)();
        let reservedOnDisk = false;
        const reservationMatches = (plan, job, item) => plan && job && job.status === "pending" && !job.commandId
            && JSON.stringify([plan.id, plan.projectId, plan.revision, plan.codeFingerprint, job.index, job.outputDir, job.collectionResultCsv]) === item.identity
            && job.manualDispatch?.stage === "preparing" && job.manualDispatch?.batchId === batchId;
        try {
            if (h.distributedQueueTickPromise)
                await h.distributedQueueTickPromise;
            current();
            h.assertExecutionWorkersReady();
            h.assertExecutionAgentProjectsReady({ options: { workers: h.workerActionTargets() } });
            const queue = await h.loadDistributedQueue(this.root);
            current();
            if (ids && ids.some((id) => !queue.plans.some((plan) => plan.id === id)))
                throw Error("所选 PLAN 已变化，整批未派发。");
            const selected = queue.plans.filter((plan) => !ids || ids.includes(plan.id)).flatMap((plan) => (0, ServerQueueDispatch_1.remainingQueueJobs)(plan).map(job => ({ plan, job })));
            if (!selected.length)
                return { status: "completed", message: "没有尚未派发的剩余 job；已在运行或服务器排队的任务保持原状。" };
            const gpu = await h.client.getGpu({ userInitiated: true });
            current();
            const workers = h.enabledWorkerConfigs();
            if (workers.some((w) => h.lastWorkerProbes?.[w.id]?.capabilities?.endpoints?.manualDispatch !== 1 || h.lastWorkerProbes?.[w.id]?.capabilities?.endpoints?.gpuQuotaScheduling !== 1))
                throw Error("Worker 未支持逐卡手动排队协议，未派发。");
            for (const worker of workers) {
                const policy = (0, GpuQuotaScheduling_1.quotaSettings)(h.schedulerSettings(), worker, gpu?.[worker.id] || []), capabilities = h.lastWorkerProbes?.[worker.id]?.capabilities?.endpoints;
                if (policy.gpuCardOverrides && capabilities?.gpuCardQuotaScheduling !== 1 || policy.gpuMaxConcurrentCards !== undefined && capabilities?.gpuCardLimitScheduling !== 1)
                    throw Error("Worker 未支持当前逐卡配额或占卡上限协议，整批未派发。");
            }
            const cards = (0, ServerQueueDispatch_1.serverQueueCards)(h.schedulerSettings(), workers, gpu);
            let distribution = (0, ServerQueueDispatch_1.quotaQueuePlacements)(selected.length, cards);
            const identity = (plan, job) => JSON.stringify([plan.id, plan.projectId, plan.revision, plan.codeFingerprint, job.index, job.outputDir, job.collectionResultCsv]);
            selected.forEach((item, index) => reserved.push({ ...item, identity: identity(item.plan, item.job), placement: distribution.placements[index] }));
            // Persist only this batch's job reservations before a human review can
            // release the global gate. Other jobs remain eligible for normal scheduling.
            await h.saveDistributedQueue(this.root, undefined, { controlMutation: true, mutateLatest: (latest) => {
                    current();
                    for (const item of reserved) {
                        const plan = latest.plans.find((p) => p.id === item.plan.id), job = plan?.jobs.find((j) => j.index === item.job.index);
                        if (!job || identity(plan, job) !== item.identity || !(0, ServerQueueDispatch_1.remainingQueueJobs)(plan).includes(job))
                            throw Error("排队批次已变化，未预约任务。");
                    }
                    for (const item of reserved) {
                        const job = latest.plans.find((p) => p.id === item.plan.id).jobs.find((j) => j.index === item.job.index);
                        job.manualDispatch = { ...item.placement, stage: "preparing", origin: "server_queue", batchId };
                    }
                    return { ...latest };
                } });
            reservedOnDisk = true;
            const ports = new ManualDispatchHost_1.ManualDispatchHost(h, this.root).ports(), approved = new Set(), blocked = new Map();
            for (const planId of new Set(reserved.map(item => item.plan.id))) {
                current();
                const plan = reserved.find(item => item.plan.id === planId).plan;
                const jobs = reserved.filter(item => item.plan.id === planId).map(item => ({ ...item.job,
                    manualDispatch: { ...item.placement, stage: "preparing", origin: "server_queue", batchId } })), input = { ...plan, jobs };
                // Review may retain some jobs. Verify every eligible destination before
                // recomputing the exact quota split for the approved subset.
                const prepareInput = { ...input, jobs: [...jobs, ...cards.map(card => ({ ...jobs[0], manualDispatch: { ...card, stage: "preparing" } }))] };
                await ports.prepare(prepareInput);
                current();
                const reviewed = await ports.review(input, jobs);
                current();
                if (reviewed === false)
                    throw Error("已取消产物审核；本批剩余 job 未派发。");
                const decisions = new Map();
                if (reviewed && typeof reviewed === "object" && !Array.isArray(reviewed))
                    for (const row of reviewed.blocked || [])
                        if (Number.isInteger(Number(row?.index)))
                            decisions.set(Number(row.index), row);
                const accepted = Array.isArray(reviewed) ? reviewed : reviewed && typeof reviewed === "object" ? reviewed.accepted || [] : jobs.map(job => job.index);
                for (const job of jobs) {
                    const id = identity(plan, job), decision = decisions.get(job.index);
                    if (decision)
                        blocked.set(id, decision);
                    else if (accepted.includes(job.index))
                        approved.add(id);
                }
            }
            distribution = (0, ServerQueueDispatch_1.quotaQueuePlacements)(approved.size, cards);
            let placementIndex = 0;
            for (const item of reserved)
                if (approved.has(item.identity))
                    item.placement = distribution.placements[placementIndex++];
            await h.saveDistributedQueue(this.root, undefined, { controlMutation: true, mutateLatest: (latest) => {
                    current();
                    for (const item of reserved) {
                        const plan = latest.plans.find((p) => p.id === item.plan.id), job = plan?.jobs.find((j) => j.index === item.job.index);
                        if (!reservationMatches(plan, job, item) || job.stopIntent || job.outputIsolationBlocked)
                            throw Error("排队批次已变化，未提交新任务。");
                    }
                    for (const item of reserved) {
                        const plan = latest.plans.find((p) => p.id === item.plan.id), job = plan.jobs.find((j) => j.index === item.job.index);
                        if (approved.has(item.identity)) {
                            job.nextCommandId = (0, node_crypto_1.randomUUID)().replaceAll("-", "");
                            job.manualDispatch = { ...item.placement, stage: "ready", origin: "server_queue", batchId };
                            job.localQueueOnly = true;
                        }
                        else if (blocked.has(item.identity)) {
                            const decision = blocked.get(item.identity);
                            Object.assign(job, { manualDispatch: undefined, nextCommandId: undefined, manualDispatchNotice: undefined, retainExistingOutputs: undefined,
                                outputIsolationBlocked: { reason: String(decision.reason || "隔离结果未核实"),
                                    stage: ["preview", "execute", "verify"].includes(decision.stage) ? decision.stage : "execute",
                                    ...(decision.code ? { code: String(decision.code) } : {}), ...(decision.operationId ? { operationId: String(decision.operationId) } : {}),
                                    ...(Array.isArray(decision.codes) ? { codes: decision.codes.map(String) } : {}), ...(typeof decision.busyOnly === "boolean" ? { busyOnly: decision.busyOnly } : {}),
                                    declarationKey: job.outputDir, observedAt: new Date().toISOString() } });
                            job.blockReason = (0, DistributedPlanQueue_1.outputIsolationNotice)(job);
                        }
                        else
                            Object.assign(job, { manualDispatch: undefined, retainExistingOutputs: true, status: "cancelled", manualDispatchNotice: "保留已有产物，本次未派发。" });
                    }
                    return { ...latest };
                } });
            if (!approved.size)
                return { status: blocked.size ? "blocked" : "completed", blocked: blocked.size, retained: reserved.length - blocked.size, message: blocked.size ? "产物隔离尚未核实，受阻 job 保留等待；本批未派发。" : "已保留已有产物；本批未派发。", allocations: distribution.allocations };
            await ports.tick();
            return { status: "submitted", message: `已按逐卡 job 配额将 ${approved.size} 个剩余 job 派入服务器队列；比例 ` + distribution.allocations.map(card => `${card.workerId}/GPU ${card.gpuId}=${card.weight}（本批 ${card.count}）`).join("、"), allocations: distribution.allocations };
        }
        finally {
            try {
                if (reservedOnDisk)
                    await h.saveDistributedQueue(this.root, undefined, { controlMutation: true, mutateLatest: (latest) => {
                            let changed = false;
                            for (const item of reserved) {
                                const plan = latest.plans.find((p) => p.id === item.plan.id), job = plan?.jobs.find((j) => j.index === item.job.index);
                                if (job?.manualDispatch?.stage === "preparing" && job.manualDispatch.batchId === batchId) {
                                    job.manualDispatch = reservationMatches(plan, job, item) ? item.job.manualDispatch : undefined;
                                    changed = true;
                                }
                            }
                            return changed ? { ...latest } : latest;
                        } });
            }
            finally {
                h.manualDispatchInFlight.delete(key);
                h.postState();
                if (h.projectContextIsCurrent(context))
                    void h.tickDistributedQueue().catch(() => { });
            }
        }
    }
}
exports.ServerQueueHost = ServerQueueHost;
