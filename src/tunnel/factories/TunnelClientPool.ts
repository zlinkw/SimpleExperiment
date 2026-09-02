// @ts-nocheck
/**
 * TunnelClientPool — 多端点客户端池工厂
 * 从 MultiEndpointRealtimeClient 提取池化逻辑，统一管理 RealtimeTunnelClient 实例
 * 遵循工厂化：定义接口 + 实现 + create 工厂方法，支持依赖注入，保持与原 API 兼容
 */

export interface TunnelClientPoolOptions {
  policy?: unknown;
  budgetFactory?: (endpoint: any) => any;
  onState?: (state: any) => void;
}

export interface TunnelClientPool {
  readonly size: number;
  get(id: string): any | undefined;
  getAll(): Map<string, any>;
  connect(sinceSeq?: number): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  reconnect(reason?: string): Promise<void>;
  dispose(): Promise<void>;
}

export interface TunnelClientPoolFactory {
  create(endpoints: any[], opts?: TunnelClientPoolOptions): TunnelClientPool;
  createWithBudgets(endpoints: any[], budgetFactory: (e: any) => any, policy?: any, onState?: (s: any) => void): TunnelClientPool;
}

class DefaultTunnelClientPool implements TunnelClientPool {
  private readonly pool = new Map<string, any>();
  private multi: any;

  constructor(endpoints: any[], private opts: TunnelClientPoolOptions = {}) {
    const budgetFactory = opts.budgetFactory || this.defaultBudgetFactory.bind(this);
    const policy = opts.policy || this.resolveDefaultPolicy();
    const onState = opts.onState || (() => undefined);
    // 优先委托给原有 MultiEndpointRealtimeClient，池逻辑复用其内部 clients Map
    try {
      const mod = require("../MultiEndpointRealtimeClient");
      if (mod && mod.MultiEndpointRealtimeClient) {
        this.multi = new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, policy, onState);
        // 同步镜像内部 clients 到池，便于外部按 id 访问
        const internal = (this.multi as any).clients as Map<string, any> | undefined;
        if (internal) for (const [k, v] of internal.entries()) this.pool.set(k, v);
        return;
      }
    } catch {}
    // 降级：为每个 endpoint 单独创建 RealtimeTunnelClient
    for (const ep of endpoints) {
      try {
        const cmod = require("../RealtimeTunnelClient");
        const b = budgetFactory(ep);
        const client = cmod && cmod.RealtimeTunnelClient ? new cmod.RealtimeTunnelClient(ep, b, policy, onState) : { endpoint: ep, budget: b, connect: async () => {}, disconnect: async () => {} };
        this.pool.set(String(ep.id || ep.localPort), client);
      } catch {
        this.pool.set(String(ep.id || ep.localPort), { endpoint: ep, connect: async () => {}, disconnect: async () => {} });
      }
    }
  }

  get size(): number { return this.pool.size; }
  get(id: string): any | undefined { return this.pool.get(id) || (this.multi as any)?.clients?.get?.(id); }
  getAll(): Map<string, any> { return new Map(this.pool); }

  async connect(sinceSeq?: number): Promise<void> {
    if (this.multi) return this.multi.connect(sinceSeq);
    await Promise.allSettled([...this.pool.values()].map((c) => c.connect?.(sinceSeq)));
  }
  async disconnect(reason = "manual"): Promise<void> {
    if (this.multi) return this.multi.disconnect(reason);
    await Promise.allSettled([...this.pool.values()].map((c) => c.disconnect?.(reason)));
  }
  async reconnect(reason = "reconnect"): Promise<void> {
    if (this.multi) return this.multi.reconnect(reason);
    await Promise.allSettled([...this.pool.values()].map((c) => c.reconnect?.(reason)));
  }
  async dispose(): Promise<void> { await this.disconnect("dispose"); this.pool.clear(); }

  private defaultBudgetFactory(endpoint: any): any {
    try {
      const mod = require("../RequestBudget");
      if (mod && mod.RequestBudget) {
        const cfg = (mod.defaultRequestBudgetConfig) || { maxRequestsPerMinute: 120 };
        return new mod.RequestBudget(cfg);
      }
    } catch {}
    return { endpointId: endpoint.id, consume: () => true, snapshot: () => ({}) };
  }
  private resolveDefaultPolicy(): any {
    try { const m = require("../RealtimeTunnelClient"); if (m && m.defaultRealtimeRefreshPolicy) return m.defaultRealtimeRefreshPolicy; } catch {}
    return { mode: "realtime", preferWebSocket: true, fallbackToSse: true, fallbackToPolling: true, heartbeatIntervalSeconds: 5, snapshotFallbackIntervalSeconds: 60 };
  }
}

export class DefaultTunnelClientPoolFactory implements TunnelClientPoolFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }
  create(endpoints: any[], opts: TunnelClientPoolOptions = {}): TunnelClientPool {
    const merged: TunnelClientPoolOptions = { ...opts };
    if (!merged.budgetFactory && this.deps.budgetFactory) merged.budgetFactory = this.deps.budgetFactory as any;
    if (!merged.policy && this.deps.policy) merged.policy = this.deps.policy;
    if (!merged.onState && this.deps.onState) merged.onState = this.deps.onState as any;
    return new DefaultTunnelClientPool(endpoints, merged);
  }
  createWithBudgets(endpoints: any[], budgetFactory: (e: any) => any, policy?: any, onState?: (s: any) => void): TunnelClientPool {
    return new DefaultTunnelClientPool(endpoints, { budgetFactory, policy, onState });
  }
}

export function createTunnelClientPool(endpoints: any[], opts?: TunnelClientPoolOptions): TunnelClientPool {
  return new DefaultTunnelClientPool(endpoints, opts);
}
export function createTunnelClientPoolFactory(deps?: Record<string, unknown>): TunnelClientPoolFactory {
  return new DefaultTunnelClientPoolFactory(deps);
}
