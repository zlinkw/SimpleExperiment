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
exports.defaultRealtimeRefreshPolicy = Object.freeze({
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
    displayAutoRefresh: true,
});
class RealtimeTunnelClient {
    endpoint;
    budget;
    policyArgument;
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
    get progressGeneration() { return this.connectionGeneration; }
    disposed = false;
    workerGpuUpdatedAt = 0;
    // Each client owns its own policy copy: several endpoints are commonly built from one
    // policy object and an in-place write would silently change every other endpoint's cadence.
    policy;
    // True while the stream is closed only because display auto-refresh is off. That is an
    // intentional closure and must never be reported as tunnel_unavailable / local_port_closed.
    displayAutoClosed = false;
    // Real success evidence for the current connection: set only when a round actually succeeded (the
    // stream opened, or a snapshot was accepted) and dropped by any real connection loss or by closing
    // the client for anything other than the guard. A paused or still-handshaking client has no such
    // evidence, so a policy change must not reinterpret its outstanding failure as our own closure.
    verifiedDisplayRound = false;
    constructor(endpoint, budget, policyArgument = exports.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.endpoint = endpoint;
        this.budget = budget;
        this.policyArgument = policyArgument;
        this.onState = onState;
        this.policy = { ...policyArgument };
        this.http = new TunnelClient_1.HttpTunnelClient(endpoint, budget);
        this.files = new FileTransferClient_1.FileTransferClient({ ...endpoint, fileCapabilities: endpoint.fileCapabilities }, budget);
        this.reconnectPolicy = new RealtimeReconnect_1.RealtimeReconnect(this.policy);
    }
    async connect(sinceSeq = this.state.lastSeq, options = {}) {
        if (this.disposed)
            return;
        if (this.requiresManualReconnect && !options.manual)
            return;
        if (["websocket", "sse", "polling", "connecting"].includes(this.status))
            return;
        if (this.displayAutoRefreshDisabled()) {
            // A01/A04: no display stream, no initial snapshot (also not inside the manual_only branch),
            // no poll fallback and no display reconnect. Cached lastSeq/snapshot stay readable and a
            // manual single-shot read still works; nothing here marks the client as user-paused.
            this.clearDisplayTimers();
            if (this.status === "disconnected")
                this.markDisplayAutoClosed();
            return;
        }
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
                if (["websocket"].includes(this.status))
                    return;
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
                if (["sse"].includes(this.status))
                    return;
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
        // Only the display-auto closure is explained by the low-traffic guard; any other closure is a
        // real connection state change and must be able to surface as a connection error again.
        if (reason === "display-auto")
            this.markDisplayAutoClosed();
        else
            this.displayAutoClosed = false;
        // A guard closure keeps the success evidence of the round it closes; pausing keeps it too (the
        // user paused a channel that worked), while any other closure starts a new connection story.
        if (reason !== "display-auto" && reason !== "paused")
            this.verifiedDisplayRound = false;
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
        // A real connection loss is never the guard's intentional closure, and it invalidates the success
        // evidence of the round that just failed.
        this.displayAutoClosed = false;
        this.verifiedDisplayRound = false;
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
        if (this.reconnectTimer || this.disposed || this.hidden || this.displayAutoRefreshDisabled() || this.policy.mode === "manual_only" || this.status !== "disconnected" || this.budget.isPaused())
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
    getPlanCodeScope(query, options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        return this.coalescedRead("plan-code-scope:" + JSON.stringify(query), options, () => this.http.getPlanCodeScope(query, options));
    }
    getWorkerTasks(options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        const selection = [...new Set(options.retiredCommandIds || [])].sort().join(",") + JSON.stringify(options.queries || []) + JSON.stringify(options.declarations || []) + JSON.stringify(options.discovery || null) + ":execution=" + (options.executionOnly === true) + ":selected=" + (options.selectedOnly === true) + ":observation=" + (options.observationOnly === true) + ":declaration=" + (options.declarationOnly === true) + ":diagnostics=" + (options.diagnosticsOnly === true);
        const generation = this.connectionGeneration;
        return this.coalescedRead("worker-tasks:" + selection, options, () => this.http.getWorkerTasks(options)).then(value => {
            if (generation !== this.connectionGeneration || this.disposed)
                throw Object.assign(new Error("Worker connection changed during query"), { code: "CONNECTION_GENERATION_CHANGED" });
            // An execution inventory may carry the Worker's already-collected GPU sample.
            // Feeding the existing in-memory state keeps the display current without any
            // separate automatic getGpu read; the sample keeps its own collected time.
            const carried = value?.gpuSample;
            if (options.executionOnly === true && carried && typeof carried === "object" && this.isWorkerTelemetryEndpoint() && !("gpuSampleError" in value))
                this.acceptWorkerGpuSample(carried);
            return value;
        });
    }
    getSyncScopeIndex(query, options = {}) {
        if (this.requiresManualReconnect)
            return Promise.reject(new Error(this.lastError));
        if (!this.http.getSyncScopeIndex)
            return Promise.reject(new Error("SCOPE_INDEX_UNSUPPORTED"));
        const generation = this.connectionGeneration;
        return this.http.getSyncScopeIndex(query, options).then(value => {
            if (generation !== this.connectionGeneration || this.disposed)
                throw new Error("CONNECTION_GENERATION_CHANGED");
            return value;
        });
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
    /**
     * Low-traffic mode: re-apply the cadence and the A-class display guard in place. The policy object
     * is shared by every endpoint client built from one realtimeRefreshPolicy() snapshot, so nothing
     * is rebuilt: lastSeq, cached snapshots, budgets and task/operation state stay intact, a paused
     * client is never implicitly connected and the user refreshProfile/stream preference is untouched.
     * Turning the display guard off closes the display channel and aborts in-flight display reads
     * through disconnect("display-auto"), which also invalidates old reconnect/poll callbacks by
     * bumping the connection generation. It is deliberately not disconnect("paused").
     */
    /**
     * Decide whether the current closure may be attributed to the low-traffic display guard. Only a
     * genuine policy transition with nothing unresolved about the connection qualifies:
     * - a handshake that never completed (`connecting`) never qualifies, because there is no successful
     *   round to close and the outstanding attempt or failure keeps its own attribution;
     * - standing fault evidence (lastError / requiresManualReconnect) is superseded only by a round that
     *   really succeeded afterwards on a live stream; a pause is not proof of recovery, and a refused
     *   claim also drops any stale claim instead of leaving a wrong one behind;
     * - with no fault evidence at all, closing a live or paused display channel, or simply never opening
     *   one, is our own closure and must not be reported as an outage.
     * Nothing here marks the client as connected, online or already probed.
     */
    markDisplayAutoClosed() {
        if (this.status === "connecting") {
            this.displayAutoClosed = false;
            return;
        }
        const live = ["websocket", "sse", "polling"].includes(this.status);
        if (this.lastError || this.requiresManualReconnect) {
            this.displayAutoClosed = live && this.verifiedDisplayRound;
            return;
        }
        this.displayAutoClosed = true;
    }
    updateRefreshPolicy(policy) {
        if (this.disposed || !policy)
            return;
        const incoming = { ...policy };
        const previous = this.policy;
        const prevDisplayAutoRefresh = previous.displayAutoRefresh !== false;
        const prevFallback = Number(previous.snapshotFallbackIntervalSeconds);
        const displayAutoRefresh = incoming.displayAutoRefresh === undefined
            ? prevDisplayAutoRefresh
            : incoming.displayAutoRefresh !== false;
        const nextFallback = Number(incoming.snapshotFallbackIntervalSeconds);
        // The caller's object is never adopted: another endpoint mutating its own copy must not reach
        // this client, and restore decisions compare against this client's own previous view.
        this.policy = {
            ...previous,
            ...incoming,
            displayAutoRefresh,
            snapshotFallbackIntervalSeconds: Number.isFinite(nextFallback) && nextFallback >= 0
                ? nextFallback
                : previous.snapshotFallbackIntervalSeconds,
        };
        if (!displayAutoRefresh) {
            this.clearDisplayTimers();
            if (this.status !== "disconnected") {
                void this.disconnect("display-auto").catch(() => undefined);
            }
            else {
                this.markDisplayAutoClosed();
            }
            return;
        }
        if (prevDisplayAutoRefresh && prevFallback === this.policy.snapshotFallbackIntervalSeconds) {
            // Neither the display guard nor the cadence changed: never disturb a healthy connection.
            return;
        }
        // Restored to normal: re-arm exactly the channels this client had before, with the original
        // cadence, and never replay the rounds that were skipped while the mode was on. A client the
        // guard closed goes back through the normal connect path (stream first, then the configured
        // fallback); a polling client only re-arms its fallback poll.
        if (this.status === "polling") {
            this.scheduleSnapshotFallbackPoll();
            return;
        }
        if (this.status === "connecting")
            return;
        if (!this.requiresManualReconnect)
            void this.connect().catch(() => undefined);
    }
    diagnostics() {
        const cached = this.diagnosticsCache;
        if (cached
            && cached.streamStatus === this.status
            && cached.lastSeq === this.state.lastSeq
            && cached.lastHeartbeatAt === this.state.lastHeartbeatAt
            && cached.reconnectCount === this.reconnectCount
            && cached.requiresManualReconnect === this.requiresManualReconnect
            && cached.lastError === this.lastError
            && cached.displayAutoRefreshDisabled === this.displayAutoRefreshDisabled()
            && cached.displayAutoClosed === this.displayAutoClosed) {
            return cached;
        }
        const diagnostics = {
            streamStatus: this.status,
            lastSeq: this.state.lastSeq,
            lastHeartbeatAt: this.state.lastHeartbeatAt,
            reconnectCount: this.reconnectCount,
            lastError: this.lastError,
            requiresManualReconnect: this.requiresManualReconnect,
            displayAutoRefreshDisabled: this.displayAutoRefreshDisabled(),
            displayAutoClosed: this.displayAutoClosed,
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
            this.verifiedDisplayRound = true;
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
        this.verifiedDisplayRound = true;
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
    displayAutoRefreshDisabled() {
        return this.policy.displayAutoRefresh === false;
    }
    clearDisplayTimers() {
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        if (this.reconnectTimer)
            clearTimeout(this.reconnectTimer);
        this.pollTimer = undefined;
        this.reconnectTimer = undefined;
    }
    async startPolling() {
        if (this.displayAutoRefreshDisabled())
            return;
        this.status = "polling";
        await this.refreshSnapshot();
        this.scheduleSnapshotFallbackPoll();
    }
    scheduleSnapshotFallbackPoll() {
        if (this.displayAutoRefreshDisabled()) {
            this.clearDisplayTimers();
            return;
        }
        if (this.status !== "polling" || this.hidden)
            return;
        if (this.pollTimer)
            clearTimeout(this.pollTimer);
        const generation = this.connectionGeneration;
        this.pollTimer = setTimeout(() => {
            if (!this.isCurrentConnection(generation) || this.status !== "polling" || this.hidden)
                return;
            this.pollTimer = undefined;
            void this.readSnapshot(false, true)
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
    async readSnapshot(manual, fromPoll = false) {
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
                    // GPU telemetry has its own current read. Task/result observations
                    // belong to the Host's shared progress query, never this stream boot.
                    // When the shared execution inventory recently CARRIED a GPU sample
                    // into memory, the fallback poll must not read getGpu a second time;
                    // it still samples whenever nothing fresh has been carried.
                    const carriedFresh = fromPoll === true && this.workerGpuUpdatedAt > 0
                        && Date.now() - this.workerGpuUpdatedAt <= this.snapshotFallbackDelayMs() * 2;
                    if (carriedFresh)
                        snapshot = { generatedAt: new Date(this.workerGpuUpdatedAt).toISOString(), gpu: this.state.gpu };
                    else {
                        const gpuResult = await this.http.getGpu();
                        if (generation !== this.connectionGeneration || this.disposed)
                            return { gpu: {} };
                        this.acceptWorkerGpuSample(gpuResult);
                        snapshot = { generatedAt: objectRecord(gpuResult)?.generatedAt, gpu: this.state.gpu };
                    }
                }
                else
                    snapshot = await this.http.getSnapshot({ manual, signal: abort.signal });
            }
            catch (error) {
                if (generation === this.connectionGeneration && !(error instanceof RequestBudget_1.RequestBudgetDeniedError)) {
                    // A slow GPU snapshot does not invalidate an independently open
                    // event stream. Authentication errors still fence the connection.
                    if (isHardConnectionError(error) || !["sse", "websocket"].includes(this.status))
                        this.connectionLost(message(error));
                    else
                        this.lastError = "遥测查询待核实：" + message(error);
                }
                throw error;
            }
            if (generation !== this.connectionGeneration)
                return snapshot;
            this.reconnectPolicy.reset();
            // A round that really succeeded is the only evidence able to supersede an older failure
            // attribution once the guard later closes the display channels.
            this.verifiedDisplayRound = true;
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
            const payload = objectRecord(event.payload) || {};
            const sampledAt = Date.parse(String(payload.generatedAt || event.generatedAt));
            if (Number.isFinite(sampledAt) && sampledAt < this.workerGpuUpdatedAt) {
                // Advance replay cursor without letting an old journal sample undo HTTP refresh.
                this.state = { ...this.state, gpu: beforeState.gpu,
                    lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu: beforeState.gpu } };
            }
            else {
                if (Number.isFinite(sampledAt))
                    this.workerGpuUpdatedAt = sampledAt;
                const gpu = { [this.workerEndpointId()]: this.state.gpu[event.workerId || event.serverId || "hub"] || [] };
                this.state = { ...this.state, gpu,
                    workerHealth: { ...(this.state.workerHealth || {}), [this.workerEndpointId()]: {
                            status: payload.status || "ok", lastError: payload.error || "", updatedAt: payload.generatedAt || event.generatedAt,
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
        // Worker Agents publish SSE. Before the first probe there are no cached
        // capabilities; trying an unadvertised WebSocket used to return success
        // before its asynchronous rejection, bypassing SSE fallback entirely.
        if (this.isWorkerTelemetryEndpoint() && endpoints?.websocketEvents !== true)
            return false;
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
