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
        const mod = getRequestBudgetMod();
        if (mod?.RequestBudget) {
            const cfg = this.deps["requestBudgetConfig"] ?? mod.defaultRequestBudgetConfig;
            return new mod.RequestBudget(cfg);
        }
        return { kind: "RequestBudget", endpointId: endpoint.id, consume: () => true, snapshot: () => ({}) };
    }
    createSingleClient(endpoint, budget, policy, onState) {
        const mod = getSingleClientMod();
        if (mod?.RealtimeTunnelClient) {
            return new mod.RealtimeTunnelClient(endpoint, budget, policy, onState);
        }
        return { kind: "RealtimeTunnelClient", endpoint, budget, policy, onState, connect: async () => undefined, dispose() { } };
    }
    createMultiClient(endpoints, budgetFactory, policy, onState) {
        const mod = getMultiClientMod();
        if (mod?.MultiEndpointRealtimeClient) {
            const effPolicy = policy ?? resolvePolicyForProfile("realtime");
            const handler = onState ?? (() => undefined);
            return new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, effPolicy, handler);
        }
        return {
            kind: "MultiEndpointRealtimeClient",
            endpoints,
            policy: policy ?? resolvePolicyForProfile("realtime"),
            connect: async () => undefined,
            dispose() { },
        };
    }
    policyForProfile(profile) {
        return resolvePolicyForProfile(profile);
    }
    createAll(_ctx) {
        const policy = this.policyForProfile("realtime");
        const dummyEndpoint = { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 0 };
        const budget = this.createBudget(dummyEndpoint);
        return [
            budget,
            this.createSingleClient(dummyEndpoint, budget, policy, () => undefined),
            this.createMultiClient([dummyEndpoint], () => budget, policy, () => undefined),
        ];
    }
    createByName(name, _ctx) {
        const policy = this.policyForProfile("realtime");
        const dummyEndpoint = { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 0 };
        const map = {
            budget: () => this.createBudget(dummyEndpoint),
            singleClient: () => this.createSingleClient(dummyEndpoint, this.createBudget(dummyEndpoint), policy, () => undefined),
            multiClient: () => this.createMultiClient([dummyEndpoint], (e) => this.createBudget(e), policy, () => undefined),
            policyRealtime: () => this.policyForProfile("realtime"),
            policyBalanced: () => this.policyForProfile("balanced"),
            policyManual: () => this.policyForProfile("manual_only"),
        };
        const fn = map[name];
        return fn ? fn() : undefined;
    }
}
exports.DefaultRealtimeClientFactory = DefaultRealtimeClientFactory;
