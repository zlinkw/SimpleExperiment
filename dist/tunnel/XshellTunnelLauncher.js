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
exports.buildXshellArgs = void 0;
exports.findXshellExecutable = findXshellExecutable;
exports.validateXshellExecutable = validateXshellExecutable;
exports.isLocalPortAvailable = isLocalPortAvailable;
exports.recommendAvailableLocalPort = recommendAvailableLocalPort;
exports.buildForwardCommand = buildForwardCommand;
exports.buildXshellPreview = buildXshellPreview;
exports.launchXshellTunnel = launchXshellTunnel;
exports.generateBatScript = generateBatScript;
exports.generatePs1Script = generatePs1Script;
const fs = __importStar(require("fs/promises"));
const net = __importStar(require("net"));
const path = __importStar(require("path"));
const XshellTunnelCommandBuilder_1 = require("./XshellTunnelCommandBuilder");
Object.defineProperty(exports, "buildXshellArgs", { enumerable: true, get: function () { return XshellTunnelCommandBuilder_1.buildXshellArgs; } });
const XshellProcessLauncher_1 = require("./XshellProcessLauncher");
const commonInstallPaths = [
    "C:\\Program Files\\NetSarang\\Xshell 8\\Xshell.exe",
    "C:\\Program Files (x86)\\NetSarang\\Xshell 8\\Xshell.exe",
    "C:\\Program Files\\NetSarang\\Xshell 7\\Xshell.exe",
    "C:\\Program Files (x86)\\NetSarang\\Xshell 7\\Xshell.exe",
];
async function findXshellExecutable(options = {}) {
    const candidates = [
        options.configuredPath,
        ...commonInstallPaths,
        ...(options.workspaceRoot ? await portableCandidates(options.workspaceRoot) : []),
        ...(await pathCandidates()),
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (await validateXshellExecutable(candidate))
            return candidate;
    }
    return undefined;
}
async function validateXshellExecutable(file) {
    if (path.basename(file).toLowerCase() !== "xshell.exe")
        return false;
    try {
        const stat = await fs.stat(file);
        return stat.isFile();
    }
    catch {
        return false;
    }
}
async function isLocalPortAvailable(port, host = "127.0.0.1") {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once("error", () => resolve(false));
        server.once("listening", () => {
            server.close(() => resolve(true));
        });
        server.listen(port, host);
    });
}
async function recommendAvailableLocalPort(startPort, host = "127.0.0.1") {
    const start = Math.max(1024, Math.min(65535, Math.floor(startPort)));
    for (let port = start; port <= 65535; port += 1) {
        if (await isLocalPortAvailable(port, host))
            return port;
    }
    for (let port = 1024; port < start; port += 1) {
        if (await isLocalPortAvailable(port, host))
            return port;
    }
    throw new Error("没有可用的本地端口。");
}
function buildForwardCommand(config) {
    return (0, XshellTunnelCommandBuilder_1.buildXshellForwardCommand)(config);
}
function buildXshellPreview(config) {
    return (0, XshellTunnelCommandBuilder_1.buildXshellTunnelCommand)(config).redactedShellCommand;
}
function launchXshellTunnel(config) {
    void (0, XshellProcessLauncher_1.launchXshellTunnelProcess)(config);
}
function generateBatScript(config) {
    return (0, XshellTunnelCommandBuilder_1.generateXshellBatScript)(config);
}
function generatePs1Script(config) {
    return (0, XshellTunnelCommandBuilder_1.generateXshellPs1Script)(config);
}
async function portableCandidates(root) {
    const names = ["Xshell.exe", path.join("tools", "Xshell.exe"), path.join("bin", "Xshell.exe")];
    return names.map((name) => path.join(root, name));
}
async function pathCandidates() {
    const envPath = process.env.PATH || "";
    return envPath.split(path.delimiter).filter(Boolean).map((dir) => path.join(dir, "Xshell.exe"));
}
