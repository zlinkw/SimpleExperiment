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
exports.sharedConnectionProfile = sharedConnectionProfile;
exports.flushSharedConnections = flushSharedConnections;
exports.readProjectConnectionValue = readProjectConnectionValue;
exports.saveProjectConnectionValues = saveProjectConnectionValues;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const STORAGE_KEY = "simpleExperiment.sharedConnections.v1";
const SETUP_KEY = "simpleExperiment.xshellRealtimeTunnelConfig";
const CONNECTION_KEYS = [SETUP_KEY, "simpleExperiment.tunnelGatewayConfig", "simpleExperiment.setupConfigurationSignature"];
const migrations = new WeakMap();
const pendingWrites = new WeakMap();
const empty = { schemaVersion: 1, values: {} };
function identity(root) {
    if (!root)
        return "";
    const normalized = path.resolve(root).replace(/\\/g, "/");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
/** Shared server settings, including parent directories. Queues, results, derived project directories and AI grants stay local. */
function sharedConnectionProfile(context, root) {
    const saved = context.globalState.get(STORAGE_KEY);
    if (saved !== undefined) {
        if (saved?.schemaVersion !== 1 || !saved.values || typeof saved.values !== "object" || Array.isArray(saved.values))
            throw new Error("SHARED_CONNECTION_CONFIG_INVALID：全局连接配置格式无效。");
        return saved;
    }
    const migrating = migrations.get(context);
    if (migrating)
        return migrating;
    const owner = identity(root);
    // This existing key is used only to migrate the old per-project format.
    const old = owner && context.workspaceState.get("simpleExperiment.projectConnections.v1." + (0, node_crypto_1.createHash)("sha256").update(owner).digest("hex"));
    if (old && (old.schemaVersion !== 1 || old.root !== owner || !old.values || typeof old.values !== "object"))
        throw new Error("PROJECT_CONNECTION_OWNER_MISMATCH：旧项目连接归属不匹配，未导入。");
    const legacyGlobal = Object.fromEntries(CONNECTION_KEYS.map(key => [key, context.globalState.get(key)]));
    const source = old?.values[SETUP_KEY]?.workerTunnels?.length ? old.values : legacyGlobal[SETUP_KEY] ? legacyGlobal : undefined;
    // Opening an unconfigured project first must not hide the configured project's servers.
    if (!source)
        return empty;
    const profile = { schemaVersion: 1, values: Object.fromEntries(CONNECTION_KEYS.filter(key => Object.hasOwn(source, key)).map(key => [key, structuredClone(source[key])])) };
    migrations.set(context, profile);
    const pending = Promise.resolve().then(() => context.globalState.update(STORAGE_KEY, profile));
    pendingWrites.set(context, pending);
    void pending.catch(() => undefined); // Activation and explicit saves await the same failure.
    return profile;
}
async function flushSharedConnections(context, root) {
    sharedConnectionProfile(context, root);
    await pendingWrites.get(context);
}
/** Existing entry names remain available; storage is now shared across projects. */
function readProjectConnectionValue(context, root, key) {
    return sharedConnectionProfile(context, root).values[key];
}
async function saveProjectConnectionValues(context, root, values) {
    sharedConnectionProfile(context, root);
    const changed = structuredClone(values);
    const pending = (pendingWrites.get(context) || Promise.resolve()).then(async () => {
        const current = sharedConnectionProfile(context, root);
        await context.globalState.update(STORAGE_KEY, { schemaVersion: 1, values: { ...current.values, ...changed } });
    });
    pendingWrites.set(context, pending);
    await pending;
}
