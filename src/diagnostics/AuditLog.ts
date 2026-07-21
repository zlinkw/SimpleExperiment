import * as fs from "fs/promises";
import * as path from "path";

export interface AuditRecord {
  schemaVersion: 1;
  opId: string;
  type: string;
  startedAt: string;
  finishedAt?: string;
  status: "started" | "succeeded" | "failed" | "cancelled";
  targetServers: string[];
  targetKeys?: string[];
  userAction: boolean;
  summary: string;
  error?: string;
}

export function createAuditRecord(input: Omit<AuditRecord, "schemaVersion" | "startedAt" | "status"> & Partial<Pick<AuditRecord, "startedAt" | "status">>): AuditRecord {
  return {
    schemaVersion: 1,
    startedAt: input.startedAt || new Date().toISOString(),
    status: input.status || "started",
    ...input,
  };
}

export function finishAuditRecord(record: AuditRecord, status: AuditRecord["status"], error?: string): AuditRecord {
  return { ...record, status, error, finishedAt: new Date().toISOString() };
}

export async function appendAuditRecord(file: string, record: AuditRecord): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, `${JSON.stringify(sanitizeAuditRecord(record))}\n`, "utf8");
}

export function sanitizeAuditRecord(record: AuditRecord): AuditRecord {
  const secretPattern = /(passphrase|password|token|private[-_ ]?key)\s*[:=]\s*[^;\s]+/ig;
  return {
    ...record,
    summary: record.summary.replace(secretPattern, "$1=<redacted>"),
    error: record.error?.replace(secretPattern, "$1=<redacted>"),
  };
}

