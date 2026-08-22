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
exports.REMOTE_ROOT_POLICY_PREFILL_KEY = exports.REMOTE_ROOT_POLICY_PREFILL_VERSION = void 0;
exports.deriveRemoteRootPolicyPrefill = deriveRemoteRootPolicyPrefill;
exports.prefillRemoteRootPolicy = prefillRemoteRootPolicy;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.REMOTE_ROOT_POLICY_PREFILL_VERSION = 1;
exports.REMOTE_ROOT_POLICY_PREFILL_KEY = "simpleExperiment.remoteRootPolicyPrefillVersion";
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function normalizeRemoteRoot(value) {
    const text = String(value || "").trim().replace(/\\/g, "/").replace(/\/+/g, "/");
    if (!text || !text.startsWith("/") || text === "/" || text === "." || text === "..")
        return undefined;
    const root = text.replace(/\/+$/, "");
    const segments = root.split("/").filter(Boolean);
    if (segments.includes(".") || segments.includes(".."))
        return undefined;
    if (segments.some((segment) => ["simple_agent", "zlk_agent"].includes(segment.toLowerCase())))
        return undefined;
    return root;
}
function unique(values) {
    return [...new Set(values)];
}
function parentRemotePath(value) {
    const separator = value.lastIndexOf("/");
    return separator > 0 ? normalizeRemoteRoot(value.slice(0, separator)) : undefined;
}
function rootsFromSetupConfig(source) {
    const setup = record(source);
    const workers = Array.isArray(setup.workerTunnels) ? setup.workerTunnels : [];
    const values = [
        setup.agentProjectDir,
        ...workers,
    ];
    return values.map((value) => record(value).agentProjectDir ?? value)
        .map((value) => normalizeRemoteRoot(value))
        .filter((value) => Boolean(value));
}
function rootsFromServerProfiles(source, projectName) {
    const profiles = record(source);
    const servers = Array.isArray(profiles.servers) ? profiles.servers : [];
    return servers.map((item) => {
        const remotePath = normalizeRemoteRoot(record(item).remotePath);
        if (!remotePath)
            return undefined;
        const leaf = remotePath.split("/").pop() || "";
        // Shared profiles store the work directory; setup roots store its parent.
        return projectName && leaf.toLowerCase() === projectName.toLowerCase()
            ? parentRemotePath(remotePath)
            : remotePath;
    }).filter((value) => Boolean(value));
}
function rootsFromRemoteSshInstallPaths(source) {
    const values = Object.values(record(source));
    return values.map((value) => normalizeRemoteRoot(value)).filter((value) => Boolean(value));
}
function deriveRemoteRootPolicyPrefill(source = {}, projectName = "") {
    const candidates = unique([
        ...rootsFromSetupConfig(source.setupConfig),
        ...rootsFromServerProfiles(source.serverProfiles, String(projectName || "")),
        ...rootsFromRemoteSshInstallPaths(source.remoteSshInstallPaths),
    ]);
    const unsafeRoots = candidates.filter((root) => root === "/root" || root.startsWith("/root/"));
    const allowedRoots = candidates.filter((root) => !unsafeRoots.includes(root));
    // Seed the migration-defect sibling (for example /data/team/simple beside
    // /data/team/zlk) so the failed branding migration cannot become authoritative.
    const migrationDefectRoots = allowedRoots.map((root) => {
        const separator = root.lastIndexOf("/");
        const leaf = separator >= 0 ? root.slice(separator + 1).toLowerCase() : "";
        return leaf === "zlk" ? `${root.slice(0, separator)}/simple` : undefined;
    }).filter((value) => Boolean(value))
        .filter((value) => !allowedRoots.includes(value));
    return {
        allowedRoots: unique(allowedRoots),
        deniedRoots: unique([...unsafeRoots, ...migrationDefectRoots]),
    };
}
async function readServerProfiles() {
    try {
        const file = path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "SimpleSFTP", "server-profiles", "servers.json");
        return JSON.parse(await fs.readFile(file, "utf8"));
    }
    catch {
        return {};
    }
}
function hasExplicitConfigurationValue(inspection) {
    const item = record(inspection);
    return item.globalValue !== undefined
        || item.workspaceValue !== undefined
        || item.workspaceFolderValue !== undefined;
}
async function prefillRemoteRootPolicy(context, setupConfig, vscode, options = {}) {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder || Number(context.workspaceState.get(exports.REMOTE_ROOT_POLICY_PREFILL_KEY, 0)) >= exports.REMOTE_ROOT_POLICY_PREFILL_VERSION)
        return undefined;
    await context.workspaceState.update(exports.REMOTE_ROOT_POLICY_PREFILL_KEY, exports.REMOTE_ROOT_POLICY_PREFILL_VERSION);
    const config = vscode.workspace.getConfiguration("simpleExperiment", folder.uri);
    const allowedInspection = config.inspect("remote.allowedRoots");
    const deniedInspection = config.inspect("remote.deniedRoots");
    if (hasExplicitConfigurationValue(allowedInspection) && hasExplicitConfigurationValue(deniedInspection))
        return undefined;
    const projectName = path.basename(folder.uri.fsPath).trim();
    const source = {
        setupConfig,
        serverProfiles: await (options.readServerProfiles || readServerProfiles)(),
        remoteSshInstallPaths: vscode.workspace.getConfiguration("remote").get("SSH.serverInstallPath"),
    };
    const derived = deriveRemoteRootPolicyPrefill(source, projectName);
    const target = vscode.ConfigurationTarget.WorkspaceFolder;
    if (!hasExplicitConfigurationValue(allowedInspection) && derived.allowedRoots.length) {
        await config.update("remote.allowedRoots", derived.allowedRoots, target);
    }
    if (!hasExplicitConfigurationValue(deniedInspection) && derived.deniedRoots.length) {
        await config.update("remote.deniedRoots", derived.deniedRoots, target);
    }
    return derived;
}
