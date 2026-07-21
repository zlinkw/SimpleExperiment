import { RequestBudget, RequestBudgetDeniedError, TunnelRequestPurpose } from "./RequestBudget";
import { assertLocalhost, localBaseUrl } from "./TunnelGateway";
import { TunnelHealth } from "./TunnelHealth";

export type TunnelAction =
  | "run-plan"
  | "stop-experiment"
  | "parse-results"
  | "refresh-results"
  | "self-check"
  | "rescan-results";

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

export interface TunnelClient {
  getHealth(options?: { userInitiated?: boolean }): Promise<TunnelHealth>;
  getSnapshot(options?: { manual?: boolean }): Promise<ClusterSnapshot>;
  getGpu(): Promise<unknown>;
  getScheduler(): Promise<unknown>;
  getTraces(): Promise<unknown>;
  getLiveOutput(runKey: string, since?: number): Promise<unknown>;
  getResultsSummary(): Promise<unknown>;
  getDiagnostics(): Promise<unknown>;
  getAuditTail(): Promise<unknown>;
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
  ["/api/results/summary", "snapshot"],
  ["/api/diagnostics", "diagnostics"],
  ["/api/audit/tail", "diagnostics"],
]);

const actionPurpose: Record<TunnelAction, TunnelRequestPurpose> = {
  "run-plan": "run_plan",
  "stop-experiment": "stop",
  "parse-results": "parse_results",
  "refresh-results": "manual_refresh",
  "self-check": "diagnostics",
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

  postAction<T>(action: TunnelAction, body: unknown): Promise<T> {
    if (!body || typeof body !== "object" || !("opId" in body) || !String((body as { opId?: unknown }).opId || "").trim()) {
      throw new Error("Tunnel action requires opId.");
    }
    return this.requestJson<T>(`/api/actions/${action}`, actionPurpose[action], body, {
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
