import { RequestBudget, RequestBudgetDeniedError, TunnelRequestPurpose } from "./RequestBudget";
import { assertLocalhost, localBaseUrl } from "./TunnelGateway";
import { TunnelHealth } from "./TunnelHealth";

export const tunnelActions = [
  "run-plan", "stop-experiment", "retry-experiment", "reproduce-plan", "validate-plan", "dry-run-plan",
  "archive-artifacts", "exclude-results", "sync-artifacts", "complete-three-way", "delete-artifacts", "reconcile-deletions",
  "parse-results", "refresh-results", "self-check", "rescan-results", "run-quality-gate", "run-statistics", "export-paper-table",
  "check-claim-evidence", "deploy-runtime", "restart-agent", "create-debug-bundle", "create-offline-bundle", "cancel-operation",
  "check-output-contract", "parse-case-level", "run-leakage-check", "run-subgroup-analysis", "export-case-analysis", "plan-checkpoint-retention",
  "inspect-dataset", "export-plotting-contract", "infer-config-from-run", "recover-plan-from-run", "diagnose-result-anomaly", "compare-with-best-config",
  "start-worker-task", "stop-worker-task", "retry-worker-task", "delete-worker-artifacts", "archive-worker-artifacts", "finalize-worker-operation",
] as const;

export type TunnelAction = typeof tunnelActions[number];

export interface ClusterSnapshot {
  gpu?: Record<string, unknown[]>;
  scheduler?: unknown;
  schedulerStates?: unknown[];
  traces?: unknown;
  experimentTraces?: unknown[];
  operations?: unknown[];
  diagnostics?: Record<string, unknown>;
  generatedAt?: string;
}

export interface TunnelEndpointConfig {
  localHost: "127.0.0.1";
  localPort: number;
  token?: string;
  timeoutMs?: number;
  capabilities?: unknown;
}

export interface GpuHistoryQuery {
  serverId?: string;
  gpuId?: string;
  start?: string | number;
  end?: string | number;
  maxPoints?: number;
}

export interface GpuHistoryPoint {
  serverId: string;
  gpuId: string;
  timestamp: string;
  bucketEpoch: number;
  gpuUtilPercent: number | null;
  memoryUsedMb: number | null;
  memoryTotalMb: number | null;
  memoryUtilPercent: number | null;
  gapBefore?: boolean;
}

export interface GpuHistorySeries {
  serverId: string;
  gpuId: string;
  points: GpuHistoryPoint[];
  rawPointCount: number;
}

export interface GpuHistoryResponse {
  schemaVersion: 1;
  bucketSeconds: number;
  retentionHours: number;
  maxPointsPerSeries: number;
  updatedAt: string;
  series: GpuHistorySeries[];
}

export interface TunnelClient {
  getHealth(options?: { userInitiated?: boolean }): Promise<TunnelHealth>;
  getSnapshot(options?: { manual?: boolean }): Promise<ClusterSnapshot>;
  getGpu(): Promise<unknown>;
  getGpuHistory(query?: GpuHistoryQuery): Promise<GpuHistoryResponse>;
  getScheduler(): Promise<unknown>;
  getTraces(): Promise<unknown>;
  getLiveOutput(runKey: string, since?: number): Promise<unknown>;
  getResultsSummary(): Promise<unknown>;
  getDiagnostics(): Promise<unknown>;
  getAuditTail(): Promise<unknown>;
  getOperation(operationId: string): Promise<unknown>;
  postAction<T>(action: TunnelAction, body: unknown): Promise<T>;
  postAvailabilityBatch<T>(body: unknown): Promise<T>;
  openEventStream?(sinceSeq: number): Promise<void>;
}

const getPurposeByPath = new Map<string, TunnelRequestPurpose>([
  ["/api/health", "health"],
  ["/api/snapshot", "snapshot"],
  ["/api/gpu", "snapshot"],
  ["/api/scheduler", "snapshot"],
  ["/api/traces", "snapshot"],
  ["/api/live-output", "snapshot"],
  ["/api/results/summary", "snapshot"],
  ["/api/diagnostics", "diagnostics"],
  ["/api/audit/tail", "diagnostics"],
]);

const actionPurpose: Partial<Record<TunnelAction, TunnelRequestPurpose>> = {
  "validate-plan": "run_plan",
  "dry-run-plan": "run_plan",
  "run-plan": "run_plan",
  "stop-experiment": "stop",
  "retry-experiment": "run_plan",
  "reproduce-plan": "run_plan",
  "parse-results": "parse_results",
  "refresh-results": "manual_refresh",
  "run-quality-gate": "parse_results",
  "run-statistics": "parse_results",
  "export-paper-table": "parse_results",
  "archive-artifacts": "manual_refresh",
  "sync-artifacts": "manual_refresh",
  "complete-three-way": "manual_refresh",
  "delete-artifacts": "manual_refresh",
  "reconcile-deletions": "manual_refresh",
  "self-check": "diagnostics",
  "create-debug-bundle": "diagnostics",
  "rescan-results": "manual_refresh",
};

export class HttpTunnelClient implements TunnelClient {
  private snapshotPromise?: Promise<ClusterSnapshot>;

