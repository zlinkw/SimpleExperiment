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
exports.REQUIRED_PANEL_BUILD_FILES = exports.PANEL_BUILD_MANIFEST_PATH = void 0;
exports.readPanelBuildIdentity = readPanelBuildIdentity;
exports.freezePanelBuildIdentity = freezePanelBuildIdentity;
exports.classifyPanelBuildIdentity = classifyPanelBuildIdentity;
exports.stablePanelExtensionProbe = stablePanelExtensionProbe;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
exports.PANEL_BUILD_MANIFEST_PATH = "dist/panel-build-manifest.json";
exports.REQUIRED_PANEL_BUILD_FILES = Object.freeze([
    "dist/extension.js",
    "dist/extension/legacy.js",
    "dist/ui/PanelHtml.js",
    "dist/ui/PanelHtml.legacy.js",
    "dist/ui/PanelRecoveryHtml.js",
    "dist/features/PanelBuildIdentity.js",
    "dist/features/PanelLifecycle.js",
    "dist/features/PanelStateDelivery.js",
    "dist/features/PanelStateProgress.js",
]);
function statFile(file, fsApi) {
    try {
        const stat = fsApi.statSync(file);
        return { size: Number(stat.size), mtimeMs: Number(stat.mtimeMs) };
    }
    catch {
        return null;
    }
}
function digest(content) {
    return crypto.createHash("sha256").update(content).digest("hex");
}
function normalizeManifestFiles(value) {
    if (!Array.isArray(value))
        return undefined;
    const files = {};
    for (const item of value) {
        if (!item || typeof item !== "object")
            return undefined;
        const row = item;
        const file = String(row.path || "").replaceAll("\\", "/");
        const hash = String(row.sha256 || "").toLowerCase();
        if (!file || file.startsWith("/") || file.split("/").includes("..") || !/^[a-f0-9]{64}$/.test(hash))
            return undefined;
        files[file] = hash;
    }
    return exports.REQUIRED_PANEL_BUILD_FILES.every((file) => Boolean(files[file])) ? files : undefined;
}
/** Reads the generated runtime closure manifest from disk on each identity probe. */
function readPanelBuildIdentity(extensionPath, previous, versionHint = "", fsApi = fs) {
    const packagePath = path.join(extensionPath, "package.json");
    const manifestPath = path.join(extensionPath, exports.PANEL_BUILD_MANIFEST_PATH);
    const packageStats = statFile(packagePath, fsApi);
    const manifestStats = statFile(manifestPath, fsApi);
    let packageVersion = String(versionHint || "");
    if (!packageVersion) {
        try {
            packageVersion = String(JSON.parse(fsApi.readFileSync(packagePath, "utf8")).version || "");
        }
        catch { }
    }
    let manifestVersion = "";
    let buildId = "";
    let manifestHash = "";
    let files = {};
    let manifestValid = false;
    try {
        const raw = fsApi.readFileSync(manifestPath, "utf8");
        const manifest = JSON.parse(raw);
        const normalizedFiles = normalizeManifestFiles(manifest.files);
        if (Number(manifest.schemaVersion) === 1 && normalizedFiles && /^[a-f0-9]{64}$/i.test(String(manifest.buildId || ""))) {
            manifestVersion = String(manifest.version || "");
            buildId = String(manifest.buildId || "").toLowerCase();
            manifestHash = digest(raw);
            files = normalizedFiles;
            manifestValid = Boolean(manifestVersion && (packageVersion === manifestVersion));
        }
    }
    catch {
        // Incomplete installs remain visible as unknown or content_mismatch instead of throwing during activation.
    }
    const version = packageVersion || manifestVersion;
    return {
        version,
        buildId,
        manifestHash,
        fingerprint: manifestHash,
        files,
        stats: { package: packageStats, manifest: manifestStats },
        exists: Boolean(packageStats && manifestStats && manifestValid),
    };
}
function freezePanelBuildIdentity(identity) {
    Object.freeze(identity.files);
    Object.freeze(identity.stats);
    return Object.freeze(identity);
}
function classifyPanelBuildIdentity(input) {
    const runningVersion = String(input.running.version || "");
    const installedVersion = String(input.registryAvailable ? input.installedVersion || "" : "");
    let registryState = "unknown";
    if (input.registryAvailable) {
        if (runningVersion !== installedVersion)
            registryState = "version_mismatch";
        else if (!input.disk.exists || !input.running.buildId || input.running.buildId !== input.disk.buildId)
            registryState = "content_mismatch";
        else
            registryState = "match";
    }
    else if (input.missingConfirmed && !input.disk.exists) {
        registryState = "extension_missing";
    }
    return {
        registryState,
        reloadRequired: registryState === "version_mismatch" || registryState === "content_mismatch" || registryState === "extension_missing",
        runningVersion,
        installedVersion,
        runningBuildId: input.running.buildId,
        diskBuildId: input.disk.buildId,
        runningManifestHash: input.running.manifestHash,
        diskManifestHash: input.disk.manifestHash,
        runningFingerprint: input.running.fingerprint,
        diskFingerprint: input.disk.fingerprint,
    };
}
async function stablePanelExtensionProbe(options) {
    const first = options.getExtension();
    if (first)
        return { extension: first, missingConfirmed: false, diskIdentity: options.readDiskIdentity() };
    await options.delay(Math.max(0, Number(options.debounceMs ?? 350)));
    const second = options.getExtension();
    const diskIdentity = options.readDiskIdentity();
    return { extension: second, missingConfirmed: !second && !diskIdentity.exists, diskIdentity };
}
