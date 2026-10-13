"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleDefaultCondaEnv = exports.simpleAgentRuntimeRelativePath = exports.simpleAgentTmuxCommandVersion = exports.simpleTmuxSessionPrefix = void 0;
exports.normalizeRemoteTmuxSessionPrefix = normalizeRemoteTmuxSessionPrefix;
exports.defaultAgentTmuxSessionName = defaultAgentTmuxSessionName;
exports.isValidRemoteTmuxSessionName = isValidRemoteTmuxSessionName;
exports.agentTmuxStartupCommand = agentTmuxStartupCommand;
const TunnelGateway_1 = require("./TunnelGateway");
// 仅当 settings 缺失时回退到 "simple"（与 tunnel.remoteTmuxSessionPrefix / XshellTunnelSetup 默认保持一致，动态解析优先）
exports.simpleTmuxSessionPrefix = "simple";
exports.simpleAgentTmuxCommandVersion = "SIMPLE_EXPERIMENT_AGENT_TMUX_V21=1";
exports.simpleAgentRuntimeRelativePath = "simple_cluster/runtime/cluster_agent.py";
exports.simpleDefaultCondaEnv = "";
function normalizeRemoteTmuxSessionPrefix(value) {
    const prefix = String(value || exports.simpleTmuxSessionPrefix)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
    return /^[a-z0-9]/.test(prefix) ? prefix : exports.simpleTmuxSessionPrefix;
}
function defaultAgentTmuxSessionName(role, endpointId, sessionPrefix) {
    const prefix = normalizeRemoteTmuxSessionPrefix(sessionPrefix);
    if (role === "hub")
        return `${prefix}-hub-agent`;
    return `${prefix}-worker-${slug(endpointId || "worker")}-agent`;
}
function isValidRemoteTmuxSessionName(value) {
    return /^[a-z0-9][a-z0-9._-]{0,31}-[a-z0-9][a-z0-9._-]*$/.test(value);
}
function agentTmuxStartupCommand(options) {
    const role = options.role;
    const mode = role === "hub" ? "hub_control" : "worker_telemetry";
    const port = options.port || 18765;
    const host = normalizeAgentBindHost(options.host);
    const sessionPrefix = normalizeRemoteTmuxSessionPrefix(options.sessionPrefix);
    const session = defaultAgentTmuxSessionName(role, options.endpointId, sessionPrefix);
    const condaEnv = normalizeCondaEnvName(options.condaEnv);
    const requireCondaEnv = condaEnv ? "1" : "0";
    const config = JSON.stringify({ projectDir: options.workDir || options.installDir || "", installDir: options.installDir || "", mode, workerId: options.endpointId || "", host, port, condaEnv, sessionPrefix, tmuxSession: session, tmuxWindow: "agent" });
    return [exports.simpleAgentTmuxCommandVersion, "unset TMUX",
        `SESSION=${shellQuote(session)}`, `SIMPLE_EXPERIMENT_CONDA_ENV=${shellQuote(condaEnv)}`,
        `SIMPLE_EXPERIMENT_REQUIRE_CONDA_ENV=${shellQuote(requireCondaEnv)}`,
        `python3 ${shellQuote((options.installDir || "").replace(/\/+$/, "") + "/" + exports.simpleAgentRuntimeRelativePath)} lifecycle --action ensure --config ${shellQuote(config)}`].join("; ");
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
