import { RequestBudget, RequestBudgetDeniedError } from "./RequestBudget";
import { SharedReadCoalescer } from "../core/SharedReadCoalescer";
import { FileTransferClient } from "./FileTransferClient";
import { DownloadOptions, FileTransferTask } from "./FileTransferTypes";
import { RealtimeReconnect } from "./RealtimeReconnect";
import { applyRealtimeEvent, applySnapshot, compactRealtimeState, createRealtimeState, RealtimeEvent, RealtimeState } from "./RealtimeEventReducer";
import { ClusterSnapshot, GpuHistoryQuery, GpuHistoryResponse, HttpTunnelClient, TunnelAction, TunnelEndpointConfig } from "./TunnelClient";
// T2: RealtimeTunnelClient 透传批量能力协商字段，聚合逻辑在 MultiEndpointRealtimeClient
import { localBaseUrl } from "./TunnelGateway";
import { TunnelHealth } from "./TunnelHealth";
import { BoundedSseDecoder, MAX_SSE_EVENT_BYTES } from "./BoundedResponse";

export interface RealtimeRefreshPolicy {
  mode: "realtime" | "balanced" | "manual_only";
  preferWebSocket: boolean;
  fallbackToSse: boolean;
  fallbackToPolling: boolean;
  heartbeatIntervalSeconds: number;
  snapshotFallbackIntervalSeconds: number;
  gpuEventCoalesceMs: number;
  uiBatchMs: number;
  logTailEnabledByDefault: boolean;
  logTailOnlyForSelectedExperiment: boolean;
  logTailIntervalSeconds: number;
  fileTransferManualOnly: boolean;
  fileTransferMaxConcurrent: number;
  fileTransferSpeedLimitMbPerSec?: number;
  reconnectInitialDelaySeconds: number;
  reconnectMaxDelaySeconds: number;
  pauseWhenWebviewHidden: boolean;
  keepAgentStreamWhenHidden: boolean;
  /**
   * r2 A-class guard: when false the client must not open the display stream, must not take the
   * initial/fallback snapshot, must not arm pollTimer or the display reconnectTimer. Manual single
   * shot reads (getSnapshot/getGpu/...) stay available. A 0 cadence is never the only signal, so a
   * downstream Math.max(5, ...) clamp can not silently revive the display traffic.
   */
  displayAutoRefresh: boolean;
}

