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
exports.localCodeManifestCachePath = localCodeManifestCachePath;
exports.sha256File = sha256File;
exports.hashLocalCodeFiles = hashLocalCodeFiles;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs/promises"));
const fsNode = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_SCHEMA_VERSION = 1;
function bigintString(value) {
    if (typeof value === "bigint")
        return value.toString();
    if (typeof value === "number" && Number.isFinite(value))
        return Number.isSafeInteger(value) ? String(value) : value.toFixed(0);
    return "";
}
function finiteTime(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function identityFromStat(stat) {
    const dev = bigintString(stat.dev);
    const ino = bigintString(stat.ino);
    const mtimeMs = finiteTime(stat.mtimeMs);
    const ctimeMs = finiteTime(stat.ctimeMs);
    const birthtimeMs = finiteTime(stat.birthtimeMs);
    if (!dev || !ino || mtimeMs === undefined || ctimeMs === undefined || birthtimeMs === undefined || !Number.isSafeInteger(stat.size))
        return undefined;
    return { dev, ino, size: stat.size, mtimeMs, ctimeMs, birthtimeMs };
}
function sameIdentity(row, identity) {
    return Boolean(row && identity
        && row.dev === identity.dev
        && row.ino === identity.ino
        && row.size === identity.size
        && row.mtimeMs === identity.mtimeMs
        && row.ctimeMs === identity.ctimeMs
        && row.birthtimeMs === identity.birthtimeMs
        && /^[a-f0-9]{64}$/i.test(String(row.sha256 || "")));
}
function localCodeManifestCachePath(storageRoot, projectRoot) {
    const resolved = path.resolve(projectRoot);
    const id = crypto.createHash("sha256").update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
    return path.join(storageRoot, "code-manifest-cache", `${id}.json`);
}
async function readCache(file) {
    try {
        const parsed = JSON.parse(await fs.readFile(file, "utf8"));
        if (parsed?.schemaVersion === CACHE_SCHEMA_VERSION && parsed.files && typeof parsed.files === "object" && !Array.isArray(parsed.files)) {
            return { schemaVersion: CACHE_SCHEMA_VERSION, files: parsed.files };
        }
    }
    catch {
        // A missing or unreadable cache only forces a full hash; it never changes the manifest.
    }
    return { schemaVersion: CACHE_SCHEMA_VERSION, files: {} };
}
async function writeCache(file, document) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(document), "utf8");
    await fs.rename(temp, file);
}
async function sha256File(file) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        const input = fsNode.createReadStream(file);
        input.on("data", (chunk) => hash.update(chunk));
        input.on("error", reject);
        input.on("end", () => resolve(hash.digest("hex")));
    });
}
async function hashLocalCodeFiles(root, files, cacheFile, onProgress) {
    const cache = cacheFile ? await readCache(cacheFile) : { schemaVersion: CACHE_SCHEMA_VERSION, files: {} };
    const manifest = {};
    const nextFiles = {};
    const stats = { listed: files.length, reused: 0, hashed: 0, pruned: 0 };
    const concurrency = 12;
    let nextIndex = 0;
    let completed = 0;
    const progressEvery = Math.max(25, Math.ceil(files.length / 20));
    async function worker() {
        while (true) {
            const index = nextIndex++;
            if (index >= files.length)
                break;
            const relative = files[index].replace(/\\/g, "/");
            const full = path.join(root, relative);
            const stat = await fs.stat(full);
            const identity = identityFromStat(stat);
            const cached = cache.files[relative];
            if (sameIdentity(cached, identity)) {
                manifest[relative] = { size: stat.size, sha256: cached.sha256.toLowerCase() };
                nextFiles[relative] = cached;
                stats.reused++;
            }
            else {
                const before = identityFromStat(await fs.stat(full));
                const sha256 = (await sha256File(full)).toLowerCase();
                const after = identityFromStat(await fs.stat(full));
                if (!before || !after || !sameIdentity({ ...before, sha256: "0".repeat(64) }, after) || before.size !== stat.size) {
                    throw new Error(`本地文件在哈希期间发生变化：${relative}`);
                }
                manifest[relative] = { size: after.size, sha256 };
                nextFiles[relative] = { ...after, sha256 };
                stats.hashed++;
            }
            completed++;
            if (onProgress && (completed === files.length || completed % progressEvery === 0))
                onProgress({ ...stats });
        }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, files.length)) }, () => worker()));
    if (cacheFile) {
        stats.pruned = Object.keys(cache.files).filter((file) => !Object.prototype.hasOwnProperty.call(nextFiles, file)).length;
        try {
            await writeCache(cacheFile, { schemaVersion: CACHE_SCHEMA_VERSION, files: nextFiles });
        }
        catch (error) {
            console.warn(`[SimpleExperiment] local code manifest cache write failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    return { manifest, stats };
}
