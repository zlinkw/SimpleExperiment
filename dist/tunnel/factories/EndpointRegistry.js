"use strict";
/**
 * EndpointRegistry — 端点注册表工厂
 * 封装 TunnelEndpointRegistry 的注册/发现/持久化，支持依赖注入与多端点拓扑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultEndpointRegistryFactory = void 0;
exports.createEndpointRegistry = createEndpointRegistry;
exports.createEndpointRegistryFactory = createEndpointRegistryFactory;
const TunnelGateway_1 = require("../TunnelGateway");
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
        if (!Array.isArray(initial))
            throw new Error("Tunnel endpoint initial value must be an array.");
        for (const ep of initial)
            this.register(ep);
    }
    register(endpoint) {
        if (!endpoint || typeof endpoint !== "object" || Array.isArray(endpoint))
            throw new Error("Tunnel endpoint must be an object.");
        const id = String(endpoint.id || "").trim();
        if (!id)
            throw new Error("Endpoint id is required");
        if (endpoint.role !== "hub" && endpoint.role !== "worker")
            throw new Error(`Endpoint ${id} has an unsupported role.`);
        const localHost = String(endpoint.localHost || "").trim();
        const localPort = Number(endpoint.localPort);
        const remoteHost = String(endpoint.remoteHost || "").trim();
        const remotePort = Number(endpoint.remotePort);
        if (!localHost || !Number.isInteger(localPort) || localPort < 1024 || localPort > 65535
            || !remoteHost || !Number.isInteger(remotePort) || remotePort < 1 || remotePort > 65535)
            throw new Error(`Endpoint ${id} requires configured local and remote hosts and ports.`);
        (0, TunnelGateway_1.assertLocalhost)(localHost);
        (0, TunnelGateway_1.assertLocalhost)(remoteHost);
        (0, TunnelGateway_1.localBaseUrl)({ localHost, localPort });
        this.map.set(id, { ...endpoint, id, localHost, localPort, remoteHost, remotePort, enabled: endpoint.enabled !== false });
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
            const register = inst.register ? (ep) => inst.register(ep) : inst.set ? (ep) => inst.set(ep.id, ep) : undefined;
            const unregister = inst.unregister ? (id) => Boolean(inst.unregister(id)) : inst.delete ? (id) => Boolean(inst.delete(id)) : undefined;
            const get = inst.get ? (id) => inst.get(id) : inst.find ? (id) => inst.find(id) : undefined;
            const list = inst.list ? (role) => inst.list(role) : inst.values ? () => [...inst.values()] : undefined;
            if (!register || !unregister || !get || !list)
                throw new Error("TunnelEndpointRegistry implementation is missing required registry operations.");
            return {
                register,
                unregister,
                get,
                list: (role) => list(role),
                listEnabled: () => inst.listEnabled ? inst.listEnabled() : list().filter((e) => e.enabled !== false),
                has: (id) => inst.has ? Boolean(inst.has(id)) : Boolean(get(id)),
                clear: () => {
                    if (inst.clear) {
                        inst.clear();
                        return;
                    }
                    for (const endpoint of list())
                        unregister(endpoint.id);
                },
                toNamedConfigs: () => inst.toNamedConfigs ? inst.toNamedConfigs() : [...list()],
            };
        }
        return new DefaultEndpointRegistry(initial);
    }
    fromWorkspace(initial = []) {
        if (!Array.isArray(initial))
            throw new Error("Tunnel endpoint initial value must be an array.");
        let persisted = [...initial];
        const store = this.deps["workspaceState"] ?? this.deps["globalState"];
        if (store && typeof store.get === "function") {
            let saved;
            try {
                saved = store.get("tunnelEndpoints");
            }
            catch (error) {
                throw new Error(`Tunnel endpoint settings could not be read: ${String(error?.message || error).slice(0, 240)}`);
            }
            if (saved !== undefined && !Array.isArray(saved))
                throw new Error("Saved tunnel endpoint settings are malformed; refusing to use an empty registry.");
            if (Array.isArray(saved))
                persisted = [...persisted, ...saved];
        }
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
