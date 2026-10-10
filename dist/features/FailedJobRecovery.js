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
exports.recoveryServerIdentity = recoveryServerIdentity;
exports.failedAttemptPaths = failedAttemptPaths;
exports.recallFailedJob = recallFailedJob;
exports.recallFailedJobFromUi = recallFailedJobFromUi;
exports.processFailedAttemptRecoveries = processFailedAttemptRecoveries;
const path = __importStar(require("node:path"));
const Queue = __importStar(require("./DistributedPlanQueue"));
function recoveryServerIdentity(server) {
    if (!server || !String(server.host || "").trim() || !String(server.user || "").trim()
        || !Number.isInteger(Number(server.port)) || Number(server.port) < 1 || Number(server.port) > 65535)
        throw new Error("原 Worker 的服务器身份不完整，未召回或移动。");
    return JSON.stringify([server.host, server.user, Number(server.port), String(server.remotePath || "").replace(/\/+$/, "")]);
}
function failedAttemptPaths(remoteRoot, outputDir) {
    const root = String(remoteRoot || "").replace(/\/+$/, "");
    const parts = String(outputDir || "").split("/");
    if (!root.startsWith("/") || root === "/" || path.posix.normalize(root) !== root
        || root.split("/").some(part => part === "..") || parts.length < 4 || parts.at(-2) !== "attempts"
        || !(parts[0] === "work_dirs" || parts[0] === "experiments" && parts[1] === "runs")
        || parts.some(part => !/^[A-Za-z0-9_.-]+$/.test(part) || [".", "..", ".git", "clean_dir", "simple_cluster", ".runtime"].includes(part)))
        throw new Error("失败 attempt 的精确路径无效，未召回。");
    return { remoteRoot: root, absolutePath: root + "/" + outputDir, destination: root + "/clean_dir/" + outputDir };
}
const jobIdentity = (plan, job) => JSON.stringify([plan.id, plan.projectId, plan.planFile, plan.revision, plan.codeFingerprint,
    job.index, job.case, job.seed, job.attempt, job.workerId, job.commandId, job.outputDir]);
