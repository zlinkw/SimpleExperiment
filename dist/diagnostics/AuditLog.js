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
exports.createAuditRecord = createAuditRecord;
exports.finishAuditRecord = finishAuditRecord;
exports.appendAuditRecord = appendAuditRecord;
exports.sanitizeAuditRecord = sanitizeAuditRecord;
const fs = __importStar(require("fs/promises"));
const fsNode = __importStar(require("node:fs"));
const path = __importStar(require("path"));
const StateStore_1 = require("../state/StateStore");
const AUDIT_LOG_MAX_BYTES = 256 * 1024;
const AUDIT_LOG_MAX_RECORD_BYTES = 8 * 1024;
const AUDIT_LOG_WRITE_QUEUES = new Map();
function createAuditRecord(input) {
    return {
        schemaVersion: 1,
        startedAt: input.startedAt || new Date().toISOString(),
        status: input.status || "started",
        ...input,
    };
}
function finishAuditRecord(record, status, error) {
    return { ...record, status, error, finishedAt: new Date().toISOString() };
}
async function appendAuditRecord(file, record) {
    const target = path.resolve(file);
    const key = process.platform === "win32" ? target.toLowerCase() : target;
    const previous = AUDIT_LOG_WRITE_QUEUES.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(async () => {
        await fs.mkdir(path.dirname(target), { recursive: true });
        const nextRecord = JSON.stringify(sanitizeAuditRecord(record));
        const recordBytes = Buffer.from(`${nextRecord}\n`, "utf8");
        if (recordBytes.length > AUDIT_LOG_MAX_RECORD_BYTES)
            throw new Error("审计记录超过单条字节上限。");
        let existing = Buffer.alloc(0);
        try {
            const before = await fs.lstat(target);
            if (!before.isFile() || before.isSymbolicLink() || before.nlink > 1)
                throw new Error("审计日志不是独占普通文件，保留现状并停止写入。");
            const handle = await fs.open(target, fsNode.constants.O_RDONLY | (fsNode.constants.O_NOFOLLOW || 0));
            try {
                const opened = await handle.stat();
                if (!opened.isFile() || opened.nlink > 1 || opened.dev !== before.dev || opened.ino !== before.ino
                    || opened.size !== before.size || opened.mtimeMs !== before.mtimeMs)
                    throw new Error("审计日志在读取前发生变化。");
                const length = Math.min(opened.size, AUDIT_LOG_MAX_BYTES);
                existing = Buffer.alloc(length);
                let offset = 0;
                const position = opened.size - length;
                while (offset < length) {
                    const read = await handle.read(existing, offset, length - offset, position + offset);
                    if (!read.bytesRead)
                        throw new Error("审计日志尾部未完整读取。");
                    offset += read.bytesRead;
                }
                const after = await handle.stat();
                const currentPath = await fs.lstat(target);
                if (after.dev !== opened.dev || after.ino !== opened.ino || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs
                    || currentPath.isSymbolicLink() || !currentPath.isFile() || currentPath.nlink > 1
                    || currentPath.dev !== opened.dev || currentPath.ino !== opened.ino || currentPath.size !== opened.size || currentPath.mtimeMs !== opened.mtimeMs)
                    throw new Error("审计日志在读取期间发生变化。");
                if (position > 0) {
                    const newline = existing.indexOf(0x0a);
                    existing = newline >= 0 ? existing.subarray(newline + 1) : Buffer.alloc(0);
                }
            }
            finally {
                await handle.close();
            }
        }
        catch (error) {
            if (error?.code !== "ENOENT")
                throw error;
        }
        let combined = Buffer.concat([existing, recordBytes]);
        if (combined.length > AUDIT_LOG_MAX_BYTES) {
            const start = combined.length - AUDIT_LOG_MAX_BYTES;
            const newline = combined.indexOf(0x0a, start);
            combined = newline >= 0 ? combined.subarray(newline + 1) : combined.subarray(start);
        }
        await (0, StateStore_1.atomicWriteText)(target, combined.toString("utf8"));
    });
    AUDIT_LOG_WRITE_QUEUES.set(key, current);
    try {
        await current;
    }
    finally {
        if (AUDIT_LOG_WRITE_QUEUES.get(key) === current)
            AUDIT_LOG_WRITE_QUEUES.delete(key);
    }
}
function sanitizeAuditRecord(record) {
    const secretPattern = /(passphrase|password|token|private[-_ ]?key)\s*[:=]\s*[^;\s]+/ig;
    return {
        schemaVersion: 1,
        opId: String(record.opId || "").slice(0, 180),
        type: String(record.type || "").slice(0, 120),
        startedAt: String(record.startedAt || "").slice(0, 40),
        ...(record.finishedAt ? { finishedAt: String(record.finishedAt).slice(0, 40) } : {}),
        status: ["started", "succeeded", "failed", "cancelled"].includes(record.status) ? record.status : "failed",
        targetServers: (Array.isArray(record.targetServers) ? record.targetServers : []).slice(0, 32).map((value) => String(value || "").slice(0, 120)),
        ...(record.targetKeys ? { targetKeys: record.targetKeys.slice(0, 64).map((value) => String(value || "").slice(0, 240)) } : {}),
        userAction: record.userAction === true,
        summary: String(record.summary || "").replace(secretPattern, "$1=<redacted>").slice(0, 1600),
        ...(record.error ? { error: String(record.error).replace(secretPattern, "$1=<redacted>").slice(0, 2800) } : {}),
    };
}