export const defaultRealtimeRefreshPolicy: RealtimeRefreshPolicy = Object.freeze({
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

export type StreamStatus = "disconnected" | "connecting" | "websocket" | "sse" | "polling" | "paused";

export interface RealtimeClientDiagnostics {
  streamStatus: StreamStatus;
  lastSeq: number;
  lastHeartbeatAt?: string;
  requiresManualReconnect?: boolean;
  reconnectCount: number;
  lastError?: string;
  /** True while display-class automatic refresh is switched off (low traffic mode). */
  displayAutoRefreshDisabled?: boolean;
  /** True when a disconnected status came from closing the display channels only. */
  displayAutoClosed?: boolean;
}

export class RealtimeTunnelClient {
  private readonly http: HttpTunnelClient;
  private readonly files: FileTransferClient;
  private readonly reconnectPolicy: RealtimeReconnect;
  private state: RealtimeState = createRealtimeState();
  private status: StreamStatus = "disconnected";
  private websocket?: WebSocket;
  private abort?: AbortController;
  private pollTimer?: NodeJS.Timeout;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectCount = 0;
  private lastError?: string;
  private hidden = false;
  private protectedLogKeys: string[] = [];
  private diagnosticsCache?: RealtimeClientDiagnostics;
  private snapshotInFlight?: Promise<ClusterSnapshot>;
  private snapshotAbort?: AbortController;
  private readonly sharedReads = new SharedReadCoalescer(64);
  private requiresManualReconnect = false;
  private connectionGeneration = 0;
  get progressGeneration(): number { return this.connectionGeneration; }
  private disposed = false;
  private workerGpuUpdatedAt = 0;
  // Each client owns its own policy copy: several endpoints are commonly built from one
  // policy object and an in-place write would silently change every other endpoint's cadence.
  private policy: RealtimeRefreshPolicy;
  // True while the stream is closed only because display auto-refresh is off. That is an
  // intentional closure and must never be reported as tunnel_unavailable / local_port_closed.
  private displayAutoClosed = false;
  // Real success evidence for the current connection: set only when a round actually succeeded (the
  // stream opened, or a snapshot was accepted) and dropped by any real connection loss or by closing
  // the client for anything other than the guard. A paused or still-handshaking client has no such
  // evidence, so a policy change must not reinterpret its outstanding failure as our own closure.
  private verifiedDisplayRound = false;

  constructor(
    private readonly endpoint: TunnelEndpointConfig,
    private readonly budget: RequestBudget,
    private readonly policyArgument: RealtimeRefreshPolicy = defaultRealtimeRefreshPolicy,
    private readonly onState: (state: RealtimeState) => void = () => undefined,
  ) {
    this.policy = { ...policyArgument };
    this.http = new HttpTunnelClient(endpoint, budget);
    this.files = new FileTransferClient({ ...endpoint, fileCapabilities: endpoint.fileCapabilities }, budget);
    this.reconnectPolicy = new RealtimeReconnect(this.policy);
  }

  async connect(sinceSeq = this.state.lastSeq, options: { manual?: boolean } = {}): Promise<void> {
    if (this.disposed) return;
    if (this.requiresManualReconnect && !options.manual) return;
    if (["websocket", "sse", "polling", "connecting"].includes(this.status)) return;
    if (this.displayAutoRefreshDisabled()) {
      // A01/A04: no display stream, no initial snapshot (also not inside the manual_only branch),
      // no poll fallback and no display reconnect. Cached lastSeq/snapshot stay readable and a
      // manual single-shot read still works; nothing here marks the client as user-paused.
      this.clearDisplayTimers();
      if (this.status === "disconnected") this.markDisplayAutoClosed();
      return;
    }
    if (this.budget.isPaused()) throw new RequestBudgetDeniedError("events", { allowed: false, reason: "paused" });
    this.requiresManualReconnect = false;
    const generation = this.connectionGeneration + 1;
    await this.disconnect("reconnect");
    if (!this.isCurrentConnection(generation)) return;
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
        if (this.isWorkerTelemetryEndpoint()) await this.refreshSnapshot();
        return;
      } catch (error) {
        if (!this.isCurrentConnection(generation)) return;
        if (error instanceof RequestBudgetDeniedError) {
          this.status = "disconnected";
          throw error;
        }
        this.lastError = message(error);
        if (isHardConnectionError(error)) {
          this.connectionLost(this.lastError);
          return;
        }
        if (["websocket"].includes(this.status)) return;
      }
    }
    if (this.shouldUseSse()) {
      try {
        await this.connectSse(sinceSeq);
        if (!this.isCurrentConnection(generation)) return;
        if (options.manual || this.isWorkerTelemetryEndpoint()) await this.getSnapshot();
        return;
      } catch (error) {
        if (!this.isCurrentConnection(generation)) return;
        this.lastError = message(error);
        if (isHardConnectionError(error)) {
          this.connectionLost(this.lastError);
          return;
        }
        if (["sse"].includes(this.status)) return;
      }
    }
    if (this.policy.fallbackToPolling) {
      try { await this.startPolling(); } catch (error) {
        if (this.isCurrentConnection(generation)) this.connectionLost(message(error));
      }
      return;
    }
    if (this.isCurrentConnection(generation)) this.connectionLost(this.lastError || "Connection failed");
  }

  private isCurrentConnection(generation: number): boolean {
    return generation === this.connectionGeneration && !this.disposed && this.status !== "paused" && !this.budget.isPaused();
  }

  async disconnect(reason = "manual"): Promise<void> {
    // Only the display-auto closure is explained by the low-traffic guard; any other closure is a
    // real connection state change and must be able to surface as a connection error again.
    if (reason === "display-auto") this.markDisplayAutoClosed();
    else this.displayAutoClosed = false;
    // A guard closure keeps the success evidence of the round it closes; pausing keeps it too (the
    // user paused a channel that worked), while any other closure starts a new connection story.
    if (reason !== "display-auto" && reason !== "paused") this.verifiedDisplayRound = false;
    this.connectionGeneration += 1;
    this.snapshotAbort?.abort();
    this.snapshotAbort = undefined;
    this.snapshotInFlight = undefined;
    const disposeTransfers = reason === "deactivate" || reason === "dispose";
    if (disposeTransfers) this.disposed = true;
    const websocket = this.websocket;
    this.websocket = undefined;
    websocket?.close();
    this.abort?.abort();
    this.abort = undefined;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pollTimer = undefined;
    this.reconnectTimer = undefined;
    this.status = reason === "paused" ? "paused" : "disconnected";
    if (disposeTransfers) await this.files.dispose();
  }

  async reconnect(reason = "reconnect"): Promise<void> {
    await this.disconnect(reason);
    this.reconnectCount += 1;
    await this.connect(this.state.lastSeq, { manual: true });
    if (this.status !== "disconnected" && this.status !== "paused") await this.getSnapshot();
  }

  private connectionLost(reason: string): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = undefined;
    if (this.disposed || this.status === "paused" || this.budget.isPaused()) return;
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
    if (!this.requiresManualReconnect) this.scheduleAutomaticReconnect();
  }

  private scheduleAutomaticReconnect(): void {
    if (this.reconnectTimer || this.disposed || this.hidden || this.displayAutoRefreshDisabled() || this.policy.mode === "manual_only" || this.status !== "disconnected" || this.budget.isPaused()) return;
    const generation = this.connectionGeneration;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (this.disposed || this.hidden || this.status !== "disconnected" || this.budget.isPaused() || generation !== this.connectionGeneration) return;
      void this.connect(this.state.lastSeq).catch((error) => this.connectionLost(message(error)));
    }, this.reconnectPolicy.nextDelayMs());
    this.reconnectTimer.unref?.();
  }

  private reportHardRequestError(error: unknown, generation: number): void {
    if (generation !== this.connectionGeneration || this.disposed || this.status === "paused" || this.budget.isPaused()) return;
    if (isHardConnectionError(error)) this.connectionLost(message(error));
  }

  getHealth(): Promise<TunnelHealth> {
    return this.http.getHealth({ userInitiated: true });
  }

  requestJson(apiPath: string, purpose: any, body: unknown, options: any): Promise<any> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    const generation = this.connectionGeneration;
    return (this.http as any).requestJson(apiPath, purpose, body, options).catch((error: unknown) => {
      this.reportHardRequestError(error, generation);
      throw error;
    });
  }

  async getSnapshot(): Promise<ClusterSnapshot> {
    return this.readSnapshot(true);
  }

  getGpu(options: { dispatch?: boolean } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    const generation = this.connectionGeneration;
    return this.coalescedRead(`gpu:${options.dispatch === true ? "dispatch" : "snapshot"}`, undefined, async () => {
      const value = await this.http.getGpu(options);
      if (generation === this.connectionGeneration && !this.disposed) {
        if (this.isWorkerTelemetryEndpoint()) this.acceptWorkerGpuSample(value);
        else {
          const gpu = gpuSnapshotRows(value, "hub");
          this.state = { ...this.state, gpu, lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu } };
          this.onState(this.state);
        }
      }
      return value;
    });
  }

  private isWorkerTelemetryEndpoint(): boolean {
    return (this.endpoint as TunnelEndpointConfig & { role?: string }).role === "worker"
      || objectRecord(this.endpoint.capabilities)?.mode === "worker_telemetry";
  }

  private workerEndpointId(): string {
    return String((this.endpoint as TunnelEndpointConfig & { id?: string }).id || this.endpoint.resourceServer || "hub");
  }

  private acceptWorkerGpuSample(value: unknown): void {
    const item = objectRecord(value) || {};
    const sampledAt = Date.parse(String(item.generatedAt || item.updatedAt || ""));
    const sampleTime = Number.isFinite(sampledAt) ? sampledAt : Date.now();
    if (sampleTime < this.workerGpuUpdatedAt) return;
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

  getGpuHistory(query: GpuHistoryQuery = {}): Promise<GpuHistoryResponse> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    // T2: 批量能力协商字段透传至 HttpTunnelClient，聚合由 MultiEndpointRealtimeClient 完成
    return this.coalescedRead(`gpu-history:${stableReadKey(query)}`, undefined, () => this.http.getGpuHistory(query));
  }

  getScheduler(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead("scheduler", undefined, () => this.http.getScheduler());
  }

  getTraces(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead("traces", undefined, () => this.http.getTraces());
  }

  getLiveOutput(runKey: string, since = 0, options: { userInitiated?: boolean; signal?: AbortSignal } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead(`live-output:${String(runKey)}:${Math.max(0, Number(since) || 0)}`,
      options, () => this.http.getLiveOutput(runKey, since, options));
  }

  private coalescedRead<T>(key: string, options: { userInitiated?: boolean; signal?: AbortSignal } | undefined,
                           operation: () => Promise<T>): Promise<T> {
    // An explicitly cancellable or user-triggered request keeps its own budget
    // semantics. Background reads without per-caller cancellation may share a
    // single in-flight RPC and never retain the completed value.
    const independentlyScoped = Boolean(options?.signal || options?.userInitiated === true);
    if (!independentlyScoped && this.sharedReads.has(key)) this.budget.noteCoalescedRequest();
    const request = independentlyScoped ? Promise.resolve().then(operation) : this.sharedReads.run(key, operation);
    return this.watchRead(request);
  }

  private watchRead<T>(request: Promise<T>): Promise<T> {
    const generation = this.connectionGeneration;
    return request.catch((error) => {
      if (!(error instanceof RequestBudgetDeniedError)) this.reportHardRequestError(error, generation);
      throw error;
    });
  }

  setProtectedLogKeys(keys: string[]): void {
    this.protectedLogKeys = normalizeProtectedLogKeys(keys);
    this.state = compactRealtimeState(this.state, { protectedLogKeys: this.protectedLogKeys });
  }

  getResultsSummary(planFile = "", options: { userInitiated?: boolean; signal?: AbortSignal } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead(`results-summary:${String(planFile || "").replace(/\\/g, "/")}`,
      options, () => this.http.getResultsSummary(planFile, options));
  }

  getDiagnostics(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead("diagnostics", undefined, () => this.http.getDiagnostics());
  }

  getAuditTail(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead("audit-tail", undefined, () => this.http.getAuditTail());
  }

  getOperation(operationId: string): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead(`operation:${String(operationId)}`, undefined, () => this.http.getOperation(operationId));
  }

  getPlanCodeScope(query: unknown, options: { signal?: AbortSignal } = {}): Promise<any> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.coalescedRead("plan-code-scope:" + JSON.stringify(query), options, () => this.http.getPlanCodeScope(query, options));
  }
  getWorkerTasks(options: { signal?: AbortSignal; executionOnly?: boolean; selectedOnly?: boolean; observationOnly?: boolean; diagnosticsOnly?: boolean; declarationOnly?: boolean; retiredCommandIds?: string[]; queries?: any[]; declarations?: any[]; discovery?: { planFile: string; condaEnv?: string } } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    const selection = [...new Set(options.retiredCommandIds || [])].sort().join(",") + JSON.stringify(options.queries || []) + JSON.stringify(options.declarations || []) + JSON.stringify(options.discovery || null) + ":execution=" + (options.executionOnly === true) + ":selected=" + (options.selectedOnly === true) + ":observation=" + (options.observationOnly === true) + ":declaration=" + (options.declarationOnly === true) + ":diagnostics=" + (options.diagnosticsOnly === true);
    const generation = this.connectionGeneration;
    return this.coalescedRead("worker-tasks:" + selection, options, () => this.http.getWorkerTasks(options)).then(value => {
      if (generation !== this.connectionGeneration || this.disposed)
        throw Object.assign(new Error("Worker connection changed during query"), { code: "CONNECTION_GENERATION_CHANGED" });
      // An execution inventory may carry the Worker's already-collected GPU sample.
      // Feeding the existing in-memory state keeps the display current without any
      // separate automatic getGpu read; the sample keeps its own collected time.
      const carried = (value as any)?.gpuSample;
      if (options.executionOnly === true && carried && typeof carried === "object" && this.isWorkerTelemetryEndpoint() && !("gpuSampleError" in (value as any)))
        this.acceptWorkerGpuSample(carried);
      return value;
    });
  }

  getSyncScopeIndex(query: unknown, options: { signal?: AbortSignal } = {}): Promise<any> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    if (!this.http.getSyncScopeIndex) return Promise.reject(new Error("SCOPE_INDEX_UNSUPPORTED"));
    const generation = this.connectionGeneration;
    return this.http.getSyncScopeIndex(query, options).then(value => {
      if (generation !== this.connectionGeneration || this.disposed) throw new Error("CONNECTION_GENERATION_CHANGED");
      return value;
    });
  }

  getRunEvidence(params: { operationId?: string; planFile?: string; pid?: number | string; tmuxSession?: string }): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    if (!this.http.getRunEvidence) return Promise.reject(new Error("Agent runtime does not expose run evidence."));
    return this.coalescedRead(`run-evidence:${stableReadKey(params)}`, undefined, () => this.http.getRunEvidence!(params));
  }

  listRemoteFiles(remotePath: string) {
    return this.files.list(remotePath);
  }

  postAction<T>(action: TunnelAction, body: unknown, options: { signal?: AbortSignal } = {}): Promise<T> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.http.postAction<T>(action, body, options);
  }

  postAvailabilityBatch<T>(body: unknown): Promise<T> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.http.postAvailabilityBatch<T>(body);
  }

  downloadFile(remotePath: string, localPath: string, options: DownloadOptions = {}): Promise<FileTransferTask> {
    return this.files.downloadFile(remotePath, localPath, options);
  }

  uploadFile(localPath: string, remotePath: string): Promise<FileTransferTask> {
    return this.files.uploadFile(localPath, remotePath);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.budget.setHidden(hidden);
    if (hidden && this.pollTimer) { clearTimeout(this.pollTimer); this.pollTimer = undefined; }
    if (hidden && this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = undefined; }
    if (hidden && this.policy.pauseWhenWebviewHidden && !this.policy.keepAgentStreamWhenHidden && this.status !== "paused" && this.status !== "disconnected") {
      void this.disconnect("paused");
      return;
    }
    if (!hidden && this.status === "paused" && this.policy.pauseWhenWebviewHidden && !this.budget.isPaused()) {
      void this.connect(this.state.lastSeq).catch((error) => { this.lastError = message(error); });
    }
    if (!hidden && this.status === "polling") this.scheduleSnapshotFallbackPoll();
    if (!hidden && this.status === "disconnected" && !this.requiresManualReconnect && !this.budget.isPaused()) this.scheduleAutomaticReconnect();
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
  private markDisplayAutoClosed(): void {
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

  updateRefreshPolicy(policy?: Partial<RealtimeRefreshPolicy> | null): void {
    if (this.disposed || !policy) return;
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
      } else {
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
    if (this.status === "connecting") return;
    if (!this.requiresManualReconnect) void this.connect().catch(() => undefined);
  }

  diagnostics(): RealtimeClientDiagnostics {
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

  currentState(): RealtimeState {
    return this.state;
  }

  private connectWebSocket(sinceSeq: number): void {
    const wsUrl = localBaseUrl(this.endpoint).replace(/^http:/, "ws:") + `/api/events?since=${encodeURIComponent(String(sinceSeq))}`;
    const ws = new WebSocket(wsUrl);
    this.websocket = ws;
    ws.onopen = () => {
      if (this.websocket !== ws) return;
      this.status = "websocket";
      this.reconnectPolicy.reset();
      this.verifiedDisplayRound = true;
    };
    ws.onmessage = (event) => {
      if (this.websocket !== ws) return;
      if (typeof event.data === "string" && Buffer.byteLength(event.data, "utf8") > MAX_SSE_EVENT_BYTES) {
        this.connectionLost("Agent WebSocket frame exceeds control-plane byte limit");
        return;
      }
      this.acceptEvent(event.data);
    };
    ws.onerror = () => {
      if (this.websocket !== ws) return;
      this.lastError = "websocket error";
    };
    ws.onclose = () => {
      if (this.websocket !== ws) return;
      this.websocket = undefined;
      if (this.status === "paused") return;
      this.connectionLost("WebSocket closed");
    };
  }

  private async connectSse(sinceSeq: number): Promise<void> {
    const abort = new AbortController();
    this.abort = abort;
    const response = await this.budget.run("events", () => fetch(`${localBaseUrl(this.endpoint)}/api/events/sse?since=${encodeURIComponent(String(sinceSeq))}`, {
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

  private async readSse(body: ReadableStream<Uint8Array>, abort: AbortController): Promise<void> {
    const reader = body.getReader();
    const decoder = new BoundedSseDecoder();
    let failure = "SSE ended";
    let finished = false;
    try {
      while (true) {
        const chunk = await reader.read();
        if (this.abort !== abort || abort.signal.aborted) break;
        if (chunk.done) { finished = true; break; }
        for (const data of decoder.push(chunk.value)) this.acceptEvent(data);
      }
      if (this.abort !== abort || abort.signal.aborted || this.disposed) return;
      for (const data of decoder.push()) this.acceptEvent(data);
    } catch (error) {
      failure = message(error);
    } finally {
      if (!finished) await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
    if (this.abort === abort && !abort.signal.aborted && this.status === "sse") this.connectionLost(failure);
  }

  private displayAutoRefreshDisabled(): boolean {
    return this.policy.displayAutoRefresh === false;
  }
  private clearDisplayTimers(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pollTimer = undefined;
    this.reconnectTimer = undefined;
  }

  private async startPolling(): Promise<void> {
    if (this.displayAutoRefreshDisabled()) return;
    this.status = "polling";
    await this.refreshSnapshot();
    this.scheduleSnapshotFallbackPoll();
  }

  private scheduleSnapshotFallbackPoll(): void {
    if (this.displayAutoRefreshDisabled()) { this.clearDisplayTimers(); return; }
    if (this.status !== "polling" || this.hidden) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const generation = this.connectionGeneration;
    this.pollTimer = setTimeout(() => {
      if (!this.isCurrentConnection(generation) || this.status !== "polling" || this.hidden) return;
      this.pollTimer = undefined;
      void this.readSnapshot(false, true)
        .catch((error) => { if (this.isCurrentConnection(generation)) this.connectionLost(message(error)); })
        .finally(() => { if (this.isCurrentConnection(generation)) this.scheduleSnapshotFallbackPoll(); });
    }, this.snapshotFallbackDelayMs());
    this.pollTimer.unref?.();
  }

  private snapshotFallbackDelayMs(): number {
    return Math.max(5, Number(this.policy.snapshotFallbackIntervalSeconds) || 5) * 1000;
  }

  private async refreshSnapshot(): Promise<void> {
    await this.readSnapshot(false);
  }

  private async readSnapshot(manual: boolean, fromPoll = false): Promise<ClusterSnapshot> {
    if (this.requiresManualReconnect) throw new Error(this.lastError);
    if (this.snapshotInFlight) return this.snapshotInFlight;
    const abort = new AbortController();
    this.snapshotAbort = abort;
    const task = (async () => {
      const generation = this.connectionGeneration;
      let snapshot: ClusterSnapshot;
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
          if (carriedFresh) snapshot = { generatedAt: new Date(this.workerGpuUpdatedAt).toISOString(), gpu: this.state.gpu };
          else {
            const gpuResult = await this.http.getGpu();
            if (generation !== this.connectionGeneration || this.disposed) return { gpu: {} };
            this.acceptWorkerGpuSample(gpuResult);
            snapshot = { generatedAt: objectRecord(gpuResult)?.generatedAt, gpu: this.state.gpu };
          }
        } else snapshot = await this.http.getSnapshot({ manual, signal: abort.signal });
      } catch (error) {
        if (generation === this.connectionGeneration && !(error instanceof RequestBudgetDeniedError)) {
          // A slow GPU snapshot does not invalidate an independently open
          // event stream. Authentication errors still fence the connection.
          if (isHardConnectionError(error) || !["sse", "websocket"].includes(this.status)) this.connectionLost(message(error));
          else this.lastError = "遥测查询待核实：" + message(error);
        }
        throw error;
      }
      if (generation !== this.connectionGeneration) return snapshot;
      this.reconnectPolicy.reset();
      // A round that really succeeded is the only evidence able to supersede an older failure
      // attribution once the guard later closes the display channels.
      this.verifiedDisplayRound = true;
      if (this.policy.mode === "manual_only" && this.status === "disconnected") {
        this.status = "polling";
        this.lastError = undefined;
      }
      this.state = applySnapshot(this.state, snapshot, { protectedLogKeys: this.protectedLogKeys });
      if (this.isWorkerTelemetryEndpoint()) this.lastError = undefined;
      this.onState(this.state);
      return snapshot;
    })();
    this.snapshotInFlight = task;
    try { return await task; } finally {
      if (this.snapshotInFlight === task) this.snapshotInFlight = undefined;
      if (this.snapshotAbort === abort) this.snapshotAbort = undefined;
    }
  }

  private acceptEvent(raw: unknown): void {
    const event = typeof raw === "string" ? safeJson(raw) : raw;
    const journalGap = isJournalGapEvent(event);
    const beforeState = this.state;
    const before = this.state.lastSeq;
    const beforeDirtyKey = this.state.resultSummaryDirtyKey;
    if (journalGap) {
      this.state = compactRealtimeState({ ...this.state, lastSeq: 0 }, { protectedLogKeys: this.protectedLogKeys });
      if (this.state !== beforeState) this.onState(this.state);
      void this.getSnapshot()
        .catch((error) => { this.lastError = message(error); })
        .finally(() => {
          // The stream remains connected; a snapshot repairs the replay gap.
        });
      return;
    }
    this.state = applyRealtimeEvent(this.state, raw, { protectedLogKeys: this.protectedLogKeys });
    if (this.isWorkerTelemetryEndpoint() && event && typeof event === "object"
      && (event as RealtimeEvent).type === "gpu_snapshot" && this.state.lastSeq > before) {
      const payload = objectRecord((event as RealtimeEvent).payload) || {};
      const sampledAt = Date.parse(String(payload.generatedAt || (event as RealtimeEvent).generatedAt));
      if (Number.isFinite(sampledAt) && sampledAt < this.workerGpuUpdatedAt) {
        // Advance replay cursor without letting an old journal sample undo HTTP refresh.
        this.state = { ...this.state, gpu: beforeState.gpu,
          lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu: beforeState.gpu } };
      } else {
        if (Number.isFinite(sampledAt)) this.workerGpuUpdatedAt = sampledAt;
        const gpu = { [this.workerEndpointId()]: this.state.gpu[(event as RealtimeEvent).workerId || (event as RealtimeEvent).serverId || "hub"] || [] };
        this.state = { ...this.state, gpu,
          workerHealth: { ...(this.state.workerHealth || {}), [this.workerEndpointId()]: {
            status: payload.status || "ok", lastError: payload.error || "", updatedAt: payload.generatedAt || (event as RealtimeEvent).generatedAt,
          } }, lastKnownGood: { ...(this.state.lastKnownGood || {}), gpu } };
      }
    }
    if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey) this.onState(this.state);
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "text/event-stream, application/json" };
    if (this.endpoint.token) headers["X-Simple-Agent-Token"] = this.endpoint.token;
    return headers;
  }

  private shouldUseWebSocket(): boolean {
    if (!this.policy.preferWebSocket || typeof WebSocket === "undefined") return false;
    const endpoints = capabilityEndpoints(this.endpoint.capabilities);
    // Worker Agents publish SSE. Before the first probe there are no cached
    // capabilities; trying an unadvertised WebSocket used to return success
    // before its asynchronous rejection, bypassing SSE fallback entirely.
    if (this.isWorkerTelemetryEndpoint() && endpoints?.websocketEvents !== true) return false;
    return endpoints ? endpoints.websocketEvents !== false : true;
  }

  private shouldUseSse(): boolean {
    if (!this.policy.fallbackToSse) return false;
    const endpoints = capabilityEndpoints(this.endpoint.capabilities);
    return endpoints ? endpoints.sseEvents !== false : true;
  }
}

function gpuSnapshotRows(value: unknown, serverId: string): Record<string, unknown[]> {
  if (Array.isArray(value)) return { [serverId]: value };
  const item = objectRecord(value) || {};
  for (const rows of [item.gpu, item.gpus, item.rows]) {
    if (Array.isArray(rows)) return { [serverId]: rows };
    if (rows && typeof rows === "object") return Object.fromEntries(Object.entries(rows)
      .map(([key, value]) => [key === "hub" ? serverId : key, Array.isArray(value) ? value : []]));
  }
  return { [serverId]: [] };
}

function normalizeProtectedLogKeys(keys: string[]): string[] {
  return [...new Set((Array.isArray(keys) ? keys : []).map((key) => String(key || "").trim()).filter(Boolean))];
}

function isHardConnectionError(error: unknown): boolean {
  const text = message(error);
  const status = text.match(/(?:HTTP|SSE failed:?\s*)\s*(401|403|426)\b/i)?.[1];
  return Boolean(status || /(?:version mismatch|版本不兼容|认证失败|unauthorized|forbidden|invalid token)/i.test(text));
}

function capabilityEndpoints(capabilities: unknown): Record<string, unknown> | undefined {
  const caps = objectRecord(capabilities);
  return objectRecord(caps?.endpoints);
}

function objectRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : undefined;
}

function stableReadKey(value: unknown): string {
  const normalize = (input: unknown, depth: number): unknown => {
    if (depth > 5) return "[depth-limit]";
    if (input === null || typeof input === "string" || typeof input === "boolean")
      return typeof input === "string" ? input.slice(0, 512) : input;
    if (typeof input === "number") return Number.isFinite(input) ? input : null;
    if (Array.isArray(input)) return input.slice(0, 64).map((item) => normalize(item, depth + 1));
    if (!input || typeof input !== "object") return String(input ?? "").slice(0, 128);
    return Object.fromEntries(Object.keys(input as Record<string, unknown>).sort().slice(0, 64)
      .map((key) => [key.slice(0, 128), normalize((input as Record<string, unknown>)[key], depth + 1)]));
  };
  try { return JSON.stringify(normalize(value, 0)).slice(0, 2048); }
  catch { return "{}"; }
}

function safeJson(text: unknown): unknown {
  if (typeof text !== "string") return text;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isJournalGapEvent(event: unknown): boolean {
  return Boolean(event && typeof event === "object" && (event as { payload?: { code?: string } }).payload?.code === "journal_gap");
}
