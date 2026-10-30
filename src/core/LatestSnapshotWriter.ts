/** One active write plus one replaceable latest snapshot; no per-event queue. */
export class LatestSnapshotWriter<T> {
  private pending?: { value: T };
  private active?: Promise<void>;

  constructor(private readonly write: (value: T) => Promise<void>) {}

  enqueue(value: T): Promise<void> {
    this.pending = { value };
    if (!this.active) {
      this.active = Promise.resolve().then(async () => {
        let failed = false, firstError: unknown;
        try {
          while (this.pending) {
            const next = this.pending;
            this.pending = undefined;
            try { await this.write(next.value); }
            catch (error) {
              // Do not replay the failed write or discard a newer queued snapshot.
              if (!failed) firstError = error;
              failed = true;
            }
          }
          if (failed) throw firstError;
        } finally { this.active = undefined; }
      });
    }
    return this.active;
  }

  get pendingCount(): number { return this.pending ? 1 : 0; }
}
