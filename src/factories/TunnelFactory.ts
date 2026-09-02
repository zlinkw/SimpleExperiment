/**
 * TunnelFactory - 隧道工厂
 * 封装 TunnelGateway / TunnelPortAllocator / TunnelEndpointRegistry / XshellTunnel* 的创建
 * P0 约束：禁止硬编码端口，所有端口经由输入配置或 normalize 动态解析
 * 遵循 docs/architecture-factory-refactor-plan.md §3.3
 */

import type { FactoryContext } from "./types";

// ---------- 强类型动态 require 访问器 ----------
function tryRequire<T>(id: string): T | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(id) as T;
  } catch {
    return undefined;
  }
}

type TunnelGatewayMod = {
  defaultTunnelGatewayConfig: TunnelGatewayConfig;
  normalizeTunnelGatewayConfig?: (input: Partial<TunnelGatewayConfig>) => TunnelGatewayConfig;
  localBaseUrl?: (cfg: { localHost: string; localPort: number }) => string;
  normalizePort?: (value: unknown, fallback: number) => number;
};

type XshellSetupMod = {
  normalizeXshellRealtimeTunnelConfig?: (input: Partial<XshellSetupConfig>) => XshellSetupConfig;
  normalizeXshellTunnelSetup?: (input: Partial<XshellSetupConfig>) => XshellSetupConfig;
};

type PortAllocatorMod = {
  TunnelPortAllocator?: new (range?: TunnelPortRange) => unknown;
  allocateTunnelPorts?: (...args: unknown[]) => unknown;
};

type EndpointRegistryMod = {
  buildTunnelEndpointRegistry?: (setup: XshellSetupConfig, probes: Record<string, unknown>) => unknown;
};

type PortConflictMod = {
  detectPortConflicts?: (assignments: TunnelEndpointAssignment[], range?: TunnelPortRange) => TunnelPortConflict[];
  makeTunnelPortConflict?: (...args: unknown[]) => unknown;
};

type PortProbeMod = {
  XshellTunnelPortProbe?: new () => unknown;
  createPortProbe?: () => unknown;
};

type LauncherMod = {
  XshellSessionLauncher?: new (deps: Record<string, unknown>) => unknown;
};

type IntegrationMod = {
  XshellTunnelIntegration?: new (deps: Record<string, unknown>) => unknown;
};

function getTunnelGateway(): TunnelGatewayMod | undefined {
  return tryRequire<TunnelGatewayMod>("../tunnel/TunnelGateway");
}

function getXshellSetup(): XshellSetupMod | undefined {
  return tryRequire<XshellSetupMod>("../tunnel/XshellTunnelSetup");
}

function getPortAllocator(): PortAllocatorMod | undefined {
  return tryRequire<PortAllocatorMod>("../tunnel/TunnelPortAllocator");
}

function getEndpointRegistry(): EndpointRegistryMod | undefined {
  return tryRequire<EndpointRegistryMod>("../tunnel/TunnelEndpointRegistry");
}

function getPortConflict(): PortConflictMod | undefined {
  return tryRequire<PortConflictMod>("../tunnel/TunnelPortConflict");
}

function getPortProbe(): PortProbeMod | undefined {
  return tryRequire<PortProbeMod>("../tunnel/XshellTunnelPortProbe");
}

function getLauncher(): LauncherMod | undefined {
  return tryRequire<LauncherMod>("../tunnel/XshellSessionLauncher");
}

function getIntegration(): IntegrationMod | undefined {
  return tryRequire<IntegrationMod>("../tunnel/XshellTunnelIntegration");
}

export interface TunnelGatewayConfig {
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  enabled?: boolean;
  [key: string]: unknown;
}

export interface XshellSetupConfig {
  hubHost: string;
  localForwardPort: number;
  remoteAgentPort: number;
  [key: string]: unknown;
}

export interface TunnelPortRange {
  min: number;
  max: number;
}

export interface TunnelEndpointAssignment {
  endpointId: string;
  localForwardPort: number;
  [key: string]: unknown;
}

