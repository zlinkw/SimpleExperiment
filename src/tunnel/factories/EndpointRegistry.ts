// @ts-nocheck
/**
 * EndpointRegistry — 端点注册表工厂
 * 封装 TunnelEndpointRegistry 的注册/发现/持久化，支持依赖注入与多端点拓扑
 */

export interface EndpointDescriptor {
  id: string;
  role: "hub" | "worker";
  displayName?: string;
  localHost: string;
  localPort: number;
  remoteHost?: string;
  remotePort?: number;
  enabled?: boolean;
  [key: string]: any;
}

export interface EndpointRegistry {
  register(endpoint: EndpointDescriptor): void;
  unregister(id: string): boolean;
  get(id: string): EndpointDescriptor | undefined;
  list(role?: "hub" | "worker"): EndpointDescriptor[];
  listEnabled(): EndpointDescriptor[];
  has(id: string): boolean;
  clear(): void;
  toNamedConfigs(): any[];
}

export interface EndpointRegistryFactory {
  create(initial?: EndpointDescriptor[]): EndpointRegistry;
  fromWorkspace(initial?: EndpointDescriptor[]): EndpointRegistry;
}

class DefaultEndpointRegistry implements EndpointRegistry {
  private readonly map = new Map<string, EndpointDescriptor>();
  constructor(initial: EndpointDescriptor[] = []) {
    for (const ep of initial) this.register(ep);
  }
  register(endpoint: EndpointDescriptor): void {
    const id = String(endpoint.id || "").trim();
    if (!id) throw new Error("Endpoint id is required");
    // 兼容校验：localPort 按 TunnelGateway.normalizePort 规则归一，host 允许自定义
    const port = Number(endpoint.localPort);
    const normalizedPort = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : endpoint.localPort;
    this.map.set(id, { ...endpoint, id, localPort: normalizedPort as number, remoteHost: endpoint.remoteHost || "127.0.0.1", remotePort: endpoint.remotePort || 18765, enabled: endpoint.enabled !== false });
  }
  unregister(id: string): boolean { return this.map.delete(String(id)); }
  get(id: string): EndpointDescriptor | undefined { return this.map.get(String(id)); }
  list(role?: "hub" | "worker"): EndpointDescriptor[] {
    const all = [...this.map.values()];
    return role ? all.filter((e) => e.role === role) : all;
  }
  listEnabled(): EndpointDescriptor[] { return [...this.map.values()].filter((e) => e.enabled !== false); }
  has(id: string): boolean { return this.map.has(String(id)); }
  clear(): void { this.map.clear(); }
  toNamedConfigs(): any[] {
    return this.list().map((e) => ({
      id: e.id,
      role: e.role,
      displayName: e.displayName,
      localHost: e.localHost,
      localPort: e.localPort,
      remoteHost: e.remoteHost,
      remotePort: e.remotePort,
      token: (e as any).token,
      capabilities: (e as any).capabilities,
    }));
  }
}

export class DefaultEndpointRegistryFactory implements EndpointRegistryFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }
  create(initial: EndpointDescriptor[] = []): EndpointRegistry {
    // 优先委托原有 TunnelEndpointRegistry（若存在），否则使用本地实现
    try {
      const mod = require("../TunnelEndpointRegistry");
      if (mod && mod.TunnelEndpointRegistry) {
        const inst = new mod.TunnelEndpointRegistry(initial);
        // 适配为 EndpointRegistry 接口
        return {
          register: (ep: EndpointDescriptor) => inst.register ? inst.register(ep) : inst.set?.(ep.id, ep),
          unregister: (id: string) => inst.unregister ? inst.unregister(id) : inst.delete?.(id),
          get: (id: string) => inst.get?.(id) || inst.find?.(id),
          list: (role?: any) => inst.list ? inst.list(role) : [...(inst.values?.() || [])],
          listEnabled: () => (inst.listEnabled ? inst.listEnabled() : inst.list ? inst.list().filter((e: any) => e.enabled !== false) : []),
          has: (id: string) => inst.has ? inst.has(id) : false,
          clear: () => inst.clear?.(),
          toNamedConfigs: () => inst.toNamedConfigs ? inst.toNamedConfigs() : [...(inst.values?.() || [])],
        } as EndpointRegistry;
      }
    } catch {}
    return new DefaultEndpointRegistry(initial);
  }
  fromWorkspace(initial: EndpointDescriptor[] = []): EndpointRegistry {
    // 支持从 deps.workspaceState / globalState 恢复持久化端点
    let persisted: EndpointDescriptor[] = [...initial];
    try {
      const store = (this.deps.workspaceState as any) || (this.deps.globalState as any);
      if (store && typeof store.get === "function") {
        const saved = store.get("tunnelEndpoints");
        if (Array.isArray(saved)) persisted = [...persisted, ...saved];
      }
    } catch {}
    return this.create(persisted);
  }
}

export function createEndpointRegistry(initial?: EndpointDescriptor[]): EndpointRegistry {
  return new DefaultEndpointRegistry(initial);
}
export function createEndpointRegistryFactory(deps?: Record<string, unknown>): EndpointRegistryFactory {
  return new DefaultEndpointRegistryFactory(deps);
}
