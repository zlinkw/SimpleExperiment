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
        throw new Error("[ServiceFactory] RealtimeTunnelPanelProvider implementation unavailable; caller must explicitly select its legacy activation path.");
    }
    createLocalApiServer(ctx, options) {
        if (!options || typeof options !== "object" || Array.isArray(options))
            throw new Error("LocalApiServer requires explicit runtime options.");
        const name = String(options["name"] || "").trim();
        const discoveryPath = String(options["discoveryPath"] || "").trim();
        const methods = options["methods"];
        const methodEntries = methods && typeof methods === "object" && !Array.isArray(methods) ? Object.entries(methods) : [];
        if (!name || !discoveryPath || !methodEntries.length)
            throw new Error("LocalApiServer requires a name, discovery path, and at least one registered API method.");
        const invalidMethods = methodEntries.filter(([method, handler]) => !/^[A-Za-z][A-Za-z0-9._:-]{0,127}$/.test(method) || typeof handler !== "function").map(([method]) => method);
        if (invalidMethods.length)
            throw new Error(`LocalApiServer methods must be callable and have valid names: ${invalidMethods.slice(0, 12).join(", ")}${invalidMethods.length > 12 ? "…" : ""}`);
        const mod = getLocalApiServerMod();
        if (mod) {
            const Cls = mod.LocalApiServer ?? mod.default?.LocalApiServer ?? mod.LocalApiServerClass ?? mod.default?.LocalApiServerClass;
            if (typeof Cls === "function") {
                const ctxRecord = ctx;
                const version = String(options["version"] ?? ctxRecord["extensionVersion"] ?? ctxRecord["version"] ?? "");
                return new Cls({ ...options, name, version, discoveryPath, methods });
            }
        }
        throw new Error("LocalApiServer implementation unavailable; refusing to create an unregistered or no-op API server.");
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
