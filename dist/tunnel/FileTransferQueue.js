"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileTransferQueue = void 0;
class FileTransferQueue {
    maxConcurrent;
    running = 0;
    queue = [];
    tasks = new Map();
    constructor(maxConcurrent = 1) {
        this.maxConcurrent = maxConcurrent;
    }
    enqueue(factory, seed) {
        this.tasks.set(seed.transferId, seed);
        return new Promise((resolve, reject) => {
            const run = async () => {
                this.running += 1;
                try {
                    seed.status = "running";
                    const task = await factory();
                    this.tasks.set(task.transferId, task);
                    resolve(task);
                }
                catch (error) {
                    seed.status = "failed";
                    seed.error = error instanceof Error ? error.message : String(error);
                    reject(error);
                }
                finally {
                    this.running = Math.max(0, this.running - 1);
                    this.next();
                }
            };
            this.queue.push(run);
            this.next();
        });
    }
    list() {
        return [...this.tasks.values()];
    }
    next() {
        while (this.running < this.maxConcurrent && this.queue.length) {
            const run = this.queue.shift();
            if (run)
                void run();
        }
    }
}
exports.FileTransferQueue = FileTransferQueue;
