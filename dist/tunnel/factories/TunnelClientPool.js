"use strict";
// @ts-nocheck
/**
 * TunnelClientPool — 多端点客户端池工厂
 * 从 MultiEndpointRealtimeClient 提取池化逻辑，统一管理 RealtimeTunnelClient 实例
 * 遵循工厂化：定义接口 + 实现 + create 工厂方法，支持依赖注入，保持与原 API 兼容
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTunnelClientPoolFactory = void 0;
exports.createTunnelClientPool = createTunnelClientPool;
exports.createTunnelClientPoolFactory = createTunnelClientPoolFactory;
class DefaultTunnelClientPool {
    opts;
    pool = new Map();
    multi;
    constructor(endpoints, opts = {}) {
        this.opts = opts;
        const budgetFactory = opts.budgetFactory || this.defaultBudgetFactory.bind(this);
        const policy = opts.policy || this.resolveDefaultPolicy();
        const onState = opts.onState || (() => undefined);
        // 优先委托给原有 MultiEndpointRealtimeClient，池逻辑复用其内部 clients Map
        try {
            const mod = require("../MultiEndpointRealtimeClient");
            if (mod && mod.MultiEndpointRealtimeClient) {
                this.multi = new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, policy, onState);
                // 同步镜像内部 clients 到池，便于外部按 id 访问
                const internal = this.multi.clients;
                if (internal)
                    for (const [k, v] of internal.entries())
                        this.pool.set(k, v);
                return;
            }
        }
        catch { }
        // 降级：为每个 endpoint 单独创建 RealtimeTunnelClient
        for (const ep of endpoints) {
            try {
                const cmod = require("../RealtimeTunnelClient");
                const b = budgetFactory(ep);
                const client = cmod && cmod.RealtimeTunnelClient ? new cmod.RealtimeTunnelClient(ep, b, policy, onState) : { endpoint: ep, budget: b, connect: async () => { }, disconnect: async () => { } };
                this.pool.set(String(ep.id || ep.localPort), client);
            }
            catch {
                this.pool.set(String(ep.id || ep.localPort), { endpoint: ep, connect: async () => { }, disconnect: async () => { } });
            }
        }
    }
    get size() { return this.pool.size; }
    get(id) { return this.pool.get(id) || this.multi?.clients?.get?.(id); }
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
        try {
            const mod = require("../RequestBudget");
            if (mod && mod.RequestBudget) {
                const cfg = (mod.defaultRequestBudgetConfig) || { maxRequestsPerMinute: 120 };
                return new mod.RequestBudget(cfg);
            }
        }
        catch { }
        return { endpointId: endpoint.id, consume: () => true, snapshot: () => ({}) };
    }
    resolveDefaultPolicy() {
        try {
            const m = require("../RealtimeTunnelClient");
            if (m && m.defaultRealtimeRefreshPolicy)
                return m.defaultRealtimeRefreshPolicy;
        }
        catch { }
        return { mode: "realtime", preferWebSocket: true, fallbackToSse: true, fallbackToPolling: true, heartbeatIntervalSeconds: 5, snapshotFallbackIntervalSeconds: 60 };
    }
}
class DefaultTunnelClientPoolFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(endpoints, opts = {}) {
        const merged = { ...opts };
        if (!merged.budgetFactory && this.deps.budgetFactory)
            merged.budgetFactory = this.deps.budgetFactory;
        if (!merged.policy && this.deps.policy)
            merged.policy = this.deps.policy;
        if (!merged.onState && this.deps.onState)
            merged.onState = this.deps.onState;
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