export interface TunnelPortConflict {
  endpointId: string;
  conflictWith?: string;
  port: number;
  reason: string;
}

export interface TunnelFactory {
  normalizeGatewayConfig(input: Partial<TunnelGatewayConfig>): TunnelGatewayConfig;
  normalizeSetupConfig(input: Partial<XshellSetupConfig>): XshellSetupConfig;
  createPortAllocator(range?: TunnelPortRange): unknown;
  createEndpointRegistry(setup: XshellSetupConfig, probes?: Record<string, unknown>): unknown;
  detectPortConflicts(assignments: TunnelEndpointAssignment[], range?: TunnelPortRange): TunnelPortConflict[];
  createPortProbe(): unknown;
  createLauncher(): unknown;
  createIntegration(): unknown;
  resolveEndpointUrl(cfg: { localHost: string; localPort: number }): string;
  createAll(ctx: FactoryContext): unknown[];
  createByName(name: string, ctx: FactoryContext): unknown | undefined;
}

export class DefaultTunnelFactory implements TunnelFactory {
  private readonly injectedDeps: Record<string, unknown>;

  constructor(deps: Record<string, unknown> = {}) {
    this.injectedDeps = deps;
  }

  private getDefaultPort(): number {
    const gw = getTunnelGateway();
    if (gw?.defaultTunnelGatewayConfig?.localPort !== undefined) {
      return Number(gw.defaultTunnelGatewayConfig.localPort) || 0;
    }
    return 0;
  }

  private getDefaultRemotePort(): number {
    const gw = getTunnelGateway();
    if (gw?.defaultTunnelGatewayConfig?.remotePort !== undefined) {
      return Number(gw.defaultTunnelGatewayConfig.remotePort) || 0;
    }
    return 0;
  }

  private getDefaultGatewayConfig(): TunnelGatewayConfig {
    const gw = getTunnelGateway();
    if (gw?.defaultTunnelGatewayConfig) {
      return gw.defaultTunnelGatewayConfig as TunnelGatewayConfig;
    }
    return { localHost: "127.0.0.1", localPort: 0, remoteHost: "127.0.0.1", remotePort: 0 } as TunnelGatewayConfig;
  }

  normalizeGatewayConfig(input: Partial<TunnelGatewayConfig> = {}): TunnelGatewayConfig {
    const mod = getTunnelGateway();
    if (mod) {
      if (typeof mod.normalizeTunnelGatewayConfig === "function") {
        return mod.normalizeTunnelGatewayConfig(input);
      }
      if (mod.defaultTunnelGatewayConfig) {
        const def = mod.defaultTunnelGatewayConfig as TunnelGatewayConfig;
        return { ...def, ...input } as TunnelGatewayConfig;
      }
    }
    // 回退：使用动态默认配置合并，禁止硬编码端口字面量分支
    const defPort = this.getDefaultPort();
    const defRemotePort = this.getDefaultRemotePort();
    void this.getDefaultGatewayConfig();
    const fallbackBase = { localHost: "127.0.0.1", localPort: defPort, remoteHost: "127.0.0.1", remotePort: defRemotePort } as TunnelGatewayConfig;
    return { ...fallbackBase, ...input } as TunnelGatewayConfig;
  }

  normalizeSetupConfig(input: Partial<XshellSetupConfig> = {}): XshellSetupConfig {
    const mod = getXshellSetup();
    if (mod) {
      if (typeof mod.normalizeXshellRealtimeTunnelConfig === "function") {
        return mod.normalizeXshellRealtimeTunnelConfig(input);
      }
      if (typeof mod.normalizeXshellTunnelSetup === "function") {
        return mod.normalizeXshellTunnelSetup(input);
      }
    }
    return { hubHost: String(input.hubHost || ""), localForwardPort: Number(input.localForwardPort) || 0, remoteAgentPort: Number(input.remoteAgentPort) || 0, ...input } as XshellSetupConfig;
  }

