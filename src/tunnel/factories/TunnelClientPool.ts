/**
 * TunnelClientPool — 多端点客户端池工厂
 * 从 MultiEndpointRealtimeClient 提取池化逻辑，统一管理 RealtimeTunnelClient 实例
 */

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

type MultiEndpointRealtimeClientMod = {
  MultiEndpointRealtimeClient?: new (endpoints: unknown[], budgetFactory: (e: unknown) => unknown, policy: unknown, onState: (s: unknown) => void) => {
    clients?: Map<string, unknown>;
    connect(sinceSeq?: number): Promise<void>;
    disconnect(reason?: string): Promise<void>;
    reconnect(reason?: string): Promise<void>;
  };
};

type RealtimeTunnelClientMod = {
  RealtimeTunnelClient?: new (endpoint: unknown, budget: unknown, policy: unknown, onState: (s: unknown) => void) => unknown;
  defaultRealtimeRefreshPolicy?: unknown;
};

type RequestBudgetMod = {
  RequestBudget?: new (cfg: unknown) => unknown;
  defaultRequestBudgetConfig?: unknown;
};

export interface TunnelClientPoolOptions {
  policy?: unknown;
  budgetFactory?: (endpoint: unknown) => unknown;
  onState?: (state: unknown) => void;
}

export interface TunnelClientPool {
  readonly size: number;
  get(id: string): unknown | undefined;
  getAll(): Map<string, unknown>;
  connect(sinceSeq?: number): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  reconnect(reason?: string): Promise<void>;
  dispose(): Promise<void>;
}

export interface TunnelClientPoolFactory {
  create(endpoints: unknown[], opts?: TunnelClientPoolOptions): TunnelClientPool;
  createWithBudgets(endpoints: unknown[], budgetFactory: (e: unknown) => unknown, policy?: unknown, onState?: (s: unknown) => void): TunnelClientPool;
}

class DefaultTunnelClientPool implements TunnelClientPool {
  private readonly pool = new Map<string, unknown>();
  private multi: { clients?: Map<string, unknown>; connect(sinceSeq?: number): Promise<void>; disconnect(reason?: string): Promise<void>; reconnect(reason?: string): Promise<void> } | undefined;

  constructor(endpoints: unknown[], private opts: TunnelClientPoolOptions = {}) {
    const budgetFactory = opts.budgetFactory ?? this.defaultBudgetFactory.bind(this);
    const policy = opts.policy ?? this.resolveDefaultPolicy();
    const onState = opts.onState ?? (() => undefined);
    const mod = tryRequire<MultiEndpointRealtimeClientMod>("../MultiEndpointRealtimeClient");
    if (mod?.MultiEndpointRealtimeClient) {
      try {
        this.multi = new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, policy, onState);
        const internal = this.multi.clients;
        if (internal) for (const [k, v] of internal.entries()) this.pool.set(k, v);
        return;
      } catch { /* fallback */ }
    }
    for (const ep of endpoints) {
      const rec = ep as Record<string, unknown>;
      const key = String(rec["id"] ?? rec["localPort"] ?? "");
      try {
        const cmod = tryRequire<RealtimeTunnelClientMod>("../RealtimeTunnelClient");
        const b = budgetFactory(ep);
        const client = cmod?.RealtimeTunnelClient ? new cmod.RealtimeTunnelClient(ep, b, policy, onState) as Record<string, unknown> : { endpoint: ep, budget: b, connect: async () => undefined, disconnect: async () => undefined } as unknown;
        this.pool.set(key, client);
      } catch {
        this.pool.set(key, { endpoint: ep, connect: async () => undefined, disconnect: async () => undefined });
      }
    }
  }

  get size(): number { return this.pool.size; }
  get(id: string): unknown | undefined { return this.pool.get(id) ?? (this.multi?.clients?.get?.(id)); }
  getAll(): Map<string, unknown> { return new Map(this.pool); }

  async connect(sinceSeq?: number): Promise<void> {
    if (this.multi) return this.multi.connect(sinceSeq);
    await Promise.allSettled([...this.pool.values()].map((c) => (c as { connect?: (s?: number) => Promise<void> }).connect?.(sinceSeq)));
  }
  async disconnect(reason = "manual"): Promise<void> {
    if (this.multi) return this.multi.disconnect(reason);
    await Promise.allSettled([...this.pool.values()].map((c) => (c as { disconnect?: (r?: string) => Promise<void> }).disconnect?.(reason)));
  }
  async reconnect(reason = "reconnect"): Promise<void> {
    if (this.multi) return this.multi.reconnect(reason);
    await Promise.allSettled([...this.pool.values()].map((c) => (c as { reconnect?: (r?: string) => Promise<void> }).reconnect?.(reason)));
  }
  async dispose(): Promise<void> { await this.disconnect("dispose"); this.pool.clear(); }

  private defaultBudgetFactory(endpoint: unknown): unknown {
    const mod = tryRequire<RequestBudgetMod>("../RequestBudget");
    if (mod?.RequestBudget) {
      const cfg = mod.defaultRequestBudgetConfig ?? { maxRequestsPerMinute: 120 };
      return new mod.RequestBudget(cfg);
    }
    return { endpointId: (endpoint as Record<string, unknown>)["id"], consume: () => true, snapshot: () => ({}) };
  }
  private resolveDefaultPolicy(): unknown {
    const m = tryRequire<RealtimeTunnelClientMod>("../RealtimeTunnelClient");
    if (m?.defaultRealtimeRefreshPolicy) return m.defaultRealtimeRefreshPolicy;
    return { mode: "realtime", preferWebSocket: true, fallbackToSse: true, fallbackToPolling: true, heartbeatIntervalSeconds: 5, snapshotFallbackIntervalSeconds: 60 };
  }
}

export class DefaultTunnelClientPoolFactory implements TunnelClientPoolFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }
  create(endpoints: unknown[], opts: TunnelClientPoolOptions = {}): TunnelClientPool {
    const merged: TunnelClientPoolOptions = { ...opts };
    if (!merged.budgetFactory && this.deps["budgetFactory"]) merged.budgetFactory = this.deps["budgetFactory"] as TunnelClientPoolOptions["budgetFactory"];
    if (!merged.policy && this.deps["policy"]) merged.policy = this.deps["policy"];
    if (!merged.onState && this.deps["onState"]) merged.onState = this.deps["onState"] as TunnelClientPoolOptions["onState"];
    return new DefaultTunnelClientPool(endpoints, merged);
  }
  createWithBudgets(endpoints: unknown[], budgetFactory: (e: unknown) => unknown, policy?: unknown, onState?: (s: unknown) => void): TunnelClientPool {
    return new DefaultTunnelClientPool(endpoints, { budgetFactory, policy, onState });
  }
}

export function createTunnelClientPool(endpoints: unknown[], opts?: TunnelClientPoolOptions): TunnelClientPool {
  return new DefaultTunnelClientPool(endpoints, opts);
}
export function createTunnelClientPoolFactory(deps?: Record<string, unknown>): TunnelClientPoolFactory {
  return new DefaultTunnelClientPoolFactory(deps);
}
