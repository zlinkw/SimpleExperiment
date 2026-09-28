import { RequestBudget, RequestBudgetDeniedError } from "./RequestBudget";
import { FileTransferClient } from "./FileTransferClient";
import { DownloadOptions, FileTransferTask } from "./FileTransferTypes";
import { RealtimeReconnect } from "./RealtimeReconnect";
import { applyRealtimeEvent, applySnapshot, compactRealtimeState, createRealtimeState, RealtimeEvent, RealtimeState } from "./RealtimeEventReducer";
import { ClusterSnapshot, GpuHistoryQuery, GpuHistoryResponse, HttpTunnelClient, TunnelAction, TunnelEndpointConfig } from "./TunnelClient";
// T2: RealtimeTunnelClient 透传批量能力协商字段，聚合逻辑在 MultiEndpointRealtimeClient
import { localBaseUrl } from "./TunnelGateway";
import { TunnelHealth } from "./TunnelHealth";

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
}

export const defaultRealtimeRefreshPolicy: RealtimeRefreshPolicy = {
  mode: "realtime",
  preferWebSocket: true,
  fallbackToSse: true,
  fallbackToPolling: true,
  heartbeatIntervalSeconds: 5,
  snapshotFallbackIntervalSeconds: 0.5,
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

export type StreamStatus = "disconnected" | "connecting" | "websocket" | "sse" | "polling" | "paused";

export interface RealtimeClientDiagnostics {
  streamStatus: StreamStatus;
  lastSeq: number;
  lastHeartbeatAt?: string;
  requiresManualReconnect?: boolean;
  reconnectCount: number;
  lastError?: string;
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
  private requiresManualReconnect = false;
  private connectionGeneration = 0;

  constructor(
    private readonly endpoint: TunnelEndpointConfig,
    private readonly budget: RequestBudget,
    private readonly policy: RealtimeRefreshPolicy = defaultRealtimeRefreshPolicy,
    private readonly onState: (state: RealtimeState) => void = () => undefined,
  ) {
    this.http = new HttpTunnelClient(endpoint, budget);
    this.files = new FileTransferClient(endpoint, budget);
    this.reconnectPolicy = new RealtimeReconnect(policy);
  }

  async connect(sinceSeq = this.state.lastSeq, options: { manual?: boolean } = {}): Promise<void> {
    if (this.requiresManualReconnect && !options.manual) return;
    if (["websocket", "sse", "polling", "connecting"].includes(this.status)) return;
    this.requiresManualReconnect = false;
    if (this.budget.isPaused()) throw new RequestBudgetDeniedError("events", { allowed: false, reason: "paused" });
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
      } catch (error) {
        if (error instanceof RequestBudgetDeniedError) {
          this.status = "disconnected";
          throw error;
        }
        this.lastError = message(error);
      }
    }
    if (this.shouldUseSse()) {
      try {
        await this.connectSse(sinceSeq);
        if (options.manual) await this.getSnapshot();
        return;
      } catch (error) {
        this.lastError = message(error);
      }
    }
    if (this.policy.fallbackToPolling) {
      try { await this.startPolling(); } catch (error) { this.connectionLost(message(error)); }
      return;
    }
    this.connectionLost(this.lastError || "Connection failed");
  }

  async disconnect(reason = "manual"): Promise<void> {
    this.connectionGeneration += 1;
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
    this.status = "disconnected";
    this.requiresManualReconnect = true;
    this.lastError = reason + "；连接已断开，请点击重新连接。服务器任务可能仍在运行。";
    this.onState(this.state);
  }

  getHealth(): Promise<TunnelHealth> {
    return this.http.getHealth({ userInitiated: true });
  }

  requestJson(apiPath: string, purpose: any, body: unknown, options: any): Promise<any> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return (this.http as any).requestJson(apiPath, purpose, body, options).catch((error: unknown) => {
      if (options.method === "GET" && !(error instanceof RequestBudgetDeniedError)) this.connectionLost(message(error));
      throw error;
    });
  }

  async getSnapshot(): Promise<ClusterSnapshot> {
    return this.readSnapshot(true);
  }

  getGpu(options: { dispatch?: boolean } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getGpu(options));
  }

  getGpuHistory(query: GpuHistoryQuery = {}): Promise<GpuHistoryResponse> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    // T2: 批量能力协商字段透传至 HttpTunnelClient，聚合由 MultiEndpointRealtimeClient 完成
    return this.watchRead(this.http.getGpuHistory(query));
  }

  getScheduler(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getScheduler());
  }

  getTraces(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getTraces());
  }

  getLiveOutput(runKey: string, since = 0, options: { userInitiated?: boolean } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getLiveOutput(runKey, since, options));
  }

  private watchRead<T>(request: Promise<T>): Promise<T> {
    return request.catch((error) => {
      if (!(error instanceof RequestBudgetDeniedError)) this.connectionLost(message(error));
      throw error;
    });
  }

  setProtectedLogKeys(keys: string[]): void {
    this.protectedLogKeys = normalizeProtectedLogKeys(keys);
    this.state = compactRealtimeState(this.state, { protectedLogKeys: this.protectedLogKeys });
  }

  getResultsSummary(planFile = "", options: { userInitiated?: boolean } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getResultsSummary(planFile, options));
  }

  getDiagnostics(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getDiagnostics());
  }

  getAuditTail(): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getAuditTail());
  }

  getOperation(operationId: string): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getOperation(operationId));
  }

  getWorkerTasks(options: { signal?: AbortSignal } = {}): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.watchRead(this.http.getWorkerTasks(options));
  }

  getRunEvidence(params: { operationId?: string; planFile?: string; pid?: number | string; tmuxSession?: string }): Promise<unknown> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.http.getRunEvidence?.(params) ?? Promise.reject(new Error("Agent runtime does not expose run evidence."));
  }

  listRemoteFiles(remotePath: string) {
    return this.files.list(remotePath);
  }

  postAction<T>(action: TunnelAction, body: unknown): Promise<T> {
    if (this.requiresManualReconnect) return Promise.reject(new Error(this.lastError));
    return this.http.postAction<T>(action, body);
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
    if (hidden && this.policy.pauseWhenWebviewHidden && !this.policy.keepAgentStreamWhenHidden && this.status !== "paused" && this.status !== "disconnected") {
      void this.disconnect("paused");
      return;
    }
    if (!hidden && this.status === "paused" && this.policy.pauseWhenWebviewHidden && !this.budget.isPaused()) {
      void this.connect(this.state.lastSeq).catch((error) => { this.lastError = message(error); });
    }
    if (!hidden && this.status === "polling") this.scheduleSnapshotFallbackPoll();
  }

  diagnostics(): RealtimeClientDiagnostics {
    const cached = this.diagnosticsCache;
    if (cached
      && cached.streamStatus === this.status
      && cached.lastSeq === this.state.lastSeq
      && cached.lastHeartbeatAt === this.state.lastHeartbeatAt
      && cached.reconnectCount === this.reconnectCount
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
    };
    ws.onmessage = (event) => {
      if (this.websocket !== ws) return;
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
    if (!response.ok || !response.body) throw new Error(`SSE failed: ${response.status}`);
    this.status = "sse";
    this.reconnectPolicy.reset();
    void this.readSse(response.body, abort);
  }

  private async readSse(body: ReadableStream<Uint8Array>, abort: AbortController): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const chunk = await reader.read();
        if (this.abort !== abort || abort.signal.aborted) break;
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() || "";
        for (const part of parts) {
          const data = part.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
          if (data) this.acceptEvent(data);
        }
      }
      buffer += decoder.decode();
      const data = buffer.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
      if (data) this.acceptEvent(data);
    } catch (error) {
      this.lastError = message(error);
    }
    if (this.abort === abort && !abort.signal.aborted && this.status === "sse") this.connectionLost("SSE ended");
  }

  private async startPolling(): Promise<void> {
    this.status = "polling";
    await this.refreshSnapshot();
    this.scheduleSnapshotFallbackPoll();
  }

  private scheduleSnapshotFallbackPoll(): void {
    if (this.status !== "polling" || this.hidden) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      void this.refreshSnapshot()
        .catch((error) => { this.connectionLost(message(error)); })
        .finally(() => this.scheduleSnapshotFallbackPoll());
    }, this.snapshotFallbackDelayMs());
    this.pollTimer.unref?.();
  }

  private snapshotFallbackDelayMs(): number {
    return 500;
  }

  private async refreshSnapshot(): Promise<void> {
    await this.readSnapshot(false);
  }

  private async readSnapshot(manual: boolean): Promise<ClusterSnapshot> {
    if (this.requiresManualReconnect) throw new Error(this.lastError);
    if (this.snapshotInFlight) return this.snapshotInFlight;
    const task = (async () => {
      const generation = this.connectionGeneration;
      const snapshot = await this.http.getSnapshot({ manual });
      if (generation !== this.connectionGeneration) return snapshot;
      this.state = applySnapshot(this.state, snapshot, { protectedLogKeys: this.protectedLogKeys });
      this.onState(this.state);
      return snapshot;
    })();
    this.snapshotInFlight = task;
    try { return await task; } finally { if (this.snapshotInFlight === task) this.snapshotInFlight = undefined; }
  }

  private acceptEvent(raw: unknown): void {
    const event = typeof raw === "string" ? safeJson(raw) : raw;
    const journalGap = isJournalGapEvent(event);
    const beforeState = this.state;
    const before = this.state.lastSeq;
    const beforeDirtyKey = this.state.resultSummaryDirtyKey;
    this.state = applyRealtimeEvent(this.state, raw, { protectedLogKeys: this.protectedLogKeys });
    if (journalGap) this.state = compactRealtimeState({ ...this.state, lastSeq: 0 }, { protectedLogKeys: this.protectedLogKeys });
    if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey) this.onState(this.state);
    if (journalGap) {
      void this.getSnapshot()
        .catch((error) => { this.lastError = message(error); })
        .finally(() => {
          // The stream remains connected; a snapshot repairs the replay gap.
        });
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "text/event-stream, application/json" };
    if (this.endpoint.token) headers["X-Simple-Agent-Token"] = this.endpoint.token;
    return headers;
  }

  private shouldUseWebSocket(): boolean {
    if (!this.policy.preferWebSocket || typeof WebSocket === "undefined") return false;
    const endpoints = capabilityEndpoints(this.endpoint.capabilities);
    return endpoints ? endpoints.websocketEvents !== false : true;
  }

  private shouldUseSse(): boolean {
    if (!this.policy.fallbackToSse) return false;
    const endpoints = capabilityEndpoints(this.endpoint.capabilities);
    return endpoints ? endpoints.sseEvents !== false : true;
  }
}

function normalizeProtectedLogKeys(keys: string[]): string[] {
  return [...new Set((Array.isArray(keys) ? keys : []).map((key) => String(key || "").trim()).filter(Boolean))];
}

function capabilityEndpoints(capabilities: unknown): Record<string, unknown> | undefined {
  const caps = objectRecord(capabilities);
  return objectRecord(caps?.endpoints);
}

function objectRecord(value: unknown): Record<string, any> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : undefined;
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
