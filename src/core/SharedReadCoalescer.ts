/** Coalesce identical in-flight reads without retaining settled values. */
export class SharedReadCoalescer {
  private readonly pending = new Map<string, Promise<unknown>>();

  constructor(private readonly maxKeys = 64) {}

  has(key: string): boolean { return this.pending.has(String(key || "").slice(0, 2048)); }

  run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const normalizedKey = String(key || "").slice(0, 2048);
    if (!normalizedKey) return Promise.resolve().then(operation);
    const existing = this.pending.get(normalizedKey);
    if (existing) return existing as Promise<T>;
    if (this.pending.size >= Math.max(1, this.maxKeys)) return Promise.resolve().then(operation);

    const request = Promise.resolve().then(operation);
    this.pending.set(normalizedKey, request);
    const clear = () => {
      if (this.pending.get(normalizedKey) === request) this.pending.delete(normalizedKey);
    };
    void request.then(clear, clear);
    return request;
  }

  get size(): number { return this.pending.size; }
}
