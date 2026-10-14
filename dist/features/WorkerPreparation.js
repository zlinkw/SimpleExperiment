"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPreparation = void 0;
/** One submission's live preparation. Never persisted or used as remote task state. */
class WorkerPreparation {
    ready = new Set();
    settled = false;
    error;
    resolveFirst;
    rejectFirst;
    firstReady = new Promise((resolve, reject) => { this.resolveFirst = resolve; this.rejectFirst = reject; });
    finished;
    constructor(work, onReady = () => { }) {
        this.firstReady.catch(() => { });
        this.finished = Promise.resolve().then(() => work(id => {
            if (this.ready.has(id))
                return;
            this.ready.add(id);
            this.resolveFirst(id);
            onReady(id);
        })).then(() => { }, error => { this.error = error instanceof Error ? error : new Error(String(error)); }).then(() => {
            this.settled = true;
            if (!this.ready.size)
                this.rejectFirst(this.error || new Error("没有 Worker 完成运行准备。"));
        });
    }
    first() { return this.firstReady; }
    async all() { await this.finished; if (this.error)
        throw this.error; }
}
exports.WorkerPreparation = WorkerPreparation;
