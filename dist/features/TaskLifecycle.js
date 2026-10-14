"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskLifecycle = taskLifecycle;
exports.observationMatches = observationMatches;
function taskLifecycle(value) {
    let execution = "missing", result = "unverified";
    if (value.queryError)
        return { execution: "unknown", result, status: "unknown", message: value.queryError };
    const pane = value.tmux;
    if (pane) {
        if (pane.dead)
            execution = pane.exitCode === 0 ? "exited" : "failed";
        else if (["queued", "bound"].includes(pane.phase || ""))
            execution = "queued";
        else if (["admitted", "starting"].includes(pane.phase || ""))
            execution = "starting";
        else if (pane.phase === "running")
            execution = "running";
        else
            execution = "unknown";
    }
    if (value.result) {
        result = value.result.runId !== value.commandId ? "conflict"
            : value.result.status === "completed" && value.result.present && value.result.verified ? "complete" : "incomplete";
    }
    const status = ["queued", "starting"].includes(execution) ? "queued" : execution === "running" ? "running"
        : execution === "failed" ? "failed" : result === "complete" ? "completed" : value.cancelled && !pane ? "cancelled"
            : execution === "missing" ? "unknown" : "unknown";
    const message = value.resultQueryError ? "产物核实失败：" + value.resultQueryError : execution === "starting" ? "任务窗口已建立，正在启动命令"
        : execution === "unknown" ? "窗口执行阶段尚未核实" : execution === "missing" && result !== "complete" ? "远端未发现该任务；未自动重新派发"
            : execution === "exited" && result !== "complete" ? "执行已结束，产物尚未确认"
                : result === "conflict" ? "产物属于其他运行" : undefined;
    return { execution, result, status, message };
}
/** Only stable control ownership is required for a live observation. */
function observationMatches(value, expected) {
    return value.lifecycleProtocol === 2 && Boolean(expected.commandId && expected.projectId && expected.workerId)
        && value.commandId === expected.commandId && value.projectId === expected.projectId && value.workerId === expected.workerId;
}
