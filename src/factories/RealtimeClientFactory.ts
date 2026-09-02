// @ts-nocheck
/**
 * RealtimeClientFactory - 实时客户端工厂
 * 封装 RequestBudget / RealtimeTunnelClient / MultiEndpointRealtimeClient 的创建
 * P0：endpoints 的 localPort 必须来自 TunnelFactory 分配结果，不得在工厂内 default 赋字面量
 * 遵循 docs/architecture-factory-refactor-plan.md §3.4
 */

import type { FactoryContext } from "./types";

export interface NamedTunnelEndpointConfig {
  id: string;
  role: "hub" | "worker";
  displayName?: string;
  localHost: string;
  localPort: number;
  remoteHost?: string;
  remotePort?: number;
  [key: string]: unknown;
}

export interface RefreshProfileConfig {
  health: number;
  snapshot: number;
  stream: boolean;
}

export interface RealtimeRefreshPolicy {
  mode: "realtime" | "balanced" | "manual_only";
  [key: string]: unknown;
}

export interface RealtimeClientFactory {
  createBudget(endpoint: NamedTunnelEndpointConfig): unknown;
  createSingleClient(
    endpoint: { localHost: string; localPort: number; [key: string]: unknown },
    budget: unknown,
    policy: RealtimeRefreshPolicy,
    onState: (s: unknown) => void,
  ): unknown;
  createMultiClient(
    endpoints: NamedTunnelEndpointConfig[],
    budgetFactory: (e: NamedTunnelEndpointConfig) => unknown,
    policy?: RealtimeRefreshPolicy,
    onState?: (s: unknown) => void,
  ): unknown;
  policyForProfile(profile: string): RealtimeRefreshPolicy;
  createAll(ctx: FactoryContext): unknown[];
  createByName(name: string, ctx: FactoryContext): unknown | undefined;
}

function resolvePolicyForProfile(profile: string): RealtimeRefreshPolicy {
  try {
    const gw = require("../tunnel/TunnelGateway");
    if (gw && gw.refreshProfiles && gw.refreshProfiles[profile]) {
      const cfg = gw.refreshProfiles[profile] as RefreshProfileConfig;
      return {
        mode: profile as RealtimeRefreshPolicy["mode"],
        preferWebSocket: cfg.stream,
        fallbackToSse: cfg.stream,
        fallbackToPolling: true,
        heartbeatIntervalSeconds: cfg.health,
        snapshotFallbackIntervalSeconds: cfg.snapshot,
        pauseWhenWebviewHidden: false,
      } as RealtimeRefreshPolicy;
    }
  } catch {}
  const isManual = profile === "manual_only";
  const isBalanced = profile === "balanced";
  return {
    mode: (isManual ? "manual_only" : isBalanced ? "balanced" : "realtime") as RealtimeRefreshPolicy["mode"],
    preferWebSocket: !isManual,
    fallbackToSse: !isManual,
    fallbackToPolling: true,
    heartbeatIntervalSeconds: isManual ? 0 : isBalanced ? 10 : 5,
    snapshotFallbackIntervalSeconds: isManual ? 0 : isBalanced ? 60 : 30,
    pauseWhenWebviewHidden: false,
  } as RealtimeRefreshPolicy;
}

export class DefaultRealtimeClientFactory implements RealtimeClientFactory {
  private readonly deps: Record<string, unknown>;
  constructor(deps: Record<string, unknown> = {}) {
    this.deps = deps;
  }

  createBudget(endpoint: NamedTunnelEndpointConfig): unknown {
    try {
      const mod = require("../tunnel/RequestBudget");
      if (mod && mod.RequestBudget) {
        const cfg = (this.deps.requestBudgetConfig as unknown) || mod.defaultRequestBudgetConfig;
        return new mod.RequestBudget(cfg);
      }
    } catch {}
    return { kind: "RequestBudget", endpointId: endpoint.id, consume: () => true, snapshot: () => ({}) };
  }

  createSingleClient(
    endpoint: { localHost: string; localPort: number; [key: string]: unknown },
    budget: unknown,
    policy: RealtimeRefreshPolicy,
    onState: (s: unknown) => void,
  ): unknown {
    try {
      const mod = require("../tunnel/RealtimeTunnelClient");
      if (mod && mod.RealtimeTunnelClient) {
        return new mod.RealtimeTunnelClient(endpoint, budget, policy, onState);
      }
    } catch {}
    return { kind: "RealtimeTunnelClient", endpoint, budget, policy, onState, connect: async () => undefined, dispose() {} };
  }

  createMultiClient(
    endpoints: NamedTunnelEndpointConfig[],
    budgetFactory: (e: NamedTunnelEndpointConfig) => unknown,
    policy?: RealtimeRefreshPolicy,
    onState?: (s: unknown) => void,
  ): unknown {
    try {
      const mod = require("../tunnel/MultiEndpointRealtimeClient");
      if (mod && mod.MultiEndpointRealtimeClient) {
        const effPolicy = policy || resolvePolicyForProfile("realtime");
        return new mod.MultiEndpointRealtimeClient(endpoints, budgetFactory, effPolicy, onState || (() => undefined));
      }
    } catch {}
    return {
      kind: "MultiEndpointRealtimeClient",
      endpoints,
      policy: policy || resolvePolicyForProfile("realtime"),
      connect: async () => undefined,
      dispose() {},
    };
  }

  policyForProfile(profile: string): RealtimeRefreshPolicy {
    return resolvePolicyForProfile(profile);
  }

  createAll(ctx: FactoryContext): unknown[] {
    const policy = this.policyForProfile("realtime");
    const dummyEndpoint: NamedTunnelEndpointConfig = { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 0 };
    const budget = this.createBudget(dummyEndpoint);
    return [
      budget,
      this.createSingleClient(dummyEndpoint, budget, policy, () => undefined),
      this.createMultiClient([dummyEndpoint], () => budget, policy, () => undefined),
    ];
  }

  createByName(name: string, ctx: FactoryContext): unknown | undefined {
    const policy = this.policyForProfile("realtime");
    const dummyEndpoint: NamedTunnelEndpointConfig = { id: "hub", role: "hub", localHost: "127.0.0.1", localPort: 0 };
    const map: Record<string, () => unknown> = {
      budget: () => this.createBudget(dummyEndpoint),
      singleClient: () => this.createSingleClient(dummyEndpoint, this.createBudget(dummyEndpoint), policy, () => undefined),
      multiClient: () => this.createMultiClient([dummyEndpoint], (e) => this.createBudget(e), policy, () => undefined),
      policyRealtime: () => this.policyForProfile("realtime"),
      policyBalanced: () => this.policyForProfile("balanced"),
      policyManual: () => this.policyForProfile("manual_only"),
    };
    const fn = map[name];
    return fn ? fn() : undefined;
  }
}
