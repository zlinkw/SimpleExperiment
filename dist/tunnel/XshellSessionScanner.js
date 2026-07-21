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
exports.defaultXshellSessionDirs = defaultXshellSessionDirs;
exports.scanXshellSessions = scanXshellSessions;
exports.readXshellSessionFile = readXshellSessionFile;
exports.parseXshellSessionContent = parseXshellSessionContent;
exports.preferredZlkForward = preferredZlkForward;
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
function defaultXshellSessionDirs(home = os.homedir()) {
    const roots = unique([
        home,
        process.env.USERPROFILE || "",
        process.env.HOME || "",
        process.env.HOMEDRIVE && process.env.HOMEPATH ? path.join(process.env.HOMEDRIVE, process.env.HOMEPATH) : "",
    ]);
    const documentRoots = unique([
        ...roots.map((root) => path.join(root, "Documents")),
        ...roots.map((root) => path.join(root, "OneDrive", "Documents")),
        process.env.OneDrive ? path.join(process.env.OneDrive, "Documents") : "",
        process.env.OneDriveCommercial ? path.join(process.env.OneDriveCommercial, "Documents") : "",
        process.env.OneDriveConsumer ? path.join(process.env.OneDriveConsumer, "Documents") : "",
    ]);
    return unique(documentRoots.flatMap((documents) => [
        path.join(documents, "NetSarang Computer", "8", "Xshell", "Sessions"),
        path.join(documents, "NetSarang Computer", "7", "Xshell", "Sessions"),
    ]));
}
const defaultScanOptions = {
    maxDirectories: 800,
    maxFiles: 2000,
    maxDepth: 12,
    maxFileBytes: 512 * 1024,
    ignoredDirectoryNames: [
        ".git",
        ".hg",
        ".svn",
        ".vscode",
        "__pycache__",
        "node_modules",
        ".venv",
        "venv",
        "env",
        ".conda",
        "datasets",
        "data",
        "weights",
        "checkpoints",
        "outputs",
        "work_dirs",
        "runs",
        "logs",
        "dist",
        "build",
    ],
};
async function scanXshellSessions(dirs = defaultXshellSessionDirs(), options = {}) {
    const limits = normalizeScanOptions(options);
    const existingDirs = [];
    const sessions = [];
    const seenDirs = new Set();
    const seenFiles = new Set();
    const budget = {
        directoryCount: 0,
        fileCount: 0,
        skippedDirectoryCount: 0,
        limited: false,
    };
    for (const dir of unique(dirs)) {
        if (budget.limited)
            break;
        const dirKey = await pathKey(dir).catch(() => normalizePathKey(dir));
        if (seenDirs.has(dirKey))
            continue;
        if (!(await isDirectory(dir)))
            continue;
        seenDirs.add(dirKey);
        existingDirs.push(dir);
        for (const filePath of await walkXshFiles(dir, limits, budget)) {
            const fileKey = await pathKey(filePath).catch(() => normalizePathKey(filePath));
            if (seenFiles.has(fileKey))
                continue;
            seenFiles.add(fileKey);
            const info = await readXshellSessionFile(filePath, dir).catch(() => undefined);
            if (info)
                sessions.push(info);
        }
    }
    return {
        searchedDirs: unique(dirs),
        existingDirs,
        sessions: sessions.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
        limited: budget.limited || undefined,
        scannedDirectoryCount: budget.directoryCount,
        scannedFileCount: budget.fileCount,
        skippedDirectoryCount: budget.skippedDirectoryCount || undefined,
        warning: budget.limited ? "Xshell 会话扫描已达到安全预算，请缩小扫描目录或手动选择 .xsh 会话。" : undefined,
    };
}
async function readXshellSessionFile(filePath, rootDir) {
    const buffer = await fs.readFile(filePath);
    return parseXshellSessionContent(buffer, filePath, rootDir);
}
function parseXshellSessionContent(input, filePath, rootDir) {
    const text = typeof input === "string" ? input : decodeXshellText(input);
    const values = parseIniValues(text);
    const forwards = parseForwards(values);
    const name = path.basename(filePath, path.extname(filePath));
    return {
        name,
        filePath,
        relativePath: rootDir ? path.relative(rootDir, filePath) : undefined,
        host: stringValue(values.Host),
        userName: stringValue(values.UserName),
        port: numberValue(values.Port),
        remoteCommand: stringValue(values.RemoteCommand),
        forwards,
    };
}
function preferredZlkForward(session) {
    if (!session)
        return undefined;
    return session.forwards.find((item) => item.remotePort === 18765)
        || session.forwards.find((item) => item.localPort >= 18765 && item.localPort <= 18999)
        || session.forwards[0];
}
function decodeXshellText(buffer) {
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe)
        return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    if (buffer.includes(0))
        return buffer.toString("utf16le").replace(/^\uFEFF/, "");
    return buffer.toString("utf8").replace(/^\uFEFF/, "");
}
function parseIniValues(text) {
    const out = {};
    for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("[") || trimmed.startsWith(";"))
            continue;
        const index = trimmed.indexOf("=");
        if (index <= 0)
            continue;
        out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
    }
    return out;
}
function parseForwards(values) {
    const groups = new Map();
    for (const [key, value] of Object.entries(values)) {
        const match = /^FwdReq_(\d+)_(.+)$/.exec(key);
        if (!match)
            continue;
        const index = Number(match[1]);
        const group = groups.get(index) || {};
        group[match[2]] = value;
        groups.set(index, group);
    }
    const forwards = [];
    for (const [index, group] of groups) {
        const localPort = numberValue(group.Port);
        const remotePort = numberValue(group.HostPort);
        if (!localPort || !remotePort)
            continue;
        forwards.push({
            index,
            localHost: group.Source || "127.0.0.1",
            localPort,
            remoteHost: group.Host || "127.0.0.1",
            remotePort,
        });
    }
    return forwards.sort((a, b) => a.index - b.index);
}
async function walkXshFiles(dir, options, budget, depth = 0) {
    const out = [];
    if (budget.limited)
        return out;
    if (depth > options.maxDepth) {
        budget.skippedDirectoryCount += 1;
        budget.limited = true;
        return out;
    }
    budget.directoryCount += 1;
    if (budget.directoryCount > options.maxDirectories) {
        budget.limited = true;
        return out;
    }
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
        if (budget.limited)
            break;
        const full = path.join(dir, item.name);
        if (item.isDirectory()) {
            if (options.ignoredDirectoryNames.has(item.name.toLowerCase())) {
                budget.skippedDirectoryCount += 1;
                continue;
            }
            out.push(...await walkXshFiles(full, options, budget, depth + 1));
        }
        else if (item.isFile() && item.name.toLowerCase().endsWith(".xsh")) {
            budget.fileCount += 1;
            if (budget.fileCount > options.maxFiles) {
                budget.limited = true;
                break;
            }
            const stats = await fs.stat(full).catch(() => undefined);
            if (stats && stats.size > options.maxFileBytes)
                continue;
            out.push(full);
        }
    }
    return out;
}
function normalizeScanOptions(options) {
    const ignored = options.ignoredDirectoryNames?.length ? options.ignoredDirectoryNames : defaultScanOptions.ignoredDirectoryNames;
    return {
        maxDirectories: numberValue(options.maxDirectories) || defaultScanOptions.maxDirectories,
        maxFiles: numberValue(options.maxFiles) || defaultScanOptions.maxFiles,
        maxDepth: numberValue(options.maxDepth) || defaultScanOptions.maxDepth,
        maxFileBytes: numberValue(options.maxFileBytes) || defaultScanOptions.maxFileBytes,
        ignoredDirectoryNames: new Set(ignored.map((item) => item.toLowerCase())),
    };
}
async function isDirectory(dir) {
    try {
        return (await fs.stat(dir)).isDirectory();
    }
    catch {
        return false;
    }
}
async function pathKey(filePath) {
    return normalizePathKey(await fs.realpath(filePath));
}
function normalizePathKey(filePath) {
    const resolved = path.resolve(filePath);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}
function numberValue(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : undefined;
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function unique(values) {
    return [...new Set(values.filter(Boolean))];
}
