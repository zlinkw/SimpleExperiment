"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gpuTmuxSessionBatch = gpuTmuxSessionBatch;
exports.tmuxSessionBatch = tmuxSessionBatch;
exports.closeGpuTmuxSession = closeGpuTmuxSession;
exports.closeTmuxSession = closeTmuxSession;
exports.manageTmuxSession = manageTmuxSession;
const TmuxWindowIdentity_1 = require("../features/TmuxWindowIdentity");
/** A card represents a session, but authorization remains a frozen list of stable
 * window identities. Never kill-session, infer ownership, or follow new windows. */
function gpuTmuxSessionBatch(list, workerId, session, prefix, expected) {
    const gpu = session.slice(prefix.length + 5);
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(prefix) || session !== prefix + "-gpu-" + gpu || !/^\d+$/.test(gpu) || String(Number(gpu)) !== gpu)
        throw new Error("GPU 会话不属于当前配置前缀，未关闭窗口。");
    return tmuxSessionBatch(list, workerId, session, expected);
}
function tmuxSessionBatch(list, workerId, session, expected, compareActivity = true) {
    if (!/^[A-Za-z0-9._-]+$/.test(session) || session.endsWith("-agent"))
        throw new Error("会话名称无效或属于受保护的 Agent，未关闭窗口。");
    if (list?.workerId !== workerId || list?.ok === false || list?.available === false || !Array.isArray(list?.sessions))
        throw new Error("无法核实当前 Worker 的 GPU 窗口列表。");
    const found = list.sessions.filter((row) => row.name === session);
    if (found.length > 1)
        throw new Error("GPU 会话登记不唯一。");
    const windows = found[0]?.windows || [];
    if (!Array.isArray(expected) || !Array.isArray(windows) || windows.length !== expected.length)
        throw new Error("GPU 窗口集合已变化，请刷新后重新确认。");
    const result = windows.map((win) => ({
        ...(0, TmuxWindowIdentity_1.resolveTmuxWindowIdentity)(list, session + ":" + win.index),
        taskCommandId: String(win.task?.commandId || ""), taskStatus: String(win.task?.status || ""),
        paneCommands: (win.panes || []).map((pane) => ({ id: String(pane.id || ""), command: String(pane.command || "") }))
            .sort((a, b) => a.id.localeCompare(b.id)),
    }));
    if (new Set(result.map(row => row.windowId)).size !== result.length || result.some(row => row.windowName.toLowerCase() === "agent"))
        throw new Error("GPU 窗口包含受保护或不唯一的身份。");
    // Numeric indices can change after closing a sibling. Authorization follows
    // the frozen stable ID inside the same session, never a reused index.
    const normalized = (rows) => JSON.stringify(rows.map(row => ({ session: row.session,
        windowId: row.windowId, windowName: row.windowName, paneIds: [...row.paneIds].sort(),
        taskCommandId: row.taskCommandId, taskStatus: compareActivity ? row.taskStatus : "",
        paneCommands: compareActivity ? [...row.paneCommands].sort((a, b) => a.id.localeCompare(b.id)) : [] })).sort((a, b) => a.windowId.localeCompare(b.windowId)));
    if (normalized(result) !== normalized(expected))
        throw new Error("GPU 窗口身份或运行任务已变化，请刷新后重新确认。");
    return result;
}
async function closeGpuTmuxSession(ports, request) {
    return closeTmuxSession(ports, { ...request, session: request.gpuSession }, true);
}
async function closeTmuxSession(ports, request, gpuOnly = false) {
    const { workerId, session } = request, prefix = gpuOnly ? ports.prefix() : "";
    const inspect = (list, expected) => gpuOnly
        ? gpuTmuxSessionBatch(list, workerId, session, prefix, expected) : tmuxSessionBatch(list, workerId, session, expected);
    const batch = inspect(await ports.read(), request.identities);
    if (!batch.length)
        throw new Error("当前会话没有可关闭的窗口，请刷新列表。");
    await ports.confirm(`关闭 ${workerId} 的${gpuOnly ? " GPU" : ""}会话 ${session} 的全部窗口，窗口内的进程会终止。精确目标：\n`
        + batch.map(row => `${row.target}（${row.windowName}，${row.windowId}，${row.paneIds.join(",")}）`).join("\n"));
    return ports.progress(async (report) => {
        const closed = new Set();
        try {
            for (const identity of batch) {
                if (gpuOnly && ports.prefix() !== prefix)
                    throw new Error("配置前缀已变化，原确认失效。");
                const current = inspect(await ports.read(), batch.filter(row => !closed.has(row.windowId)))
                    .find(row => row.windowId === identity.windowId);
                report(`正在关闭 ${closed.size + 1}/${batch.length} ${current.target}`);
                await ports.close(current);
                closed.add(identity.windowId);
            }
            inspect(await ports.read(), []);
            return `已核实关闭 ${workerId} · ${session} 的 ${batch.length} 个窗口。`;
        }
        catch (error) {
            throw new Error(`已关闭 ${closed.size}/${batch.length} 个窗口；其余未关闭：${String(error.message || error)}`);
        }
    });
}
/** Explicit session control, separate from the legacy selected-window batch. */
async function manageTmuxSession(ports, request) {
    const { workerId, session, action } = request;
    const before = await ports.read();
    const batch = tmuxSessionBatch(before, workerId, session, request.identities, false);
    if (!before.sessionActions?.includes(action))
        throw new Error("Worker Agent 不支持会话关闭/清空，请更新远端 Agent 后重试。");
    if (!batch.length)
        throw new Error("会话已不存在，请刷新列表。");
    await ports.confirm(`${action === "close" ? "关闭整个会话" : "清空全部标签页"} ${workerId} · ${session}？其中进程会终止。`
        + (action === "clear" ? "保留会话和一个空闲终端。" : "会话也会移除。") + "\n" + batch.map(row => `${row.target}（${row.windowName}，${row.windowId}）`).join("\n"));
    tmuxSessionBatch(await ports.read(), workerId, session, batch, false);
    let response, failure;
    try {
        response = await ports.request({ session, sessionAction: action, identities: batch, confirm: true });
    }
    catch (error) {
        failure = error;
    }
    const after = await ports.read();
    if (after?.workerId !== workerId || after.ok === false || !Array.isArray(after.sessions))
        throw new Error("操作后无法查询会话，请刷新核对；未重复执行。");
    const remaining = after.sessions.find((row) => row.name === session);
    const oldIds = new Set(batch.map(row => row.windowId));
    const done = action === "close" ? !remaining : remaining && remaining.windows?.length === 1
        && !remaining.windows.some((row) => oldIds.has(row.windowId))
        && (!response?.idleWindowId || remaining.windows[0].windowId === response.idleWindowId);
    if (!done)
        throw new Error(`操作尚未完成：${response?.error || failure?.message || "原会话或标签页仍存在，请刷新核对"}`);
    return action === "close" ? `已关闭会话 ${session}。` : `已清空 ${session} 的标签页，保留一个空闲终端。`;
}
