"use strict";
/**
 * TunnelClientPool — 多端点客户端池工厂
 * 从 MultiEndpointRealtimeClient 提取池化逻辑，统一管理 RealtimeTunnelClient 实例
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTunnelClientPoolFactory = void 0;
exports.createTunnelClientPool = createTunnelClientPool;
exports.createTunnelClientPoolFactory = createTunnelClientPoolFactory;
const RequestBudget_1 = require("../RequestBudget");
const RealtimeTunnelClient_1 = require("../RealtimeTunnelClient");
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
        if (mod && typeof mod.MultiEndpointRealtimeClient === "function") {
            try {
                this.multi = new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, policy, onState);
                const internal = this.multi.clients;
                if (!internal)
                    throw new Error("MultiEndpointRealtimeClient did not expose its endpoint clients.");
                for (const [k, v] of internal.entries())
                    this.pool.set(k, v);
                return;
            }
            catch (error) {
                throw new Error(`Multi-endpoint tunnel client initialization failed: ${String(error?.message || error).slice(0, 300)}`);
            }
        }
        const clientModule = tryRequire("../RealtimeTunnelClient");
        if (typeof clientModule?.RealtimeTunnelClient !== "function")
            throw new Error("RealtimeTunnelClient implementation is unavailable.");
        for (const ep of endpoints) {
            const rec = ep;
            const key = String(rec["id"] ?? "").trim();
            if (!key)
                throw new Error("Tunnel endpoint is missing its stable id.");
            if (this.pool.has(key))
                throw new Error(`Duplicate tunnel endpoint id: ${key}`);
            try {
                const b = budgetFactory(ep);
                if (!b)
                    throw new Error("RequestBudget factory returned no budget.");
                const client = new clientModule.RealtimeTunnelClient(ep, b, policy, onState);
                if (typeof client.connect !== "function" || typeof client.disconnect !== "function" || typeof client.reconnect !== "function")
                    throw new Error("RealtimeTunnelClient is missing a lifecycle method.");
                this.pool.set(key, client);
            }
            catch (error) {
                throw new Error(`Tunnel endpoint ${key} initialization failed: ${String(error?.message || error).slice(0, 240)}`);
            }
        }
    }
    get size() { return this.pool.size; }
    get(id) { return this.pool.get(id) ?? (this.multi?.clients?.get?.(id)); }
    getAll() { return new Map(this.pool); }
    async connect(sinceSeq) {
        if (this.multi)
            return this.multi.connect(sinceSeq);
        await this.invokeAll("connect", sinceSeq);
    }
    async disconnect(reason = "manual") {
        if (this.multi)
            return this.multi.disconnect(reason);
        await this.invokeAll("disconnect", reason);
    }
    async reconnect(reason = "reconnect") {
        if (this.multi)
            return this.multi.reconnect(reason);
        await this.invokeAll("reconnect", reason);
    }
    async dispose() { await this.disconnect("dispose"); this.pool.clear(); }
    async invokeAll(method, argument) {
        const entries = [...this.pool.entries()];
        const outcomes = await Promise.all(entries.map(async ([id, client]) => {
            const fn = client[method];
            if (typeof fn !== "function")
                return `${id}: lifecycle method ${method} is unavailable`;
            try {
                await fn.call(client, argument);
                return "";
            }
            catch (error) {
                return `${id}: ${String(error?.message || error).slice(0, 240)}`;
            }
        }));
        const failures = outcomes.filter(Boolean);
        if (failures.length)
            throw new Error(`${method} failed for ${failures.length}/${entries.length} tunnel endpoints: ${failures.slice(0, 8).join("; ")}`);
    }
    defaultBudgetFactory(endpoint) {
        const mod = tryRequire("../RequestBudget");
        if (mod?.RequestBudget) {
            const cfg = mod.defaultRequestBudgetConfig ?? RequestBudget_1.defaultRequestBudgetConfig;
            return new mod.RequestBudget(cfg);
        }
        throw new Error(`RequestBudget implementation is unavailable for endpoint ${String(endpoint?.["id"] || "unknown")}.`);
    }
    resolveDefaultPolicy() {
        const m = tryRequire("../RealtimeTunnelClient");
        if (m?.defaultRealtimeRefreshPolicy)
            return m.defaultRealtimeRefreshPolicy;
        return RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy;
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
