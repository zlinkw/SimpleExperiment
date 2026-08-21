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
exports.LEGACY_EXTENSION_ID = exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY = exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION = void 0;
exports.xshellRecoveryConfig = xshellRecoveryConfig;
exports.xshellConfigCompleteness = xshellConfigCompleteness;
exports.hasCompletedXshellSetup = hasCompletedXshellSetup;
exports.readExtensionStateFromDatabase = readExtensionStateFromDatabase;
exports.renamedExtensionStateSourcePath = renamedExtensionStateSourcePath;
exports.migrateRenamedExtensionState = migrateRenamedExtensionState;
// @ts-nocheck
const path = __importStar(require("path"));
const XshellTunnelSetup_1 = require("../tunnel/XshellTunnelSetup");
exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION = 1;
exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY = "simpleExperiment.renamedExtensionStateMigrationVersion";
exports.LEGACY_EXTENSION_ID = "simple-local.simple-experiment";
const SETUP_KEY = "simpleExperiment.xshellRealtimeTunnelConfig";
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stripDirectSshFields(value) {
    const source = record(value);
    const copy = { ...source };
    delete copy.sshConfigAlias;
    delete copy.privateKeyPath;
    delete copy.sshHost;
    delete copy.sftpHost;
    return copy;
}
function xshellRecoveryConfig(value) {
    const source = record(value);
    return {
        ...stripDirectSshFields(source),
        savedSessionRunner: "xshell",
        localForwardHost: "127.0.0.1",
        remoteAgentHost: "127.0.0.1",
        workerTunnels: Array.isArray(source.workerTunnels)
            ? source.workerTunnels.map((worker) => stripDirectSshFields(worker))
            : [],
    };
}
function xshellConfigCompleteness(value) {
    const source = record(value);
    const workers = Array.isArray(source.workerTunnels)
        ? source.workerTunnels.filter((worker) => record(worker).enabled !== false)
        : [];
    let score = 0;
    if (String(source.xshellExePath || "").trim())
        score += 2;
    if (String(source.hubHost || "").trim() && String(source.hubUser || "").trim())
        score += 2;
    if (String(source.savedSessionPath || source.xshellSessionName || "").trim())
        score += 3;
    if (String(source.agentProjectDir || "").trim())
        score += 3;
    score += Math.min(workers.length, 8) * 4;
    score += workers.filter((worker) => String(worker.savedSessionPath || worker.xshellSessionName || "").trim()).length * 2;
    return score;
}
function hasCompletedXshellSetup(value) {
    const source = record(value);
    return xshellConfigCompleteness(source) >= 13
        && Array.isArray(source.workerTunnels)
        && source.workerTunnels.some((worker) => record(worker).enabled !== false);
}
function readExtensionStateFromDatabase(databasePath, extensionId = exports.LEGACY_EXTENSION_ID) {
    try {
        const { DatabaseSync } = require("node:sqlite");
        const database = new DatabaseSync(databasePath, { readOnly: true });
        try {
            const row = database.prepare("SELECT value FROM ItemTable WHERE key = ?").get(extensionId);
            if (!row?.value)
                return {};
            const parsed = JSON.parse(String(row.value));
            return record(parsed);
        }
        finally {
            database.close();
        }
    }
    catch {
        return {};
    }
}
function renamedExtensionStateSourcePath(globalStoragePath) {
    return path.join(path.dirname(globalStoragePath), "state.vscdb");
}
async function migrateRenamedExtensionState(context, options = {}) {
    const globalState = context?.globalState;
    if (!globalState?.get || !globalState?.update)
        return { migrated: false, reason: "missing_global_state" };
    if (Number(globalState.get(exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY, 0)) >= exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION)
        return { migrated: false, reason: "already_checked" };
    const current = record(globalState.get(SETUP_KEY, {}));
    if (hasCompletedXshellSetup(current)) {
        await globalState.update(exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY, exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION);
        return { migrated: false, reason: "current_setup_complete" };
    }
    const globalStoragePath = String(context?.globalStorageUri?.fsPath || "");
    const legacyState = globalStoragePath
        ? (options.readState || readExtensionStateFromDatabase)(renamedExtensionStateSourcePath(globalStoragePath))
        : {};
    const legacy = record(legacyState[SETUP_KEY]);
    if (!Object.keys(legacy).length || xshellConfigCompleteness(legacy) <= xshellConfigCompleteness(current)) {
        await globalState.update(exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY, exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION);
        return { migrated: false, reason: "no_better_legacy_setup" };
    }
    const setup = (0, XshellTunnelSetup_1.normalizeXshellSetupConfig)(xshellRecoveryConfig(legacy));
    const tunnel = {
        enabled: true,
        connectionMode: "xshell_tunnel_realtime",
        provider: "xshell",
        localHost: "127.0.0.1",
        localPort: setup.localForwardPort,
        remoteHost: "127.0.0.1",
        remotePort: setup.remoteAgentPort,
        xshellExePath: setup.xshellExePath,
        allowStreaming: true,
        refreshProfile: "realtime",
    };
    await globalState.update(SETUP_KEY, setup);
    await globalState.update("simpleExperiment.tunnelGatewayConfig", tunnel);
    await globalState.update(exports.RENAMED_EXTENSION_STATE_MIGRATION_KEY, exports.RENAMED_EXTENSION_STATE_MIGRATION_VERSION);
    return { migrated: true, source: exports.LEGACY_EXTENSION_ID, workerCount: setup.workerTunnels.length };
}
