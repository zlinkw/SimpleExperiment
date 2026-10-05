"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSftpOperationStopped = confirmSftpOperationStopped;
exports.callSftpWithProgress = callSftpWithProgress;
const node_crypto_1 = require("node:crypto");
const ProgressInactivity_1 = require("./ProgressInactivity");
const SafeRequestRetry_1 = require("./SafeRequestRetry");
const BoundedResponse_1 = require("../tunnel/BoundedResponse");
async function readSftpJson(response) {
    return JSON.parse(await (0, BoundedResponse_1.readBoundedResponseText)(response, () => { }));
}
function identityOf(value) {
    if (!value || typeof value !== "object")
        return undefined;
    const source = value;
    const result = {};
    for (const key of ["id", "name", "host", "hostname", "remotePath", "path", "port", "user", "username"])
        if (source[key] !== undefined && source[key] !== null)
            result[key] = source[key];
    return Object.keys(result).length ? result : undefined;
}
function sftpRequestKey(method, params) {
    const localPath = String(params.localPath || params.localBase || params.workspacePath || "").trim().replace(/[\\/]+/g, "/");
    const identity = {
        method,
        localPath: process.platform === "win32" ? localPath.toLowerCase() : localPath,
        remotePath: String(params.remotePath || "").trim(),
        targetId: params.targetId || params.serverId || "",
        host: params.host || "",
        server: identityOf(params.server),
        sftp: identityOf(params.sftp),
        source: identityOf(params.source),
        destination: identityOf(params.destination),
        target: identityOf(params.target),
    };
    return (0, node_crypto_1.createHash)("sha256").update(JSON.stringify(identity)).digest("hex");
}
async function confirmSftpOperationStopped(operationId, initial) {
    const expectedInstanceId = String(initial.instanceId || "");
    if (!expectedInstanceId || initial.features?.transferSettlementReceipts !== true)
        throw new Error("当前 SimpleSFTP 未提供持久化退出回执，未重新传输；请更新 SimpleSFTP 后重试。");
    async function rpc(method, params) {
        const response = await fetch(new URL("/api/v1/rpc", initial.endpoint), {
            method: "POST", headers: { ...initial.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method, params }), signal: AbortSignal.timeout(10_000),
        });
        const payload = await readSftpJson(response);
        if (!response.ok || payload.error || payload.result?.ok !== true)
            throw new Error("旧传输停止结果无法确认，未重新传输。");
        return payload.result;
    }
    const receipt = await rpc("transfers.cancel", { operationId, operationInstanceId: expectedInstanceId, reason: "用户重新执行相同请求" });
    if (receipt.operationId !== operationId || receipt.operationInstanceId !== expectedInstanceId)
        throw new Error("旧传输取消回执身份不匹配。");
    if (receipt.status === "outcomeUnknown")
        throw new Error("旧传输结果未知，未重新传输；请核对目标后人工恢复。");
    if (receipt.status === "identityMismatch")
        throw new Error("旧传输取消回执身份不匹配。");
    if (receipt.cancelled !== true)
        throw new Error("SimpleSFTP 未接受旧传输取消，未重新传输。");
    if (receipt.settled === true && receipt.status === "settled")
        return;
    if (receipt.instanceId !== expectedInstanceId || receipt.status !== "cancelling")
        throw new Error("SimpleSFTP 实例已变化或旧传输状态未知，未重新传输。");
    const deadline = Date.now() + 20_000;
    do {
        const state = await rpc("transfers.list", {});
        if (state.instanceId !== expectedInstanceId)
            throw new Error("SimpleSFTP 实例已变化，无法确认旧传输退出。");
        if (!Array.isArray(state.transfers) || !Array.isArray(state.operations) || !Array.isArray(state.settledOperations))
            throw new Error("SimpleSFTP 未提供完整退出证据，请升级并重试。");
        const settled = state.settledOperations.find((row) => row?.operationId === operationId
            && row?.operationInstanceId === expectedInstanceId && row?.status === "settled" && Boolean(row?.settledAt));
        if (settled)
            return;
        const unresolved = state.operations.find((row) => (row?.operationId || row?.id) === operationId);
        if (unresolved?.status === "outcomeUnknown")
            throw new Error("旧传输结果未知，未重新传输；请核对目标后人工恢复。");
        const active = [...state.transfers, ...state.operations].some(row => (row.operationId || row.id) === operationId);
        if (!active)
            throw new Error("SimpleSFTP 缺少该传输的完成回执，未重新传输。");
        await new Promise(resolve => setTimeout(resolve, 250));
    } while (Date.now() < deadline);
    throw new Error("旧传输取消尚未完成，未重新传输。");
}
async function callSftpWithProgress(method, params, discover) {
    (0, SafeRequestRetry_1.assertRetryRequestCurrent)();
    const scopedSignal = (0, SafeRequestRetry_1.retryRequestSignal)();
    if (scopedSignal)
        params = { ...params, signal: params.signal ? AbortSignal.any([params.signal, scopedSignal]) : scopedSignal };
    const discovery = await discover(method);
    const { endpoint, headers } = discovery;
    (0, SafeRequestRetry_1.assertRetryRequestCurrent)();
    const operationId = `sftp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fileOperation = /^(sync[.]|upload[.]|download[.]|remote[.])/.test(method);
    const requestAbort = new AbortController(), eventsAbort = new AbortController();
    let timer, disposed = false;
    let forgetStopCheck = () => { };
    async function cancelRemote() {
        try {
            const response = await fetch(new URL("/api/v1/rpc", endpoint), {
                method: "POST", headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.cancel", params: { operationId, operationInstanceId: discovery.instanceId, reason: "调用方已取消或无真实进展" } }),
                signal: AbortSignal.timeout(30_000),
            });
            await response.body?.cancel();
        }
        catch { /* Outcome remains unknown; never replay a modifying operation. */ }
    }
    const inactivity = new ProgressInactivity_1.ProgressInactivity(fileOperation ? 120_000 : 30_000, () => {
        requestAbort.abort(new Error("无真实进展，执行结果待确认。连接中断时实时通道会自动重连；请刷新目标状态，勿重复执行。"));
        void cancelRemote();
    });
    const onCancel = () => { requestAbort.abort(params.signal?.reason); void cancelRemote(); };
    if (params.signal?.aborted)
        onCancel();
    else
        params.signal?.addEventListener("abort", onCancel, { once: true });
    function accept(item) {
        if (disposed || requestAbort.signal.aborted || item?.operationId !== operationId)
            return;
        inactivity.update({ phase: item.phase, scope: item.progressScope || item.id, processedBytes: item.processedBytes ?? item.transferredBytes, processedFiles: item.processedFiles, status: item.status });
        if (item.status === "cancelled")
            requestAbort.abort(new Error(item.reason || "传输已取消"));
    }
    async function poll() {
        if (disposed || requestAbort.signal.aborted)
            return;
        try {
            const response = await fetch(new URL("/api/v1/rpc", endpoint), {
                method: "POST", headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.list", params: {} }),
                signal: AbortSignal.any([eventsAbort.signal, AbortSignal.timeout(30_000)]),
            });
            const payload = await readSftpJson(response);
            if (payload.result?.instanceId !== discovery.instanceId)
                throw new Error("SimpleSFTP 实例已变化");
            for (const item of payload.result?.transfers || [])
                accept(item);
            if (!disposed && !requestAbort.signal.aborted) {
                timer = setTimeout(() => void poll(), 500);
                timer.unref?.();
            }
        }
        catch { /* Manual recovery only. Do not restart a failed event connection or query. */ }
    }
    async function readEvents() {
        try {
            const response = await fetch(new URL("/api/v1/events", endpoint), { headers, signal: eventsAbort.signal });
            if (!response.ok || !response.body) {
                void response.body?.cancel().catch(() => undefined);
                return;
            }
            const reader = response.body.getReader();
            const decoder = new BoundedResponse_1.BoundedSseDecoder();
            let finished = false;
            try {
                while (!disposed) {
                    const chunk = await reader.read();
                    for (const data of decoder.push(chunk.done ? undefined : chunk.value)) {
                        try {
                            accept(JSON.parse(data));
                        }
                        catch { }
                    }
                    if (chunk.done) {
                        finished = true;
                        break;
                    }
                }
            }
            finally {
                if (!finished)
                    void reader.cancel().catch(() => undefined);
                reader.releaseLock();
            }
        }
        catch { /* Keep fallback reads; no event reconnect. */ }
    }
    if (fileOperation) {
        void readEvents();
        timer = setTimeout(() => void poll(), 500);
    }
    try {
        requestAbort.signal.throwIfAborted();
        if (fileOperation)
            forgetStopCheck = (0, SafeRequestRetry_1.registerRetryStopCheck)(() => confirmSftpOperationStopped(operationId, discovery));
        const { signal: _signal, ...serializable } = params;
        const requestBody = JSON.stringify({ jsonrpc: "2.0", id: operationId, method, params: {
                ...serializable, _operationId: operationId, _operationInstanceId: discovery.instanceId,
                _requestKey: sftpRequestKey(method, serializable),
            } });
        const sendOperation = async () => {
            try {
                const response = await fetch(new URL("/api/v1/rpc", endpoint), {
                    method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: requestBody, signal: requestAbort.signal,
                });
                if (!response.ok)
                    void response.body?.cancel().catch(() => undefined);
                return response;
            }
            catch (error) {
                if (requestAbort.signal.aborted)
                    throw error;
                const detail = error instanceof Error ? error.message : String(error || "连接中断");
                throw new Error(`SimpleSFTP ${method} 请求中断，旧传输结果未知，未重新传输；刷新目标状态并确认远端退出后再重试。${detail ? ` (${detail})` : ""}`);
            }
        };
        let response = await sendOperation();
        if (!response.ok)
            throw new Error(`SimpleSFTP ${method} 失败：HTTP ${response.status}`);
        let payload = await readSftpJson(response);
        requestAbort.signal.throwIfAborted();
        const blocker = payload.error?.data;
        if (fileOperation && blocker?.blockedOperationId && typeof blocker.operationInstanceId === "string") {
            await confirmSftpOperationStopped(String(blocker.blockedOperationId), { ...discovery, instanceId: blocker.operationInstanceId });
            response = await sendOperation();
            if (!response.ok)
                throw new Error(`SimpleSFTP ${method} 失败：HTTP ${response.status}`);
            payload = await readSftpJson(response);
            requestAbort.signal.throwIfAborted();
        }
        if (payload.error || payload.result?.ok === false) {
            // Keep the stop check attached to this request generation. A later
            // explicit retry must reconcile this operation before starting another
            // modifying transfer; the current error response alone may not prove
            // that all remote writers have exited.
            if (payload.error)
                throw new Error(`SimpleSFTP ${method}：${payload.error.message || "未知错误"}`);
            throw new Error(`SimpleSFTP ${method}：${payload.result.error || payload.result.message || "传输失败"}`);
        }
        forgetStopCheck();
        return payload.result;
    }
    finally {
        disposed = true;
        inactivity.dispose();
        clearTimeout(timer);
        eventsAbort.abort();
        params.signal?.removeEventListener("abort", onCancel);
    }
}
