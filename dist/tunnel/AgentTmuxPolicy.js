"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleDefaultCondaEnv = exports.simpleAgentRuntimeRelativePath = exports.simpleAgentTmuxCommandVersion = exports.simpleTmuxSessionPrefix = exports.remoteAgentDirectoryName = void 0;
exports.normalizeRemoteTmuxSessionPrefix = normalizeRemoteTmuxSessionPrefix;
exports.defaultAgentTmuxSessionName = defaultAgentTmuxSessionName;
exports.isValidRemoteTmuxSessionName = isValidRemoteTmuxSessionName;
exports.agentTmuxStartupCommand = agentTmuxStartupCommand;
exports.defaultAgentTmuxWindowName = defaultAgentTmuxWindowName;
const TunnelGateway_1 = require("./TunnelGateway");
const ProjectRootMap_1 = require("../features/ProjectRootMap");
const RemoteResourcePrefix_1 = require("../config/RemoteResourcePrefix");
var RemoteResourcePrefix_2 = require("../config/RemoteResourcePrefix");
Object.defineProperty(exports, "remoteAgentDirectoryName", { enumerable: true, get: function () { return RemoteResourcePrefix_2.remoteAgentDirectoryName; } });
exports.simpleTmuxSessionPrefix = RemoteResourcePrefix_1.DEFAULT_REMOTE_RESOURCE_PREFIX;
exports.simpleAgentTmuxCommandVersion = "SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1";
exports.simpleAgentRuntimeRelativePath = "simple_cluster/runtime/cluster_agent.py";
exports.simpleDefaultCondaEnv = "";
function normalizeRemoteTmuxSessionPrefix(value) {
    return (0, RemoteResourcePrefix_1.normalizeRemoteResourcePrefix)(value);
}
function defaultAgentTmuxSessionName(role, endpointId, sessionPrefix) {
    const prefix = normalizeRemoteTmuxSessionPrefix(sessionPrefix);
    if (role === "hub")
        throw new Error("HUB_REMOVED：请配置 Worker。");
    return `${prefix}-worker-${slug(endpointId || "worker")}-agent`;
}
function isValidRemoteTmuxSessionName(value) {
    return /^[a-z0-9][a-z0-9._-]{0,31}-[a-z0-9][a-z0-9._-]*$/.test(value);
}
function agentTmuxStartupCommand(options) {
    const role = options.role;
    if (role !== "worker")
        throw new Error("HUB_REMOVED：请配置 Worker。");
    const mode = "worker_telemetry";
    const port = options.port || 18765;
    const host = normalizeAgentBindHost(options.host);
    const sessionPrefix = normalizeRemoteTmuxSessionPrefix(options.sessionPrefix);
    const session = defaultAgentTmuxSessionName(role, options.endpointId, sessionPrefix);
    const window = defaultAgentTmuxWindowName(options.workDir);
    const condaEnv = normalizeCondaEnvName(options.condaEnv);
    const requireCondaEnv = condaEnv ? "1" : "0";
    const config = JSON.stringify({ projectDir: options.workDir, installDir: options.installDir || "", stateDir: options.stateDir, workerStateDir: options.workerStateDir, mode, workerId: options.endpointId || "", host, port, condaEnv, sessionPrefix, tmuxSession: session, tmuxWindow: window });
    return [exports.simpleAgentTmuxCommandVersion, "unset TMUX",
        `SESSION=${shellQuote(session)}`, `SIMPLE_EXPERIMENT_CONDA_ENV=${shellQuote(condaEnv)}`,
        `SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV=${shellQuote(requireCondaEnv)}`,
        `python3 ${shellQuote((options.installDir || "").replace(/\/+$/, "") + "/" + exports.simpleAgentRuntimeRelativePath)} lifecycle --action ensure --config ${shellQuote(config)}`].join("; ");
}
function defaultAgentTmuxWindowName(projectDir) {
    const root = (0, ProjectRootMap_1.canonicalRemotePath)(String(projectDir || ""));
    if (!root.ok || root.path === "/")
        throw new Error("AGENT_PROJECT_REQUIRED：项目目录尚未确定。");
    return `agent-${(0, ProjectRootMap_1.projectIdentityKey)({ projectDir: root.path }).slice(0, 16)}`;
}
function normalizeAgentBindHost(value) {
    const input = String(value || "127.0.0.1").trim() || "127.0.0.1";
    (0, TunnelGateway_1.assertLocalhost)(input);
    return input.startsWith("[") && input.endsWith("]") ? input.slice(1, -1) : input;
}
function shellQuote(value) {
    return `'${value.replace(/'/g, `'\\''`)}'`;
}
function normalizeCondaEnvName(value) {
    const normalized = String(value || exports.simpleDefaultCondaEnv).trim();
    return normalized === "-" || normalized === "--" ? "" : normalized;
}
function slug(value) {
    return String(value || "worker").trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "worker";
}
