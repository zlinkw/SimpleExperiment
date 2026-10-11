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
    const context = host.captureProjectContext();
    const queue = await host.loadDistributedQueue(context.root);
    const plan = queue.plans.find(p => p.id === String(message.planId || ""));
    if (!plan || !host.projectContextIsCurrent(context))
        throw new Error("Plan context changed.");
    if (plan.resultPathPolicy === "declared")
        return host.retryDistributedJobFromUi(message);
    throw new Error("HISTORICAL_ATTEMPT_READ_ONLY: old attempts cannot be requeued or moved automatically.");
}
/** Legacy signals remain available to the independent, explicitly confirmed cleanup workflow. */
async function processFailedAttemptRecoveries(host, root, makeId, now = Date.now()) {
    return { status: "manual_review_required", automaticExecution: false };
}
