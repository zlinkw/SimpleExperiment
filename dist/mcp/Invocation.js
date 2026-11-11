"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpInvocation = void 0;
exports.authorizedRemoteTargets = authorizedRemoteTargets;
exports.authorizedEmptyRunChoice = authorizedEmptyRunChoice;
const node_async_hooks_1 = require("node:async_hooks");
exports.mcpInvocation = new node_async_hooks_1.AsyncLocalStorage();
function authorizedRemoteTargets(targets) {
    const invocation = exports.mcpInvocation.getStore();
    if (!invocation)
        return false;
    invocation.permission("sync");
    const workers = invocation.workers();
    for (const target of targets) {
        const worker = workers.find(row => row.id === target.id);
        if (!worker || worker.host !== target.host || worker.port !== target.port || worker.user !== target.user
            || worker.projectRoot.replace(/\/+$/, "") !== String(target.remotePath).replace(/\/+$/, ""))
            throw Error("MCP_REMOTE_TARGET_NOT_AUTHORIZED");
    }
    return true;
}
function authorizedEmptyRunChoice(payload) {
    const invocation = exports.mcpInvocation.getStore();
    if (!invocation)
        return undefined;
    invocation.permission("experiment");
    const group = payload.phase === 1 && payload.groups.find((row) => row.value === "rerun_missing" && !row.disabled && row.targets.length === 0);
    return group ? "rerun_missing" : undefined;
}
