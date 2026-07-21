import * as fs from "fs/promises";
import * as path from "path";
import { RequestBudget } from "./RequestBudget";
import { localBaseUrl } from "./TunnelGateway";
import {
  DownloadOptions,
  FileListResponse,
  FileStatResponse,
  FileTransferProgressEvent,
  FileTransferTask,
  FileTransferVerifyResult,
  isSafeRemotePath,
  makeTransferId,
  UploadOptions,
} from "./FileTransferTypes";
import { sha256File, verifyLocalFileSha256 } from "./FileTransferVerifier";

export interface FileTransferClientConfig {
  localHost: "127.0.0.1";
  localPort: number;
  token?: string;
  chunkSizeBytes?: number;
}

type TransferRecord = {
  task: FileTransferTask;
  abort: AbortController;
  expectedSha256?: string;
  actualSha256?: string;
  retry?: () => Promise<FileTransferTask>;
};

export class FileTransferClient {
  private readonly transfers = new Map<string, TransferRecord>();

  constructor(
    private readonly config: FileTransferClientConfig,
    private readonly budget: RequestBudget,
    private readonly onProgress: (event: FileTransferProgressEvent) => void = () => undefined,
  ) {}

  async list(remotePath: string): Promise<FileListResponse> {
    this.assertSafe(remotePath);
    const result = await this.requestJson<FileListResponse>(`/api/files/list?path=${encodeURIComponent(remotePath)}`, "GET");
    return { schemaVersion: 1, path: result.path || remotePath, entries: result.entries || [] };
  }

  async stat(remotePath: string): Promise<FileStatResponse> {
    this.assertSafe(remotePath);
    const result = await this.requestJson<FileStatResponse>(`/api/files/stat?path=${encodeURIComponent(remotePath)}`, "GET");
    return { schemaVersion: 1, path: result.path || remotePath, exists: Boolean(result.exists), ...result };
  }

  async download(remotePath: string, localPath: string, options: DownloadOptions = {}): Promise<FileTransferTask> {
    this.assertSafe(remotePath);
    const transferId = makeTransferId("download");
    const task = this.task(transferId, "download", remotePath, localPath);
    const abort = new AbortController();
    const record: TransferRecord = { task, abort, expectedSha256: options.expectedSha256 };
    record.retry = () => this.download(remotePath, localPath, options);
    this.transfers.set(transferId, record);
    return this.withRetries(options.maxRetries ?? 0, async () => this.runDownload(record, options));
  }

  downloadFile(remotePath: string, localPath: string, options: DownloadOptions = {}): Promise<FileTransferTask> {
    return this.download(remotePath, localPath, options);
  }

  async downloadRange(remotePath: string, localPath: string, start: number, end?: number, options: DownloadOptions = {}): Promise<FileTransferTask> {
    this.assertSafe(remotePath);
    const transferId = makeTransferId("range");
    const task = this.task(transferId, "download", remotePath, localPath);
    const abort = new AbortController();
    const record: TransferRecord = { task, abort, expectedSha256: options.expectedSha256 };
    this.transfers.set(transferId, record);
    return this.withRetries(options.maxRetries ?? 0, async () => this.runDownload(record, options, Math.max(0, start), end));
  }

  async upload(localPath: string, remotePath: string, options: UploadOptions = {}): Promise<FileTransferTask> {
    this.assertSafe(remotePath);
    const transferId = makeTransferId("upload");
    const task = this.task(transferId, "upload", remotePath, localPath);
    const abort = new AbortController();
    const record: TransferRecord = { task, abort, expectedSha256: options.sha256 };
    record.retry = () => this.upload(localPath, remotePath, options);
    this.transfers.set(transferId, record);
    return this.withRetries(options.maxRetries ?? 0, async () => this.runUpload(record, options));
  }

  uploadFile(localPath: string, remotePath: string, options: UploadOptions = {}): Promise<FileTransferTask> {
    return this.upload(localPath, remotePath, options);
  }

  async cancel(transferId: string): Promise<void> {
    const record = this.transfers.get(transferId);
    if (!record) return;
    record.abort.abort();
    record.task.status = "cancelled";
    record.task.error = "TRANSFER_CANCELLED";
  }