  constructor(
    private readonly endpoint: TunnelEndpointConfig,
    private readonly budget: RequestBudget,
  ) {
    assertLocalhost(endpoint.localHost);
  }

  getHealth(options: { userInitiated?: boolean } = {}): Promise<TunnelHealth> {
    return this.requestJson<TunnelHealth>("/api/health", "health", undefined, {
      method: "GET",
      userInitiated: options.userInitiated,
    });
  }

  getSnapshot(options: { manual?: boolean } = {}): Promise<ClusterSnapshot> {
    if (options.manual) {
      return this.requestJson<ClusterSnapshot>("/api/snapshot", "manual_refresh", undefined, {
        method: "GET",
        userInitiated: true,
      });
    }
    if (!this.snapshotPromise) {
      this.snapshotPromise = this.requestJson<ClusterSnapshot>("/api/snapshot", "snapshot", undefined, { method: "GET" })
        .finally(() => {
          this.snapshotPromise = undefined;
        });
    }
    return this.snapshotPromise;
  }

  getGpu(): Promise<unknown> {
    return this.getPath("/api/gpu");
  }

  getGpuHistory(query: GpuHistoryQuery = {}): Promise<GpuHistoryResponse> {
    const params = new URLSearchParams();
    if (query.serverId) params.set("serverId", query.serverId);
    if (query.gpuId) params.set("gpuId", query.gpuId);
    if (query.start !== undefined) params.set("start", String(query.start));
    if (query.end !== undefined) params.set("end", String(query.end));
    if (query.maxPoints !== undefined) params.set("maxPoints", String(Math.max(1, Math.min(864, Math.trunc(query.maxPoints) || 1))));
    const suffix = params.size ? `?${params.toString()}` : "";
    return this.requestJson<GpuHistoryResponse>(`/api/gpu/history${suffix}`, "manual_refresh", undefined, {
      method: "GET",
      userInitiated: true,
    });
  }

  getScheduler(): Promise<unknown> {
    return this.getPath("/api/scheduler");
  }

  getTraces(): Promise<unknown> {
    return this.getPath("/api/traces");
  }

  getLiveOutput(runKey: string, since = 0): Promise<unknown> {
    const params = new URLSearchParams({ runKey, since: String(Math.max(0, since)) });
    return this.getPath(`/api/live-output?${params.toString()}`);
  }

  getResultsSummary(): Promise<unknown> {
    return this.getPath("/api/results/summary");
  }

  getDiagnostics(): Promise<unknown> {
    return this.getPath("/api/diagnostics");
  }

  getAuditTail(): Promise<unknown> {
    return this.getPath("/api/audit/tail");
  }

  getOperation(operationId: string): Promise<unknown> {
    const id = String(operationId || "").trim();
    if (!id) throw new Error("operationId is required.");
    return this.requestJson(`/api/operations/${encodeURIComponent(id)}`, "diagnostics", undefined, {
      method: "GET",
      userInitiated: true,
    });
  }

  async postAction<T>(action: TunnelAction, body: unknown): Promise<T> {
    if (!body || typeof body !== "object" || !("opId" in body) || !String((body as { opId?: unknown }).opId || "").trim()) {
      throw new Error("Tunnel action requires opId.");
    }
    return this.requestJson<T>(`/api/actions/${action}`, actionPurpose[action] || "manual_refresh", body, {
      method: "POST",
      userInitiated: true,
    });
  }

  postAvailabilityBatch<T>(body: unknown): Promise<T> {
    return this.requestJson<T>("/api/worker/availability/batch", "manual_refresh", body, {
      method: "POST",
      userInitiated: false,
    });
  }

  async openEventStream(): Promise<void> {
    throw new RequestBudgetDeniedError("events", { allowed: false, reason: "offline" });
  }

  private getPath(path: string): Promise<unknown> {
    const purpose = getPurposeByPath.get(path.split("?", 1)[0]);
    if (!purpose) throw new Error(`API path not allowed: ${path}`);
    return this.requestJson(path, purpose, undefined, { method: "GET" });
  }

  private async requestJson<T>(
    apiPath: string,
    purpose: TunnelRequestPurpose,
    body: unknown,
    options: { method: "GET" | "POST"; userInitiated?: boolean },
  ): Promise<T> {
    if (!apiPath.startsWith("/api/")) throw new Error("Only Hub Agent API paths are allowed.");
    const base = localBaseUrl(this.endpoint);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.endpoint.timeoutMs ?? 8_000);
    timeout.unref?.();
    try {
      return await this.budget.run(
        purpose,
        async () => {
          const response = await fetch(`${base}${apiPath}`, {
            method: options.method,
            signal: controller.signal,
            headers: this.headers(body !== undefined),
            body: body === undefined ? undefined : JSON.stringify(body),
          });
          const text = await response.text();
          if (!response.ok) throw new Error(`Hub Agent HTTP ${response.status}: ${text.slice(0, 200)}`);
          if (!text.trim()) return {} as T;
          return JSON.parse(text) as T;
        },
        { userInitiated: options.userInitiated },
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private headers(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (hasBody) headers["Content-Type"] = "application/json";
    if (this.endpoint.token) headers["X-ZLK-Agent-Token"] = this.endpoint.token;
    return headers;
  }
}
