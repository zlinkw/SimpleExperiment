"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownExecutionExited = ownExecutionExited;
const DistributedPlanQueue_1 = require("./DistributedPlanQueue");
const TaskLifecycle_1 = require("./TaskLifecycle");
/** A current, exact execution observation wakes local scheduling before result checks finish. */
function ownExecutionExited(previous, snapshot, queue, projectId) {
    if (!(0, DistributedPlanQueue_1.hasFreshDurableSnapshot)(snapshot) || snapshot.queryComplete !== true || snapshot.executionQueryError)
        return false;
    const jobs = (queue?.plans || []).flatMap((plan) => plan.projectId === projectId ? plan.jobs || [] : []);
    if (!jobs.some((job) => job.status === "pending" && !job.workerId && !job.commandId && !job.manualDispatch && !job.stopIntent))
        return false;
    return (snapshot.tasks || []).some((task) => {
        const job = jobs.find((job) => job.commandId === task.commandId && job.workerId === snapshot.workerId);
        const observation = task.observation;
        if (!job || !observation || !(0, TaskLifecycle_1.observationMatches)(observation, { commandId: job.commandId, workerId: job.workerId, projectId })
            || observation.queryError || observation.executionQueryError || observation.tmux?.dead !== true)
            return false;
        const before = previous?.tasks?.find((row) => row.commandId === job.commandId && row.projectId === projectId);
        return before ? before.observation?.tmux?.dead !== true : (0, DistributedPlanQueue_1.jobHasLiveExecution)(job);
    });
}
