/** Default and normalization shared by remote resource naming consumers. */
export const DEFAULT_REMOTE_RESOURCE_PREFIX = "simple";

export function normalizeRemoteResourcePrefix(value: unknown): string {
  const prefix = String(value || DEFAULT_REMOTE_RESOURCE_PREFIX)
    .trim().toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return /^[a-z0-9]/.test(prefix) ? prefix : DEFAULT_REMOTE_RESOURCE_PREFIX;
}

export function remoteAgentDirectoryName(prefix?: unknown): string {
  return `${normalizeRemoteResourcePrefix(prefix)}_agent`;
}
