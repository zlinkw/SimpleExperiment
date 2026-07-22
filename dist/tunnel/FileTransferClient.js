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
exports.FileTransferClient = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const TunnelGateway_1 = require("./TunnelGateway");
const FileTransferTypes_1 = require("./FileTransferTypes");
const FileTransferVerifier_1 = require("./FileTransferVerifier");
class FileTransferClient {
    config;
    budget;
    onProgress;
    transfers = new Map();
    constructor(config, budget, onProgress = () => undefined) {
        this.config = config;
        this.budget = budget;
        this.onProgress = onProgress;
    }
    async list(remotePath) {
        this.assertSafe(remotePath);
        const result = await this.requestJson(`/api/files/list?path=${encodeURIComponent(remotePath)}`, "GET");
        return { schemaVersion: 1, path: result.path || remotePath, entries: result.entries || [] };
    }
    async stat(remotePath) {
        this.assertSafe(remotePath);
        const result = await this.requestJson(`/api/files/stat?path=${encodeURIComponent(remotePath)}`, "GET");
        return { ...result, schemaVersion: 1, path: result.path || remotePath, exists: Boolean(result.exists) };
    }
    async download(remotePath, localPath, options = {}) {
        this.assertSafe(remotePath);
        const transferId = (0, FileTransferTypes_1.makeTransferId)("download");
        const task = this.task(transferId, "download", remotePath, localPath);
        const abort = new AbortController();
        const record = { task, abort, expectedSha256: options.expectedSha256 };
        record.retry = () => this.download(remotePath, localPath, options);
        this.transfers.set(transferId, record);
        return this.withRetries(options.maxRetries ?? 0, async () => this.runDownload(record, options));
    }
    downloadFile(remotePath, localPath, options = {}) {
        return this.download(remotePath, localPath, options);
    }
    async downloadRange(remotePath, localPath, start, end, options = {}) {
        this.assertSafe(remotePath);
        const transferId = (0, FileTransferTypes_1.makeTransferId)("range");
        const task = this.task(transferId, "download", remotePath, localPath);
        const abort = new AbortController();
        const record = { task, abort, expectedSha256: options.expectedSha256 };
        this.transfers.set(transferId, record);
        return this.withRetries(options.maxRetries ?? 0, async () => this.runDownload(record, options, Math.max(0, start), end));
    }
    async upload(localPath, remotePath, options = {}) {
        this.assertSafe(remotePath);
        const transferId = (0, FileTransferTypes_1.makeTransferId)("upload");
        const task = this.task(transferId, "upload", remotePath, localPath);
        const abort = new AbortController();
        const record = { task, abort, expectedSha256: options.sha256 };
        record.retry = () => this.upload(localPath, remotePath, options);
        this.transfers.set(transferId, record);
        return this.withRetries(options.maxRetries ?? 0, async () => this.runUpload(record, options));
    }
    uploadFile(localPath, remotePath, options = {}) {
        return this.upload(localPath, remotePath, options);
    }
    async cancel(transferId) {
        const record = this.transfers.get(transferId);
        if (!record)
            return;
        record.abort.abort();
        record.task.status = "cancelled";
        record.task.error = "TRANSFER_CANCELLED";
    }
    async retry(transferId) {
        const record = this.transfers.get(transferId);
        if (!record?.retry)
            throw new Error("Transfer cannot be retried.");
        return record.retry();
    }
    async verify(transferId) {
        const record = this.transfers.get(transferId);
        if (!record)
            return { transferId, ok: false, message: "Unknown transfer." };
        if (!record.task.localPath)
            return { transferId, ok: false, message: "No local file for verification." };
        return (0, FileTransferVerifier_1.verifyLocalFileSha256)(transferId, record.task.localPath, record.expectedSha256 || record.actualSha256);
    }
    async runDownload(record, options, rangeStart = 0, rangeEnd) {
        const task = record.task;
        task.status = "running";
        const tmpPath = `${task.localPath}.tmp.${task.transferId}`;
        let start = rangeStart;
        if (options.resume && rangeStart === 0) {
            start = await existingSize(tmpPath);
        }
        const query = new URLSearchParams({ path: task.remotePath });
        const maxBytes = Number(options.maxBytes || 0);
        if (Number.isFinite(maxBytes) && maxBytes > 0)
            query.set("maxBytes", String(Math.trunc(maxBytes)));
        let apiPath = "/api/files/download";
        if (start > 0 || rangeEnd !== undefined) {
            apiPath = "/api/files/download-range";
            query.set("start", String(start));
            if (rangeEnd !== undefined)
                query.set("end", String(rangeEnd));
        }
        try {
            const response = await this.budget.run("file_transfer", () => fetch(`${(0, TunnelGateway_1.localBaseUrl)(this.config)}${apiPath}?${query.toString()}`, {
                headers: this.headers(),
                signal: record.abort.signal,
            }), { userInitiated: true });
            if (!response.ok)
                throw new Error(`download failed: HTTP ${response.status} ${await response.text()}`);
            const contentLength = Number(response.headers.get("content-length") || 0) || undefined;
            if (contentLength && Number.isFinite(maxBytes) && maxBytes > 0 && contentLength > maxBytes) {
                throw new Error(`remote file exceeds download limit: ${contentLength} > ${Math.trunc(maxBytes)} bytes`);
            }
            const expected = options.expectedSha256 || response.headers.get("x-zlk-file-sha256") || undefined;
            record.expectedSha256 = expected;
            if (contentLength && options.confirmLargeFile && !(await options.confirmLargeFile(contentLength))) {
                throw new Error("TRANSFER_CANCELLED");
            }
            const transferred = await this.writeDownloadWithProgress(response, tmpPath, task.transferId, contentLength, start > 0);
            task.transferredBytes = start + transferred;
            task.size = contentLength ? start + contentLength : undefined;
            const verify = await (0, FileTransferVerifier_1.verifyLocalFileSha256)(task.transferId, tmpPath, expected);
            record.actualSha256 = verify.actualSha256;
            if (!verify.ok)
                throw new Error("SHA256_MISMATCH");
            await fs.mkdir(path.dirname(task.localPath || "."), { recursive: true });
            await fs.rename(tmpPath, task.localPath || tmpPath);
            task.status = "completed";
            task.finishedAt = new Date().toISOString();
            return task;
        }
        catch (error) {
            task.status = record.abort.signal.aborted ? "cancelled" : "failed";
            task.error = error instanceof Error ? error.message : String(error);
            if (!options.resume)
                await fs.rm(tmpPath, { force: true }).catch(() => undefined);
            throw error;
        }
    }
    async runUpload(record, options) {
        const task = record.task;
        task.status = "running";
        try {
            const stat = await fs.stat(task.localPath || "");
            task.size = stat.size;
            const expectedSha256 = options.sha256 || await (0, FileTransferVerifier_1.sha256File)(task.localPath || "");
            record.expectedSha256 = expectedSha256;
            const init = await this.requestJson("/api/files/upload-init", "POST", {
                schemaVersion: 1,
                remotePath: task.remotePath,
                size: stat.size,
                sha256: expectedSha256,
                overwrite: options.overwrite || "if_same_size",
            }, record.abort.signal);
            if (init.accepted === false)
                throw new Error("upload rejected");
            const oldTransferId = task.transferId;
            const transferId = init.transferId || task.transferId;
            task.transferId = transferId;
            this.transfers.delete(oldTransferId);
            this.transfers.set(transferId, record);
            let offset = Math.max(0, Number(init.resumeFromByte || 0));
            const chunkSize = Math.max(1, Math.min(init.chunkSize || this.config.chunkSizeBytes || 1024 * 1024, this.config.chunkSizeBytes || Number.MAX_SAFE_INTEGER));
            const file = await fs.open(task.localPath || "", "r");
            const startedAt = task.startedAt;
            try {
                while (offset < stat.size) {
                    if (record.abort.signal.aborted)
                        throw new Error("TRANSFER_CANCELLED");
                    const size = Math.min(chunkSize, stat.size - offset);
                    const buffer = Buffer.allocUnsafe(size);
                    const read = await file.read(buffer, 0, size, offset);
                    const body = buffer.subarray(0, read.bytesRead);
                    const query = new URLSearchParams({ transferId, offset: String(offset) });
                    const result = await this.requestJson(`/api/files/upload-chunk?${query.toString()}`, "POST", body, record.abort.signal, "application/octet-stream");
                    offset = Number(result.nextOffset ?? (offset + body.byteLength));
                    task.transferredBytes = offset;
                    this.onProgress(this.progress(transferId, offset, stat.size, startedAt));
                }
            }
            finally {
                await file.close();
            }
            const complete = await this.requestJson("/api/files/upload-complete", "POST", { schemaVersion: 1, transferId, sha256: expectedSha256 }, record.abort.signal);
            record.actualSha256 = complete.sha256;
            if (complete.sha256 && complete.sha256.toLowerCase() !== expectedSha256.toLowerCase())
                throw new Error("SHA256_MISMATCH");
            task.status = "completed";
            task.transferredBytes = stat.size;
            task.finishedAt = new Date().toISOString();
            return task;
        }
        catch (error) {
            task.status = record.abort.signal.aborted ? "cancelled" : "failed";
            task.error = error instanceof Error ? error.message : String(error);
            throw error;
        }
    }
    async requestJson(apiPath, method, body, signal, contentType = "application/json") {
        return this.budget.run("file_transfer", async () => {
            const response = await fetch(`${(0, TunnelGateway_1.localBaseUrl)(this.config)}${apiPath}`, {
                method,
                headers: this.headers(body !== undefined, contentType),
                body: body === undefined ? undefined : (contentType === "application/json" ? JSON.stringify(body) : body),
                signal,
            });
            const text = await response.text();
            if (!response.ok)
                throw new Error(`file API ${response.status}: ${text.slice(0, 200)}`);
            return text.trim() ? JSON.parse(text) : {};
        }, { userInitiated: true });
    }
    headers(hasBody = false, contentType = "application/json") {
        const headers = { Accept: "application/json" };
        if (hasBody)
            headers["Content-Type"] = contentType;
        if (this.config.token)
            headers["X-ZLK-Agent-Token"] = this.config.token;
        return headers;
    }
    async writeDownloadWithProgress(response, localPath, transferId, totalBytes, append = false) {
        await fs.mkdir(path.dirname(localPath), { recursive: true });
        const file = await fs.open(localPath, append ? "a" : "w");
        let transferredBytes = 0;
        const startedAt = new Date().toISOString();
        try {
            if (!response.body) {
                const bytes = new Uint8Array(await response.arrayBuffer());
                await file.write(bytes);
                this.onProgress(this.progress(transferId, bytes.byteLength, totalBytes, startedAt));
                return bytes.byteLength;
            }
            const reader = response.body.getReader();
            while (true) {
                if (this.transfers.get(transferId)?.abort.signal.aborted)
                    throw new Error("TRANSFER_CANCELLED");
                const chunk = await reader.read();
                if (chunk.done)
                    break;
                if (!chunk.value?.byteLength)
                    continue;
                await file.write(chunk.value);
                transferredBytes += chunk.value.byteLength;
                this.onProgress(this.progress(transferId, transferredBytes, totalBytes, startedAt));
            }
            return transferredBytes;
        }
        finally {
            await file.close();
        }
    }
    async withRetries(maxRetries, run) {
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            try {
                return await run();
            }
            catch (error) {
                lastError = error;
                if (String(error instanceof Error ? error.message : error) === "TRANSFER_CANCELLED")
                    break;
            }
        }
        throw lastError;
    }
    progress(transferId, transferredBytes, totalBytes, startedAt) {
        const start = startedAt ? Date.parse(startedAt) : Date.now();
        const elapsedSeconds = Math.max(0.001, (Date.now() - start) / 1000);
        const speedBytesPerSecond = transferredBytes / elapsedSeconds;
        const etaSeconds = totalBytes && speedBytesPerSecond > 0 ? Math.max(0, (totalBytes - transferredBytes) / speedBytesPerSecond) : undefined;
        return { transferId, transferredBytes, totalBytes, speedBytesPerSecond, etaSeconds };
    }
    task(transferId, direction, remotePath, localPath) {
        return { transferId, direction, remotePath, localPath, transferredBytes: 0, status: "queued", startedAt: new Date().toISOString() };
    }
    assertSafe(remotePath) {
        if (!(0, FileTransferTypes_1.isSafeRemotePath)(remotePath))
            throw new Error("SAFE_PATH_REJECTED");
    }
}
exports.FileTransferClient = FileTransferClient;
async function existingSize(file) {
    try {
        return (await fs.stat(file)).size;
    }
    catch {
        return 0;
    }
}
