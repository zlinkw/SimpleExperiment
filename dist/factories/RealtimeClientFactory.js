"use strict";
/**
 * RealtimeClientFactory - 实时客户端工厂
 * 封装 RequestBudget / RealtimeTunnelClient / MultiEndpointRealtimeClient 的创建
 * P0：endpoints 的 localPort 必须来自 TunnelFactory 分配结果，不得在工厂内 default 赋字面量
 * 遵循 docs/architecture-factory-refactor-plan.md §3.4
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRealtimeClientFactory = void 0;
// ---------- 强类型动态 require 访问器 ----------
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function getTunnelGateway() {
    return tryRequire("../tunnel/TunnelGateway");
}
function getRequestBudgetMod() {
    return tryRequire("../tunnel/RequestBudget");
}
function getSingleClientMod() {
    return tryRequire("../tunnel/RealtimeTunnelClient");
}
function getMultiClientMod() {
    return tryRequire("../tunnel/MultiEndpointRealtimeClient");
}
function resolvePolicyForProfile(profile) {
    const gw = getTunnelGateway();
    if (gw?.refreshProfiles) {
        const cfg = gw.refreshProfiles[profile];
        if (cfg) {
            return {
                mode: profile,
                preferWebSocket: cfg.stream,
                fallbackToSse: cfg.stream,
                fallbackToPolling: true,
                heartbeatIntervalSeconds: cfg.health,
                snapshotFallbackIntervalSeconds: cfg.snapshot,
                pauseWhenWebviewHidden: false,
            };
        }
    }
    const isManual = profile === "manual_only";
    const isBalanced = profile === "balanced";
    return {
        mode: (isManual ? "manual_only" : isBalanced ? "balanced" : "realtime"),
        preferWebSocket: !isManual,
        fallbackToSse: !isManual,
        fallbackToPolling: true,
        heartbeatIntervalSeconds: isManual ? 0 : isBalanced ? 10 : 5,
        snapshotFallbackIntervalSeconds: isManual ? 0 : isBalanced ? 60 : 30,
        pauseWhenWebviewHidden: false,
    };
}
class DefaultRealtimeClientFactory {
    deps;
    constructor(deps = {}) {
        this.deps = deps;
    }
    createBudget(endpoint) {
        if (!String(endpoint?.id || "").trim())
            throw new Error("RequestBudget requires a configured endpoint id.");
        const mod = getRequestBudgetMod();
        if (mod?.RequestBudget) {
            const cfg = this.deps["requestBudgetConfig"] ?? mod.defaultRequestBudgetConfig;
            return new mod.RequestBudget(cfg);
        }
        throw new Error(`RequestBudget implementation unavailable for endpoint ${endpoint.id}; refusing an unbounded fallback.`);
    }
    createSingleClient(endpoint, budget, policy, onState) {
        this.assertEndpoint(endpoint);
        const mod = getSingleClientMod();
        if (mod?.RealtimeTunnelClient) {
            return new mod.RealtimeTunnelClient(endpoint, budget, policy, onState);
        }
        throw new Error(`RealtimeTunnelClient implementation unavailable for endpoint ${String(endpoint.id || "unknown")}.`);
    }
    createMultiClient(endpoints, budgetFactory, policy, onState) {
        if (!Array.isArray(endpoints) || !endpoints.length)
            throw new Error("MultiEndpointRealtimeClient requires at least one configured endpoint.");
        for (const endpoint of endpoints)
            this.assertEndpoint(endpoint);
        const mod = getMultiClientMod();
        if (mod?.MultiEndpointRealtimeClient) {
            const effPolicy = policy ?? resolvePolicyForProfile("realtime");
            const handler = onState ?? (() => undefined);
            return new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, effPolicy, handler);
        }
        throw new Error(`MultiEndpointRealtimeClient implementation unavailable for ${endpoints.length} configured endpoint(s).`);
    }
    policyForProfile(profile) {
        return resolvePolicyForProfile(profile);
    }
    createAll(ctx) {
        const endpoints = this.configuredEndpoints(ctx);
        const policy = this.policyForProfile(String(ctx["refreshProfile"] || this.deps["refreshProfile"] || "realtime"));
        const onState = (ctx["onRealtimeState"] || this.deps["onState"] || (() => undefined));
        return [this.createMultiClient(endpoints, (endpoint) => this.createBudget(endpoint), policy, onState)];
    }
    createByName(name, ctx) {
        const policy = this.policyForProfile(String(ctx["refreshProfile"] || this.deps["refreshProfile"] || "realtime"));
        const map = {
            budget: () => this.createBudget(this.configuredEndpoint(ctx)),
            singleClient: () => {
                const endpoint = this.configuredEndpoint(ctx);
                return this.createSingleClient(endpoint, this.createBudget(endpoint), policy, this.stateHandler(ctx));
            },
            multiClient: () => this.createMultiClient(this.configuredEndpoints(ctx), (e) => this.createBudget(e), policy, this.stateHandler(ctx)),
            policyRealtime: () => this.policyForProfile("realtime"),
            policyBalanced: () => this.policyForProfile("balanced"),
            policyManual: () => this.policyForProfile("manual_only"),
        };
        const fn = map[name];
        return fn ? fn() : undefined;
    }
    configuredEndpoints(ctx) {
        const candidate = this.deps["endpoints"] ?? ctx["realtimeEndpoints"] ?? ctx["endpoints"];
        if (!Array.isArray(candidate) || !candidate.length)
            throw new Error("RealtimeClientFactory needs endpoints resolved from the user's tunnel configuration.");
        const endpoints = candidate.map((value) => this.assertEndpoint(value));
        if (new Set(endpoints.map((endpoint) => endpoint.id)).size !== endpoints.length)
            throw new Error("Realtime endpoint ids must be unique.");
        return endpoints;
    }
    configuredEndpoint(ctx) {
        const explicit = this.deps["endpoint"] ?? ctx["realtimeEndpoint"] ?? ctx["endpoint"];
        if (explicit)
            return this.assertEndpoint(explicit);
        const endpoints = this.configuredEndpoints(ctx);
        const id = String(ctx["endpointId"] ?? this.deps["endpointId"] ?? "");
        const selected = id ? endpoints.find((row) => row.id === id) : endpoints.length === 1 ? endpoints[0] : undefined;
        if (!selected)
            throw new Error("A specific configured endpoint is required when creating a single tunnel client or budget.");
        return selected;
    }
    stateHandler(ctx) {
        const handler = ctx["onRealtimeState"] ?? this.deps["onState"];
        return typeof handler === "function" ? handler : () => undefined;
    }
    assertEndpoint(value) {
        if (!value || typeof value !== "object" || !String(value.id || "").trim() || !["hub", "worker"].includes(value.role))
            throw new Error("Tunnel endpoint requires a stable id and supported role.");
        const localHost = String(value.localHost || "").trim();
        const localPort = Number(value.localPort);
        const remoteHost = String(value.remoteHost || "").trim();
        const remotePort = Number(value.remotePort);
        if (!localHost || !Number.isInteger(localPort) || localPort < 1 || localPort > 65535
            || !remoteHost || !Number.isInteger(remotePort) || remotePort < 1 || remotePort > 65535)
            throw new Error(`Tunnel endpoint ${value.id} is missing its configured local/remote host or port.`);
        const gateway = getTunnelGateway();
        if (gateway?.localBaseUrl)
            gateway.localBaseUrl({ localHost, localPort });
        return { ...value, localHost, localPort, remoteHost, remotePort };
    }
}
exports.DefaultRealtimeClientFactory = DefaultRealtimeClientFactory;
