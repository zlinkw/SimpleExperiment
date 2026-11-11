import { canonicalProjectId, confirmRetainedTaskStop } from "../features/DistributedPlanQueue";

/** Exact job control shares the UI stop implementation and its persisted cancellation intent. */
export async function stopProjectTask(host: any, root: string, params: Record<string, any>): Promise<unknown> {
  if (params.confirm !== true) throw Error("CONFIRM_REQUIRED: tasks.stop");
  const context = host.captureProjectContext();
  let selected: { plan: any; job: any } | undefined;
  await host.saveDistributedQueue(root, undefined, { controlMutation: true, mutateLatest: (queue: any) => {
    if (!host.projectContextIsCurrent(context)) throw Error("MCP_WORKSPACE_CHANGED");
    const matches = queue.plans.filter((plan: any) => (plan.projectId || canonicalProjectId(root)) === canonicalProjectId(root)
      && (!params.workflowId || plan.id === params.workflowId)).flatMap((plan: any) => plan.jobs
      .filter((job: any) => job.workerId === params.workerId && job.commandId === params.commandId).map((job: any) => ({ plan, job })));
    if (matches.length !== 1) throw Error("TASK_EXACT_IDENTITY_REQUIRED");
    selected = matches[0];
    selected!.job.stopIntent ||= { commandId: params.commandId, workerId: params.workerId, requestedAt: new Date().toISOString(), state: "pending" };
    selected!.job.stopIntent.retainTask = true;
    return { ...queue };
  } });
  if (!host.projectContextIsCurrent(context)) throw Error("MCP_WORKSPACE_CHANGED");
  const result = await host.stopDistributedJobForClear(selected!.plan, selected!.job, true);
  await host.saveDistributedQueue(root, undefined, { controlMutation: true, mutateLatest: (queue: any) => {
    if (!host.projectContextIsCurrent(context)) throw Error("MCP_WORKSPACE_CHANGED");
    const plan = queue.plans.find((plan: any) => plan.id === selected!.plan.id);
    const job = plan?.jobs.find((job: any) => job.workerId === params.workerId && job.commandId === params.commandId);
    if (!job) throw Error("TASK_EXACT_IDENTITY_REQUIRED");
    confirmRetainedTaskStop(plan, job);
    return { ...queue };
  } });
  return { ok: true, workerId: params.workerId, commandId: params.commandId, workflowId: selected!.plan.id,
    receipt: result, completionSource: "exact_window_observation", nextTool: "task_list" };
}
