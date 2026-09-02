"use strict";
/**
 * EndpointRegistry — 端点注册表工厂
 * 封装 TunnelEndpointRegistry 的注册/发现/持久化，支持依赖注入与多端点拓扑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEndpointRegistryFactory = void 0;
exports.createEndpointRegistry = createEndpointRegistry;
exports.createEndpointRegistryFactory = createEndpointRegistryFactory;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
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
            token: e["token"],
            capabilities: e["capabilities"],
        }));
    }
}
class DefaultEndpointRegistryFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(initial = []) {
        const mod = tryRequire("../TunnelEndpointRegistry");
        if (mod?.TunnelEndpointRegistry) {
            const inst = new mod.TunnelEndpointRegistry(initial);
            return {
                register: (ep) => { if (inst.register)
                    inst.register(ep);
                else
                    inst.set?.(ep.id, ep); },
                unregister: (id) => inst.unregister ? Boolean(inst.unregister(id)) : Boolean(inst.delete?.(id)),
                get: (id) => inst.get?.(id) ?? inst.find?.(id),
                list: (role) => inst.list ? inst.list(role) : [...(inst.values?.() ?? [])],
                listEnabled: () => inst.listEnabled ? inst.listEnabled() : inst.list ? inst.list().filter((e) => e.enabled !== false) : [],
                has: (id) => inst.has ? Boolean(inst.has(id)) : false,
                clear: () => inst.clear?.(),
                toNamedConfigs: () => inst.toNamedConfigs ? inst.toNamedConfigs() : [...(inst.values?.() ?? [])],
            };
        }
        return new DefaultEndpointRegistry(initial);
    }
    fromWorkspace(initial = []) {
        let persisted = [...initial];
        try {
            const store = this.deps["workspaceState"] ?? this.deps["globalState"];
            if (store && typeof store.get === "function") {
                const saved = store.get("tunnelEndpoints");
                if (Array.isArray(saved))
                    persisted = [...persisted, ...saved];
            }
        }
        catch { /* ignore */ }
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