  createPortAllocator(range?: TunnelPortRange): unknown {
    const mod = getPortAllocator();
    if (mod) {
      if (mod.TunnelPortAllocator) return new mod.TunnelPortAllocator(range);
      if (typeof mod.allocateTunnelPorts === "function") return { allocate: mod.allocateTunnelPorts, range };
    }
    return { kind: "TunnelPortAllocator", range: range || null, allocate: async () => ({ ok: true, assignments: [], conflicts: [] }) };
  }

  createEndpointRegistry(setup: XshellSetupConfig, probes: Record<string, unknown> = {}): unknown {
    const mod = getEndpointRegistry();
    if (mod && typeof mod.buildTunnelEndpointRegistry === "function") return mod.buildTunnelEndpointRegistry(setup, probes);
    return { kind: "TunnelEndpointRegistry", setup, probes, endpoints: [] };
  }

  detectPortConflicts(assignments: TunnelEndpointAssignment[], range?: TunnelPortRange): TunnelPortConflict[] {
    const mod = getPortConflict();
    if (mod) {
      if (typeof mod.detectPortConflicts === "function") return mod.detectPortConflicts(assignments, range);
      if (typeof mod.makeTunnelPortConflict === "function" && assignments) {
        // 基础去重检测回退
        const seen = new Map<number, string>();
        const conflicts: TunnelPortConflict[] = [];
        for (const a of assignments) {
          const prev = seen.get(a.localForwardPort);
          if (prev) conflicts.push({ endpointId: a.endpointId, conflictWith: prev, port: a.localForwardPort, reason: "duplicate_port" });
          else seen.set(a.localForwardPort, a.endpointId);
        }
        return conflicts;
      }
    }
    return [];
  }

  createPortProbe(): unknown {
    const mod = getPortProbe();
    if (mod) {
      if (mod.XshellTunnelPortProbe) return new mod.XshellTunnelPortProbe();
      if (typeof mod.createPortProbe === "function") return mod.createPortProbe();
    }
    return { kind: "PortProbe", probe: async (_port: number) => "available" };
  }

  createLauncher(): unknown {
    const mod = getLauncher();
    if (mod && mod.XshellSessionLauncher) return new mod.XshellSessionLauncher(this.injectedDeps);
    return { kind: "XshellSessionLauncher", launch: async () => ({ ok: true }) };
  }

  createIntegration(): unknown {
    const mod = getIntegration();
    if (mod && mod.XshellTunnelIntegration) return new mod.XshellTunnelIntegration(this.injectedDeps);
    return { kind: "XshellTunnelIntegration", check: async () => ({ ok: true }) };
  }

  resolveEndpointUrl(cfg: { localHost: string; localPort: number }): string {
    // P0: 禁止工厂内出现字面量端口，全部经 TunnelGateway.localBaseUrl 动态解析
    const mod = getTunnelGateway();
    if (mod) {
      if (typeof mod.localBaseUrl === "function") return mod.localBaseUrl(cfg);
      if (typeof mod.normalizePort === "function") {
        const defPort: number = (mod.defaultTunnelGatewayConfig?.localPort as number) ?? this.getDefaultPort();
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

  createAll(_ctx: FactoryContext): unknown[] {
    return [
      this.createPortAllocator(),
      this.createEndpointRegistry({ hubHost: "", localForwardPort: 0, remoteAgentPort: 0 } as XshellSetupConfig),
      this.createPortProbe(),
      this.createLauncher(),
      this.createIntegration(),
    ];
  }

  createByName(name: string, _ctx: FactoryContext): unknown | undefined {
    const map: Record<string, () => unknown> = {
      portAllocator: () => this.createPortAllocator(),
      endpointRegistry: () => this.createEndpointRegistry({ hubHost: "", localForwardPort: 0, remoteAgentPort: 0 } as XshellSetupConfig),
      portProbe: () => this.createPortProbe(),
      launcher: () => this.createLauncher(),
      integration: () => this.createIntegration(),
    };
    const fn = map[name];
    return fn ? fn() : undefined;
  }
}
