import { RequestBudgetConfig, defaultRequestBudgetConfig } from "./RequestBudget";

export const xshellTunnelConnectionMode = "xshell_tunnel_realtime" as const;
export const legacyMobaXtermTunnelConnectionMode = "mobaxterm_tunnel_realtime" as const;

export type ClusterConnectionMode = typeof xshellTunnelConnectionMode | "offline_import";
export type LegacyClusterConnectionMode = typeof legacyMobaXtermTunnelConnectionMode;

export type RefreshProfile = "realtime" | "balanced" | "manual_only";

export interface TunnelGatewayConfig {
  enabled: boolean;
  connectionMode: ClusterConnectionMode;
  provider: "xshell" | "mobaxterm" | "openssh" | "putty" | "manual";
  localHost: "127.0.0.1";
  localPort: number;
  remoteHost: "127.0.0.1";
  remotePort: number;
  hubServerId: string;
  tunnelStartMode: "manual" | "launch_external_app" | "generate_script";
  mobaxtermExePath?: string;
  mobaxtermCommandTemplate?: string;
  healthCheckIntervalSeconds: number;
  snapshotPollIntervalSeconds: number;
  maxRequestsPerMinute: number;
  allowStreaming: boolean;
  streamingRequiresExplicitConfirm: boolean;
  pauseWhenWebviewHidden: boolean;
  pauseAllBackgroundTraffic: boolean;
  refreshProfile: RefreshProfile;
  token?: string;
}

export interface RefreshProfileConfig {
  health: number;
  snapshot: number;
  stream: boolean;
}

export const refreshProfiles: Record<RefreshProfile, RefreshProfileConfig> = {
  realtime: { health: 5, snapshot: 30, stream: true },
  balanced: { health: 10, snapshot: 60, stream: true },
  manual_only: { health: 0, snapshot: 0, stream: false },
};

export const defaultTunnelGatewayConfig: TunnelGatewayConfig = {
  enabled: true,
  connectionMode: xshellTunnelConnectionMode,
  provider: "xshell",
  localHost: "127.0.0.1",
  localPort: 18765,
  remoteHost: "127.0.0.1",
  remotePort: 18765,
  hubServerId: "",
  tunnelStartMode: "manual",
  healthCheckIntervalSeconds: 30,
  snapshotPollIntervalSeconds: 30,
  maxRequestsPerMinute: 120,
  allowStreaming: true,
  streamingRequiresExplicitConfirm: false,
  pauseWhenWebviewHidden: true,
  pauseAllBackgroundTraffic: false,
  refreshProfile: "realtime",
};

export function normalizeTunnelGatewayConfig(input: Partial<TunnelGatewayConfig> = {}): TunnelGatewayConfig {
  const localPort = normalizePort(input.localPort, defaultTunnelGatewayConfig.localPort);
  const remotePort = normalizePort(input.remotePort, defaultTunnelGatewayConfig.remotePort);
  return {
    ...defaultTunnelGatewayConfig,
    ...input,
    connectionMode: normalizeConnectionMode(input.connectionMode),
    provider: normalizeProvider(input.provider),
    localHost: "127.0.0.1",
    localPort,
    remoteHost: "127.0.0.1",
    remotePort,
    refreshProfile: input.refreshProfile && refreshProfiles[input.refreshProfile] ? input.refreshProfile : defaultTunnelGatewayConfig.refreshProfile,
    allowStreaming: input.refreshProfile === "manual_only" ? false : input.allowStreaming !== false,
  };
}

export function isRealtimeConnectionMode(mode: unknown): boolean {
  return mode === xshellTunnelConnectionMode || mode === legacyMobaXtermTunnelConnectionMode;
}

export function normalizeConnectionMode(mode: unknown): ClusterConnectionMode {
  return mode === "offline_import" ? "offline_import" : xshellTunnelConnectionMode;
}

function normalizeProvider(provider: unknown): TunnelGatewayConfig["provider"] {
  return provider === "mobaxterm" ? "xshell" : (provider as TunnelGatewayConfig["provider"]) || "xshell";
}

export function requestBudgetConfigFromTunnel(config: TunnelGatewayConfig): RequestBudgetConfig {
  return {
    ...defaultRequestBudgetConfig,
    maxRequestsPerMinute: config.maxRequestsPerMinute,
    pauseWhenHidden: config.pauseWhenWebviewHidden,
  };
}

export function localBaseUrl(config: Pick<TunnelGatewayConfig, "localHost" | "localPort">): string {
  assertLocalhost(config.localHost);
  return `http://127.0.0.1:${normalizePort(config.localPort, defaultTunnelGatewayConfig.localPort)}`;
}

export function assertLocalhost(host: string): void {
  if (host !== "127.0.0.1") throw new Error("Only 127.0.0.1 local endpoint is allowed.");
}

export function normalizePort(value: unknown, fallback: number): number {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) return fallback;
  return port;
}
