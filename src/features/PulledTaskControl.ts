import { observationMatches, taskLifecycle } from "./TaskLifecycle";

export function taskQuery(plan: any, job: any) {
  return { lifecycleProtocol: 2, commandId: job.commandId, projectId: plan.projectId, workerId: job.workerId,
    workflowId: plan.id, planFile: plan.planFile, planRevision: plan.revision, codeFingerprint: plan.codeFingerprint,
    globalJobId: job.globalJobId, experimentIndex: job.index, case: job.case, seed: job.seed, resultPathPolicy: "declared",
    runKey: job.commandId, planJobCount: plan.planJobCount || plan.jobs.length, enqueuedAt: plan.enqueuedAt,
    outputDir: job.outputDir, collectionResultCsv: job.collectionResultCsv, executionMode: plan.executionMode };
}

export async function queryTask(client: any, plan: any, job: any, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error("任务状态查询超时")), timeoutMs);
  try {
    const snapshot = await Promise.race([client.getWorkerTasks(job.workerId, { signal: controller.signal, queries: [taskQuery(plan, job)] }),
      new Promise<any>((_, reject) => controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true }))]);
    if (snapshot?.capabilities?.taskLifecycle !== 2) throw new Error("TASK_LIFECYCLE_PROTOCOL_REQUIRED：请更新 Worker Agent/Scheduler；未派发任务");
    const task = (snapshot.tasks || []).find((row: any) => observationMatches(row.observation || {}, {
      commandId: job.commandId, projectId: plan.projectId, workerId: job.workerId }));
    if (!task) throw new Error("任务查询未返回所选 commandId 的证据");
    if (task.observation.queryError) throw new Error(task.observation.queryError);
    return { task, state: taskLifecycle(task.observation), snapshot };
  } finally { clearTimeout(timer); }
}

/** The POST outcome is never a completion gate. Only a subsequent observation settles intent. */
export async function stopPulledTask(client: any, plan: any, job: any, operationId: string) {
  const request = { ...taskQuery(plan, job), lifecycleProtocol: 2, schemaVersion: 1,
    targetCommandId: job.commandId, opId: operationId, operationId, stopBoundary: "local_command" };
  let transportError: unknown;
  void Promise.resolve().then(() => client.postWorkerAction(job.workerId, "stop-worker-task", request))
    .catch(error => { transportError = error; });
  const deadline = Date.now() + 8500;
  do {
    const { task } = await queryTask(client, plan, job);
    if (task.observation.cancelled === true && !task.observation.tmux) {
      return { status: "completed", source: "pull", stoppedTasks: [{ ...taskQuery(plan, job),
        commandId: job.commandId, stopBoundary: "local_command", paneClosed: true, cacheRetired: true }], stoppedPids: [] };
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  } while (Date.now() < deadline);
  throw new Error("停止尚未核实；保留原 commandId，可主动刷新。" + (transportError instanceof Error ? transportError.message : ""));
}

export function returnPulledJobToLocal(queue: any, planId: string, index: number, commandId: string) {
  return { ...queue, plans: queue.plans.map((plan: any) => plan.id !== planId ? plan : { ...plan,
    jobs: plan.jobs.map((job: any) => job.index !== index ? job : { ...job, lifecycleProtocol: 2, status: "pending",
      commandId: undefined, runKey: undefined, workerId: undefined, gpuId: undefined, localQueueOnly: true,
      recallRequested: undefined, recallOperationId: undefined, reassignmentPending: undefined, stopIntent: undefined,
      executionState: undefined, resultState: undefined, statusQueryError: undefined, lastObservedAt: undefined,
      error: undefined, blockReason: undefined, trustedTerminalStatus: undefined,
      history: [...(job.history || []), { commandId, status: job.status, outputDir: job.outputDir, stopReason: "requeue" }] }) } ) };
}
