/** Runtime truth comes from a bounded pull, never an event or a stored status. */
export type TaskExecution = "queued" | "starting" | "running" | "exited" | "failed" | "missing" | "unknown";
export type TaskResult = "complete" | "incomplete" | "unverified" | "conflict";
export type TaskObservation = {
  commandId: string; projectId: string; workerId: string; lifecycleProtocol: 2;
  observedAt: string; queryError?: string; schedulerPhase?: string;
  tmux?: { windowId: string; paneId: string; dead: boolean; exitCode?: number; phase?: string };
  result?: { runId: string; status: string; present: boolean; verified: boolean };
};
export function taskLifecycle(value: TaskObservation): { execution: TaskExecution; result: TaskResult;
  status: "unknown" | "queued" | "running" | "failed" | "completed"; message?: string } {
  let execution: TaskExecution = "missing", result: TaskResult = "unverified";
  if (value.queryError) return { execution: "unknown" as TaskExecution, result, status: "unknown" as const, message: value.queryError };
  const pane = value.tmux;
  if (pane) {
    if (pane.dead) execution = pane.exitCode === 0 ? "exited" : "failed";
    else if (["queued", "bound"].includes(pane.phase || "")) execution = "queued";
    else if (["admitted", "starting"].includes(pane.phase || "")) execution = "starting";
    else execution = "running";
  }
  if (value.result) {
    result = value.result.runId !== value.commandId ? "conflict"
      : value.result.status === "completed" && value.result.present && value.result.verified ? "complete" : "incomplete";
  }
  const status = execution === "queued" ? "queued" : ["running", "starting"].includes(execution) ? "running"
    : execution === "failed" ? "failed" : result === "complete" ? "completed"
    : execution === "missing" ? "unknown" : "unknown";
  const message = execution === "missing" && result !== "complete" ? "远端未发现该任务；未自动重新派发"
    : execution === "exited" && result !== "complete" ? "执行已结束，产物尚未确认"
    : result === "conflict" ? "产物属于其他运行" : undefined;
  return { execution, result, status, message };
}

/** Only stable control ownership is required for a live observation. */
export function observationMatches(value: TaskObservation, expected: { commandId?: string; projectId?: string; workerId?: string }) {
  return value.lifecycleProtocol === 2 && Boolean(expected.commandId && expected.projectId && expected.workerId)
    && value.commandId === expected.commandId && value.projectId === expected.projectId && value.workerId === expected.workerId;
}