/** One local transaction creates the new attempt and persists the separately owned remote obligation. */
function recallFailedJob(queue, planId, jobIndex, expectedIdentity, attemptId, recoveryId, server, authorizedAt) {
    const plan = queue.plans.find(p => p.id === planId), job = plan?.jobs.find(j => j.index === jobIndex);
    if (!plan || !job || jobIdentity(plan, job) !== expectedIdentity || job.status !== "failed"
        || !job.workerId || !job.commandId || !plan.projectId || job.recoveryConflict || plan.recoveryConflict
        || plan.executionModeBlocked || !["train", "test", "train_test"].includes(plan.executionMode || ""))
        throw new Error("job 身份、状态或原 Plan 模式已变化，未召回。");
    const paths = failedAttemptPaths(server.remotePath, job.outputDir);
    const next = Queue.retryVerifiedJob(queue, planId, jobIndex, attemptId);
    const target = next.plans.find(p => p.id === planId).jobs.find(j => j.index === jobIndex);
    Object.assign(target, { projectId: job.projectId || plan.projectId, localQueueOnly: true });
    const obligation = { id: recoveryId,
        plan: { id: plan.id, projectId: plan.projectId, planFile: plan.planFile, revision: plan.revision,
            codeFingerprint: plan.codeFingerprint, planJobCount: plan.planJobCount },
        job: { index: job.index, case: job.case, seed: job.seed, attempt: job.attempt, outputDir: job.outputDir,
            workerId: job.workerId, commandId: job.commandId, runKey: job.runKey || job.commandId, gpuId: job.gpuId },
        ...paths, serverIdentity: recoveryServerIdentity(server), authorizedAt, status: "pending" };
    return { ...next, failedAttemptRecoveries: [...(queue.failedAttemptRecoveries || []), obligation] };
}
async function recallFailedJobFromUi(host, message, confirm, makeId) {
    const context = host.captureProjectContext(), client = host.client;
    const current = () => host.projectContextIsCurrent(context) && host.client === client;
    const queue = await host.loadDistributedQueue(context.root);
    const plan = queue.plans.find(p => p.id === String(message.planId || ""));
    const job = plan?.jobs.find(j => j.index === Number(message.jobIndex));
    if (!plan || !job || !Queue.sameDistributedPlanFile(plan.planFile, String(message.planFile || ""))
        || plan.projectId !== Queue.canonicalProjectId(context.root)
        || host.distributedPlanStopEpoch || job.status !== "failed" || job.attempt !== Number(message.attempt) || job.commandId !== message.commandId)
        throw new Error("目标失败 job 已变化，请刷新后重试。");
    const source = host.workerCodeSyncTargets().find((target) => target.id === job.workerId);
    if (!source)
        throw new Error("原 Worker 配置缺失，未召回。");
    const server = host.sftpServerOptions(source), identity = jobIdentity(plan, job);
    const paths = failedAttemptPaths(server.remotePath, job.outputDir);
    if (!await confirm(`${plan.planFile} · ${job.case} seed ${job.seed} · attempt ${job.attempt}\n` +
        `只将这个失败 job 建立新 attempt，放回本机队列。\n原 Worker：${job.workerId} · ${server.user}@${server.host}:${server.port}\n` +
        `安全根：${paths.remoteRoot}\n原目录：${paths.absolutePath}\n恢复后移入：${paths.destination}\n` +
        "旧任务停止和身份核验通过后静默移动并记录清单；完整保留内容，不永久删除。"))
        return { status: "cancelled", message: "已取消召回。" };
    if (!current())
        return { status: "cancelled", message: "项目已切换，未召回。" };
    const latestSource = host.workerCodeSyncTargets().find((target) => target.id === job.workerId);
    if (!latestSource || recoveryServerIdentity(host.sftpServerOptions(latestSource)) !== recoveryServerIdentity(server))
        throw new Error("原 Worker 配置已变化，未召回。");
    const attemptId = makeId("attempt"), recoveryId = makeId("failed-recovery");
    const generation = host.distributedQueueGeneration = (host.distributedQueueGeneration || 0) + 1;
    host.distributedTickAbort?.abort();
    host.detachStaleDistributedTick(host.distributedQueueTickPromise);
    await host.saveDistributedQueue(context.root, undefined, { queueGeneration: generation, mutateLatest: (latest) => {
            if (!current() || host.distributedPlanStopEpoch)
                throw new Error("项目已切换或 Plan 正在停止，未召回。");
            return recallFailedJob(latest, plan.id, job.index, identity, attemptId, recoveryId, server, new Date().toISOString());
        } });
    host.postState();
    void host.tickDistributedQueue().catch((error) => host.recordActionError({ command: "distributedPlanQueue", message: error.message }));
    return { status: "completed", message: "已召回本机队列；原 Worker 恢复后自动核验并移走失败 attempt。" };
}
const processing = new WeakSet();
class RetainedAttemptError extends Error {
}
/** Runs independently of dispatch. Offline Workers and old Agent capabilities never block a new attempt. */
async function processFailedAttemptRecoveries(host, root, makeId, now = Date.now()) {
    if (processing.has(host))
        return;
    processing.add(host);
    const context = host.captureProjectContext(), client = host.client;
    const current = () => context.root === root && host.projectContextIsCurrent(context) && host.client === client;
    try {
        const queue = await host.loadDistributedQueue(root);
        const due = (queue.failedAttemptRecoveries || []).filter(row => row.status === "pending" && (!row.retryAt || Date.parse(row.retryAt) <= now)).slice(0, 2);
        for (const row of due) {
            if (!current())
                return;
            let patch;
            try {
                const target = host.workerCodeSyncTargets().find((item) => item.id === row.job.workerId);
                if (!target || recoveryServerIdentity(host.sftpServerOptions(target)) !== row.serverIdentity)
                    throw new Error("原 Worker 的地址、用户或安全根已变化，保留旧 attempt。");
                const paths = failedAttemptPaths(row.remoteRoot, row.job.outputDir);
                if (paths.absolutePath !== row.absolutePath || paths.destination !== row.destination || !row.authorizedAt)
                    throw new Error("失败 attempt 的已授权路径不一致，保留旧目录。");
                const snapshot = await client.getWorkerTasks(row.job.workerId);
                if (!current())
                    return;
                if (snapshot?.capabilities?.failedAttemptQuarantine !== true)
                    throw new Error("等待原 Worker 恢复或更新 Agent 的失败 attempt 移动能力。");
                const matches = (snapshot.tasks || []).filter((task) => task.commandId === row.job.commandId);
                if (matches.length !== 1 || !Queue.stopIdentityMatchesJob(row.plan, row.job, matches[0]))
                    throw new Error("原 Worker 的任务身份缺失或不一致，保留旧 attempt。");
                if (matches[0].status === "completed")
                    throw new RetainedAttemptError("原 attempt 已完成，保留结果供审核。");
                if (["running", "queued", "dispatching", "pending"].includes(matches[0].status)) {
                    await host.stopDistributedJobForClear({ ...row.plan, jobs: [row.job] }, row.job);
                    if (!current())
                        return;
                }
                const request = { ...row.job, experimentIndex: row.job.index, projectId: row.plan.projectId,
                    workflowId: row.plan.id, planFile: row.plan.planFile, planRevision: row.plan.revision,
                    codeFingerprint: row.plan.codeFingerprint, runKey: row.job.runKey || row.job.commandId,
                    targetCommandId: row.job.commandId, workerId: row.job.workerId, recoveryId: row.id,
                    quarantineFailedAttempt: true, remoteRoot: row.remoteRoot, approvedAbsolutePath: row.absolutePath,
                    approvedDestination: row.destination, confirm: true, pathConfirmed: true, opId: makeId("failed-cleanup") };
                const result = await host.withRemoteActionResource(row.job.workerId, "archive-worker-artifacts", request, async () => {
                    if (!current())
                        throw new Error("项目已切换，未移动旧目录。");
                    const submitted = await client.postWorkerAction(row.job.workerId, "archive-worker-artifacts", request);
                    return ["running", "queued", "accepted", "pending"].includes(submitted?.status)
                        ? await host.waitForOperationTerminalResult("archive-worker-artifacts", submitted, "核验失败 attempt", 0, row.job.workerId, { authorityClient: client, projectContext: context }) : submitted;
                });
                if (!current())
                    return;
                const proof = result?.result || result;
                if (result?.status !== "completed" || proof?.quarantined !== true || proof.recoveryId !== row.id || proof.absolutePath !== row.absolutePath
                    || proof.destination !== row.destination || !Queue.stopIdentityMatchesJob(row.plan, row.job, proof))
                    throw new Error(proof?.message || "Worker 移动回执未通过身份核验，保留待处理记录。");
                patch = { status: "completed", receipt: proof, error: undefined, retryAt: undefined };
            }
            catch (error) {
                const tries = (row.tries || 0) + 1;
                patch = { status: error instanceof RetainedAttemptError ? "blocked" : "pending", tries,
                    error: String(error.message || error).slice(0, 400),
                    retryAt: error instanceof RetainedAttemptError ? undefined : new Date(now + Math.min(30 * 60_000, 30_000 * 2 ** Math.min(tries - 1, 6))).toISOString() };
            }
            if (!current())
                return;
            await host.saveDistributedQueue(root, undefined, { mutateLatest: (latest) => {
                    if (!current())
                        throw new Error("项目已切换，未更新旧目录回执。");
                    return { ...latest, failedAttemptRecoveries: (latest.failedAttemptRecoveries || []).map(item => item.id === row.id && item.status === "pending" ? { ...item, ...patch } : item) };
                } });
            host.postState();
        }
    }
    finally {
        processing.delete(host);
    }
}
