/**
 * CommandBusFactory — CommandBus 工厂
 * 封装 CommandBus 创建与 handler 注册，支持依赖注入，保持与原 API 兼容
 */

export interface CommandBusFactoryOptions {
  singleton?: boolean;
  handlers?: Array<{ type: string; handler: (cmd: any) => any }>;
}

export interface CommandBusFactory {
  create(opts?: CommandBusFactoryOptions): any;
  getShared(): any;
  createWithHandlers(handlers: Array<{ type: string; handler: (cmd: any) => any }>): any;
  resetShared(): void;
}

let sharedBus: any = undefined;

function resolveCommandBusClass(): any {
  try {
    const mod = require("../CommandBus");
    if (mod && mod.CommandBus) return mod.CommandBus;
  } catch {}
  return null;
}

class DefaultCommandBusFactory implements CommandBusFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }

  create(opts: CommandBusFactoryOptions = {}): any {
    const Cls = resolveCommandBusClass();
    const bus = Cls ? new Cls() : this.createFallbackBus();
    const handlers: Array<{ type: string; handler: any }> = (opts.handlers as any) || (this.deps.handlers as any) || [];
    for (const h of handlers) {
      try { bus.register(h.type, h.handler); } catch {}
    }
    if (opts.singleton || this.deps.singleton) sharedBus = bus;
    return bus;
  }

  getShared(): any {
    if (sharedBus) return sharedBus;
    if (this.deps.commandBus) return this.deps.commandBus;
    sharedBus = this.create({ singleton: true });
    return sharedBus;
  }

  createWithHandlers(handlers: Array<{ type: string; handler: (cmd: any) => any }>): any {
    return this.create({ handlers });
  }

  resetShared(): void { sharedBus = undefined; }

  private createFallbackBus(): any {
    const handlers = new Map<string, any[]>();
    return {
      kind: "CommandBus",
      register(type: string, handler: any) {
        const list = handlers.get(type) || [];
        list.push(handler);
        handlers.set(type, list);
        return () => {
          const next = (handlers.get(type) || []).filter((x) => x !== handler);
          if (next.length) handlers.set(type, next); else handlers.delete(type);
        };
      },
      async dispatch(command: any) {
        const list = handlers.get(command.type) || [];
        if (!list.length) throw new Error(`No command handler registered: ${command.type}`);
        for (const h of list) await h(command);
      },
    };
  }
}

export function createCommandBus(opts?: CommandBusFactoryOptions): any {
  const factory = new DefaultCommandBusFactory();
  return factory.create(opts);
}
export function createCommandBusFactory(deps?: Record<string, unknown>): CommandBusFactory {
  return new DefaultCommandBusFactory(deps);
}
export { DefaultCommandBusFactory };
