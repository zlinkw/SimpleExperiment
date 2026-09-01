"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeLocalTunnel = probeLocalTunnel;
exports.probeWorkerTelemetryTunnel = probeWorkerTelemetryTunnel;
const net = __importStar(require("net"));
const AgentCapabilities_1 = require("./AgentCapabilities");
const WorkerTelemetryApi_1 = require("./WorkerTelemetryApi");
function resolveProbeHost(config, fallback = "127.0.0.1") {
    const text = String(config.localForwardHost || "").trim();
    return text || fallback;
}
function resolveProbeBase(config) {
    return `http://${resolveProbeHost(config)}:${config.localForwardPort}`;
}
async function fetchHealthWithFallback(base, headers, timeoutMs) {
    const primary = await timedFetch(`${base}/api/health`, { headers }, timeoutMs);
    if (primary.ok)
        return primary;
    // 兼容降级：worker_telemetry 旧路径 /health 或 /api/version
    try {
        const fallback = await timedFetch(`${base}/health`, { headers }, timeoutMs);
        if (fallback.ok)
            return fallback;
    }
    catch { }
    // 如仍不可达，尝试 /api/version 作最后降级（版本比对路径）
    return primary;
}
async function probeLocalTunnel(config, options = {}) {
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? 5_000;
    const host = resolveProbeHost(config);
    const base = resolveProbeBase(config);
    const baseResult = {
        localForwardPort: config.localForwardPort,
        remoteAgentPort: config.remoteAgentPort,
        tcpOpen: false,
        healthOk: false,
        capabilitiesOk: false,
        fileApiOk: false,
        streamApiOk: false,
    };
    if (!(await tcpOpen(config.localForwardPort, timeoutMs, host))) {
        return {
            ...baseResult,
            status: "local_port_closed",
            message: `${host}:${config.localForwardPort} 未打开。`,
            suggestion: `请启动 Xshell 隧道会话，并确认 Hub Agent 已在 ${host} 上运行（端口按每服务器隧道配置动态解析）。`,
        };
    }
    const headers = config.token ? { "X-Simple-Agent-Token": config.token } : undefined;
    try {
        const healthResponse = await fetchHealthWithFallback(base, headers, timeoutMs);
        if (healthResponse.status === 401 || healthResponse.status === 403)
            return tokenInvalid(baseResult, config);
        if (!healthResponse.ok) {
            return {
                ...baseResult,
                tcpOpen: true,
                status: "local_port_occupied_by_unknown",
                latencyMs: Date.now() - started,
                message: `/api/health 返回 HTTP ${healthResponse.status}。`,
                suggestion: "请检查该本地端口是否真的转发到了 Hub Agent。",
            };
        }
        const health = await healthResponse.json();
        if (!(0, AgentCapabilities_1.validateAgentHealth)(health)) {
            return {
                ...baseResult,
                tcpOpen: true,
                status: "local_port_occupied_by_unknown",
                latencyMs: Date.now() - started,
                message: "/api/health 返回格式不兼容 SimpleExperiment Hub Agent。",
                suggestion: "请确认本地端口目标正确，并升级 Hub Agent runtime。",
            };
        }
        const projectRoot = String(health.projectRoot || "").trim();
        const agentInstallDir = String(health.agentInstallDir || "").trim();
        const schedulerDependencies = health.schedulerDependencies;
        const capsResponse = await timedFetch(`${base}/api/capabilities`, { headers }, timeoutMs);
        if (capsResponse.status === 401 || capsResponse.status === 403)
            return tokenInvalid(baseResult, config);
        if (!capsResponse.ok) {
            return {
                ...baseResult,
                tcpOpen: true,
                healthOk: true,
                status: "agent_version_mismatch",
                latencyMs: Date.now() - started,
                agentVersion: health.agentVersion,
                apiVersion: health.apiVersion,
                projectRoot,
                schedulerDependencies,
                message: "/api/capabilities 不可用。",
                suggestion: "请在发布与代码同步卡片点击“部署最新版 Agent 到全部服务器”，然后重启 Hub/Worker Agent 会话。",
            };
        }
        const capabilities = await capsResponse.json();
        if (!(0, AgentCapabilities_1.validateAgentCapabilities)(capabilities)) {
            return {
                ...baseResult,
                tcpOpen: true,
                healthOk: true,
                status: "agent_version_mismatch",
                latencyMs: Date.now() - started,
                agentVersion: health.agentVersion,
                apiVersion: health.apiVersion,
                projectRoot,
                message: "/api/capabilities 返回格式无效。",
                suggestion: "请在发布与代码同步卡片点击“部署最新版 Agent 到全部服务器”，然后重启 Hub/Worker Agent 会话。",
            };
        }
        const compatibility = (0, AgentCapabilities_1.checkAgentApiCompatibility)(capabilities, options.expectedApiVersion ?? AgentCapabilities_1.expectedAgentApiVersion);
        if (!compatibility.compatible) {
            return {
                ...baseResult,
                tcpOpen: true,
                healthOk: true,
                capabilitiesOk: false,
                status: "agent_version_mismatch",
                latencyMs: Date.now() - started,
                agentVersion: health.agentVersion,
                apiVersion: capabilities.apiVersion,
                projectRoot,
                agentInstallDir,
                schedulerDependencies,
                capabilities,
                missingCapabilities: compatibility.missingEndpoints,
                message: `Hub Agent API ${capabilities.apiVersion} 与插件不兼容。`,
                suggestion: "请部署最新版 Agent 并重启 Agent 会话；如果暂不升级，请禁用不支持的功能。",
            };
        }
        let fileCapabilities;
        let fileApiOk = !config.fileTransferEnabled;
        if (config.fileTransferEnabled) {
            const fileCapsResponse = await timedFetch(`${base}/api/files/capabilities`, { headers }, timeoutMs);
            if (fileCapsResponse.status === 401 || fileCapsResponse.status === 403)
                return tokenInvalid(baseResult, config);
            if (!fileCapsResponse.ok) {
                return {
                    ...baseResult,
                    tcpOpen: true,
                    healthOk: true,
                    capabilitiesOk: true,
                    status: "file_api_unavailable",
                    latencyMs: Date.now() - started,
                    agentVersion: health.agentVersion,
                    apiVersion: capabilities.apiVersion,
                    projectRoot,
                    schedulerDependencies,
                    capabilities,
                    message: "/api/files/capabilities 不可用。",
                    suggestion: "请启动较新的 Hub Agent，并确认文件网关已启用。",
                };
            }
            const fileCaps = await fileCapsResponse.json();
            if (!(0, AgentCapabilities_1.validateFileCapabilities)(fileCaps) || !fileCaps.supportsList || !fileCaps.supportsDownload || !fileCaps.supportsUploadChunk) {
                return {
                    ...baseResult,
                    tcpOpen: true,
                    healthOk: true,
                    capabilitiesOk: true,
                    status: "file_api_unavailable",
                    latencyMs: Date.now() - started,
                    agentVersion: health.agentVersion,
                    apiVersion: capabilities.apiVersion,
                    projectRoot,
                    schedulerDependencies,
                    capabilities,
                    message: "文件 API 能力不完整。",
                    suggestion: "请升级 Hub Agent，或改用 offline_import 导入文件。",
                };
            }
            fileCapabilities = fileCaps;
            fileApiOk = true;
        }
        const streamApiOk = !config.realtimeEnabled || capabilities.endpoints.sseEvents || capabilities.endpoints.websocketEvents;
        if (!streamApiOk) {
            return {
                ...baseResult,
                tcpOpen: true,
                healthOk: true,
                capabilitiesOk: true,
                fileApiOk,
                status: "stream_api_unavailable",
                latencyMs: Date.now() - started,
                agentVersion: health.agentVersion,
                apiVersion: capabilities.apiVersion,
                projectRoot,
                schedulerDependencies,
                capabilities,
                fileCapabilities,
                message: "实时流 API 不可用。",
                suggestion: "请升级 Hub Agent，或使用快照备用刷新。",
            };
        }
        return {
            ...baseResult,
            tcpOpen: true,
            healthOk: true,
            capabilitiesOk: true,
            fileApiOk,
            streamApiOk,
            status: "ok",
            latencyMs: Date.now() - started,
            agentVersion: health.agentVersion,
            apiVersion: capabilities.apiVersion,
            projectRoot,
            agentInstallDir,
            schedulerDependencies: health.schedulerDependencies,
            capabilities,
            fileCapabilities,
            message: "Xshell 隧道和 Hub Agent API 可用。",
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            ...baseResult,
            tcpOpen: true,
            status: /AbortError|timeout/i.test(message) ? "timeout" : "agent_unreachable",
            latencyMs: Date.now() - started,
            message,
            suggestion: "请检查 Hub Agent 进程、token、远端端口和 Xshell 转发目标。",
        };
    }
}
async function probeWorkerTelemetryTunnel(config, options = {}) {
    const started = Date.now();
    const timeoutMs = options.timeoutMs ?? 5_000;
    const host = resolveProbeHost(config);
    const base = resolveProbeBase(config);
    const baseResult = {
        localForwardPort: config.localForwardPort,
        remoteTelemetryPort: config.remoteAgentPort,
        tcpOpen: false,
        healthOk: false,
        capabilitiesOk: false,
        streamApiOk: false,
        gpuApiOk: false,
        workerTasksApiOk: false,
        warnings: [],
    };
    if (!(await tcpOpen(config.localForwardPort, timeoutMs, host))) {
        return {
            ...baseResult,
            status: "local_port_closed",
            message: `${host}:${config.localForwardPort} 未打开。`,
            suggestion: `请启动该 Worker 的 Xshell 实时观测隧道（${host}:${config.localForwardPort} 按每服务器隧道配置动态解析），并确认 Worker Telemetry Agent 已启动。`,
        };
    }
    const headers = config.token ? { "X-Simple-Agent-Token": config.token } : undefined;
    try {
        const healthResponse = await fetchHealthWithFallback(base, headers, timeoutMs);
        if (healthResponse.status === 401 || healthResponse.status === 403) {
            return { ...baseResult, tcpOpen: true, status: "agent_token_invalid", message: "Worker Telemetry token 被拒绝。" };
        }
        if (!healthResponse.ok) {
            return { ...baseResult, tcpOpen: true, status: "agent_unreachable", message: `/api/health 返回 HTTP ${healthResponse.status}。` };
        }
        const health = await healthResponse.json().catch(() => ({}));
        const projectRoot = String(health.projectRoot || "").trim();
        const agentInstallDir = String(health.agentInstallDir || "").trim();
        const capsResponse = await timedFetch(`${base}/api/capabilities`, { headers }, timeoutMs);
        if (capsResponse.status === 401 || capsResponse.status === 403) {
            return { ...baseResult, tcpOpen: true, healthOk: true, projectRoot, status: "agent_token_invalid", message: "Worker Telemetry token 被拒绝。" };
        }
        if (!capsResponse.ok) {
            return { ...baseResult, tcpOpen: true, healthOk: true, projectRoot, status: "worker_api_invalid", message: "/api/capabilities 不可用。" };
        }
        const capabilities = await capsResponse.json();
        const validation = (0, WorkerTelemetryApi_1.validateWorkerTelemetryCapabilities)(capabilities);
        const endpoints = capabilities.endpoints || {};
        const mode = String(capabilities.mode || "");
        const streamApiOk = Boolean(endpoints.websocketEvents || endpoints.sseEvents);
        const gpuApiOk = Boolean(endpoints.gpu);
        const workerTasksApiOk = Boolean(endpoints.workerTasks);
        const ok = validation.ok && streamApiOk && gpuApiOk && workerTasksApiOk;
        const modeSuggestion = mode && mode !== "worker_telemetry"
            ? `${host}:${config.localForwardPort} 返回的是 ${mode} Agent，不是 Worker Telemetry。请重新写入 Agent 自动启动命令并重启该 Worker tmux。`
            : "请在 Worker 上启动 cluster_agent.py serve --mode worker_telemetry。";
        return {
            ...baseResult,
            tcpOpen: true,
            healthOk: true,
            capabilitiesOk: validation.ok,
            streamApiOk,
            gpuApiOk,
            workerTasksApiOk,
            status: ok ? "ok" : "worker_api_invalid",
            latencyMs: Date.now() - started,
            projectRoot,
            agentInstallDir,
            schedulerDependencies: health.schedulerDependencies,
            capabilities,
            warnings: validation.warnings,
            message: ok ? "Worker Telemetry API 可用。" : "Worker Telemetry API 不完整。",
            suggestion: ok ? undefined : modeSuggestion,
        };
    }
    catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        return {
            ...baseResult,
            tcpOpen: true,
            status: /AbortError|timeout/i.test(text) ? "timeout" : "agent_unreachable",
            latencyMs: Date.now() - started,
            message: text,
            suggestion: "请检查 Worker Telemetry 进程，以及 Xshell 本地转发目标。",
        };
    }
}
async function tcpOpen(port, timeoutMs, host = "127.0.0.1") {
    return new Promise((resolve) => {
        const resolvedHost = String(host || "127.0.0.1").trim() || "127.0.0.1";
        const socket = net.createConnection({ host: resolvedHost, port });
        const done = (ok) => {
            socket.removeAllListeners();
            socket.destroy();
            resolve(ok);
        };
        socket.setTimeout(timeoutMs, () => done(false));
        socket.once("connect", () => done(true));
        socket.once("error", () => done(false));
    });
}
async function timedFetch(url, init, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    }
    finally {
        clearTimeout(timer);
    }
}
function tokenInvalid(base, config) {
    return {
        ...base,
        localForwardPort: config.localForwardPort,
        remoteAgentPort: config.remoteAgentPort,
        tcpOpen: true,
        status: "agent_token_invalid",
        message: "Hub Agent 拒绝了 token/session。",
        suggestion: "请检查 simpleExperiment.tunnel.agentToken，或用匹配 token 重启 Hub Agent。",
    };
}
