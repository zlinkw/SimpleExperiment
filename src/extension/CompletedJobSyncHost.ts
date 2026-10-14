import { newestJobOutputs, jobArtifactScopes, latestJobSyncKey } from "../features/LatestJobArtifacts";
import { queryTask } from "../features/PulledTaskControl";
import { canonicalProjectId } from "../features/DistributedPlanQueue";
import { loadSyncHolds } from "../features/SyncResolution";

/** Per-job completion publication reuses the file tree's newest-version merge, never the whole PLAN gate. */
export class CompletedJobSyncHost {
  constructor(private readonly h: any, private readonly root: string, private readonly current: () => boolean) {}
  async run(selected: string[]): Promise<void> {
    const h = this.h, targets = h.workerCodeSyncTargets();
    if (targets.length < 2) return;
    const queue = await h.loadDistributedQueue(this.root);
    const pending = newestJobOutputs(queue).filter(({ plan, job }) => plan.projectId === canonicalProjectId(this.root)
      && job.lifecycleProtocol === 2 && job.status === "completed" && !job.unavailable && !!job.workerId && !!job.commandId);
    for (const { plan, job } of pending) {
      if (!this.current()) return;
      const scopes = jobArtifactScopes({ ...job, executionMode: plan.executionMode }, selected);
      const key = latestJobSyncKey(plan, job, scopes, targets), previous = job.latestArtifactSync;
      if (previous?.key === key && (["synced", "excluded"].includes(previous.state) || Date.parse(previous.retryAfter || "") > Date.now())) continue;
      const assertCurrent = async () => {
        if (!this.current()) throw Error("同步已停止：项目、连接或清理操作已变化。");
        const latest = newestJobOutputs(await h.loadDistributedQueue(this.root));
        if (!latest.some(row => row.plan.id === plan.id && row.job.index === job.index && row.job.commandId === job.commandId
          && !row.job.outputRetiredAt && !row.job.cleanup)) throw Error("这项产物已被新的运行或清理操作替代，未继续同步。");
        const holds = await loadSyncHolds(h.context.globalStorageUri.fsPath, this.root);
        const overlap = (a: string, b: string) => a === b || a.startsWith(b + "/") || b.startsWith(a + "/");
        if (Object.entries(holds).some(([file, hold]) => hold.status !== "resolved"
          && Date.parse(hold.deletedAt || "") >= (Date.parse(plan.enqueuedAt) || 0) && scopes.some(scope => overlap(scope, file))))
          throw Error("这些文件在本次运行后被用户删除或暂停同步，未自动补回。");
        const { task, snapshot, state } = await queryTask(h.client, plan, job);
        if (snapshot.queryComplete !== true || state.status !== "completed")
          throw Error("来源 Worker 尚未主动核实这项任务的完整产物：" + (snapshot.error || task?.observation?.resultQueryError || job.workerId));
      };
      const patch = (fields: any) => h.patchDistributedJob(this.root, plan.id, job.index, job.attempt,
        { expectedCommandId: job.commandId, ...fields });
      if (!scopes.length) { await patch({ latestArtifactSync: { key, state: "excluded", scopes, checkedAt: new Date().toISOString() } }); continue; }
      try {
        await assertCurrent();
        const result = await h.mergeLatestWorkerVersions(this.root, targets, scopes, ".", () => {}, {
          completedJob: { sourceId: job.workerId }, assertCurrent,
        });
        if (!result || result.errors.length) throw Error(result?.errors?.join("；") || "同步未完成");
        await assertCurrent();
        await patch({ latestArtifactSync: { key, state: "synced", scopes, workerIds: targets.map((row: any) => row.id), checkedAt: new Date().toISOString() },
          artifactError: undefined, artifactRetryAfter: undefined, artifacts: { ...job.artifacts, ...result.files },
          ...(scopes.includes(job.outputDir) && (!job.collectionResultCsv || job.actualExecutionMode === "train" || scopes.includes(job.collectionResultCsv))
            ? { mirroredWorkerIds: targets.map((row: any) => row.id), replaceMirroredWorkerIds: true } : {}) });
      } catch (error: any) {
        if (!this.current()) return;
        const detail = String(error.message || error), retryAfter = new Date(Date.now() + 30000).toISOString();
        await patch({ latestArtifactSync: { key, state: "partial", scopes, error: detail, retryAfter, checkedAt: new Date().toISOString() },
          artifactError: "最新产物同步未完成：" + detail, artifactRetryAfter: retryAfter });
        h.recordActionError({ command: "completedJobLatestSync", message: plan.planFile + " job " + job.index + "：" + detail });
      }
    }
  }
}
