"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerTaskQueries = workerTaskQueries;
exports.assertLaunchObservations = assertLaunchObservations;
const PulledTaskControl_1 = require("./PulledTaskControl");
const LatestJobArtifacts_1 = require("./LatestJobArtifacts");
const VerifiedCompletion_1 = require("./VerifiedCompletion");
/** History remains display-only. Never invent identities for a current query. */
function workerTaskQueries(queue, workerId, options = {}) {
    const queries = new Map();
    const latest = new Set((0, LatestJobArtifacts_1.newestJobOutputs)(queue).map(row => row.plan.id + "\0" + row.job.index));
    for (const plan of queue.plans || [])
        for (const job of plan.jobs || []) {
            // A solidified exit-0 completion must not keep receiving automatic progress,
            // log or artifact rechecks. Only fresh counter-evidence (manual exact checks
            // or real corruption reports) may re-open observation of that exact identity.
            if (options.excludeVerifiedCompleted && job.status === "completed" && (0, VerifiedCompletion_1.hasVerifiedCompletion)(plan, job))
                continue;
            if (job.workerId !== workerId || !["dispatching", "queued", "running", "unknown"].includes(job.status)
                && !(job.lifecycleProtocol === 2 && ["completed", "failed"].includes(job.status) && latest.has(plan.id + "\0" + job.index)))
                continue;
            if (![plan.projectId, job.workerId, job.commandId, job.outputDir].every(value => typeof value === "string" && value.trim()))
                continue;
            const query = (0, PulledTaskControl_1.taskQuery)(plan, job);
            queries.set(query.projectId + "\0" + query.commandId, query);
        }
    return [...queries.values()];
}
function assertLaunchObservations(snapshots, jobs) {
    const overlap = (a, b) => a && b && (a === b || a.startsWith(b + "/") || b.startsWith(a + "/"));
    for (const snapshot of snapshots) {
        if (snapshot.error || snapshot.executionOnly || snapshot.controlIncomplete || snapshot.queryComplete !== true || snapshot.capabilities?.taskLifecycle !== 2) {
            const reason = snapshot.error || (snapshot.capabilities?.taskLifecycle !== 2 ? "TASK_LIFECYCLE_PROTOCOL_REQUIRED" : "TASK_QUERY_INCOMPLETE");
            throw Object.assign(new Error("Worker " + snapshot.workerId + " · 当前任务检查：" + reason + "；尚未提交，可重试失败步骤。"), { retryableSubmission: true, workerId: snapshot.workerId, stage: "checking_workers", cause: snapshot.error });
        }
        for (const executor of snapshot.cleanupExecutors || [])
            if (jobs.some(job => [job.output_dir, job.result_csv].some(target => [executor.relativePath, executor.destination].some(active => overlap(target, active)))))
                throw new Error("ACTIVE_CLEANUP_WINDOW：" + snapshot.workerId + " " + executor.windowId + "；实际清理仍在执行，未启动重跑。");
        for (const task of snapshot.tasks || [])
            if (task.observation?.tmux && !task.observation.tmux.dead && jobs.some(job => [job.output_dir, job.result_csv].some(target => [task.outputDir, task.collectionResultCsv].some(active => overlap(target, active)))))
                throw new Error("ACTIVE_TMUX_TASK：" + snapshot.workerId + " " + task.tmuxWindowId + "；请先中止对应窗口，未重复提交。");
    }
}
