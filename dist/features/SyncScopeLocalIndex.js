"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncScopeLocalIndexReader = void 0;
const IncrementalLocalMetadata_1 = require("./IncrementalLocalMetadata");
/** One fresh local scan per page round, shared by directory browsing and summaries. */
class SyncScopeLocalIndexReader {
    root;
    idleMs;
    index;
    request;
    constructor(root, idleMs = 30_000, index) {
        this.root = root;
        this.idleMs = idleMs;
        this.index = index;
    }
    read(round, signal, report) {
        if (this.request?.round === round) {
            if (report)
                this.request.reports.add(report);
            if (this.request.stage)
                report?.(this.request.stage);
            return this.request.promise;
        }
        const request = { round, promise: undefined, reports: new Set(report ? [report] : []), stage: "" };
        this.request = request;
        const controller = new AbortController();
        const cancel = () => controller.abort(signal?.reason);
        signal?.addEventListener("abort", cancel, { once: true });
        if (signal?.aborted)
            cancel();
        let timer;
        const expired = new Promise((_resolve, reject) => {
            const reset = () => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    const error = new Error("本机索引连续无进展，状态未知；请刷新重试。最后进度：" + request.stage);
                    controller.abort(error);
                    reject(error);
                }, this.idleMs);
            };
            request.reports.add(reset);
            reset();
        });
        const load = () => (0, IncrementalLocalMetadata_1.incrementalLocalMetadata)(this.root, this.index ? this.index.file + ".baseline" : undefined).read(controller.signal, stage => {
            if (controller.signal.aborted || this.request !== request)
                return;
            request.stage = stage;
            for (const listener of request.reports)
                listener(stage);
        });
        const scan = (this.index ? this.index.read({ method: "local.metadata", metadataOnly: true, recursive: true, backgroundPersistence: true, round, signal: controller.signal }, load) : load()).then(inventory => {
            controller.signal.throwIfAborted();
            const children = new Map();
            for (const [directory, rows] of [[true, inventory.directories], [false, inventory.files]])
                for (const [relative, facts] of Object.entries(rows)) {
                    if (relative === ".")
                        continue;
                    const parent = relative.includes("/") ? relative.slice(0, relative.lastIndexOf("/")) : ".";
                    const entries = children.get(parent) || [];
                    entries.push({ name: relative.slice(relative.lastIndexOf("/") + 1), path: relative, directory, ...facts });
                    children.set(parent, entries);
                }
            return { ...inventory, children, observedAt: new Date().toISOString() };
        });
        request.promise = Promise.race([scan, expired]).finally(() => {
            clearTimeout(timer);
            signal?.removeEventListener("abort", cancel);
            request.reports.clear();
        });
        return request.promise;
    }
    async list(relative, round, signal) {
        const index = await this.read(round, signal);
        signal?.throwIfAborted();
        const error = Object.entries(index.unverifiedFiles).find(([name]) => name === "." || name === relative || relative.startsWith(name + "/"))?.[1];
        const observation = { status: error ? "unknown" : index.directories[relative] ? "present" : "absent", directory: true, observedAt: index.observedAt, error };
        return Object.assign(index.children.get(relative) || [], { observation });
    }
}
exports.SyncScopeLocalIndexReader = SyncScopeLocalIndexReader;
