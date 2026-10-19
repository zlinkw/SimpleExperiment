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
            run = { epoch: sample.epoch, token: origin.token, lastSeq: 0, latestAt: 0, samples: [] };
            this.runs.set(sample.workerId, run);
        }
        if (run.epoch !== sample.epoch) {
            // Another agent generation (or another client/root origin) delivered this frame.
            // A different generation is promoted only by its own measured collected time
            // against the newest stored frame, never by comparing epoch strings or the
            // monotonic clock, which resets inside containers and after machine reboots.
            // A late old-epoch frame stays rejected instead of wiping the current
            // history, while a genuine restart (whose real wall time is newer) is
            // accepted even when the monotonic clock restarted from zero.
            if (sample.collectedAt < run.latestAt)
                return false;
            run.epoch = sample.epoch;
            run.token = origin.token;
            run.lastSeq = 0;
            run.samples = [];
        }
        // Within one generation the Worker's own seq is the dedup and ordering authority;
        // the origin token records request attribution so a replaced client's replayed
        // frames cannot re-enter below the live seq, while a reconnect on the same live
        // agent continues by seq.
        if (sample.seq <= run.lastSeq)
            return false;
        run.lastSeq = sample.seq;
        if (sample.collectedAt > run.latestAt)
            run.latestAt = sample.collectedAt;
        run.samples.push(sample);
        if (run.samples.length > this.capacity)
            run.samples.splice(0, run.samples.length - this.capacity);
        return true;
    }
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
