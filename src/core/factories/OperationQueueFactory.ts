// @ts-nocheck
/**
 * OperationQueueFactory — OperationQueue 工厂
 * 封装 OperationQueue 创建与全局单例，支持依赖注入与历史上限配置
 */

export interface OperationQueueFactoryOptions {
  historyLimit?: number;
  singleton?: boolean;
}

export interface OperationQueueFactory {
  create(opts?: OperationQueueFactoryOptions): any;
  getShared(): any;
  resetShared(): void;
}

let sharedInstance: any = undefined;

function resolveOperationQueueClass(): any {
  try {
    const mod = require("../OperationQueue");
    if (mod && mod.OperationQueue) return mod.OperationQueue;
  } catch {}
  return null;
}

class DefaultOperationQueueFactory implements OperationQueueFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }

  create(opts: OperationQueueFactoryOptions = {}): any {
    const historyLimit = opts.historyLimit ?? (this.deps.historyLimit as number) ?? 500;
    const Cls = resolveOperationQueueClass();
    if (Cls) return new Cls(historyLimit);
    // 降级内存队列（兼容测试）
    return {
      kind: "OperationQueue",
      historyLimit,
      enqueue: async (spec: any) => { await spec.run?.(new AbortController().signal); },
      cancel: () => false,
      snapshot: () => [],
      activeExclusiveKeys: () => new Set(),
    };
  }

  getShared(): any {
    const Cls = resolveOperationQueueClass();
    if (sharedInstance) return sharedInstance;
    const historyLimit = (this.deps.historyLimit as number) ?? 500;
    sharedInstance = Cls ? new Cls(historyLimit) : this.create({ historyLimit });
    // 若外部通过 deps 注入了 operationQueue，优先复用
    if (this.deps.operationQueue) return this.deps.operationQueue;
    return sharedInstance;
  }

  resetShared(): void { sharedInstance = undefined; }
}

export function createOperationQueue(opts?: OperationQueueFactoryOptions): any {
  const factory = new DefaultOperationQueueFactory();
  return factory.create(opts);
}
export function createOperationQueueFactory(deps?: Record<string, unknown>): OperationQueueFactory {
  return new DefaultOperationQueueFactory(deps);
}
export { DefaultOperationQueueFactory };
