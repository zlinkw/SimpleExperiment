"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmSftpOperationStopped = confirmSftpOperationStopped;
exports.callSftpWithProgress = callSftpWithProgress;
const node_crypto_1 = require("node:crypto");
const ProgressInactivity_1 = require("./ProgressInactivity");
const SafeRequestRetry_1 = require("./SafeRequestRetry");
const BoundedResponse_1 = require("../tunnel/BoundedResponse");
const ProgressRpcTransport_1 = require("./ProgressRpcTransport");
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
async function confirmSftpOperationStopped(operationId, initial, recovery) {
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
    async function reconcileUnknown() {
        if (!recovery || recovery.method !== "sync.serverToServerFpsync")
            throw new Error("旧传输结果未知，未重新传输；请核对目标后人工恢复。");
        const current = await recovery.discover("transfers.reconcile");
        if (current.features?.transferSettlementReconciliation !== true)
            throw new Error("旧传输结果未知；请更新 SimpleSFTP 并重载窗口，以核实旧传输退出后重试。");
        try {
            recovery.onProgress?.({ phase: "reconciling", elapsedMs: 0 });
        }
        catch { /* Telemetry cannot cancel recovery. */ }
        const params = recovery.params;
        const response = await fetch(new URL("/api/v1/rpc", current.endpoint), {
            method: "POST", headers: { ...current.headers, "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.reconcile", params: {
                    operationId, operationInstanceId: expectedInstanceId, requestKey: sftpRequestKey(recovery.method, params),
                    retryMethod: recovery.method, retryParams: {
                        localPath: params.localPath || params.localBase || params.workspacePath,
                        remotePath: params.remotePath, targetId: params.targetId || params.serverId, host: params.host,
                        server: identityOf(params.server), sftp: identityOf(params.sftp), source: identityOf(params.source),
                        destination: identityOf(params.destination), target: identityOf(params.target),
                    },
                } }), signal: AbortSignal.timeout(30_000),
        });
        const payload = await readSftpJson(response), proof = payload.result;
        if (!response.ok || payload.error || proof?.ok !== true || proof.operationId !== operationId
            || proof.operationInstanceId !== expectedInstanceId || proof.instanceId !== current.instanceId)
            throw new Error("旧传输退出核实失败或身份已变化，未重新传输。");
        if (proof.status !== "settled" || proof.settled !== true)
            throw new Error(`旧传输尚未确认退出，未重新传输：${String(proof.reason || proof.status || "缺少退出证据").slice(0, 200)}`);
    }
    if (receipt.status === "outcomeUnknown")
        return reconcileUnknown();
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
            return reconcileUnknown();
        const active = [...state.transfers, ...state.operations].some(row => (row.operationId || row.id) === operationId);
        if (!active)
            throw new Error("SimpleSFTP 缺少该传输的完成回执，未重新传输。");
        await new Promise(resolve => setTimeout(resolve, 250));
    } while (Date.now() < deadline);
    throw new Error("旧传输取消尚未完成，未重新传输。");
}
async function callSftpWithProgress(method, params, discover, onProgress) {
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
    const startedAt = Date.now();
    let timer, disposed = false;
    let forgetStopCheck = () => { };
    let cancellation, operationSent = false, operationNotStarted = false;
    let stopPending = false;
    function cancelRemote() {
        if (cancellation)
            return cancellation;
        cancellation = cancelRemoteCore();
        return cancellation;
    }
    async function cancelRemoteCore() {
        try {
            const response = await fetch(new URL("/api/v1/rpc", endpoint), {
                method: "POST", headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.cancel", params: { operationId, operationInstanceId: discovery.instanceId, reason: "调用方已取消或无真实进展" } }),
                signal: AbortSignal.timeout(30_000),
            });
            if (discovery.features?.transferSettlementReceipts !== true) {
                await response.body?.cancel();
                return;
            }
            const payload = await readSftpJson(response);
            const receipt = payload.result;
            const matches = (row) => row?.operationId === operationId && row?.operationInstanceId === discovery.instanceId;
            if (!response.ok || payload.error || !matches(receipt)) {
                stopPending = true;
                return;
            }
            if (receipt.status === "settled" && receipt.settled === true)
                return;
            if (receipt.status !== "cancelling") {
                stopPending = true;
                return;
            }
            const deadline = Date.now() + 20_000;
            do {
                const stateResponse = await fetch(new URL("/api/v1/rpc", endpoint), {
                    method: "POST", headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify({ jsonrpc: "2.0", id: operationId, method: "transfers.list", params: {} }), signal: AbortSignal.timeout(10_000),
                });
                const state = (await readSftpJson(stateResponse)).result;
                if (state?.instanceId !== discovery.instanceId)
                    break;
                if (state?.settledOperations?.some((row) => matches(row) && row.status === "settled" && row.settledAt))
                    return;
                const current = state?.operations?.find(matches);
                const active = state?.transfers?.some((row) => row?.operationId === operationId);
                if (current?.status === "outcomeUnknown" && !active) {
                    stopPending = true;
                    return;
                }
                if (!current && !active)
                    break;
                await new Promise(resolve => setTimeout(resolve, 250));
            } while (Date.now() < deadline);
            stopPending = true;
        }
        catch {
            stopPending = true; /* Outcome remains unknown; never replay a modifying operation. */
        }
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
        const phase = typeof item.phase === "string" ? item.phase.slice(0, 64) : "";
        const count = (value) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined;
        const processedBytes = count(item.processedBytes ?? item.transferredBytes), processedFiles = count(item.processedFiles);
        const changed = inactivity.update({ phase, scope: item.progressScope || item.id, processedBytes, processedFiles, status: item.status });
        if (changed && onProgress) {
            const visiblePhase = ["packing", "transferring", "unpacking"].includes(phase) ? "streaming" : phase;
            try {
                onProgress({ phase: visiblePhase, processedBytes, processedFiles, transferredBytes: count(item.transferredBytes),
                    comparedFiles: count(item.comparedFiles), changedFiles: count(item.changedFiles), totalBytes: count(item.totalBytes),
                    cacheHits: count(item.cacheHits), cacheRehash: count(item.cacheRehash),
                    cacheStatus: ["ready", "unavailable", "read-failed", "write-failed"].includes(item.cacheStatus) ? item.cacheStatus : undefined,
                    missingFiles: count(item.missingFiles), differentFiles: count(item.differentFiles), unchangedFiles: count(item.unchangedFiles),
                    completedFiles: count(item.completedFiles), totalFiles: count(item.totalFiles),
                    completedGroups: count(item.completedGroups), totalGroups: count(item.totalGroups), elapsedMs: Date.now() - startedAt });
            }
            catch { /* Notification failures cannot cancel a genuine transfer. */ }
        }
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
        const recovery = { method, params, discover, onProgress };
        const registerStopCheck = () => (0, SafeRequestRetry_1.registerRetryStopCheck)(() => confirmSftpOperationStopped(operationId, discovery, recovery));
        if (fileOperation)
            forgetStopCheck = registerStopCheck();
        const { signal: _signal, ...serializable } = params;
        const requestBody = JSON.stringify({ jsonrpc: "2.0", id: operationId, method, params: {
                ...serializable, _operationId: operationId, _operationInstanceId: discovery.instanceId,
                _requestKey: sftpRequestKey(method, serializable),
            } });
        const sendOperation = async () => {
            try {
                operationSent = true;
                operationNotStarted = false;
                const response = await (0, ProgressRpcTransport_1.postProgressRpc)(new URL("/api/v1/rpc", endpoint), {
                    headers: { ...headers, "Content-Type": "application/json" }, body: requestBody, signal: requestAbort.signal,
                });
                if (!response.ok)
                    void response.body?.cancel().catch(() => undefined);
                return response;
            }
            catch (error) {
                if (requestAbort.signal.aborted)
                    throw requestAbort.signal.reason || error;
                const cause = error?.cause?.code || error?.code;
                const detail = `${error instanceof Error ? error.message : String(error || "连接中断")}${cause ? ` [${String(cause).slice(0, 64)}]` : ""}`;
                throw new Error(`SimpleSFTP ${method} 请求中断，旧传输结果未知，未重新传输；刷新目标状态并确认远端退出后再重试。${detail ? ` (${detail})` : ""}`);
            }
        };
        let response = await sendOperation();
        if (!response.ok)
            throw new Error(`SimpleSFTP ${method} 失败：HTTP ${response.status}`);
        let payload = await readSftpJson(response);
        requestAbort.signal.throwIfAborted();
        const blocker = payload.error?.data;
        operationNotStarted = blocker?.notStarted === true;
        if (fileOperation && blocker?.blockedOperationId && typeof blocker.operationInstanceId === "string") {
            // Only an explicit producer receipt proves that this new operation never
            // started. Do not retain a stop check for a nonexistent operation id.
            if (blocker.notStarted === true)
                forgetStopCheck();
            await confirmSftpOperationStopped(String(blocker.blockedOperationId), { ...discovery, instanceId: blocker.operationInstanceId }, recovery);
            (0, SafeRequestRetry_1.assertRetryRequestCurrent)();
            requestAbort.signal.throwIfAborted();
            if (blocker.notStarted === true)
                forgetStopCheck = registerStopCheck();
            response = await sendOperation();
            if (!response.ok)
                throw new Error(`SimpleSFTP ${method} 失败：HTTP ${response.status}`);
            payload = await readSftpJson(response);
            requestAbort.signal.throwIfAborted();
        }
        if (payload.error || payload.result?.ok === false) {
            if (payload.error?.data?.notStarted === true) {
                operationNotStarted = true;
                forgetStopCheck();
            }
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
    catch (error) {
        // A failed wait must not silently abandon a still-running child. Cancel
        // only this operation; unknown remote exit still requires the saved guard.
        if (fileOperation && operationSent && !operationNotStarted)
            await cancelRemote();
        if (stopPending && !scopedSignal?.aborted)
            throw new Error(`${error instanceof Error ? error.message : String(error)}；已请求停止本次传输，退出结果待确认（${operationId}）。请刷新传输状态，勿并发重发。`);
        throw error;
    }
    finally {
        disposed = true;
        inactivity.dispose();
        clearTimeout(timer);
        eventsAbort.abort();
        params.signal?.removeEventListener("abort", onCancel);
    }
}
