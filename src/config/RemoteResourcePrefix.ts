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

/** Embedded runtimes receive the user's global value through their environment. */
export const REMOTE_RESOURCE_PREFIX_PYTHON = String.raw`
REMOTE_RESOURCE_DEFAULT_PREFIX = ${JSON.stringify(DEFAULT_REMOTE_RESOURCE_PREFIX)}

def remote_resource_prefix(value=None):
    raw = os.environ.get("SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX") if value is None else value
    prefix = re.sub(r"[^a-z0-9._-]+", "-", str(raw or REMOTE_RESOURCE_DEFAULT_PREFIX).strip().lower()).strip("-")[:32]
    return prefix if re.match(r"^[a-z0-9]", prefix) else REMOTE_RESOURCE_DEFAULT_PREFIX

def remote_agent_directory_name():
    return remote_resource_prefix() + "_agent"
`;
