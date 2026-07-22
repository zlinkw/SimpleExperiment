export type FileTransferDirection = "download" | "upload";
export type FileTransferStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";

export interface FileTransferTask {
  transferId: string;
  direction: FileTransferDirection;
  remotePath: string;
  localPath?: string;
  size?: number;
  transferredBytes: number;
  status: FileTransferStatus;
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export interface FileTransferProgressEvent {
  transferId: string;
  transferredBytes: number;
  totalBytes?: number;
  speedBytesPerSecond?: number;
  etaSeconds?: number;
}

export interface RemoteFileEntry {
  path: string;
  name: string;
  type: "file" | "directory";
  size?: number;
  mtime?: string;
}

export interface FileListResponse {
  schemaVersion: number;
  path: string;
  entries: RemoteFileEntry[];
}

export interface FileStatResponse extends RemoteFileEntry {
  schemaVersion: number;
  path: string;
  exists: boolean;
}

export interface DownloadOptions {
  expectedSha256?: string;
  maxRetries?: number;
  resume?: boolean;
  confirmLargeFile?: (size: number) => Promise<boolean> | boolean;
}

export interface UploadOptions {
  sha256?: string;
  maxRetries?: number;
  overwrite?: "never" | "if_same_size" | "always";
}

export interface FileTransferVerifyResult {
  transferId: string;
  ok: boolean;
  expectedSha256?: string;
  actualSha256?: string;
  message: string;
}

export function isSafeRemotePath(remotePath: string): boolean {
  const normalized = remotePath.replace(/\\/g, "/").trim();
  if (!normalized || normalized.includes("\0")) return false;
  if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized)) return false;
  if (normalized.split("/").some((part) => part === "..")) return false;
  if (normalized.split("/").some((part) => /^(id_rsa|id_ed25519|known_hosts|\.ssh)$/i.test(part) || /\.pem$/i.test(part))) return false;
  return /^(zlk_cluster|work_dirs|experiments|exports|results|paper)(\/|$)/.test(normalized);
}

export function makeTransferId(prefix = "transfer"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
