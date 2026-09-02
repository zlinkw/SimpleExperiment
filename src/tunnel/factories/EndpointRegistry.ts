/**
 * EndpointRegistry — 端点注册表工厂
 * 封装 TunnelEndpointRegistry 的注册/发现/持久化，支持依赖注入与多端点拓扑
 */

function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

type TunnelEndpointRegistryMod = {
  TunnelEndpointRegistry?: new (initial: EndpointDescriptor[]) => {
    register?(ep: EndpointDescriptor): void;
    set?(k: string, v: EndpointDescriptor): void;
    unregister?(id: string): boolean;
    delete?(k: string): boolean;
    get?(id: string): EndpointDescriptor | undefined;
    find?(id: string): EndpointDescriptor | undefined;
    list?(role?: string): EndpointDescriptor[];
    values?(): Iterable<EndpointDescriptor>;
    listEnabled?(): EndpointDescriptor[];
    has?(id: string): boolean;
    clear?(): void;
    toNamedConfigs?(): unknown[];
  };
};

export interface EndpointDescriptor {
  id: string;
  role: "hub" | "worker";
  displayName?: string;
  localHost: string;
  localPort: number;
  remoteHost?: string;
  remotePort?: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface EndpointRegistry {
  register(endpoint: EndpointDescriptor): void;
  unregister(id: string): boolean;
  get(id: string): EndpointDescriptor | undefined;
  list(role?: "hub" | "worker"): EndpointDescriptor[];
  listEnabled(): EndpointDescriptor[];
  has(id: string): boolean;
  clear(): void;
  toNamedConfigs(): unknown[];
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
  toNamedConfigs(): unknown[] {
    return this.list().map((e) => ({
      id: e.id,
      role: e.role,
      displayName: e.displayName,
      localHost: e.localHost,
      localPort: e.localPort,
      remoteHost: e.remoteHost,
      remotePort: e.remotePort,
      token: (e as Record<string, unknown>)["token"],
      capabilities: (e as Record<string, unknown>)["capabilities"],
    }));
  }
}

export class DefaultEndpointRegistryFactory implements EndpointRegistryFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) { this.deps = deps; }
  create(initial: EndpointDescriptor[] = []): EndpointRegistry {
    const mod = tryRequire<TunnelEndpointRegistryMod>("../TunnelEndpointRegistry");
    if (mod?.TunnelEndpointRegistry) {
      const inst = new mod.TunnelEndpointRegistry(initial);
      return {
        register: (ep: EndpointDescriptor) => { if (inst.register) inst.register(ep); else inst.set?.(ep.id, ep); },
        unregister: (id: string) => inst.unregister ? Boolean(inst.unregister(id)) : Boolean(inst.delete?.(id)),
        get: (id: string) => inst.get?.(id) ?? inst.find?.(id),
        list: (role?: "hub" | "worker") => inst.list ? inst.list(role) : [...(inst.values?.() ?? [])],
        listEnabled: () => inst.listEnabled ? inst.listEnabled() : inst.list ? inst.list().filter((e: EndpointDescriptor) => e.enabled !== false) : [],
        has: (id: string) => inst.has ? Boolean(inst.has(id)) : false,
        clear: () => inst.clear?.(),
        toNamedConfigs: () => inst.toNamedConfigs ? inst.toNamedConfigs() : [...(inst.values?.() ?? [])],
      } as EndpointRegistry;
    }
    return new DefaultEndpointRegistry(initial);
  }
  fromWorkspace(initial: EndpointDescriptor[] = []): EndpointRegistry {
    let persisted: EndpointDescriptor[] = [...initial];
    try {
      const store = (this.deps["workspaceState"] as { get?: (k: string) => unknown } | undefined) ?? (this.deps["globalState"] as { get?: (k: string) => unknown } | undefined);
      if (store && typeof store.get === "function") {
        const saved = store.get("tunnelEndpoints");
        if (Array.isArray(saved)) persisted = [...persisted, ...(saved as EndpointDescriptor[])];
      }
    } catch { /* ignore */ }
    return this.create(persisted);
  }
}

export function createEndpointRegistry(initial?: EndpointDescriptor[]): EndpointRegistry {
  return new DefaultEndpointRegistry(initial);
}
export function createEndpointRegistryFactory(deps?: Record<string, unknown>): EndpointRegistryFactory {
  return new DefaultEndpointRegistryFactory(deps);
}
