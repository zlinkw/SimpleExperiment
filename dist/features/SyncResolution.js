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
exports.safeSyncPath = safeSyncPath;
exports.isSyncHeld = isSyncHeld;
exports.chosenSyncHash = chosenSyncHash;
exports.filterHeldFiles = filterHeldFiles;
exports.syncHoldsStoragePath = syncHoldsStoragePath;
exports.loadSyncHolds = loadSyncHolds;
exports.saveSyncHolds = saveSyncHolds;
exports.localDeleteScript = localDeleteScript;
exports.deleteLocalSyncPath = deleteLocalSyncPath;
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
function safeSyncPath(relative) {
    const value = String(relative || "").replace(/\\/g, "/");
    if (!value || value.startsWith("/") || /^[a-z]:/i.test(value) || value.split("/").some((part) => !part || part === "." || part === ".."))
        throw new Error(`同步路径不安全：${relative}`);
    return value;
}
function isSyncHeld(relative, holds) {
    return Object.entries(holds).some(([held, row]) => row.status !== "resolved" && (relative === held || row.directory && relative.startsWith(`${held}/`)));
}
function chosenSyncHash(relative, holds) {
    const exact = holds[relative];
    if (exact?.status === "resolved" && !exact.directory)
        return exact.sha256;
    for (const [held, row] of Object.entries(holds))
        if (row.status === "resolved" && row.directory && relative.startsWith(`${held}/`))
            return row.fileHashes?.[relative];
    return undefined;
}
function filterHeldFiles(files, holds) {
    return Object.fromEntries(Object.entries(files).filter(([relative]) => !isSyncHeld(relative, holds)));
}
function syncHoldsStoragePath(storageRoot, projectRoot) {
    const resolved = path.resolve(projectRoot);
    const id = crypto.createHash("sha256").update(process.platform === "win32" ? resolved.toLowerCase() : resolved).digest("hex");
    return path.join(storageRoot, "sync-holds", `${id}.json`);
}
async function loadSyncHolds(storageRoot, projectRoot) {
    const file = syncHoldsStoragePath(storageRoot, projectRoot);
    const content = await fs.readFile(file, "utf8").catch((error) => {
        if (error.code === "ENOENT")
            return "{}";
        throw error;
    });
    const value = JSON.parse(content);
    if (!value || typeof value !== "object" || Array.isArray(value))
        throw new Error("同步暂停记录格式无效。");
    for (const [relative, row] of Object.entries(value)) {
        safeSyncPath(relative);
        if (!row || typeof row !== "object" || typeof row.endpointId !== "string")
            throw new Error("同步暂停记录条目无效。");
        const item = row;
        if (item.status === "resolved" && (item.directory ? !item.fileHashes || typeof item.fileHashes !== "object" : !/^[a-f0-9]{64}$/i.test(item.sha256 || "")))
            throw new Error("同步保留版本记录无效。");
        for (const [file, hash] of Object.entries(item.fileHashes || {}))
            if (!safeSyncPath(file) || !/^[a-f0-9]{64}$/i.test(hash))
                throw new Error("同步保留目录记录无效。");
    }
    return value;
}
async function saveSyncHolds(storageRoot, projectRoot, holds) {
    const file = syncHoldsStoragePath(storageRoot, projectRoot);
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
    await fs.writeFile(temporary, JSON.stringify(holds, null, 2) + "\n", "utf8");
    await fs.rename(temporary, file);
}
function psLiteral(value) { return `'${value.replace(/'/g, "''")}'`; }
function localDeleteScript(root, relative) {
    safeSyncPath(relative);
    const full = path.resolve(root, ...relative.split("/"));
    const parent = path.dirname(full);
    const leaf = `.\\${path.basename(full)}`;
    if (path.relative(root, full).startsWith("..") || full === path.resolve(root))
        throw new Error("删除目标超出项目根目录。");
    return `$ErrorActionPreference = 'Stop'; try { Set-Location -LiteralPath ${psLiteral(parent)}; if ((Get-Location).ProviderPath -ne ${psLiteral(parent)}) { throw 'PARENT_CD_FAILED' } } catch { [Console]::Error.WriteLine('PARENT_CD_FAILED'); exit 75 }; Remove-Item -LiteralPath ${psLiteral(leaf)} -Recurse -Force -ErrorAction Stop`;
}
async function deleteLocalSyncPath(root, relative) {
    safeSyncPath(relative);
    const full = path.resolve(root, ...relative.split("/"));
    const rootReal = await fs.realpath(root);
    const parentReal = await fs.realpath(path.dirname(full)).catch(() => { throw new Error(`PARENT_CD_FAILED：无法进入父目录 ${path.dirname(full)}；禁止删除。`); });
    const within = path.relative(rootReal, parentReal);
    if (within === ".." || within.startsWith(`..${path.sep}`) || path.isAbsolute(within))
        throw new Error("删除目标超出项目根目录。");
    const target = await fs.lstat(full);
    if (target.isSymbolicLink())
        throw new Error("禁止删除符号链接。");
    try {
        await (0, node_util_1.promisify)(node_child_process_1.execFile)("pwsh.exe", ["-NoProfile", "-NonInteractive", "-Command", localDeleteScript(rootReal, relative)], { windowsHide: true, timeout: 30000 });
    }
    catch (error) {
        if (String(error).includes("PARENT_CD_FAILED"))
            throw new Error(`PARENT_CD_FAILED：无法进入父目录 ${parentReal}；禁止删除。`);
        throw error;
    }
    return full;
}
