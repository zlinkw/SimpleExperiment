"use strict";
// @ts-nocheck
/**
 * CommandBusFactory — CommandBus 工厂
 * 封装 CommandBus 创建与 handler 注册，支持依赖注入，保持与原 API 兼容
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCommandBusFactory = void 0;
exports.createCommandBus = createCommandBus;
exports.createCommandBusFactory = createCommandBusFactory;
let sharedBus = undefined;
function resolveCommandBusClass() {
    try {
        const mod = require("../CommandBus");
        if (mod && mod.CommandBus)
            return mod.CommandBus;
    }
    catch { }
    return null;
}
class DefaultCommandBusFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(opts = {}) {
        const Cls = resolveCommandBusClass();
        const bus = Cls ? new Cls() : this.createFallbackBus();
        const handlers = opts.handlers || this.deps.handlers || [];
        for (const h of handlers) {
            try {
                bus.register(h.type, h.handler);
            }
            catch { }
        }
        if (opts.singleton || this.deps.singleton)
            sharedBus = bus;
        return bus;
    }
    getShared() {
        if (sharedBus)
            return sharedBus;
        if (this.deps.commandBus)
            return this.deps.commandBus;
        sharedBus = this.create({ singleton: true });
        return sharedBus;
    }
    createWithHandlers(handlers) {
        return this.create({ handlers });
    }
    resetShared() { sharedBus = undefined; }
    createFallbackBus() {
        const handlers = new Map();
        return {
            kind: "CommandBus",
            register(type, handler) {
                const list = handlers.get(type) || [];
                list.push(handler);
                handlers.set(type, list);
                return () => {
                    const next = (handlers.get(type) || []).filter((x) => x !== handler);
                    if (next.length)
                        handlers.set(type, next);
                    else
                        handlers.delete(type);
                };
            },
            async dispatch(command) {
                const list = handlers.get(command.type) || [];
                if (!list.length)
                    throw new Error(`No command handler registered: ${command.type}`);
                for (const h of list)
                    await h(command);
            },
        };
    }
}
exports.DefaultCommandBusFactory = DefaultCommandBusFactory;
function createCommandBus(opts) {
    const factory = new DefaultCommandBusFactory();
    return factory.create(opts);
}
function createCommandBusFactory(deps) {
    return new DefaultCommandBusFactory(deps);
}
