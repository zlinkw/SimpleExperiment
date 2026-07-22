"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTunnelClient = exports.defaultRealtimeRefreshPolicy = void 0;
const RequestBudget_1 = require("./RequestBudget");
const FileTransferClient_1 = require("./FileTransferClient");
const RealtimeReconnect_1 = require("./RealtimeReconnect");
const RealtimeEventReducer_1 = require("./RealtimeEventReducer");
const TunnelClient_1 = require("./TunnelClient");
const TunnelGateway_1 = require("./TunnelGateway");
exports.defaultRealtimeRefreshPolicy = {
    mode: "realtime",
    preferWebSocket: true,
    fallbackToSse: true,
    fallbackToPolling: true,
    heartbeatIntervalSeconds: 5,
    snapshotFallbackIntervalSeconds: 60,
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
    constructor(endpoint, budget, policy = exports.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.endpoint = endpoint;
        this.budget = budget;
        this.policy = policy;
        this.onState = onState;
        this.http = new TunnelClient_1.HttpTunnelClient(endpoint, budget);
        this.files = new FileTransferClient_1.FileTransferClient(endpoint, budget);
        this.reconnectPolicy = new RealtimeReconnect_1.RealtimeReconnect(policy);
    }
    async connect(sinceSeq = this.state.lastSeq) {
        if (this.budget.isPaused())
            throw new RequestBudget_1.RequestBudgetDeniedError("events", { allowed: false, reason: "paused" });
        await this.disconnect("reconnect");
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
                if (error instanceof RequestBudget_1.RequestBudgetDeniedError) {
                    this.status = "disconnected";
                    throw error;
                }
                this.lastError = message(error);
            }
        }
        if (this.shouldUseSse()) {
            try {
                await this.connectSse(sinceSeq);
                return;
            }
            catch (error) {
                this.lastError = message(error);
            }
        }
        if (this.policy.fallbackToPolling) {
            await this.startPolling();
            return;
        }
        this.status = "disconnected";
    }
    async disconnect(reason = "manual") {
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
        const delay = this.reconnectPolicy.nextDelayMs();
        this.reconnectCount += 1;
        this.reconnectTimer = setTimeout(() => void this.connect(this.state.lastSeq), delay);
        this.reconnectTimer.unref?.();
    }
    getHealth() {
        return this.http.getHealth({ userInitiated: true });
    }
    async getSnapshot() {
        const snapshot = await this.http.getSnapshot({ manual: true });
        this.state = (0, RealtimeEventReducer_1.applySnapshot)(this.state, snapshot);
        this.onState(this.state);
        return snapshot;
    }
    getGpu() {
        return this.http.getGpu();
    }
    getScheduler() {
        return this.http.getScheduler();
    }
    getTraces() {
        return this.http.getTraces();
    }
    getLiveOutput(runKey, since = 0) {
        return this.http.getLiveOutput(runKey, since);
    }
    getResultsSummary() {
        return this.http.getResultsSummary();
    }
    getDiagnostics() {
        return this.http.getDiagnostics();
    }
    getAuditTail() {
        return this.http.getAuditTail();
    }
    getOperation(operationId) {
        return this.http.getOperation(operationId);
    }
    listRemoteFiles(remotePath) {
        return this.files.list(remotePath);
    }
    postAction(action, body) {
        return this.http.postAction(action, body);
    }
    postAvailabilityBatch(body) {
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
        if (hidden && this.policy.pauseWhenWebviewHidden && !this.policy.keepAgentStreamWhenHidden && this.status !== "paused" && this.status !== "disconnected") {
            void this.disconnect("paused");
            return;
        }
        if (!hidden && this.status === "paused" && this.policy.pauseWhenWebviewHidden && !this.budget.isPaused()) {
            void this.connect(this.state.lastSeq).catch((error) => { this.lastError = message(error); });
        }
    }
    diagnostics() {
        return {
            streamStatus: this.status,
            lastSeq: this.state.lastSeq,
            lastHeartbeatAt: this.state.lastHeartbeatAt,
            reconnectCount: this.reconnectCount,
            lastError: this.lastError,
        };
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
            if (this.shouldUseSse()) {
                void this.connectSse(this.state.lastSeq).catch(() => this.reconnect("websocket closed"));
            }
            else if (this.policy.fallbackToPolling) {
                void this.startPolling().catch((error) => {
                    this.lastError = message(error);
                    void this.reconnect("websocket closed");
                });
            }
            else {
                void this.reconnect("websocket closed");
            }
        };
    }
    async connectSse(sinceSeq) {
        this.abort = new AbortController();
        const response = await this.budget.run("events", () => fetch(`${(0, TunnelGateway_1.localBaseUrl)(this.endpoint)}/api/events/sse?since=${encodeURIComponent(String(sinceSeq))}`, {
            headers: this.headers(),
            signal: this.abort?.signal,
        }));
        if (!response.ok || !response.body)
            throw new Error(`SSE failed: ${response.status}`);
        this.status = "sse";
        this.reconnectPolicy.reset();
        void this.readSse(response.body);
    }
    async readSse(body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        try {
            while (true) {
                const chunk = await reader.read();
                if (chunk.done)
                    break;
                buffer += decoder.decode(chunk.value, { stream: true });
                const parts = buffer.split(/\r?\n\r?\n/);
                buffer = parts.pop() || "";
                for (const part of parts) {
                    const data = part.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
                    if (data)
                        this.acceptEvent(data);
                }
            }
            buffer += decoder.decode();
            const data = buffer.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
            if (data)
                this.acceptEvent(data);
        }
        catch (error) {
            this.lastError = message(error);
        }
        if (this.status === "sse")
            void this.reconnect("sse ended");
    }
    async startPolling() {
        this.status = "polling";
        await this.refreshSnapshot();
        this.scheduleSnapshotFallbackPoll();
    }
    scheduleSnapshotFallbackPoll() {
        if (this.status !== "polling")
            return;
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        this.pollTimer = setTimeout(() => {
            this.pollTimer = undefined;
            void this.refreshSnapshot()
                .catch((error) => { this.lastError = message(error); })
                .finally(() => this.scheduleSnapshotFallbackPoll());
        }, this.snapshotFallbackDelayMs());
        this.pollTimer.unref?.();
    }
    snapshotFallbackDelayMs() {
        const baseMs = Math.max(60, Number(this.policy.snapshotFallbackIntervalSeconds) || 60) * 1000;
        const jitterMs = Math.floor(Math.random() * Math.min(30_000, Math.max(1_000, Math.floor(baseMs / 2))));
        return baseMs + jitterMs;
    }
    async refreshSnapshot() {
        const snapshot = await this.http.getSnapshot();
        this.state = (0, RealtimeEventReducer_1.applySnapshot)(this.state, snapshot);
        this.onState(this.state);
    }
    acceptEvent(raw) {
        const event = typeof raw === "string" ? safeJson(raw) : raw;
        const journalGap = isJournalGapEvent(event);
        const beforeState = this.state;
        const before = this.state.lastSeq;
        const beforeDirtyKey = this.state.resultSummaryDirtyKey;
        this.state = (0, RealtimeEventReducer_1.applyRealtimeEvent)(this.state, raw);
        if (journalGap)
            this.state = (0, RealtimeEventReducer_1.compactRealtimeState)({ ...this.state, lastSeq: 0 });
        if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey)
            this.onState(this.state);
        if (journalGap) {
            void this.getSnapshot()
                .catch((error) => { this.lastError = message(error); })
                .finally(() => {
                if (this.status !== "paused" && this.status !== "disconnected")
                    void this.reconnect("journal gap");
            });
        }
    }
    headers() {
        const headers = { Accept: "text/event-stream, application/json" };
        if (this.endpoint.token)
            headers["X-ZLK-Agent-Token"] = this.endpoint.token;
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
