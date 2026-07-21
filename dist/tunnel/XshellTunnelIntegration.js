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
exports.recommendAvailableLocalPort = exports.isLocalPortAvailable = exports.XshellIntegration = void 0;
exports.buildIntegrationReport = buildIntegrationReport;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const MobaXtermProcessLauncher_1 = require("./MobaXtermProcessLauncher");
const XshellTunnelCommandBuilder_1 = require("./XshellTunnelCommandBuilder");
const XshellTunnelLauncher_1 = require("./XshellTunnelLauncher");
Object.defineProperty(exports, "isLocalPortAvailable", { enumerable: true, get: function () { return XshellTunnelLauncher_1.isLocalPortAvailable; } });
Object.defineProperty(exports, "recommendAvailableLocalPort", { enumerable: true, get: function () { return XshellTunnelLauncher_1.recommendAvailableLocalPort; } });
const XshellTunnelPortProbe_1 = require("./XshellTunnelPortProbe");
class XshellIntegration {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    async findExecutable() {
        const configured = this.options.configuredPath ? [{ path: this.options.configuredPath, source: "configured" }] : [];
        const common = commonInstallPaths().map((item) => ({ path: item, source: "common_install_path" }));
        const pathEnv = pathCandidates().map((item) => ({ path: item, source: "path_env" }));
        const portable = this.options.workspaceRoot ? portableCandidates(this.options.workspaceRoot).map((item) => ({ path: item, source: "portable_candidate" })) : [];
        const selected = this.options.userSelectedPath ? [{ path: this.options.userSelectedPath, source: "user_selected" }] : [];
        for (const candidate of [...configured, ...common, ...pathEnv, ...portable, ...selected]) {
            const validation = await this.validateExecutable(candidate.path);
            if (validation.ok)
                return { found: true, path: candidate.path, source: candidate.source };
        }
        return { found: false, source: "not_found", message: "未找到 Xshell.exe，请手动选择。" };
    }
    async validateExecutable(file) {
        const extensionOk = path.basename(file).toLowerCase() === "xshell.exe";
        try {
            const stat = await fs.stat(file);
            const isFile = stat.isFile();
            return {
                ok: extensionOk && isFile,
                path: file,
                exists: true,
                isFile,
                extensionOk,
                launchable: extensionOk && isFile,
                message: extensionOk && isFile ? "Xshell.exe 有效。" : "该路径不是 Xshell.exe。",
            };
        }
        catch {
            return { ok: false, path: file, exists: false, isFile: false, extensionOk, launchable: false, message: "Xshell.exe 不存在。" };
        }
    }
    buildTunnelCommand(config) {
        return (0, XshellTunnelCommandBuilder_1.buildXshellTunnelCommand)(config);
    }
    async launchTunnel(config) {
        return (0, MobaXtermProcessLauncher_1.launchMobaXtermTunnel)(config);
    }
    async probeLocalTunnel(config) {
        return (0, XshellTunnelPortProbe_1.probeLocalTunnel)({ ...config, token: this.options.token });
    }
    async runIntegrationCheck(config) {
        const executable = await this.findExecutable();
        const validation = executable.path ? await this.validateExecutable(executable.path) : undefined;
        const command = validation?.ok ? this.buildTunnelCommand({ ...config, mobaxtermExePath: executable.path || config.mobaxtermExePath }) : undefined;
        const probe = await this.probeLocalTunnel(config);
        const report = buildIntegrationReport(config, executable, probe);
        return { executable, validation, command, probe, report };
    }
}
exports.XshellIntegration = XshellIntegration;
function buildIntegrationReport(config, executable, probe, launch) {
    const missing = probe.missingCapabilities || [];
    const suggestions = [probe.suggestion, executable.message].filter(Boolean);
    const fileOk = probe.fileApiOk && probe.fileCapabilities?.supportsList && probe.fileCapabilities?.supportsDownload && probe.fileCapabilities?.supportsUploadChunk;
    const realtimeOk = probe.streamApiOk;
    const overall = probe.status === "ok" ? "ok" : (probe.healthOk || probe.capabilitiesOk ? "warning" : "failed");
    return {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        mobaxterm: {
            exePath: executable.path || config.mobaxtermExePath,
            found: executable.found,
            launchAttempted: Boolean(launch?.attempted),
            launchSucceeded: launch?.launched,
        },
        tunnel: {
            localForwardPort: config.localForwardPort,
            remoteAgentPort: config.remoteAgentPort,
            localPortOpen: probe.tcpOpen,
            healthOk: probe.healthOk,
            latencyMs: probe.latencyMs,
        },
        agent: {
            reachable: probe.healthOk,
            agentVersion: probe.agentVersion,
            apiVersion: probe.apiVersion,
            capabilitiesOk: probe.capabilitiesOk,
            missingCapabilities: missing,
        },
        realtime: {
            websocketOk: Boolean(probe.capabilities?.endpoints.websocketEvents),
            sseOk: Boolean(probe.capabilities?.endpoints.sseEvents),
            fallbackMode: realtimeOk ? (probe.capabilities?.endpoints.websocketEvents ? "websocket" : "sse") : (probe.healthOk ? "snapshot" : undefined),
        },
        fileTransfer: {
            listOk: Boolean(probe.fileCapabilities?.supportsList),
            downloadOk: Boolean(probe.fileCapabilities?.supportsDownload),
            uploadOk: Boolean(probe.fileCapabilities?.supportsUploadChunk),
            sha256Ok: Boolean(probe.fileCapabilities?.supportsSha256),
            message: fileOk ? "文件 API 可用。" : "文件 API 不可用或能力不完整。",
        },
        overall,
        suggestions,
    };
}
function commonInstallPaths() {
    return [
        "C:\\Program Files\\NetSarang\\Xshell 8\\Xshell.exe",
        "C:\\Program Files (x86)\\NetSarang\\Xshell 8\\Xshell.exe",
        "C:\\Program Files\\NetSarang\\Xshell 7\\Xshell.exe",
        "C:\\Program Files (x86)\\NetSarang\\Xshell 7\\Xshell.exe",
    ];
}
function portableCandidates(root) {
    return [
        path.join(root, "Xshell.exe"),
        path.join(root, "tools", "Xshell.exe"),
        path.join(root, "bin", "Xshell.exe"),
    ];
}
function pathCandidates() {
    return (process.env.PATH || "").split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "Xshell.exe"));
}
