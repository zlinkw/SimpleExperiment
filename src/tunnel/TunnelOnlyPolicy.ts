import { ClusterConnectionMode } from "./TunnelGateway";

export interface LegacyRemoteConfigMigrationResult {
  removedFields: string[];
  migratedToTunnel: boolean;
  warning: string;
}

export function assertTunnelOnlyMode(mode: ClusterConnectionMode): void {
  if (mode !== "mobaxterm_tunnel_realtime" && mode !== "offline_import") {
    throw new Error("Direct remote connection modes have been removed. Configure MobaXterm realtime tunnel or use offline import.");
  }
}

export function removeLegacyRemoteFields<T extends Record<string, unknown>>(input: T): { value: Record<string, unknown>; removedFields: string[] } {
  const value: Record<string, unknown> = {};
  const removedFields: string[] = [];
  for (const [key, item] of Object.entries(input)) {
    if (/^(ssh|scp|rsync)/i.test(key) || /(control|shell|fallback|workerRefresh)/i.test(key)) {
      removedFields.push(key);
      continue;
    }
    value[key] = item;
  }
  return { value, removedFields };
}

export function migrateLegacyRemoteConfig(input: Record<string, unknown>): LegacyRemoteConfigMigrationResult {
  const removed = removeLegacyRemoteFields(input);
  return {
    removedFields: removed.removedFields,
    migratedToTunnel: true,
    warning: "Legacy direct remote connection mode was removed. Configure MobaXterm realtime tunnel.",
  };
}
