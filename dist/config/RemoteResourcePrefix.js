"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REMOTE_RESOURCE_PREFIX_PYTHON = exports.DEFAULT_REMOTE_RESOURCE_PREFIX = void 0;
exports.normalizeRemoteResourcePrefix = normalizeRemoteResourcePrefix;
exports.remoteAgentDirectoryName = remoteAgentDirectoryName;
/** Default and normalization shared by remote resource naming consumers. */
exports.DEFAULT_REMOTE_RESOURCE_PREFIX = "simple";
function normalizeRemoteResourcePrefix(value) {
    const prefix = String(value || exports.DEFAULT_REMOTE_RESOURCE_PREFIX)
        .trim().toLowerCase()
        // Older tmux rewrites dots in session names; generate portable names up front.
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
    return /^[a-z0-9]/.test(prefix) ? prefix : exports.DEFAULT_REMOTE_RESOURCE_PREFIX;
}
function remoteAgentDirectoryName(prefix) {
    return `${normalizeRemoteResourcePrefix(prefix)}_agent`;
}
/** Embedded runtimes receive the user's global value through their environment. */
exports.REMOTE_RESOURCE_PREFIX_PYTHON = String.raw `
REMOTE_RESOURCE_DEFAULT_PREFIX = ${JSON.stringify(exports.DEFAULT_REMOTE_RESOURCE_PREFIX)}

def remote_resource_prefix(value=None):
    raw = os.environ.get("SIMPLE_EXPERIMENT_REMOTE_TMUX_SESSION_PREFIX") if value is None else value
    prefix = re.sub(r"[^a-z0-9_-]+", "-", str(raw or REMOTE_RESOURCE_DEFAULT_PREFIX).strip().lower()).strip("-")[:32]
    return prefix if re.match(r"^[a-z0-9]", prefix) else REMOTE_RESOURCE_DEFAULT_PREFIX

def remote_agent_directory_name():
    return remote_resource_prefix() + "_agent"
`;
