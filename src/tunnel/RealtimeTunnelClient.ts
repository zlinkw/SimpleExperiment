import { RequestBudget, RequestBudgetDeniedError } from "./RequestBudget";
import { FileTransferClient } from "./FileTransferClient";
import { DownloadOptions, FileTransferTask } from "./FileTransferTypes";
import { RealtimeReconnect } from "./RealtimeReconnect";
import { applyRealtimeEvent, applySnapshot, compactRealtimeState, createRealtimeState, RealtimeEvent, RealtimeState } from "./RealtimeEventReducer";
import { ClusterSnapshot, GpuHistoryQuery, GpuHistoryResponse, HttpTunnelClient, TunnelAction, TunnelEndpointConfig } from "./TunnelClient";
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

export type StreamStatus = "disconnected" | "connecting" | "websocket" | "sse" | "polling" | "paused";

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

  async connect(sinceSeq = this.state.lastSeq): Promise<void> {
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
        return;
      } catch (error) {
        this.lastError = message(error);
      }
    }
    if (this.policy.fallbackToPolling) {
      await this.startPolling();
      return;
    }
    this.status = "disconnected";
  }

  async disconnect(reason = "manual"): Promise<void> {
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
    const delay = this.reconnectPolicy.nextDelayMs();
    this.reconnectCount += 1;
    this.reconnectTimer = setTimeout(() => void this.connect(this.state.lastSeq), delay);
    this.reconnectTimer.unref?.();
  }

  getHealth(): Promise<TunnelHealth> {
    return this.http.getHealth({ userInitiated: true });
  }

  async getSnapshot(): Promise<ClusterSnapshot> {
    const snapshot = await this.http.getSnapshot({ manual: true });
    this.state = applySnapshot(this.state, snapshot);
    this.onState(this.state);
    return snapshot;
  }

  getGpu(): Promise<unknown> {
    return this.http.getGpu();
  }

  getGpuHistory(query: GpuHistoryQuery = {}): Promise<GpuHistoryResponse> {
    return this.http.getGpuHistory(query);
  }

  getScheduler(): Promise<unknown> {
    return this.http.getScheduler();
  }

  getTraces(): Promise<unknown> {
    return this.http.getTraces();
  }

  getLiveOutput(runKey: string, since = 0): Promise<unknown> {
    return this.http.getLiveOutput(runKey, since);
  }

  getResultsSummary(): Promise<unknown> {
    return this.http.getResultsSummary();
  }

  getDiagnostics(): Promise<unknown> {
    return this.http.getDiagnostics();
  }

  getAuditTail(): Promise<unknown> {
    return this.http.getAuditTail();
  }

  getOperation(operationId: string): Promise<unknown> {
    return this.http.getOperation(operationId);
  }

  listRemoteFiles(remotePath: string) {
    return this.files.list(remotePath);
  }

  postAction<T>(action: TunnelAction, body: unknown): Promise<T> {
    return this.http.postAction<T>(action, body);
  }

  postAvailabilityBatch<T>(body: unknown): Promise<T> {
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
      if (this.shouldUseSse()) {
        void this.connectSse(this.state.lastSeq).catch(() => this.reconnect("websocket closed"));
      } else if (this.policy.fallbackToPolling) {
        void this.startPolling().catch((error) => {
          this.lastError = message(error);
          void this.reconnect("websocket closed");
        });
      } else {
        void this.reconnect("websocket closed");
      }
    };
  }

  private async connectSse(sinceSeq: number): Promise<void> {
    this.abort = new AbortController();
    const response = await this.budget.run("events", () => fetch(`${localBaseUrl(this.endpoint)}/api/events/sse?since=${encodeURIComponent(String(sinceSeq))}`, {
      headers: this.headers(),
      signal: this.abort?.signal,
    }));
    if (!response.ok || !response.body) throw new Error(`SSE failed: ${response.status}`);
    this.status = "sse";
    this.reconnectPolicy.reset();
    void this.readSse(response.body);
  }

  private async readSse(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const chunk = await reader.read();
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
    if (this.status === "sse") void this.reconnect("sse ended");
  }

  private async startPolling(): Promise<void> {
    this.status = "polling";
    await this.refreshSnapshot();
    this.scheduleSnapshotFallbackPoll();
  }

  private scheduleSnapshotFallbackPoll(): void {
    if (this.status !== "polling") return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      this.pollTimer = undefined;
      void this.refreshSnapshot()
        .catch((error) => { this.lastError = message(error); })
        .finally(() => this.scheduleSnapshotFallbackPoll());
    }, this.snapshotFallbackDelayMs());
    this.pollTimer.unref?.();
  }

  private snapshotFallbackDelayMs(): number {
    const baseMs = Math.max(60, Number(this.policy.snapshotFallbackIntervalSeconds) || 60) * 1000;
    const jitterMs = Math.floor(Math.random() * Math.min(30_000, Math.max(1_000, Math.floor(baseMs / 2))));
    return baseMs + jitterMs;
  }

  private async refreshSnapshot(): Promise<void> {
    const snapshot = await this.http.getSnapshot();
    this.state = applySnapshot(this.state, snapshot);
    this.onState(this.state);
  }

  private acceptEvent(raw: unknown): void {
    const event = typeof raw === "string" ? safeJson(raw) : raw;
    const journalGap = isJournalGapEvent(event);
    const beforeState = this.state;
    const before = this.state.lastSeq;
    const beforeDirtyKey = this.state.resultSummaryDirtyKey;
    this.state = applyRealtimeEvent(this.state, raw);
    if (journalGap) this.state = compactRealtimeState({ ...this.state, lastSeq: 0 });
    if (this.state !== beforeState || this.state.lastSeq !== before || this.state.resultSummaryDirtyKey !== beforeDirtyKey) this.onState(this.state);
    if (journalGap) {
      void this.getSnapshot()
        .catch((error) => { this.lastError = message(error); })
        .finally(() => {
          if (this.status !== "paused" && this.status !== "disconnected") void this.reconnect("journal gap");
        });
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = { Accept: "text/event-stream, application/json" };
    if (this.endpoint.token) headers["X-ZLK-Agent-Token"] = this.endpoint.token;
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
