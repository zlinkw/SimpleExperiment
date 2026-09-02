"use strict";
// @ts-nocheck
/**
 * EndpointRegistry — 端点注册表工厂
 * 封装 TunnelEndpointRegistry 的注册/发现/持久化，支持依赖注入与多端点拓扑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEndpointRegistryFactory = void 0;
exports.createEndpointRegistry = createEndpointRegistry;
exports.createEndpointRegistryFactory = createEndpointRegistryFactory;
class DefaultEndpointRegistry {
    map = new Map();
    constructor(initial = []) {
        for (const ep of initial)
            this.register(ep);
    }
    register(endpoint) {
        const id = String(endpoint.id || "").trim();
        if (!id)
            throw new Error("Endpoint id is required");
        // 兼容校验：localPort 按 TunnelGateway.normalizePort 规则归一，host 允许自定义
        const port = Number(endpoint.localPort);
        const normalizedPort = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : endpoint.localPort;
        this.map.set(id, { ...endpoint, id, localPort: normalizedPort, remoteHost: endpoint.remoteHost || "127.0.0.1", remotePort: endpoint.remotePort || 18765, enabled: endpoint.enabled !== false });
    }
    unregister(id) { return this.map.delete(String(id)); }
    get(id) { return this.map.get(String(id)); }
    list(role) {
        const all = [...this.map.values()];
        return role ? all.filter((e) => e.role === role) : all;
    }
    listEnabled() { return [...this.map.values()].filter((e) => e.enabled !== false); }
    has(id) { return this.map.has(String(id)); }
    clear() { this.map.clear(); }
    toNamedConfigs() {
        return this.list().map((e) => ({
            id: e.id,
            role: e.role,
            displayName: e.displayName,
            localHost: e.localHost,
            localPort: e.localPort,
            remoteHost: e.remoteHost,
            remotePort: e.remotePort,
            token: e.token,
            capabilities: e.capabilities,
        }));
    }
}
class DefaultEndpointRegistryFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(initial = []) {
        // 优先委托原有 TunnelEndpointRegistry（若存在），否则使用本地实现
        try {
            const mod = require("../TunnelEndpointRegistry");
            if (mod && mod.TunnelEndpointRegistry) {
                const inst = new mod.TunnelEndpointRegistry(initial);
                // 适配为 EndpointRegistry 接口
                return {
                    register: (ep) => inst.register ? inst.register(ep) : inst.set?.(ep.id, ep),
                    unregister: (id) => inst.unregister ? inst.unregister(id) : inst.delete?.(id),
                    get: (id) => inst.get?.(id) || inst.find?.(id),
                    list: (role) => inst.list ? inst.list(role) : [...(inst.values?.() || [])],
                    listEnabled: () => (inst.listEnabled ? inst.listEnabled() : inst.list ? inst.list().filter((e) => e.enabled !== false) : []),
                    has: (id) => inst.has ? inst.has(id) : false,
                    clear: () => inst.clear?.(),
                    toNamedConfigs: () => inst.toNamedConfigs ? inst.toNamedConfigs() : [...(inst.values?.() || [])],
                };
            }
        }
        catch { }
        return new DefaultEndpointRegistry(initial);
    }
    fromWorkspace(initial = []) {
        // 支持从 deps.workspaceState / globalState 恢复持久化端点
        let persisted = [...initial];
        try {
            const store = this.deps.workspaceState || this.deps.globalState;
            if (store && typeof store.get === "function") {
                const saved = store.get("tunnelEndpoints");
                if (Array.isArray(saved))
                    persisted = [...persisted, ...saved];
            }
        }
        catch { }
        return this.create(persisted);
    }
}
exports.DefaultEndpointRegistryFactory = DefaultEndpointRegistryFactory;
function createEndpointRegistry(initial) {
    return new DefaultEndpointRegistry(initial);
}
function createEndpointRegistryFactory(deps) {
    return new DefaultEndpointRegistryFactory(deps);
}
