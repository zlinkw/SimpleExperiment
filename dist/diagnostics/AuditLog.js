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
const path = __importStar(require("path"));
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
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.appendFile(file, `${JSON.stringify(sanitizeAuditRecord(record))}\n`, "utf8");
}
function sanitizeAuditRecord(record) {
    const secretPattern = /(passphrase|password|token|private[-_ ]?key)\s*[:=]\s*[^;\s]+/ig;
    return {
        ...record,
        summary: record.summary.replace(secretPattern, "$1=<redacted>"),
        error: record.error?.replace(secretPattern, "$1=<redacted>"),
    };
}
