import { taskQuery } from "./PulledTaskControl";
import { newestJobOutputs } from "./LatestJobArtifacts";

/** History remains display-only. Never invent identities for a current query. */
export function workerTaskQueries(queue: any, workerId: string): any[] {
  const queries = new Map<string, any>();
  const latest = new Set(newestJobOutputs(queue).map(row => row.plan.id + "\0" + row.job.index));
  for (const plan of queue.plans || []) for (const job of plan.jobs || []) {
    if (job.workerId !== workerId || !["dispatching", "queued", "running", "unknown"].includes(job.status)
      && !(job.lifecycleProtocol === 2 && ["completed", "failed"].includes(job.status) && latest.has(plan.id + "\0" + job.index))) continue;
    if (![plan.projectId, job.workerId, job.commandId, job.outputDir].every(value => typeof value === "string" && value.trim())) continue;
    const query = taskQuery(plan, job);
    queries.set(query.projectId + "\0" + query.commandId, query);
  }
  return [...queries.values()];
}

export function assertLaunchObservations(snapshots: any[], jobs: any[]): void {
  const overlap = (a: string, b: string) => a && b && (a === b || a.startsWith(b + "/") || b.startsWith(a + "/"));
  for (const snapshot of snapshots) {
    if (snapshot.error || snapshot.queryComplete !== true || snapshot.capabilities?.taskLifecycle !== 2) {
      const reason = snapshot.error || (snapshot.capabilities?.taskLifecycle !== 2 ? "TASK_LIFECYCLE_PROTOCOL_REQUIRED" : "TASK_QUERY_INCOMPLETE");
      throw Object.assign(new Error("Worker " + snapshot.workerId + " · 当前任务检查：" + reason + "；尚未提交，可重试失败步骤。"),
        { retryableSubmission: true, workerId: snapshot.workerId, stage: "checking_workers", cause: snapshot.error });
    }
    for (const executor of snapshot.cleanupExecutors || []) if (jobs.some(job => [job.output_dir, job.result_csv].some(target =>
      [executor.relativePath, executor.destination].some(active => overlap(target, active)))))
      throw new Error("ACTIVE_CLEANUP_WINDOW：" + snapshot.workerId + " " + executor.windowId + "；实际清理仍在执行，未启动重跑。");
    for (const task of snapshot.tasks || []) if (task.observation?.tmux && !task.observation.tmux.dead && jobs.some(job =>
      [job.output_dir, job.result_csv].some(target => [task.outputDir, task.collectionResultCsv].some(active => overlap(target, active)))))
      throw new Error("ACTIVE_TMUX_TASK：" + snapshot.workerId + " " + task.tmuxWindowId + "；请先中止对应窗口，未重复提交。");
  }
}
