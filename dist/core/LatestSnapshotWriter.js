"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LatestSnapshotWriter = void 0;
/** One active write plus one replaceable latest snapshot; no per-event queue. */
class LatestSnapshotWriter {
    write;
    pending;
    active;
    constructor(write) {
        this.write = write;
    }
    enqueue(value) {
        this.pending = { value };
        if (!this.active) {
            this.active = Promise.resolve().then(async () => {
                let failed = false, firstError;
                try {
                    while (this.pending) {
                        const next = this.pending;
                        this.pending = undefined;
                        try {
                            await this.write(next.value);
                        }
                        catch (error) {
                            // Do not replay the failed write or discard a newer queued snapshot.
                            if (!failed)
                                firstError = error;
                            failed = true;
                        }
                    }
                    if (failed)
                        throw firstError;
                }
                finally {
                    this.active = undefined;
                }
            });
        }
        return this.active;
    }
    get pendingCount() { return this.pending ? 1 : 0; }
}
exports.LatestSnapshotWriter = LatestSnapshotWriter;
