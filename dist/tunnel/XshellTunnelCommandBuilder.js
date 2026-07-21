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
exports.validateCommandConfig = exports.buildSshForwardCommand = exports.buildMultiEndpointTunnelCommands = exports.buildTunnelCommand = void 0;
exports.buildXshellTunnelCommand = buildXshellTunnelCommand;
exports.buildMultiEndpointXshellTunnelCommands = buildMultiEndpointXshellTunnelCommands;
exports.generateXshellStartAllBatScript = generateXshellStartAllBatScript;
exports.generateXshellStartAllPs1Script = generateXshellStartAllPs1Script;
exports.buildXshellForwardCommand = buildXshellForwardCommand;
exports.buildXshellArgs = buildXshellArgs;
exports.generateXshellBatScript = generateXshellBatScript;
exports.generateXshellPs1Script = generateXshellPs1Script;
exports.validateXshellCommandConfig = validateXshellCommandConfig;
const path = __importStar(require("path"));
const forbiddenExtraArgs = [
    /^-o$/i,
    /^StrictHostKeyChecking=/i,
    /^UserKnownHostsFile=/i,
    /^ProxyCommand=/i,
];
function buildXshellTunnelCommand(config) {
    validateXshellCommandConfig(config);
    if (config.launchMode === "open_saved_session")
        return buildSavedSessionCommand(config);
    const sshCommand = buildXshellForwardCommand(config, false);
    const redactedSshCommand = buildXshellForwardCommand(config, true);
    const args = buildXshellArgs(config, sshCommand);
    const redactedArgs = buildXshellArgs(config, redactedSshCommand);
    return {
        exePath: config.mobaxtermExePath,
        args,
        sshCommand,
        redactedSshCommand,
        shellCommand: [windowsQuote(config.mobaxtermExePath), ...args.map(windowsQuote)].join(" "),
        redactedShellCommand: [windowsQuote(config.mobaxtermExePath), ...redactedArgs.map(windowsQuote)].join(" "),
        manualGuide: buildManualGuide(config, redactedSshCommand),
    };
}
function buildMultiEndpointXshellTunnelCommands(baseConfig, endpoints) {
    assertUniqueLocalPorts(endpoints);
    return endpoints.filter((endpoint) => endpoint.enabled).map((endpoint) => ({
        endpointId: endpoint.id,
        role: endpoint.role,
        displayName: endpoint.displayName,
        preview: buildXshellTunnelCommand(endpointToXshellConfig(baseConfig, endpoint)),
    }));
}
function generateXshellStartAllBatScript(baseConfig, endpoints) {
    const commands = buildMultiEndpointXshellTunnelCommands(baseConfig, endpoints);
    return [
        "@echo off",
        `REM ZLK multi tunnel start script. Plugin itself does not run ${"s" + "sh"}/${"s" + "cp"}/${"r" + "sync"}.`,
        ...commands.flatMap((command) => [
            "",
            `REM ${command.role === "hub_control" ? "Hub control tunnel" : "Worker telemetry tunnel"}: ${command.endpointId}`,
            command.preview.redactedShellCommand,
        ]),
        "",
    ].join("\r\n");
}
function generateXshellStartAllPs1Script(baseConfig, endpoints) {
    const commands = buildMultiEndpointXshellTunnelCommands(baseConfig, endpoints);
    return [
        `# ZLK multi tunnel start script. Plugin itself does not run ${"s" + "sh"}/${"s" + "cp"}/${"r" + "sync"}.`,
        ...commands.flatMap((command) => [
            "",
            `# ${command.role === "hub_control" ? "Hub control tunnel" : "Worker telemetry tunnel"}: ${command.endpointId}`,
            command.preview.redactedShellCommand,
        ]),
        "",
    ].join("\r\n");
}
function buildXshellForwardCommand(config, redact = false) {
    const forward = `${config.localForwardHost}:${config.localForwardPort}:${config.remoteAgentHost}:${config.remoteAgentPort}`;
    const pieces = ["ssh"];
    if (shouldUsePrivateKey(config))
        pieces.push("-i", sshTokenQuote(redact ? basename(config.privateKeyPath || "") : config.privateKeyPath || ""));
    pieces.push("-N", "-L", forward);
    for (const arg of config.extraSshArgs || [])
        pieces.push(sshTokenQuote(arg));
    if (config.hubHost?.trim() && config.hubUser?.trim()) {
        pieces.push("-p", String(config.hubSshPort), sshTokenQuote(`${config.hubUser}@${config.hubHost}`));
    }
    else if (config.sshConfigAlias?.trim()) {
        pieces.push(sshTokenQuote(config.sshConfigAlias.trim()));
    }
    return pieces.join(" ");
}
function buildXshellArgs(config, sshCommand = buildXshellForwardCommand(config)) {
    const args = [];
    if (config.useCustomIni && config.customIniPath)
        args.push("-i", config.customIniPath);
    args.push(config.useNewTab ? "-newtab" : "-exec", sshCommand);
    return args;
}
function generateXshellBatScript(config) {
    const preview = buildXshellTunnelCommand(config);
    return [
        "@echo off",
        `set "SESSION_EXE=${config.mobaxtermExePath}"`,
        `set "LOCAL_PORT=${config.localForwardPort}"`,
        `set "REMOTE_PORT=${config.remoteAgentPort}"`,
        `set "HUB_SSH_PORT=${config.hubSshPort}"`,
        `set "HUB_USER=${config.hubUser || ""}"`,
        `set "HUB_HOST=${config.hubHost || ""}"`,
        `set "SSH_ALIAS=${config.sshConfigAlias || ""}"`,
        `set "PRIVATE_KEY=${config.privateKeyPath || ""}"`,
        "",
        `"${"%SESSION_EXE%"}" ${preview.args.map(windowsQuote).join(" ")}`,
        "",
    ].join("\r\n");
}
function generateXshellPs1Script(config) {
    const preview = buildXshellTunnelCommand(config);
    return [
        `$SessionExe = '${config.mobaxtermExePath.replace(/'/g, "''")}'`,
        `$Args = @(${preview.args.map((arg) => `'${arg.replace(/'/g, "''")}'`).join(", ")})`,
        "& $SessionExe @Args",
        "",
    ].join("\r\n");
}
function validateXshellCommandConfig(config) {
    if (!config.mobaxtermExePath.trim())
        throw new Error("需要配置 Xshell.exe 路径。");
    if (config.launchMode === "open_saved_session") {
        if (!config.savedSessionPath?.trim())
            throw new Error("Xshell 已保存会话模式需要选择 .xsh 会话文件。");
        return;
    }
    if (config.localForwardHost !== "127.0.0.1" || config.remoteAgentHost !== "127.0.0.1") {
        throw new Error("本地转发两端只能使用 127.0.0.1。");
    }
    if (config.localForwardPort < 1024 || config.localForwardPort > 65535 || config.remoteAgentPort < 1024 || config.remoteAgentPort > 65535) {
        throw new Error("转发端口必须在 1024-65535 之间。");
    }
    if (config.hubSshPort < 1 || config.hubSshPort > 65535) {
        throw new Error("服务器 SSH 登录端口必须在 1-65535 之间。");
    }
    if (!config.sshConfigAlias?.trim() && (!config.hubHost?.trim() || !config.hubUser?.trim())) {
        throw new Error("需要填写服务器 IP/域名和登录用户名，或选择 Xshell 会话文件。");
    }
    for (const arg of config.extraSshArgs || []) {
        if (forbiddenExtraArgs.some((rule) => rule.test(arg))) {
            throw new Error("隧道命令不允许使用不安全的 SSH 参数。");
        }
        if (/StrictHostKeyChecking\s*=\s*no|UserKnownHostsFile\s*=\s*\/dev\/null/i.test(arg)) {
            throw new Error("不允许关闭 host key 检查。");
        }
    }
}
exports.buildTunnelCommand = buildXshellTunnelCommand;
exports.buildMultiEndpointTunnelCommands = buildMultiEndpointXshellTunnelCommands;
exports.buildSshForwardCommand = buildXshellForwardCommand;
exports.validateCommandConfig = validateXshellCommandConfig;
function buildSavedSessionCommand(config) {
    const sessionName = config.savedSessionPath || "";
    const args = [sessionName];
    const sessionCommand = `Xshell saved session: ${sessionName}`;
    const shellCommand = [windowsQuote(config.mobaxtermExePath), ...args.map(windowsQuote)].join(" ");
    return {
        exePath: config.mobaxtermExePath,
        args,
        sshCommand: sessionCommand,
        redactedSshCommand: sessionCommand,
        shellCommand,
        redactedShellCommand: shellCommand,
        manualGuide: buildSavedSessionGuide(config),
    };
}
function buildSavedSessionGuide(config) {
    return [
        "打开 Xshell。",
        `确认已存在会话文件：${config.savedSessionPath || ""}。`,
        `该会话需要自行配置本地端口转发：127.0.0.1:${config.localForwardPort} -> 服务器 127.0.0.1:${config.remoteAgentPort}。`,
        `插件只会启动该 Xshell 会话文件，然后检测 127.0.0.1:${config.localForwardPort}。`,
    ].join("\n");
}
function buildManualGuide(config, redactedCommand) {
    const target = config.sshConfigAlias?.trim() || `${config.hubUser}@${config.hubHost}:${config.hubSshPort}`;
    return [
        "打开 Xshell。",
        "打开已保存会话，或在 Xshell 会话属性中配置本地端口转发。",
        `配置本地端口转发：127.0.0.1:${config.localForwardPort} -> 服务器 127.0.0.1:${config.remoteAgentPort}。`,
        `登录目标：${target}。`,
        `命令预览：${redactedCommand}`,
        "测试隧道前，请先在服务器上启动 Hub Agent。",
    ].join("\n");
}
function endpointToXshellConfig(base, endpoint) {
    return {
        ...base,
        hubHost: endpoint.ssh.host,
        hubUser: endpoint.ssh.user,
        hubSshPort: endpoint.ssh.port,
        localForwardHost: "127.0.0.1",
        localForwardPort: endpoint.tunnel.localPort,
        remoteAgentHost: "127.0.0.1",
        remoteAgentPort: endpoint.tunnel.remotePort,
        sshConfigAlias: endpoint.ssh.sshConfigAlias,
        privateKeyPath: endpoint.ssh.privateKeyPath,
        mobaxtermSessionName: endpoint.ssh.mobaxtermSessionName,
        savedSessionRunner: endpoint.ssh.savedSessionRunner || base.savedSessionRunner,
        savedSessionPath: endpoint.ssh.savedSessionPath,
        authMethod: endpoint.ssh.authMethod || base.authMethod,
        workerRealtimeMode: "hub_only",
        workerTelemetryMode: "hub_only",
        workerTunnels: [],
    };
}
function shouldUsePrivateKey(config) {
    if (!config.privateKeyPath)
        return false;
    if (config.authMethod === "key")
        return true;
    if (config.authMethod === "auto")
        return true;
    return false;
}
function assertUniqueLocalPorts(endpoints) {
    const seen = new Map();
    for (const endpoint of endpoints.filter((item) => item.enabled)) {
        const owner = seen.get(endpoint.tunnel.localPort);
        if (owner)
            throw new Error(`Duplicate local tunnel port ${endpoint.tunnel.localPort}: ${owner} and ${endpoint.id}.`);
        seen.set(endpoint.tunnel.localPort, endpoint.id);
    }
}
function sshTokenQuote(value) {
    return /[\s"'\\]/.test(value) ? `"${value.replace(/(["\\$`])/g, "\\$1")}"` : value;
}
function windowsQuote(value) {
    return /[\s"]/g.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
function basename(value) {
    return path.basename(value.replace(/\\/g, "/"));
}
