"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompletedJobSyncHost = void 0;
const LatestJobArtifacts_1 = require("../features/LatestJobArtifacts");
const PulledTaskControl_1 = require("../features/PulledTaskControl");
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
const SyncResolution_1 = require("../features/SyncResolution");
const PlanArtifactSyncStatus_1 = require("../features/PlanArtifactSyncStatus");
/** Per-job completion publication reuses the file tree's newest-version merge, never the whole PLAN gate. */
class CompletedJobSyncHost {
    h;
    root;
    current;
    constructor(h, root, current) {
        this.h = h;
        this.root = root;
        this.current = current;
    }
    async run(selected, options = {}) {
        const runs = this.h.completedJobSyncRuns ||= new Map();
        const key = JSON.stringify([selected, options.verifyOnly === true, options.jobs || null]);
        const active = runs.get(this.root);
        if (active) {
            if (active.key === key || !options.force)
                return active.promise;
            await active.promise;
            if (!this.current())
                throw Error("项目或连接已变化，未继续产物操作。");
            return this.run(selected, options);
        }
        const entry = { key, promise: undefined };
        entry.promise = this.runCore(selected, options).finally(() => { if (runs.get(this.root) === entry)
            runs.delete(this.root); });
        runs.set(this.root, entry);
        return entry.promise;
    }
    async runCore(selected, options) {
        const report = { synced: 0, excluded: 0, errors: [] };
        const h = this.h, targets = h.workerCodeSyncTargets();
        if (targets.length < 2) {
            if (options.force)
                throw Error("至少需要两台已启用 Worker 核对产物同步。");
            return report;
        }
        const queue = await h.loadDistributedQueue(this.root);
        let pending = (0, LatestJobArtifacts_1.newestJobOutputs)(queue).filter(({ plan, job }) => plan.projectId === (0, DistributedPlanQueue_1.canonicalProjectId)(this.root)
            && job.lifecycleProtocol === 2 && job.status === "completed" && !job.unavailable && !!job.workerId && !!job.commandId);
        if (options.jobs) {
            if (!options.jobs.length || options.jobs.some(selection => !pending.some(({ plan, job }) => plan.id === selection.planId
                && job.index === selection.index && job.commandId === selection.commandId)))
                throw Error("所选任务未完成或身份已变化，未同步其他任务。");
            pending = pending.filter(({ plan, job }) => options.jobs.some(selection => plan.id === selection.planId
                && job.index === selection.index && job.commandId === selection.commandId));
        }
        for (const { plan, job } of pending) {
            if (!this.current())
                throw Error("项目或连接已变化，产物操作已停止。");
            const scopes = (0, LatestJobArtifacts_1.jobArtifactScopes)({ ...job, executionMode: plan.executionMode }, selected);
            const key = (0, LatestJobArtifacts_1.latestJobSyncKey)(plan, job, scopes, targets), previous = job.latestArtifactSync;
            if (!options.force && previous?.key === key && (previous.state === "excluded" || previous.state === "synced"
                && (!previous.artifactDigest || previous.artifactDigest === (0, PlanArtifactSyncStatus_1.jobArtifactSyncDigest)(job)) || Date.parse(previous.retryAfter || "") > Date.now()))
                continue;
            let verificationError = "";
            const assertCurrent = async () => {
                if (!this.current())
                    throw Error("同步已停止：项目、连接或清理操作已变化。");
                const latest = (0, LatestJobArtifacts_1.newestJobOutputs)(await h.loadDistributedQueue(this.root));
                if (!latest.some(row => row.plan.id === plan.id && row.job.index === job.index && row.job.commandId === job.commandId
                    && !row.job.outputRetiredAt && !row.job.cleanup))
                    throw Error("这项产物已被新的运行或清理操作替代，未继续同步。");
                const holds = await (0, SyncResolution_1.loadSyncHolds)(h.context.globalStorageUri.fsPath, this.root);
                const overlap = (a, b) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
                if (Object.entries(holds).some(([file, hold]) => hold.status !== "resolved"
                    && Date.parse(hold.deletedAt || "") >= (Date.parse(plan.enqueuedAt) || 0) && scopes.some(scope => overlap(scope, file))))
                    throw Error("这些文件在本次运行后被用户删除或暂停同步，未自动补回。");
                try {
                    const { task, snapshot, state } = await (0, PulledTaskControl_1.queryTask)(h.client, plan, job, options.force ? 30000 : 8000);
                    if (snapshot.queryComplete !== true || state.status !== "completed")
                        throw Error(snapshot.error || task?.observation?.resultQueryError || job.workerId);
                }
                catch (error) {
                    verificationError = "来源任务核实未完成，未确认本轮同步：" + String(error.message || error);
                    throw Error(verificationError);
                }
            };
            const patch = (fields) => h.patchDistributedJob(this.root, plan.id, job.index, job.attempt, { expectedCommandId: job.commandId, ...fields });
            if (!scopes.length) {
                await patch({ latestArtifactSync: { key, state: "excluded", scopes, checkedAt: new Date().toISOString() }, artifactError: undefined, artifactRetryAfter: undefined });
                report.excluded++;
                continue;
            }
            try {
                await assertCurrent();
                const result = await h.mergeLatestWorkerVersions(this.root, targets, scopes, ".", () => { }, {
                    completedJob: { sourceId: job.workerId }, assertCurrent, verifyOnly: options.verifyOnly,
                });
                if (!result || result.errors.length)
                    throw Error(result?.errors?.join("；") || "同步未完成");
                await assertCurrent();
                await patch({ latestArtifactSync: { key, state: "synced", scopes, workerIds: targets.map((row) => row.id), checkedAt: new Date().toISOString(),
                        artifactDigest: (0, PlanArtifactSyncStatus_1.jobArtifactSyncDigest)({ artifacts: { ...job.artifacts, ...result.files } }) },
                    artifactError: undefined, artifactRetryAfter: undefined, artifacts: { ...job.artifacts, ...result.files },
                    ...(scopes.includes(job.outputDir) && (!job.collectionResultCsv || job.actualExecutionMode === "train" || scopes.includes(job.collectionResultCsv))
                        ? { mirroredWorkerIds: targets.map((row) => row.id), replaceMirroredWorkerIds: true } : {}) });
                report.synced++;
            }
            catch (error) {
                if (!this.current())
                    throw error;
                const detail = String(error.message || error), retryAfter = new Date(Date.now() + 30000).toISOString();
                report.errors.push(plan.planFile + " job " + job.index + "：" + detail);
                await patch({ latestArtifactSync: { key, state: "partial", scopes, error: detail, retryAfter, checkedAt: new Date().toISOString() },
                    artifactError: verificationError || "最新产物同步未完成：" + detail, artifactRetryAfter: retryAfter });
                if (previous?.key !== key || previous.error !== detail)
                    h.recordActionError({ command: "completedJobLatestSync", message: plan.planFile + " job " + job.index + "：" + detail });
            }
        }
        return report;
    }
}
exports.CompletedJobSyncHost = CompletedJobSyncHost;
