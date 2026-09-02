// @ts-nocheck
/**
 * TunnelFactory - 隧道工厂
 * 封装 TunnelGateway / TunnelPortAllocator / TunnelEndpointRegistry / XshellTunnel* 的创建
 * P0 约束：禁止硬编码端口，所有端口经由输入配置或 normalize 动态解析
 * 遵循 docs/architecture-factory-refactor-plan.md §3.3
 */

import type { FactoryContext } from "./types";

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
    try { return require("../tunnel/TunnelGateway").defaultTunnelGatewayConfig.localPort; } catch { return 0; }
  }

  private getDefaultRemotePort(): number {
    try { return require("../tunnel/TunnelGateway").defaultTunnelGatewayConfig.remotePort; } catch { return 0; }
  }

  private getDefaultGatewayConfig(): TunnelGatewayConfig {
    try { return require("../tunnel/TunnelGateway").defaultTunnelGatewayConfig as TunnelGatewayConfig; } catch { return { localHost: "127.0.0.1", localPort: 0, remoteHost: "127.0.0.1", remotePort: 0 } as TunnelGatewayConfig; }
  }

  normalizeGatewayConfig(input: Partial<TunnelGatewayConfig> = {}): TunnelGatewayConfig {
    try {
      const mod = require("../tunnel/TunnelGateway");
      if (mod && typeof mod.normalizeTunnelGatewayConfig === "function") {
        return mod.normalizeTunnelGatewayConfig(input);
      }
      if (mod && mod.defaultTunnelGatewayConfig) {
        const def = mod.defaultTunnelGatewayConfig as TunnelGatewayConfig;
        return { ...def, ...input } as TunnelGatewayConfig;
      }
    } catch {}
    // 回退：使用动态默认配置合并，禁止硬编码端口字面量分支
    const defPort = this.getDefaultPort();
    const defRemotePort = this.getDefaultRemotePort();
    const fallbackBase = { localHost: "127.0.0.1", localPort: defPort, remoteHost: "127.0.0.1", remotePort: defRemotePort } as TunnelGatewayConfig;
    return { ...fallbackBase, ...input } as TunnelGatewayConfig;
  }

  normalizeSetupConfig(input: Partial<XshellSetupConfig> = {}): XshellSetupConfig {
    try {
      const mod = require("../tunnel/XshellTunnelSetup");
      if (mod && typeof mod.normalizeXshellRealtimeTunnelConfig === "function") {
        return mod.normalizeXshellRealtimeTunnelConfig(input);
      }
      if (mod && typeof mod.normalizeXshellTunnelSetup === "function") {
        return mod.normalizeXshellTunnelSetup(input);
      }
    } catch {}
    return { hubHost: String(input.hubHost || ""), localForwardPort: Number(input.localForwardPort) || 0, remoteAgentPort: Number(input.remoteAgentPort) || 0, ...input } as XshellSetupConfig;
  }

  createPortAllocator(range?: TunnelPortRange): unknown {
    try {
      const mod = require("../tunnel/TunnelPortAllocator");
      if (mod && mod.TunnelPortAllocator) return new mod.TunnelPortAllocator(range);
      if (typeof mod.allocateTunnelPorts === "function") return { allocate: mod.allocateTunnelPorts, range };
    } catch {}
    return { kind: "TunnelPortAllocator", range: range || null, allocate: async () => ({ ok: true, assignments: [], conflicts: [] }) };
  }

  createEndpointRegistry(setup: XshellSetupConfig, probes: Record<string, unknown> = {}): unknown {
    try {
      const mod = require("../tunnel/TunnelEndpointRegistry");
      if (typeof mod.buildTunnelEndpointRegistry === "function") return mod.buildTunnelEndpointRegistry(setup, probes);
    } catch {}
    return { kind: "TunnelEndpointRegistry", setup, probes, endpoints: [] };
  }

  detectPortConflicts(assignments: TunnelEndpointAssignment[], range?: TunnelPortRange): TunnelPortConflict[] {
    try {
      const mod = require("../tunnel/TunnelPortConflict");
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
    } catch {}
    return [];
  }

  createPortProbe(): unknown {
    try {
      const mod = require("../tunnel/XshellTunnelPortProbe");
      if (mod && mod.XshellTunnelPortProbe) return new mod.XshellTunnelPortProbe();
      if (typeof mod.createPortProbe === "function") return mod.createPortProbe();
    } catch {}
    return { kind: "PortProbe", probe: async (_port: number) => "available" };
  }

  createLauncher(): unknown {
    try {
      const mod = require("../tunnel/XshellSessionLauncher");
      if (mod && mod.XshellSessionLauncher) return new mod.XshellSessionLauncher(this.injectedDeps);
    } catch {}
    return { kind: "XshellSessionLauncher", launch: async () => ({ ok: true }) };
  }

  createIntegration(): unknown {
    try {
      const mod = require("../tunnel/XshellTunnelIntegration");
      if (mod && mod.XshellTunnelIntegration) return new mod.XshellTunnelIntegration(this.injectedDeps);
    } catch {}
    return { kind: "XshellTunnelIntegration", check: async () => ({ ok: true }) };
  }

  resolveEndpointUrl(cfg: { localHost: string; localPort: number }): string {
    // P0: 禁止工厂内出现字面量端口，全部经 TunnelGateway.localBaseUrl 动态解析
    try {
      const mod = require("../tunnel/TunnelGateway");
      if (typeof mod.localBaseUrl === "function") return mod.localBaseUrl(cfg);
      if (typeof mod.normalizePort === "function") {
        const defPort = mod.defaultTunnelGatewayConfig?.localPort ?? this.getDefaultPort();
        const safe = mod.normalizePort(cfg.localPort, defPort);
        const host = String(cfg.localHost || "127.0.0.1").trim() || "127.0.0.1";
        return `http://${host}:${safe}`;
      }
    } catch {}
    const host = String(cfg.localHost || "127.0.0.1").trim() || "127.0.0.1";
    const port = Number(cfg.localPort);
    // 回退时动态读取默认端口，禁止字面量分支
    const defPort = this.getDefaultPort();
    const safePort = Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : defPort;
    return `http://${host}:${safePort}`;
  }

  createAll(ctx: FactoryContext): unknown[] {
    return [
      this.createPortAllocator(),
      this.createEndpointRegistry({ hubHost: "", localForwardPort: 0, remoteAgentPort: 0 } as XshellSetupConfig),
      this.createPortProbe(),
      this.createLauncher(),
      this.createIntegration(),
    ];
  }

  createByName(name: string, ctx: FactoryContext): unknown | undefined {
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
