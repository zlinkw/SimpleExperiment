"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTmuxWindowIdentity = resolveTmuxWindowIdentity;
exports.tmuxWindowIdentityPresent = tmuxWindowIdentityPresent;
function windows(list) {
    if (list?.ok === false || list?.available === false || !Array.isArray(list?.sessions))
        throw new Error(`无法核实 tmux 列表：${String(list?.error || "缺少 sessions")}`);
    return list.sessions.flatMap((session) => (session.windows || []).map((win) => ({
        ...win, session: String(session.name || ""),
        target: String(win.target || `${session.name}:${win.index}`),
    })));
}
function identity(win) {
    const windowId = String(win.windowId || "");
    const paneIds = (win.panes || []).map((pane) => String(pane.id || "")).filter((id) => /^%\d+$/.test(id)).sort();
    if (!/^@\d+$/.test(windowId))
        throw new Error("tmux 窗口缺少稳定身份，请刷新列表或更新 Worker Agent。");
    return { target: win.target, session: win.session, windowId, windowName: String(win.name || ""), paneIds };
}
function resolveTmuxWindowIdentity(list, target, expected) {
    const all = windows(list);
    const windowId = String(expected?.windowId || "");
    const paneIds = expected?.paneIds || (expected?.panes || []).map((pane) => String(pane.id || "")).filter(Boolean);
    const stable = windowId || paneIds.length;
    const win = all.find((win) => stable
        ? (windowId ? win.windowId === windowId : paneIds.every(id => win.panes?.some((pane) => pane.id === id)))
        : win.target === target);
    if (!win || win.session !== target.split(":")[0])
        throw new Error("tmux 窗口身份已变化或不存在，请刷新后重试。");
    const current = identity(win);
    const expectedName = expected?.windowName ?? expected?.name;
    if (expectedName !== undefined && current.windowName !== expectedName
        || paneIds.length && JSON.stringify([...paneIds].sort()) !== JSON.stringify(current.paneIds))
        throw new Error("tmux 窗口身份已变化，未关闭新占用窗口。");
    return current;
}
function tmuxWindowIdentityPresent(list, expected) {
    return windows(list).some(win => expected.windowId && win.windowId === expected.windowId
        || expected.paneIds.some(id => win.panes?.some((pane) => pane.id === id)));
}
