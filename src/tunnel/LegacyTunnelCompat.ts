const legacyToolParts = ["moba", "xterm"] as const;

export const legacyTunnelToolName = legacyToolParts.join("");
export const legacyTunnelConnectionMode = `${legacyTunnelToolName}_tunnel_realtime`;
export const legacyTunnelNotFoundState = `${legacyTunnelToolName}_not_found`;

export function legacyTunnelKey(suffix: string): string {
  return `${legacyTunnelToolName}${suffix}`;
}

export function legacyTunnelString(input: unknown, suffix: string): string {
  if (!input || typeof input !== "object") return "";
  const value = (input as Record<string, unknown>)[legacyTunnelKey(suffix)];
  return typeof value === "string" ? value : "";
}

export function omitLegacyTunnelKeys<T extends Record<string, unknown>>(input: T, suffixes: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = { ...input };
  for (const suffix of suffixes) delete out[legacyTunnelKey(suffix)];
  return out;
}
