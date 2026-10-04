"use strict";
/**
 * TunnelFactory - 隧道工厂
 * 封装 TunnelGateway / TunnelPortAllocator / TunnelEndpointRegistry / XshellTunnel* 的创建
 * P0 约束：禁止硬编码端口，所有端口经由输入配置或 normalize 动态解析
 * 遵循 docs/architecture-factory-refactor-plan.md §3.3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultTunnelFactory = void 0;
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
function getXshellSetup() {
    return tryRequire("../tunnel/XshellTunnelSetup");
}
function getPortAllocator() {
    return tryRequire("../tunnel/TunnelPortAllocator");
}
function getEndpointRegistry() {
    return tryRequire("../tunnel/TunnelEndpointRegistry");
}
function getPortConflict() {
    return tryRequire("../tunnel/TunnelPortConflict");
}
function getPortProbe() {
    return tryRequire("../tunnel/XshellTunnelPortProbe");
}
function getLauncher() {
    return tryRequire("../tunnel/XshellSessionLauncher");
}
function getIntegration() {
    return tryRequire("../tunnel/XshellTunnelIntegration");
}
class DefaultTunnelFactory {
    injectedDeps;
    constructor(deps = {}) {
        this.injectedDeps = deps;
    }
    getDefaultPort() {
        const gw = getTunnelGateway();
        if (gw?.defaultTunnelGatewayConfig?.localPort !== undefined) {
            return Number(gw.defaultTunnelGatewayConfig.localPort) || 0;
        }
        return 0;
    }
    getDefaultRemotePort() {
        const gw = getTunnelGateway();
        if (gw?.defaultTunnelGatewayConfig?.remotePort !== undefined) {
            return Number(gw.defaultTunnelGatewayConfig.remotePort) || 0;
        }
        return 0;
    }
    getDefaultGatewayConfig() {
        const gw = getTunnelGateway();
        if (gw?.defaultTunnelGatewayConfig) {
            return gw.defaultTunnelGatewayConfig;
        }
        return { localHost: "127.0.0.1", localPort: 0, remoteHost: "127.0.0.1", remotePort: 0 };
    }
    normalizeGatewayConfig(input = {}) {
        const mod = getTunnelGateway();
        if (mod) {
            if (typeof mod.normalizeTunnelGatewayConfig === "function") {
                return mod.normalizeTunnelGatewayConfig(input);
            }
            if (mod.defaultTunnelGatewayConfig) {
                const def = mod.defaultTunnelGatewayConfig;
                return { ...def, ...input };
            }
        }
        // 回退：使用动态默认配置合并，禁止硬编码端口字面量分支
        const defPort = this.getDefaultPort();
        const defRemotePort = this.getDefaultRemotePort();
        void this.getDefaultGatewayConfig();
        const fallbackBase = { localHost: "127.0.0.1", localPort: defPort, remoteHost: "127.0.0.1", remotePort: defRemotePort };
        return { ...fallbackBase, ...input };
    }
    normalizeSetupConfig(input = {}) {
        const mod = getXshellSetup();
        if (mod) {
            if (typeof mod.normalizeXshellRealtimeTunnelConfig === "function") {
                return mod.normalizeXshellRealtimeTunnelConfig(input);
            }
            if (typeof mod.normalizeXshellTunnelSetup === "function") {
                return mod.normalizeXshellTunnelSetup(input);
            }
        }
        return { hubHost: String(input.hubHost || ""), localForwardPort: Number(input.localForwardPort) || 0, remoteAgentPort: Number(input.remoteAgentPort) || 0, ...input };
    }
    createPortAllocator(range) {
        const mod = getPortAllocator();
        if (mod) {
            if (mod.TunnelPortAllocator)
                return new mod.TunnelPortAllocator(range);
            if (typeof mod.allocateTunnelPorts === "function")
                return { allocate: mod.allocateTunnelPorts, range };
        }
        throw new Error("TunnelPortAllocator implementation unavailable; no endpoints were allocated.");
    }
    createEndpointRegistry(setup, probes = {}) {
        const mod = getEndpointRegistry();
        if (mod && typeof mod.buildTunnelEndpointRegistry === "function")
            return mod.buildTunnelEndpointRegistry(setup, probes);
        throw new Error("TunnelEndpointRegistry implementation unavailable; refusing an empty endpoint registry.");
    }
    detectPortConflicts(assignments, range) {
        const mod = getPortConflict();
        if (mod) {
            if (typeof mod.detectPortConflicts === "function")
                return mod.detectPortConflicts(assignments, range);
            if (typeof mod.makeTunnelPortConflict === "function" && assignments) {
                // 基础去重检测回退
                const seen = new Map();
                const conflicts = [];
                for (const a of assignments) {
                    const prev = seen.get(a.localForwardPort);
                    if (prev)
                        conflicts.push({ endpointId: a.endpointId, conflictWith: prev, port: a.localForwardPort, reason: "duplicate_port" });
                    else
                        seen.set(a.localForwardPort, a.endpointId);
                }
                return conflicts;
            }
        }
        throw new Error("TunnelPortConflict implementation unavailable; refusing to report no conflicts without checking.");
    }
    createPortProbe() {
        const mod = getPortProbe();
        if (mod) {
            if (mod.XshellTunnelPortProbe)
                return new mod.XshellTunnelPortProbe();
            if (typeof mod.createPortProbe === "function")
                return mod.createPortProbe();
            if (typeof mod.probeLocalTunnel === "function" && typeof mod.probeWorkerTelemetryTunnel === "function") {
                return { probeLocalTunnel: mod.probeLocalTunnel, probeWorkerTelemetryTunnel: mod.probeWorkerTelemetryTunnel };
            }
        }
        throw new Error("XshellTunnelPortProbe implementation unavailable; port availability was not checked.");
    }
    createLauncher() {
        const mod = getLauncher();
        if (mod && mod.XshellSessionLauncher)
            return new mod.XshellSessionLauncher(this.injectedDeps);
        throw new Error("XshellSessionLauncher implementation unavailable; no session was launched.");
    }
    createIntegration() {
        const mod = getIntegration();
        if (mod && mod.XshellTunnelIntegration)
            return new mod.XshellTunnelIntegration(this.injectedDeps);
        throw new Error("XshellTunnelIntegration implementation unavailable; tunnel integration was not checked.");
    }
    resolveEndpointUrl(cfg) {
        // P0: 禁止工厂内出现字面量端口，全部经 TunnelGateway.localBaseUrl 动态解析
        const mod = getTunnelGateway();
        if (mod) {
            if (typeof mod.localBaseUrl === "function")
                return mod.localBaseUrl(cfg);
            if (typeof mod.normalizePort === "function") {
                const defPort = mod.defaultTunnelGatewayConfig?.localPort ?? this.getDefaultPort();
                const safe = mod.normalizePort(cfg.localPort, defPort);
                const host = String(cfg.localHost || "127.0.0.1").trim() || "127.0.0.1";
                return `http://${host}:${safe}`;
            }
        }
        const host = String(cfg.localHost || "127.0.0.1").trim() || "127.0.0.1";
        const port = Number(cfg.localPort);
        // 回退时动态读取默认端口，禁止字面量分支
        const defPort = this.getDefaultPort();
        const safePort = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : defPort;
        return `http://${host}:${safePort}`;
    }
    createAll(ctx) {
        return [
            this.createPortAllocator(),
            this.createEndpointRegistry(this.configuredSetup(ctx)),
            this.createPortProbe(),
            this.createLauncher(),
            this.createIntegration(),
        ];
    }
    createByName(name, ctx) {
        const map = {
            portAllocator: () => this.createPortAllocator(),
            endpointRegistry: () => this.createEndpointRegistry(this.configuredSetup(ctx)),
            portProbe: () => this.createPortProbe(),
            launcher: () => this.createLauncher(),
            integration: () => this.createIntegration(),
        };
        const fn = map[name];
        return fn ? fn() : undefined;
    }
    configuredSetup(ctx) {
        const candidate = this.injectedDeps["setupConfig"] ?? ctx["setupConfig"] ?? ctx["tunnelSetupConfig"];
        if (!candidate || typeof candidate !== "object" || Array.isArray(candidate))
            throw new Error("Tunnel endpoint registry requires the user's configured setup; refusing to create an empty registry.");
        const setup = this.normalizeSetupConfig(candidate);
        const workers = Array.isArray(setup["workerTunnels"]) ? setup["workerTunnels"] : [];
        const hasHub = Boolean(String(setup["hubHost"] || "").trim()
            && Number.isInteger(Number(setup["localForwardPort"])) && Number(setup["localForwardPort"]) > 0
            && Number.isInteger(Number(setup["remoteAgentPort"])) && Number(setup["remoteAgentPort"]) > 0);
        const hasWorker = workers.some((worker) => worker.enabled !== false && String(worker.id || "").trim()
            && String(worker.workerHost || worker.remoteAgentHost || "").trim()
            && Number.isInteger(Number(worker.localForwardPort || worker.localPort)) && Number(worker.localForwardPort || worker.localPort) > 0
            && Number.isInteger(Number(worker.remoteAgentPort || worker.remotePort)) && Number(worker.remoteAgentPort || worker.remotePort) > 0);
        if (!hasHub && !hasWorker)
            throw new Error("Tunnel endpoint registry requires at least one fully configured endpoint.");
        return setup;
    }
}
exports.DefaultTunnelFactory = DefaultTunnelFactory;
