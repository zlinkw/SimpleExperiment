"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GpuSampleRing = void 0;
exports.gpuRingSampleFromCarried = gpuRingSampleFromCarried;
function gpuRingSampleFromCarried(workerId, carried) {
    const item = carried && typeof carried === "object" ? carried : undefined;
    if (!item || item.source !== "worker_telemetry")
        return undefined;
    const seq = Number(item.seq);
    const epoch = String(item.epoch || "");
    const collectedAt = Date.parse(String(item.generatedAt || ""));
    if (!Number.isSafeInteger(seq) || seq <= 0 || !epoch || !Number.isFinite(collectedAt))
        return undefined;
    const gpus = Array.isArray(item.gpus) ? item.gpus : Array.isArray(item.gpu) ? item.gpu : undefined;
    if (!gpus)
        return undefined;
    return { seq, epoch, collectedAt, workerId: String(workerId || ""), source: "worker_telemetry", gpus };
}
class GpuSampleRing {
    capacity;
    runs = new Map();
    constructor(capacity = 900) {
        this.capacity = capacity;
    }
    push(workerId, carried, origin = {}) {
        const sample = gpuRingSampleFromCarried(workerId, carried);
        if (!sample || !sample.workerId)
            return false;
        let run = this.runs.get(sample.workerId);
        if (!run) {
            run = { epoch: sample.epoch, source: origin.source, lastSeq: 0, retired: [], samples: [] };
            this.runs.set(sample.workerId, run);
        }
        if (run.epoch !== sample.epoch) {
            // Generations are accepted or refused by request attribution, never by
            // comparing timestamps or ordering epoch strings: the monotonic clock and
            // wall clock both move in real deployments. The Host verified the frame
            // belongs to the still-current request/root/client BEFORE pushing here,
            // so a different epoch reaching the ring is the current generation's own
            // restart and is accepted even when the wall clock rolled backwards.
            // Every epoch a run has left behind is retired for this Worker: a late
            // frame of a retired epoch is refused no matter how high its seq or how
            // late its collected time, so it can never clear the newer history.
            if (run.retired.includes(sample.epoch))
                return false;
            run.retired.push(run.epoch);
            if (run.retired.length > GpuSampleRing.retiredEpochLimit)
                run.retired.splice(0, run.retired.length - GpuSampleRing.retiredEpochLimit);
            run.epoch = sample.epoch;
            run.source = origin.source;
            run.lastSeq = 0;
            run.samples = [];
        }
        else if (origin.source !== undefined) {
            // A reconnect on the same live Agent keeps one epoch; attribution follows
            // the current request and the Worker's own seq continues the run.
            run.source = origin.source;
        }
        // Within one generation the Worker's own seq is the dedup and ordering authority.
        if (sample.seq <= run.lastSeq)
            return false;
        run.lastSeq = sample.seq;
        run.samples.push(sample);
        if (run.samples.length > this.capacity)
            run.samples.splice(0, run.samples.length - this.capacity);
        return true;
    }
    // Bounded: at most this many retired epochs are remembered per Worker.
    static retiredEpochLimit = 8;
    // Local window clipping only: returned frames are stored Worker measurements
    // inside [start, end]; nothing between them is synthesized.
    slice(workerId, window = { start: 0, end: Number.MAX_SAFE_INTEGER }) {
        const run = this.runs.get(String(workerId || ""));
        if (!run)
            return [];
        const inWindow = run.samples.filter(sample => sample.collectedAt >= window.start && sample.collectedAt <= window.end);
        const maxPoints = Number.isSafeInteger(window.maxPoints) && Number(window.maxPoints) > 0 ? Number(window.maxPoints) : inWindow.length;
        if (inWindow.length <= maxPoints)
            return inWindow.slice();
        const stride = inWindow.length / maxPoints;
        const thinned = [];
        for (let index = 0; index < maxPoints; index++)
            thinned.push(inWindow[Math.floor(index * stride)]);
        if (thinned[thinned.length - 1] !== inWindow[inWindow.length - 1])
            thinned[thinned.length - 1] = inWindow[inWindow.length - 1];
        return thinned;
    }
    size(workerId) { return this.runs.get(String(workerId || ""))?.samples.length || 0; }
    latest(workerId) {
        const run = this.runs.get(String(workerId || ""));
        return run && run.samples.length ? run.samples[run.samples.length - 1] : undefined;
    }
}
exports.GpuSampleRing = GpuSampleRing;