  async retry(transferId: string): Promise<FileTransferTask> {
    const record = this.transfers.get(transferId);
    if (!record?.retry) throw new Error("Transfer cannot be retried.");
    return record.retry();
  }

  async verify(transferId: string): Promise<FileTransferVerifyResult> {
    const record = this.transfers.get(transferId);
    if (!record) return { transferId, ok: false, message: "Unknown transfer." };
    if (!record.task.localPath) return { transferId, ok: false, message: "No local file for verification." };
    return verifyLocalFileSha256(transferId, record.task.localPath, record.expectedSha256 || record.actualSha256);
  }

  private async runDownload(record: TransferRecord, options: DownloadOptions, rangeStart = 0, rangeEnd?: number): Promise<FileTransferTask> {
    const task = record.task;
    task.status = "running";
    const tmpPath = `${task.localPath}.tmp.${task.transferId}`;
    let start = rangeStart;
    if (options.resume && rangeStart === 0) {
      start = await existingSize(tmpPath);
    }
    const query = new URLSearchParams({ path: task.remotePath });
    let apiPath = "/api/files/download";
    if (start > 0 || rangeEnd !== undefined) {
      apiPath = "/api/files/download-range";
      query.set("start", String(start));
      if (rangeEnd !== undefined) query.set("end", String(rangeEnd));
    }

    try {
      const response = await this.budget.run("file_transfer", () => fetch(`${localBaseUrl(this.config)}${apiPath}?${query.toString()}`, {
        headers: this.headers(),
        signal: record.abort.signal,
      }), { userInitiated: true });
      if (!response.ok) throw new Error(`download failed: ${response.status} ${await response.text()}`);
      const contentLength = Number(response.headers.get("content-length") || 0) || undefined;
      const expected = options.expectedSha256 || response.headers.get("x-zlk-file-sha256") || undefined;
      record.expectedSha256 = expected;
      if (contentLength && options.confirmLargeFile && !(await options.confirmLargeFile(contentLength))) {
        throw new Error("TRANSFER_CANCELLED");
      }
      const transferred = await this.writeDownloadWithProgress(response, tmpPath, task.transferId, contentLength, start > 0);
      task.transferredBytes = start + transferred;
      task.size = contentLength ? start + contentLength : undefined;
      const verify = await verifyLocalFileSha256(task.transferId, tmpPath, expected);
      record.actualSha256 = verify.actualSha256;
      if (!verify.ok) throw new Error("SHA256_MISMATCH");
      await fs.mkdir(path.dirname(task.localPath || "."), { recursive: true });
      await fs.rename(tmpPath, task.localPath || tmpPath);
      task.status = "completed";
      task.finishedAt = new Date().toISOString();
      return task;
    } catch (error) {
      task.status = record.abort.signal.aborted ? "cancelled" : "failed";
      task.error = error instanceof Error ? error.message : String(error);
      if (!options.resume) await fs.rm(tmpPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private async runUpload(record: TransferRecord, options: UploadOptions): Promise<FileTransferTask> {
    const task = record.task;
    task.status = "running";
    try {
      const stat = await fs.stat(task.localPath || "");
      task.size = stat.size;
      const expectedSha256 = options.sha256 || await sha256File(task.localPath || "");
      record.expectedSha256 = expectedSha256;
      const init = await this.requestJson<{ transferId: string; chunkSize?: number; accepted?: boolean; resumeFromByte?: number }>(
        "/api/files/upload-init",
        "POST",
        {
          schemaVersion: 1,
          remotePath: task.remotePath,
          size: stat.size,
          sha256: expectedSha256,
          overwrite: options.overwrite || "if_same_size",
        },
        record.abort.signal,
      );
      if (init.accepted === false) throw new Error("upload rejected");
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
          if (record.abort.signal.aborted) throw new Error("TRANSFER_CANCELLED");
          const size = Math.min(chunkSize, stat.size - offset);
          const buffer = Buffer.allocUnsafe(size);
          const read = await file.read(buffer, 0, size, offset);
          const body = buffer.subarray(0, read.bytesRead);
          const query = new URLSearchParams({ transferId, offset: String(offset) });
          const result = await this.requestJson<{ receivedBytes?: number; nextOffset?: number }>(
            `/api/files/upload-chunk?${query.toString()}`,
            "POST",
            body,
            record.abort.signal,
            "application/octet-stream",
          );
          offset = Number(result.nextOffset ?? (offset + body.byteLength));
          task.transferredBytes = offset;
          this.onProgress(this.progress(transferId, offset, stat.size, startedAt));
        }
      } finally {
        await file.close();
      }
      const complete = await this.requestJson<{ status?: string; sha256?: string }>(
        "/api/files/upload-complete",
        "POST",
        { schemaVersion: 1, transferId, sha256: expectedSha256 },
        record.abort.signal,
      );
      record.actualSha256 = complete.sha256;
      if (complete.sha256 && complete.sha256.toLowerCase() !== expectedSha256.toLowerCase()) throw new Error("SHA256_MISMATCH");
      task.status = "completed";
      task.transferredBytes = stat.size;
      task.finishedAt = new Date().toISOString();
      return task;
    } catch (error) {
      task.status = record.abort.signal.aborted ? "cancelled" : "failed";
      task.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async requestJson<T>(
    apiPath: string,
    method: "GET" | "POST",
    body?: unknown,
    signal?: AbortSignal,
    contentType = "application/json",
  ): Promise<T> {
    return this.budget.run("file_transfer", async () => {
      const response = await fetch(`${localBaseUrl(this.config)}${apiPath}`, {
        method,
        headers: this.headers(body !== undefined, contentType),
        body: body === undefined ? undefined : (contentType === "application/json" ? JSON.stringify(body) : body as BodyInit),
        signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`file API ${response.status}: ${text.slice(0, 200)}`);
      return text.trim() ? JSON.parse(text) as T : {} as T;
    }, { userInitiated: true });
  }

  private headers(hasBody = false, contentType = "application/json"): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (hasBody) headers["Content-Type"] = contentType;
    if (this.config.token) headers["X-ZLK-Agent-Token"] = this.config.token;
    return headers;
  }

  private async writeDownloadWithProgress(
    response: Response,
    localPath: string,
    transferId: string,
    totalBytes?: number,
    append = false,
  ): Promise<number> {
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
        if (this.transfers.get(transferId)?.abort.signal.aborted) throw new Error("TRANSFER_CANCELLED");
        const chunk = await reader.read();
        if (chunk.done) break;
        if (!chunk.value?.byteLength) continue;
        await file.write(chunk.value);
        transferredBytes += chunk.value.byteLength;
        this.onProgress(this.progress(transferId, transferredBytes, totalBytes, startedAt));
      }
      return transferredBytes;
    } finally {
      await file.close();
    }
  }

  private async withRetries<T>(maxRetries: number, run: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        return await run();
      } catch (error) {
        lastError = error;
        if (String(error instanceof Error ? error.message : error) === "TRANSFER_CANCELLED") break;
      }
    }
    throw lastError;
  }

  private progress(
    transferId: string,
    transferredBytes: number,
    totalBytes?: number,
    startedAt?: string,
  ): FileTransferProgressEvent {
    const start = startedAt ? Date.parse(startedAt) : Date.now();
    const elapsedSeconds = Math.max(0.001, (Date.now() - start) / 1000);
    const speedBytesPerSecond = transferredBytes / elapsedSeconds;
    const etaSeconds = totalBytes && speedBytesPerSecond > 0 ? Math.max(0, (totalBytes - transferredBytes) / speedBytesPerSecond) : undefined;
    return { transferId, transferredBytes, totalBytes, speedBytesPerSecond, etaSeconds };
  }

  private task(transferId: string, direction: "download" | "upload", remotePath: string, localPath?: string): FileTransferTask {
    return { transferId, direction, remotePath, localPath, transferredBytes: 0, status: "queued", startedAt: new Date().toISOString() };
  }

  private assertSafe(remotePath: string): void {
    if (!isSafeRemotePath(remotePath)) throw new Error("SAFE_PATH_REJECTED");
  }
}

async function existingSize(file: string): Promise<number> {
  try {
    return (await fs.stat(file)).size;
  } catch {
    return 0;
  }
}