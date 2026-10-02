"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTunnelClient = exports.defaultRealtimeRefreshPolicy = void 0;
const RequestBudget_1 = require("./RequestBudget");
const FileTransferClient_1 = require("./FileTransferClient");
const RealtimeReconnect_1 = require("./RealtimeReconnect");
const RealtimeEventReducer_1 = require("./RealtimeEventReducer");
const TunnelClient_1 = require("./TunnelClient");
// T2: RealtimeTunnelClient 透传批量能力协商字段，聚合逻辑在 MultiEndpointRealtimeClient
const TunnelGateway_1 = require("./TunnelGateway");
const BoundedResponse_1 = require("./BoundedResponse");
exports.defaultRealtimeRefreshPolicy = {
    mode: "realtime",
    preferWebSocket: true,
    fallbackToSse: true,
    fallbackToPolling: true,
    heartbeatIntervalSeconds: 5,
    snapshotFallbackIntervalSeconds: 5,
    gpuEventCoalesceMs: 500,
    uiBatchMs: 100,
    logTailEnabledByDefault: false,
    logTailOnlyForSelectedExperiment: true,
    logTailIntervalSeconds: 1,
    fileTransferManualOnly: true,
    fileTransferMaxConcurrent: 1,
    reconnectInitialDelaySeconds: 3,
    reconnectMaxDelaySeconds: 60,
    pauseWhenWebviewHidden: false,
    keepAgentStreamWhenHidden: true,
};
class RealtimeTunnelClient {
    endpoint;
    budget;
    policy;
    onState;
    http;
    files;
    reconnectPolicy;
    state = (0, RealtimeEventReducer_1.createRealtimeState)();
    status = "disconnected";
    websocket;
    abort;
    pollTimer;
    reconnectTimer;
    reconnectCount = 0;
    lastError;
    hidden = false;
    protectedLogKeys = [];
    diagnosticsCache;
    snapshotInFlight;
    snapshotAbort;
    requiresManualReconnect = false;
    connectionGeneration = 0;
    disposed = false;
    constructor(endpoint, budget, policy = exports.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.endpoint = endpoint;
        this.budget = budget;
        this.policy = policy;
        this.onState = onState;
        this.http = new TunnelClient_1.HttpTunnelClient(endpoint, budget);
        this.files = new FileTransferClient_1.FileTransferClient(endpoint, budget);
        this.reconnectPolicy = new RealtimeReconnect_1.RealtimeReconnect(policy);
    }
    async connect(sinceSeq = this.state.lastSeq, options = {}) {
        if (this.disposed)
            return;
        if (this.requiresManualReconnect && !options.manual)
            return;
        if (["websocket", "sse", "polling", "connecting"].includes(this.status))
            return;
        if (this.budget.isPaused())
            throw new RequestBudget_1.RequestBudgetDeniedError("events", { allowed: false, reason: "paused" });
        this.requiresManualReconnect = false;
        const generation = this.connectionGeneration + 1;
        await this.disconnect("reconnect");
        if (!this.isCurrentConnection(generation))
            return;
        if (this.policy.mode === "manual_only") {
            this.status = "polling";
            await this.refreshSnapshot();
            return;
        }
        this.status = "connecting";
        if (this.shouldUseWebSocket()) {
            try {
                await this.budget.run("events", async () => {
                    this.connectWebSocket(sinceSeq);
                }, { userInitiated: true });
                return;
            }
            catch (error) {
                if (!this.isCurrentConnection(generation))
                    return;
                if (error instanceof RequestBudget_1.RequestBudgetDeniedError) {
                    this.status = "disconnected";
                    throw error;
                }
                this.lastError = message(error);
                if (isHardConnectionError(error)) {
                    this.connectionLost(this.lastError);
                    return;
                }
            }
        }
        if (this.shouldUseSse()) {
            try {
                await this.connectSse(sinceSeq);
                if (!this.isCurrentConnection(generation))
                    return;
                if (options.manual)
                    await this.getSnapshot();
                return;
            }
            catch (error) {
                if (!this.isCurrentConnection(generation))
                    return;
                this.lastError = message(error);
                if (isHardConnectionError(error)) {
                    this.connectionLost(this.lastError);
                    return;
                }
            }
        }
        if (this.policy.fallbackToPolling) {
            try {
                await this.startPolling();
            }
            catch (error) {
                if (this.isCurrentConnection(generation))
                    this.connectionLost(message(error));
            }
            return;
        }
        if (this.isCurrentConnection(generation))
            this.connectionLost(this.lastError || "Connection failed");
    }
    isCurrentConnection(generation) {
        return generation === this.connectionGeneration && !this.disposed && this.status !== "paused" && !this.budget.isPaused();
    }
    async disconnect(reason = "manual") {
        this.connectionGeneration += 1;
        this.snapshotAbort?.abort();
        this.snapshotAbort = undefined;
        this.snapshotInFlight = undefined;
        if (reason === "deactivate" || reason === "dispose")
            this.disposed = true;
        const websocket = this.websocket;
        this.websocket = undefined;
        websocket?.close();
        this.abort?.abort();
        this.abort = undefined;
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.pollTimer = undefined;
        this.reconnectTimer = undefined;
        this.status = reason === "paused" ? "paused" : "disconnected";
    }
    async reconnect(reason = "reconnect") {
        await this.disconnect(reason);
        this.reconnectCount += 1;
        await this.connect(this.state.lastSeq, { manual: true });
        if (this.status !== "disconnected" && this.status !== "paused")
            await this.getSnapshot();
    }
    connectionLost(reason) {
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        this.pollTimer = undefined;
        if (this.disposed || this.status === "paused" || this.budget.isPaused())
            return;
        const websocket = this.websocket;
        this.websocket = undefined;
        websocket?.close();
        const abort = this.abort;
        this.abort = undefined;
        abort?.abort();
        this.status = "disconnected";
        this.requiresManualReconnect = isHardConnectionError(reason);
        this.lastError = this.requiresManualReconnect
            ? reason + "；连接配置或认证失败，请检查配置后手动重新连接。"
            : reason + (this.policy.mode === "manual_only" ? "；连接暂时中断，请手动刷新或重新连接。服务器任务可能仍在运行。" : "；连接暂时中断，插件将按退避间隔自动恢复。服务器任务可能仍在运行。");
        this.onState(this.state);
        if (!this.requiresManualReconnect)
            this.scheduleAutomaticReconnect();
    }
    scheduleAutomaticReconnect() {
        if (this.reconnectTimer || this.disposed || this.hidden || this.policy.mode === "manual_only" || this.status !== "disconnected" || this.budget.isPaused())
            return;
        const generation = this.connectionGeneration;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = undefined;
            if (this.disposed || this.hidden || this.status !== "disconnected" || this.budget.isPaused() || generation !== this.connectionGeneration)
                return;
            void this.connect(this.state.lastSeq).catch((error) => this.connectionLost(message(error)));
        }, this.reconnectPolicy.nextDelayMs());
        this.reconnectTimer.unref?.();
    }
    reportHardRequestError(error, generation) {
        if (generation !== this.connectionGeneration || this.disposed || this.status === "paused" || this.budget.isPaused())
            return;
        if (isHardConnectionError(error))
            this.connectionLost(message(error));
    }
    getHealth() {
        return this.http.getHealth({ userInitiated: true });
    }
    requestJson(apiPath, purpose, body, options) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        const generation = this.connectionGeneration;
        return this.http.requestJson(apiPath, purpose, body, options).catch((error) => {
            this.reportHardRequestError(error, generation);
            throw error;
        });
    }
    async getSnapshot() {
        return this.readSnapshot(true);
    }
    getGpu(options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getGpu(options));
    }
    getGpuHistory(query = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        // T2: 批量能力协商字段透传至 HttpTunnelClient，聚合由 MultiEndpointRealtimeClient 完成
        return this.watchRead(this.http.getGpuHistory(query));
    }
    getScheduler() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getScheduler());
    }
    getTraces() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getTraces());
    }
    getLiveOutput(runKey, since = 0, options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getLiveOutput(runKey, since, options));
    }
    watchRead(request) {
        const generation = this.connectionGeneration;
        return request.catch((error) => {
            if (!(error instanceof RequestBudget_1.RequestBudgetDeniedError))
                this.reportHardRequestError(error, generation);
            throw error;
        });
    }
    setProtectedLogKeys(keys) {
        this.protectedLogKeys = normalizeProtectedLogKeys(keys);
        this.state = (0, RealtimeEventReducer_1.compactRealtimeState)(this.state, { protectedLogKeys: this.protectedLogKeys });
    }
    getResultsSummary(planFile = "", options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getResultsSummary(planFile, options));
    }
    getDiagnostics() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getDiagnostics());
    }
    getAuditTail() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getAuditTail());
    }
    getOperation(operationId) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getOperation(operationId));
    }
    getWorkerTasks(options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.watchRead(this.http.getWorkerTasks(options));
    }
    getRunEvidence(params) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.http.getRunEvidence?.(params) ?? Promise.reject(new Error("Agent runtime does not expose run evidence."));
    }
    listRemoteFiles(remotePath) {
        return this.files.list(remotePath);
    }
    postAction(action, body) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.http.postAction(action, body);
    }
    postAvailabilityBatch(body) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.http.postAvailabilityBatch(body);
    }
    downloadFile(remotePath, localPath, options = {}) {
        return this.files.downloadFile(remotePath, localPath, options);
    }
    uploadFile(localPath, remotePath) {
        return this.files.uploadFile(localPath, remotePath);
    }
    setHidden(hidden) {
        this.hidden = hidden;
        this.budget.setHidden(hidden);
        if (hidden && this.pollTimer) {
            clearTimeout(this.pollTimer);
            this.pollTimer = undefined;
        }
        if (hidden && this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (hidden && this.policy.pauseWhenWebviewHidden && !this.policy.keepAgentStreamWhenHidden && this.status !== "paused" && this.status !== "disconnected") {
            void this.disconnect("paused");
            return;
        }
        if (!hidden && this.status === "paused" && this.policy.pauseWhenWebviewHidden && !this.budget.isPaused()) {
            void this.connect(this.state.lastSeq).catch((error) => { this.lastError = message(error); });
        }
        if (!hidden && this.status === "polling")
            this.scheduleSnapshotFallbackPoll();
        if (!hidden && this.status === "disconnected" && !this.requiresManualReconnect && !this.budget.isPaused())
            this.scheduleAutomaticReconnect();
    }
    diagnostics() {
        const cached = this.diagnosticsCache;
        if (cached
            && cached.streamStatus === this.status
            && cached.lastSeq === this.state.lastSeq
            && cached.lastHeartbeatAt === this.state.lastHeartbeatAt
            && cached.reconnectCount === this.reconnectCount
            && cached.requiresManualReconnect === this.requiresManualReconnect
            && cached.lastError === this.lastError) {
            return cached;
        }
        const diagnostics = {
            streamStatus: this.status,
            lastSeq: this.state.lastSeq,
            lastHeartbeatAt: this.state.lastHeartbeatAt,
            reconnectCount: this.reconnectCount,
            lastError: this.lastError,
            requiresManualReconnect: this.requiresManualReconnect,
        };
        this.diagnosticsCache = diagnostics;
        return diagnostics;
    }
    currentState() {
        return this.state;
    }
    connectWebSocket(sinceSeq) {
        const wsUrl = (0, TunnelGateway_1.localBaseUrl)(this.endpoint).replace(/^http:/, "ws:") + `/api/events?since=${encodeURIComponent(String(sinceSeq))}`;
        const ws = new WebSocket(wsUrl);
        this.websocket = ws;
        ws.onopen = () => {
            if (this.websocket !== ws)
                return;
            this.status = "websocket";
            this.reconnectPolicy.reset();
        };
        ws.onmessage = (event) => {
            if (this.websocket !== ws)
                return;
            if (typeof event.data === "string" && Buffer.byteLength(event.data, "utf8") > BoundedResponse_1.MAX_CONTROL_RESPONSE_BYTES) {
                this.connectionLost("Agent WebSocket frame exceeds control-plane byte limit");
                return;
            }
            this.acceptEvent(event.data);
        };
        ws.onerror = () => {
            if (this.websocket !== ws)
                return;
            this.lastError = "websocket error";
        };
        ws.onclose = () => {
            if (this.websocket !== ws)
                return;
            this.websocket = undefined;
            if (this.status === "paused")
                return;
            this.connectionLost("WebSocket closed");
        };
    }
    async connectSse(sinceSeq) {
        const abort = new AbortController();
        this.abort = abort;
        const response = await this.budget.run("events", () => fetch(`${(0, TunnelGateway_1.localBaseUrl)(this.endpoint)}/api/events/sse?since=${encodeURIComponent(String(sinceSeq))}`, {
            headers: this.headers(),
            signal: abort.signal,
        }));
        if (this.abort !== abort || abort.signal.aborted || this.disposed) {
            await response.body?.cancel().catch(() => undefined);
            return;
        }
        if (!response.ok || !response.body) {
            await response.body?.cancel().catch(() => undefined);
            throw new Error(`SSE failed: ${response.status}`);
        }
        this.status = "sse";
        this.reconnectPolicy.reset();
        void this.readSse(response.body, abort);
    }
    async readSse(body, abort) {
        const reader = body.getReader();
        const decoder = new BoundedResponse_1.BoundedSseDecoder();
        let failure = "SSE ended";
        let finished = false;
        try {
            while (true) {
                const chunk = await reader.read();
                if (this.abort !== abort || abort.signal.aborted)
                    break;
                if (chunk.done) {
                    finished = true;
                    break;
                }
                for (const data of decoder.push(chunk.value))
                    this.acceptEvent(data);
            }
            if (this.abort !== abort || abort.signal.aborted || this.disposed)
                return;
            for (const data of decoder.push())
                this.acceptEvent(data);
        }
        catch (error) {
            failure = message(error);
        }
        finally {
            if (!finished)
                await reader.cancel().catch(() => undefined);
            reader.releaseLock();
        }
        if (this.abort === abort && !abort.signal.aborted && this.status === "sse")
            this.connectionLost(failure);
    }
    async startPolling() {
        this.status = "polling";
        await this.refreshSnapshot();
        this.scheduleSnapshotFallbackPoll();
    }
    scheduleSnapshotFallbackPoll() {
        if (this.status !== "polling" || this.hidden)
            return;
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        const generation = this.connectionGeneration;
        this.pollTimer = setTimeout(() => {
            if (!this.isCurrentConnection(generation) || this.status !== "polling" || this.hidden)
                return;
            this.pollTimer = undefined;
            void this.refreshSnapshot()
                .catch((error) => { if (this.isCurrentConnection(generation))
                this.connectionLost(message(error)); })
                .finally(() => { if (this.isCurrentConnection(generation))
                this.scheduleSnapshotFallbackPoll(); });
        }, this.snapshotFallbackDelayMs());
        this.pollTimer.unref?.();
    }
    snapshotFallbackDelayMs() {
        return Math.max(5, Number(this.policy.snapshotFallbackIntervalSeconds) || 5) * 1000;
    }
    async refreshSnapshot() {
        await this.readSnapshot(false);
    }
    async readSnapshot(manual) {
        if (this.requiresManualReconnect)
            throw new Error(this.lastError);
        if (this.snapshotInFlight)
            return this.snapshotInFlight;
        const abort = new AbortController();
        this.snapshotAbort = abort;
        const task = (async () => {
            const generation = this.connectionGeneration;
            let snapshot;
            try {
                snapshot = await this.http.getSnapshot({ manual, signal: abort.signal });
            }
            catch (error) {
                if (generation === this.connectionGeneration && !(error instanceof RequestBudget_1.RequestBudgetDeniedError))
                    this.connectionLost(message(error));
                throw error;
            }
            if (generation !== this.connectionGeneration)
                return snapshot;
            this.reconnectPolicy.reset();
            if (this.policy.mode === "manual_only" && this.status === "disconnected") {
                this.status = "polling";
                this.lastError = undefined;
            }
            this.state = (0, RealtimeEventReducer_1.applySnapshot)(this.state, snapshot, { protectedLogKeys: this.protectedLogKeys });
            this.onState(this.state);
            return snapshot;
        })();
        this.snapshotInFlight = task;
        try {
            return await task;
        }
        finally {
            if (this.snapshotInFlight === task)
                this.snapshotInFlight = undefined;
            if (this.snapshotAbort === abort)
                this.snapshotAbort = undefined;
        }
    }
    acceptEvent(raw) {
        const event = typeof raw === "string" ? safeJson(raw) : raw;
        const journalGap = isJournalGapEvent(event);
        const beforeState = this.state;
        const before = this.state.lastSeq;
        const beforeDirtyKey = this.state.resultSummaryDirtyKey;
        this.state = (0, RealtimeEventReducer_1.applyRealtimeEvent)(this.state, raw, { protectedLogKeys: this.protectedLogKeys });
        if (journalGap)
            this.state = (0, RealtimeEventReducer_1.compactRealtimeState)({ ...this.state, lastSeq: 0 }, { protectedLogKeys: this.protectedLogKeys });
        if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey)
            this.onState(this.state);
        if (journalGap) {
            void this.getSnapshot()
                .catch((error) => { this.lastError = message(error); })
                .finally(() => {
                // The stream remains connected; a snapshot repairs the replay gap.
            });
        }
    }
    headers() {
        const headers = { Accept: "text/event-stream, application/json" };
        if (this.endpoint.token)
            headers["X-Simple-Agent-Token"] = this.endpoint.token;
        return headers;
    }
    shouldUseWebSocket() {
        if (!this.policy.preferWebSocket || typeof WebSocket === "undefined")
            return false;
        const endpoints = capabilityEndpoints(this.endpoint.capabilities);
        return endpoints ? endpoints.websocketEvents !== false : true;
    }
    shouldUseSse() {
        if (!this.policy.fallbackToSse)
            return false;
        const endpoints = capabilityEndpoints(this.endpoint.capabilities);
        return endpoints ? endpoints.sseEvents !== false : true;
    }
}
exports.RealtimeTunnelClient = RealtimeTunnelClient;
function normalizeProtectedLogKeys(keys) {
    return [...new Set((Array.isArray(keys) ? keys : []).map((key) => String(key || "").trim()).filter(Boolean))];
}
function isHardConnectionError(error) {
    const text = message(error);
    const status = text.match(/(?:HTTP|SSE failed:?\s*)\s*(401|403|426)\b/i)?.[1];
    return Boolean(status || /(?:version mismatch|版本不兼容|认证失败|unauthorized|forbidden|invalid token)/i.test(text));
}
function capabilityEndpoints(capabilities) {
    const caps = objectRecord(capabilities);
    return objectRecord(caps?.endpoints);
}
function objectRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}
function safeJson(text) {
    if (typeof text !== "string")
        return text;
    try {
        return JSON.parse(text);
    }
    catch {
        return undefined;
    }
}
function message(error) {
    return error instanceof Error ? error.message : String(error);
}
function isJournalGapEvent(event) {
    return Boolean(event && typeof event === "object" && event.payload?.code === "journal_gap");
}
