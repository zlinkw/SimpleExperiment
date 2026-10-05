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
                try {
                    while (this.pending) {
                        const next = this.pending;
                        this.pending = undefined;
                        await this.write(next.value);
                    }
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
