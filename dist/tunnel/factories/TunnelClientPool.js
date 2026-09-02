"use strict";
/**
 * TunnelClientPool — 多端点客户端池工厂
 * 从 MultiEndpointRealtimeClient 提取池化逻辑，统一管理 RealtimeTunnelClient 实例
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTunnelClientPoolFactory = void 0;
exports.createTunnelClientPool = createTunnelClientPool;
exports.createTunnelClientPoolFactory = createTunnelClientPoolFactory;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
class DefaultTunnelClientPool {
    opts;
    pool = new Map();
    multi;
    constructor(endpoints, opts = {}) {
        this.opts = opts;
        const budgetFactory = opts.budgetFactory ?? this.defaultBudgetFactory.bind(this);
        const policy = opts.policy ?? this.resolveDefaultPolicy();
        const onState = opts.onState ?? (() => undefined);
        const mod = tryRequire("../MultiEndpointRealtimeClient");
        if (mod?.MultiEndpointRealtimeClient) {
            try {
                this.multi = new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, policy, onState);
                const internal = this.multi.clients;
                if (internal)
                    for (const [k, v] of internal.entries())
                        this.pool.set(k, v);
                return;
            }
            catch { /* fallback */ }
        }
        for (const ep of endpoints) {
            const rec = ep;
            const key = String(rec["id"] ?? rec["localPort"] ?? "");
            try {
                const cmod = tryRequire("../RealtimeTunnelClient");
                const b = budgetFactory(ep);
                const client = cmod?.RealtimeTunnelClient ? new cmod.RealtimeTunnelClient(ep, b, policy, onState) : { endpoint: ep, budget: b, connect: async () => undefined, disconnect: async () => undefined };
                this.pool.set(key, client);
            }
            catch {
                this.pool.set(key, { endpoint: ep, connect: async () => undefined, disconnect: async () => undefined });
            }
        }
    }
    get size() { return this.pool.size; }
    get(id) { return this.pool.get(id) ?? (this.multi?.clients?.get?.(id)); }
    getAll() { return new Map(this.pool); }
    async connect(sinceSeq) {
        if (this.multi)
            return this.multi.connect(sinceSeq);
        await Promise.allSettled([...this.pool.values()].map((c) => c.connect?.(sinceSeq)));
    }
    async disconnect(reason = "manual") {
        if (this.multi)
            return this.multi.disconnect(reason);
        await Promise.allSettled([...this.pool.values()].map((c) => c.disconnect?.(reason)));
    }
    async reconnect(reason = "reconnect") {
        if (this.multi)
            return this.multi.reconnect(reason);
        await Promise.allSettled([...this.pool.values()].map((c) => c.reconnect?.(reason)));
    }
    async dispose() { await this.disconnect("dispose"); this.pool.clear(); }
    defaultBudgetFactory(endpoint) {
        const mod = tryRequire("../RequestBudget");
        if (mod?.RequestBudget) {
            const cfg = mod.defaultRequestBudgetConfig ?? { maxRequestsPerMinute: 120 };
            return new mod.RequestBudget(cfg);
        }
        return { endpointId: endpoint["id"], consume: () => true, snapshot: () => ({}) };
    }
    resolveDefaultPolicy() {
        const m = tryRequire("../RealtimeTunnelClient");
        if (m?.defaultRealtimeRefreshPolicy)
            return m.defaultRealtimeRefreshPolicy;
        return { mode: "realtime", preferWebSocket: true, fallbackToSse: true, fallbackToPolling: true, heartbeatIntervalSeconds: 5, snapshotFallbackIntervalSeconds: 60 };
    }
}
class DefaultTunnelClientPoolFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(endpoints, opts = {}) {
        const merged = { ...opts };
        if (!merged.budgetFactory && this.deps["budgetFactory"])
            merged.budgetFactory = this.deps["budgetFactory"];
        if (!merged.policy && this.deps["policy"])
            merged.policy = this.deps["policy"];
        if (!merged.onState && this.deps["onState"])
            merged.onState = this.deps["onState"];
        return new DefaultTunnelClientPool(endpoints, merged);
    }
    createWithBudgets(endpoints, budgetFactory, policy, onState) {
        return new DefaultTunnelClientPool(endpoints, { budgetFactory, policy, onState });
    }
}
exports.DefaultTunnelClientPoolFactory = DefaultTunnelClientPoolFactory;
function createTunnelClientPool(endpoints, opts) {
    return new DefaultTunnelClientPool(endpoints, opts);
}
function createTunnelClientPoolFactory(deps) {
    return new DefaultTunnelClientPoolFactory(deps);
}
