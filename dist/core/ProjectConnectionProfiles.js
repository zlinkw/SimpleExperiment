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
exports.readProjectConnectionValue = readProjectConnectionValue;
exports.saveProjectConnectionValues = saveProjectConnectionValues;
const node_crypto_1 = require("node:crypto");
const path = __importStar(require("node:path"));
const profiles = new WeakMap();
function identity(root) {
    if (!root)
        return "";
    const normalized = path.resolve(root).replace(/\\/g, "/");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}
function state(context, root) {
    const owner = identity(root);
    if (!owner)
        throw new Error("PROJECT_CONNECTION_REQUIRED：当前窗口没有受支持的项目，不能保存或启用项目连接。");
    const key = "simpleExperiment.projectConnections.v1." + (0, node_crypto_1.createHash)("sha256").update(owner).digest("hex");
    let cached = profiles.get(context);
    if (!cached) {
        cached = new Map();
        profiles.set(context, cached);
    }
    let entry = cached.get(key);
    if (!entry) {
        const saved = context.workspaceState.get(key);
        const legacyOwner = context.workspaceState.get("simpleExperiment.projectConnections.legacyOwner");
        if (saved && (saved.schemaVersion !== 1 || saved.root !== owner || !saved.values || typeof saved.values !== "object"))
            throw new Error("PROJECT_CONNECTION_OWNER_MISMATCH：项目连接归属不匹配，未借用其他项目配置。");
        entry = { profile: saved ? structuredClone(saved) : { schemaVersion: 1, root: owner, values: {} },
            legacy: !saved && (legacyOwner === owner || !legacyOwner && !cached.size) && Boolean(context.workspaceState.get("simpleExperiment.localApiPort")), pending: Promise.resolve() };
        if (!legacyOwner && !cached.size)
            entry.pending = entry.pending.then(() => context.workspaceState.update("simpleExperiment.projectConnections.legacyOwner", owner));
        cached.set(key, entry);
        if (!saved)
            persist(context, key, entry);
    }
    return { key, entry };
}
function persist(context, key, entry) {
    const snapshot = structuredClone(entry.profile);
    entry.pending = entry.pending.then(() => context.workspaceState.update(key, snapshot));
    // Reads can seed a legacy profile synchronously. Explicit saves still await and
    // surface this same rejection; a failed migration never becomes a global write.
    void entry.pending.catch(() => undefined);
    return entry.pending;
}
function readProjectConnectionValue(context, root, key) {
    if (!root)
        return undefined;
    const { key: storageKey, entry } = state(context, root);
    if (!Object.hasOwn(entry.profile.values, key) && entry.legacy) {
        entry.profile.values[key] = structuredClone(context.globalState.get(key));
        persist(context, storageKey, entry);
    }
    return entry.profile.values[key];
}
async function saveProjectConnectionValues(context, root, values) {
    const { key, entry } = state(context, root);
    entry.profile = { ...entry.profile, values: { ...entry.profile.values, ...structuredClone(values) } };
    await persist(context, key, entry);
}
