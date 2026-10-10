"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealtimeTunnelClient = exports.defaultRealtimeRefreshPolicy = void 0;
const RequestBudget_1 = require("./RequestBudget");
const SharedReadCoalescer_1 = require("../core/SharedReadCoalescer");
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
    sharedReads = new SharedReadCoalescer_1.SharedReadCoalescer(64);
    requiresManualReconnect = false;
    connectionGeneration = 0;
    disposed = false;
    workerGpuUpdatedAt = 0;
    constructor(endpoint, budget, policy = exports.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.endpoint = endpoint;
        this.budget = budget;
        this.policy = policy;
        this.onState = onState;
        this.http = new TunnelClient_1.HttpTunnelClient(endpoint, budget);
        this.files = new FileTransferClient_1.FileTransferClient({ ...endpoint, fileCapabilities: endpoint.fileCapabilities }, budget);
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
                if (this.isWorkerTelemetryEndpoint())
                    await this.refreshSnapshot();
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
                if (options.manual || this.isWorkerTelemetryEndpoint())
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
        const disposeTransfers = reason === "deactivate" || reason === "dispose";
        if (disposeTransfers)
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
        if (disposeTransfers)
            await this.files.dispose();
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
            ? reason + "；连接配置或认证失败，请修复配置后重新检测隧道。"
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
        const generation = this.connectionGeneration;
        return this.coalescedRead(`gpu:${options.dispatch === true ? "dispatch" : "snapshot"}`, undefined, async () => {
            const value = await this.http.getGpu(options);
            if (generation === this.connectionGeneration && !this.disposed) {
                if (this.isWorkerTelemetryEndpoint())
                    this.acceptWorkerGpuSample(value);
                else {
                    const gpu = gpuSnapshotRows(value, "hub");
                    this.state = { ...this.state, gpu, lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu } };
                    this.onState(this.state);
                }
            }
            return value;
        });
    }
    isWorkerTelemetryEndpoint() {
        return this.endpoint.role === "worker"
            || objectRecord(this.endpoint.capabilities)?.mode === "worker_telemetry";
    }
    workerEndpointId() {
        return String(this.endpoint.id || this.endpoint.resourceServer || "hub");
    }
    acceptWorkerGpuSample(value) {
        const item = objectRecord(value) || {};
        const sampledAt = Date.parse(String(item.generatedAt || item.updatedAt || ""));
        const sampleTime = Number.isFinite(sampledAt) ? sampledAt : Date.now();
        if (sampleTime < this.workerGpuUpdatedAt)
            return;
        this.workerGpuUpdatedAt = sampleTime;
        const workerId = this.workerEndpointId();
        const gpu = gpuSnapshotRows(value, workerId);
        this.state = { ...this.state, gpu,
            lastHeartbeatAt: new Date().toISOString(),
            workerHealth: { ...(this.state.workerHealth || {}), [workerId]: {
                    status: item.status || "ok", lastError: item.error || "", updatedAt: item.generatedAt || "",
                } },
            lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu },
        };
        this.onState(this.state);
    }
    getGpuHistory(query = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        // T2: 批量能力协商字段透传至 HttpTunnelClient，聚合由 MultiEndpointRealtimeClient 完成
        return this.coalescedRead(`gpu-history:${stableReadKey(query)}`, undefined, () => this.http.getGpuHistory(query));
    }
    getScheduler() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("scheduler", undefined, () => this.http.getScheduler());
    }
    getTraces() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("traces", undefined, () => this.http.getTraces());
    }
    getLiveOutput(runKey, since = 0, options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead(`live-output:${String(runKey)}:${Math.max(0, Number(since) || 0)}`, options, () => this.http.getLiveOutput(runKey, since, options));
    }
    coalescedRead(key, options, operation) {
        // An explicitly cancellable or user-triggered request keeps its own budget
        // semantics. Background reads without per-caller cancellation may share a
        // single in-flight RPC and never retain the completed value.
        const independentlyScoped = Boolean(options?.signal || options?.userInitiated === true);
        if (!independentlyScoped && this.sharedReads.has(key))
            this.budget.noteCoalescedRequest();
        const request = independentlyScoped ? Promise.resolve().then(operation) : this.sharedReads.run(key, operation);
        return this.watchRead(request);
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
        return this.coalescedRead(`results-summary:${String(planFile || "").replace(/\\/g, "/")}`, options, () => this.http.getResultsSummary(planFile, options));
    }
    getDiagnostics() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("diagnostics", undefined, () => this.http.getDiagnostics());
    }
    getAuditTail() {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("audit-tail", undefined, () => this.http.getAuditTail());
    }
    getOperation(operationId) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead(`operation:${String(operationId)}`, undefined, () => this.http.getOperation(operationId));
    }
    getWorkerTasks(options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("worker-tasks", options, () => this.http.getWorkerTasks(options));
    }
    getRunEvidence(params) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        if (!this.http.getRunEvidence)
            return Promise.reject(new Error("Agent runtime does not expose run evidence."));
        return this.coalescedRead(`run-evidence:${stableReadKey(params)}`, undefined, () => this.http.getRunEvidence(params));
    }
    listRemoteFiles(remotePath) {
        return this.files.list(remotePath);
    }
    postAction(action, body, options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.http.postAction(action, body, options);
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
            if (typeof event.data === "string" && Buffer.byteLength(event.data, "utf8") > BoundedResponse_1.MAX_SSE_EVENT_BYTES) {
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
                if (this.isWorkerTelemetryEndpoint()) {
                    // Worker telemetry deliberately has no Hub /api/snapshot. Bootstrap
                    // from current snapshots even when no GPU change is in the SSE replay.
                    const [gpuResult, tasksResult] = await Promise.allSettled([
                        this.http.getGpu(), this.http.getWorkerTasks({ signal: abort.signal }),
                    ]);
                    if (gpuResult.status === "rejected")
                        throw gpuResult.reason;
                    if (generation !== this.connectionGeneration || this.disposed)
                        return { gpu: {} };
                    this.acceptWorkerGpuSample(gpuResult.value);
                    if (tasksResult.status === "fulfilled") {
                        const tasks = objectRecord(tasksResult.value) || {};
                        const rows = Array.isArray(tasksResult.value) ? tasksResult.value : tasks.tasks || tasks.workerTasks || tasks.rows;
                        if (Array.isArray(rows))
                            this.state = (0, RealtimeEventReducer_1.compactRealtimeState)({ ...this.state,
                                workerTasks: { ...(this.state.workerTasks || {}), [this.workerEndpointId()]: rows },
                            }, { protectedLogKeys: this.protectedLogKeys });
                    }
                    snapshot = { generatedAt: objectRecord(gpuResult.value)?.generatedAt, gpu: this.state.gpu };
                }
                else
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
            if (this.isWorkerTelemetryEndpoint())
                this.lastError = undefined;
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
        if (journalGap) {
            this.state = (0, RealtimeEventReducer_1.compactRealtimeState)({ ...this.state, lastSeq: 0 }, { protectedLogKeys: this.protectedLogKeys });
            if (this.state !== beforeState)
                this.onState(this.state);
            void this.getSnapshot()
                .catch((error) => { this.lastError = message(error); })
                .finally(() => {
                // The stream remains connected; a snapshot repairs the replay gap.
            });
            return;
        }
        this.state = (0, RealtimeEventReducer_1.applyRealtimeEvent)(this.state, raw, { protectedLogKeys: this.protectedLogKeys });
        if (this.isWorkerTelemetryEndpoint() && event && typeof event === "object"
            && event.type === "gpu_snapshot" && this.state.lastSeq > before) {
            const sampledAt = Date.parse(event.generatedAt);
            if (Number.isFinite(sampledAt) && sampledAt < this.workerGpuUpdatedAt) {
                // Advance replay cursor without letting an old journal sample undo HTTP refresh.
                this.state = { ...this.state, gpu: beforeState.gpu,
                    lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu: beforeState.gpu } };
            }
            else {
                if (Number.isFinite(sampledAt))
                    this.workerGpuUpdatedAt = sampledAt;
                const gpu = { [this.workerEndpointId()]: this.state.gpu[event.workerId || event.serverId || "hub"] || [] };
                const payload = objectRecord(event.payload) || {};
                this.state = { ...this.state, gpu,
                    workerHealth: { ...(this.state.workerHealth || {}), [this.workerEndpointId()]: {
                            status: payload.status || "ok", lastError: payload.error || "", updatedAt: event.generatedAt,
                        } }, lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu } };
            }
        }
        if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey)
            this.onState(this.state);
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
function gpuSnapshotRows(value, serverId) {
    if (Array.isArray(value))
        return { [serverId]: value };
    const item = objectRecord(value) || {};
    for (const rows of [item.gpu, item.gpus, item.rows]) {
        if (Array.isArray(rows))
            return { [serverId]: rows };
        if (rows && typeof rows === "object")
            return Object.fromEntries(Object.entries(rows)
                .map(([key, value]) => [key === "hub" ? serverId : key, Array.isArray(value) ? value : []]));
    }
    return { [serverId]: [] };
}
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
function stableReadKey(value) {
    const normalize = (input, depth) => {
        if (depth > 5)
            return "[depth-limit]";
        if (input === null || typeof input === "string" || typeof input === "boolean")
            return typeof input === "string" ? input.slice(0, 512) : input;
        if (typeof input === "number")
            return Number.isFinite(input) ? input : null;
        if (Array.isArray(input))
            return input.slice(0, 64).map((item) => normalize(item, depth + 1));
        if (!input || typeof input !== "object")
            return String(input ?? "").slice(0, 128);
        return Object.fromEntries(Object.keys(input).sort().slice(0, 64)
            .map((key) => [key.slice(0, 128), normalize(input[key], depth + 1)]));
    };
    try {
        return JSON.stringify(normalize(value, 0)).slice(0, 2048);
    }
    catch {
        return "{}";
    }
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
