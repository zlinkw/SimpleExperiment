"use strict";
/**
 * CommandBusFactory — CommandBus 工厂
 * 封装 CommandBus 创建与 handler 注册，支持依赖注入，保持与原 API 兼容
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultCommandBusFactory = void 0;
exports.createCommandBus = createCommandBus;
exports.createCommandBusFactory = createCommandBusFactory;
const CommandBus_1 = require("../CommandBus");
let sharedBus = undefined;
class DefaultCommandBusFactory {
    deps;
    constructor(deps = {}) { this.deps = deps; }
    create(opts = {}) {
        const bus = new CommandBus_1.CommandBus();
        const handlers = opts.handlers || this.deps.handlers || [];
        if (!Array.isArray(handlers))
            throw new Error("CommandBus handlers must be an array.");
        const unregister = [];
        try {
            for (const handler of handlers) {
                if (!handler || typeof handler.type !== "string" || !handler.type.trim() || typeof handler.handler !== "function")
                    throw new Error("CommandBus handler requires a non-empty type and callable handler.");
                unregister.push(bus.register(handler.type, handler.handler));
            }
        }
        catch (error) {
            for (const dispose of unregister.reverse())
                dispose();
            throw error;
        }
        if (opts.singleton || this.deps.singleton)
            sharedBus = bus;
        return bus;
    }
    getShared() {
        if (this.deps.commandBus)
            return assertCommandBus(this.deps.commandBus);
        if (sharedBus)
            return sharedBus;
        sharedBus = this.create({ singleton: true });
        return sharedBus;
    }
    createWithHandlers(handlers) {
        return this.create({ handlers });
    }
    resetShared() { sharedBus = undefined; }
}
exports.DefaultCommandBusFactory = DefaultCommandBusFactory;
function createCommandBus(opts) {
    const factory = new DefaultCommandBusFactory();
    return factory.create(opts);
}
function createCommandBusFactory(deps) {
    return new DefaultCommandBusFactory(deps);
}
function assertCommandBus(value) {
    if (!value || typeof value !== "object" || typeof value.register !== "function" || typeof value.dispatch !== "function")
        throw new Error("Injected CommandBus does not implement register/dispatch.");
    return value;
}
