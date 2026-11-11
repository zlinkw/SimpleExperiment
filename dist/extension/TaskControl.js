"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopProjectTask = stopProjectTask;
const DistributedPlanQueue_1 = require("../features/DistributedPlanQueue");
/** Exact job control shares the UI stop implementation and its persisted cancellation intent. */
async function stopProjectTask(host, root, params) {
    if (params.confirm !== true)
        throw Error("CONFIRM_REQUIRED: tasks.stop");
    const context = host.captureProjectContext();
    let selected;
    await host.saveDistributedQueue(root, undefined, { controlMutation: true, mutateLatest: (queue) => {
            if (!host.projectContextIsCurrent(context))
                throw Error("MCP_WORKSPACE_CHANGED");
            const matches = queue.plans.filter((plan) => (plan.projectId || (0, DistributedPlanQueue_1.canonicalProjectId)(root)) === (0, DistributedPlanQueue_1.canonicalProjectId)(root)
                && (!params.workflowId || plan.id === params.workflowId)).flatMap((plan) => plan.jobs
                .filter((job) => job.workerId === params.workerId && job.commandId === params.commandId).map((job) => ({ plan, job })));
            if (matches.length !== 1)
                throw Error("TASK_EXACT_IDENTITY_REQUIRED");
            selected = matches[0];
            selected.job.stopIntent ||= { commandId: params.commandId, workerId: params.workerId, requestedAt: new Date().toISOString(), state: "pending" };
            selected.job.stopIntent.retainTask = true;
            return { ...queue };
        } });
    if (!host.projectContextIsCurrent(context))
        throw Error("MCP_WORKSPACE_CHANGED");
    const result = await host.stopDistributedJobForClear(selected.plan, selected.job, true);
    await host.saveDistributedQueue(root, undefined, { controlMutation: true, mutateLatest: (queue) => {
            if (!host.projectContextIsCurrent(context))
                throw Error("MCP_WORKSPACE_CHANGED");
            const plan = queue.plans.find((plan) => plan.id === selected.plan.id);
            const job = plan?.jobs.find((job) => job.workerId === params.workerId && job.commandId === params.commandId);
            if (!job)
                throw Error("TASK_EXACT_IDENTITY_REQUIRED");
            (0, DistributedPlanQueue_1.confirmRetainedTaskStop)(plan, job);
            return { ...queue };
        } });
    return { ok: true, workerId: params.workerId, commandId: params.commandId, workflowId: selected.plan.id,
        receipt: result, completionSource: "exact_window_observation", nextTool: "task_list" };
}
