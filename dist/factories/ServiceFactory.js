"use strict";
/**
 * ServiceFactory - 根抽象工厂 (Abstract Factory)
 * 聚合 TunnelFactory / RealtimeClientFactory / FeatureFactory / CommandFactory / PanelSectionFactory
 * 遵循 docs/architecture-factory-refactor-plan.md §3.2
 * Composition Root 唯一持有具体工厂，其他模块只依赖抽象。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultServiceFactory = void 0;
const TunnelFactory_1 = require("./TunnelFactory");
const RealtimeClientFactory_1 = require("./RealtimeClientFactory");
const FeatureFactory_1 = require("./FeatureFactory");
const CommandFactory_1 = require("./CommandFactory");
const PanelSectionFactory_1 = require("./PanelSectionFactory");
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
function getExtensionMod() {
    return tryRequire("../extension");
}
function getLocalApiServerMod() {
    return tryRequire("../api/LocalApiServer");
}
class DefaultServiceFactory {
    tunnel;
    realtime;
    features;
    commands;
    panels;
    constructor(tunnel, realtime, features, commands, panels) {
        this.tunnel = tunnel ?? new TunnelFactory_1.DefaultTunnelFactory();
        this.realtime = realtime ?? new RealtimeClientFactory_1.DefaultRealtimeClientFactory();
        this.features = features ?? new FeatureFactory_1.DefaultFeatureFactory();
        this.commands = commands ?? new CommandFactory_1.DefaultCommandFactory();
        this.panels = panels ?? new PanelSectionFactory_1.DefaultPanelSectionFactory();
    }
    createPanelProvider(ctx) {
        const mod = getExtensionMod();
        if (mod) {
            const Cls = mod.RealtimeTunnelPanelProvider ?? mod.default?.RealtimeTunnelPanelProvider;
            if (typeof Cls === "function") {
                return new Cls(ctx);
            }
        }
        // 向后兼容：真实创建失败时回退到桩对象
        return {
            kind: "RealtimeTunnelPanelProvider",
            ctx,
            factories: {
                tunnel: this.tunnel,
                realtime: this.realtime,
                features: this.features,
                panels: this.panels,
            },
            dispose() { },
        };
    }
    createLocalApiServer(ctx) {
        const mod = getLocalApiServerMod();
        if (mod) {
            const Cls = mod.LocalApiServer ?? mod.default?.LocalApiServer ?? mod.LocalApiServerClass ?? mod.default?.LocalApiServerClass;
            if (typeof Cls === "function") {
                const ctxRecord = ctx;
                const version = String(ctxRecord["extensionVersion"] ?? ctxRecord["version"] ?? "");
                // 尝试用 FactoryContext 中的信息启动真实 LocalApiServer，失败则回退
                return new Cls({
                    name: "SimpleExperiment",
                    version,
                    preferredPort: 19765,
                    discoveryPath: "",
                    methods: {},
                });
            }
        }
        return {
            kind: "LocalApiServer",
            ctx,
            start: () => undefined,
            stop: () => undefined,
            dispose() { },
        };
    }
    createAllFactories() {
        return {
            tunnel: this.tunnel,
            realtime: this.realtime,
            features: this.features,
            commands: this.commands,
            panels: this.panels,
        };
    }
    createByName(name) {
        const map = this.createAllFactories();
        return map[name];
    }
}
exports.DefaultServiceFactory = DefaultServiceFactory;
