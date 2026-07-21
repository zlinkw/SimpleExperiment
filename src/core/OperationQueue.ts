import { normalizeZlkError, ZlkError } from "./ErrorModel";

export type OperationPriority = "user_blocking" | "manual" | "background" | "realtime";
export type OperationStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "timeout" | "coalesced";

export interface OperationSpec {
  id: string;
  type: string;
  priority: OperationPriority;
  targetServers?: string[];
  targetKeys?: string[];
  cancellable?: boolean;
  exclusiveKeys?: string[];
  timeoutMs?: number;
  coalesceKey?: string;
  run(signal: AbortSignal): Promise<void>;
}

export interface QueuedOperationRecord {
  id: string;
  type: string;
  priority: OperationPriority;
  status: OperationStatus;
  startedAt?: string;
  finishedAt?: string;
  targetServers: string[];
  targetKeys: string[];
  exclusiveKeys: string[];
  error?: ZlkError;
}

const priorityRank: Record<OperationPriority, number> = {
  user_blocking: 0,
  manual: 1,
  background: 2,
  realtime: 3,
};

export class OperationQueue {
  private pending: Array<{ spec: OperationSpec; resolve: () => void; reject: (error: unknown) => void }> = [];
  private running = new Map<string, { spec: OperationSpec; controller: AbortController }>();
  private coalesced = new Map<string, Promise<void>>();
  private records: QueuedOperationRecord[] = [];

  enqueue(spec: OperationSpec): Promise<void> {
    if (spec.coalesceKey) {
      const existing = this.coalesced.get(spec.coalesceKey);
      if (existing) {
        this.record(spec, "coalesced");
        return existing;
      }
    }
    const promise = new Promise<void>((resolve, reject) => {
      this.pending.push({ spec, resolve, reject });
      this.record(spec, "queued");
      this.pump();
    });
    if (spec.coalesceKey) {
      this.coalesced.set(spec.coalesceKey, promise.finally(() => this.coalesced.delete(spec.coalesceKey)));
    }
    return promise;
  }

  cancel(id: string): boolean {
    const running = this.running.get(id);
    if (running && running.spec.cancellable) {
      running.controller.abort();
      this.update(id, "cancelled");
      return true;
    }
    const index = this.pending.findIndex((item) => item.spec.id === id && item.spec.cancellable);
    if (index >= 0) {
      const [item] = this.pending.splice(index, 1);
      item.resolve();
      this.update(id, "cancelled");
      return true;
    }
    return false;
  }

  snapshot(limit = 50): QueuedOperationRecord[] {
    return this.records.slice(-limit);
  }

  activeExclusiveKeys(): Set<string> {
    const keys = new Set<string>();
    for (const item of this.running.values()) {
      for (const key of item.spec.exclusiveKeys || []) keys.add(key);
    }
    return keys;
  }

  private pump(): void {
    this.pending.sort((a, b) => priorityRank[a.spec.priority] - priorityRank[b.spec.priority]);
    for (;;) {
      const index = this.pending.findIndex((item) => this.canRun(item.spec));
      if (index < 0) return;
      const [item] = this.pending.splice(index, 1);
      void this.start(item);
    }
  }

  private canRun(spec: OperationSpec): boolean {
    const keys = spec.exclusiveKeys || [];
    if (!keys.length) return true;
    const active = this.activeExclusiveKeys();
    return !keys.some((key) => active.has(key));
  }

  private async start(item: { spec: OperationSpec; resolve: () => void; reject: (error: unknown) => void }): Promise<void> {
    const controller = new AbortController();
    this.running.set(item.spec.id, { spec: item.spec, controller });
    this.update(item.spec.id, "running", { startedAt: new Date().toISOString() });
    let timer: NodeJS.Timeout | undefined;
    try {
      const timeout = item.spec.timeoutMs
        ? new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error(`operation timeout: ${item.spec.id}`));
          }, item.spec.timeoutMs);
          timer.unref?.();
        })
        : undefined;
      await (timeout ? Promise.race([item.spec.run(controller.signal), timeout]) : item.spec.run(controller.signal));
      this.update(item.spec.id, "succeeded", { finishedAt: new Date().toISOString() });
      item.resolve();
    } catch (error) {
      const status: OperationStatus = controller.signal.aborted ? "timeout" : "failed";
      this.update(item.spec.id, status, { finishedAt: new Date().toISOString(), error: normalizeZlkError(error) });
      item.reject(error);
    } finally {
      if (timer) clearTimeout(timer);
      this.running.delete(item.spec.id);
      this.pump();
    }
  }

  private record(spec: OperationSpec, status: OperationStatus): void {
    this.records.push({
      id: spec.id,
      type: spec.type,
      priority: spec.priority,
      status,
      targetServers: spec.targetServers || [],
      targetKeys: spec.targetKeys || [],
      exclusiveKeys: spec.exclusiveKeys || [],
    });
  }

  private update(id: string, status: OperationStatus, patch: Partial<QueuedOperationRecord> = {}): void {
    const current = [...this.records].reverse().find((item) => item.id === id);
    if (current) Object.assign(current, patch, { status });
  }
}

