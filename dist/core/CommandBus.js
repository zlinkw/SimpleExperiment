"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandBus = void 0;
class CommandBus {
    handlers = new Map();
    register(type, handler) {
        const list = this.handlers.get(type) || [];
        list.push(handler);
        this.handlers.set(type, list);
        return () => {
            const next = (this.handlers.get(type) || []).filter((item) => item !== handler);
            if (next.length)
                this.handlers.set(type, next);
            else
                this.handlers.delete(type);
        };
    }
    async dispatch(command) {
        const list = this.handlers.get(command.type) || [];
        if (!list.length)
            throw new Error(`No command handler registered: ${command.type}`);
        for (const handler of list)
            await handler(command);
    }
}
exports.CommandBus = CommandBus;
