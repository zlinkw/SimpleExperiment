/**
 * src/features/GpuSampleRing.ts - Bounded host-side GPU sample ring (item 85 minimal channel).
 *
 * Stores only samples the Worker already measured and carried on the shared
 * execution-inventory responses. Every entry keeps the Worker's own seq, boot
 * epoch and collected time; the host never re-timestamps or interpolates.
 * Duplicated seq, out-of-order seq, wrong source and foreign workers are
 * rejected; an Agent restart (epoch switch) starts a fresh run instead of
 * splicing across generations. Window viewing is clipped locally from these
 * stored points, so switching windows sends no repeated history requests, and
 * coarse server-side buckets are never disguised as fine frames.
 */
export interface GpuRingSample {
    seq: number;
    epoch: string;
    collectedAt: number;
    workerId: string;
    source: string;
    gpus: unknown[];
}

export function gpuRingSampleFromCarried(workerId: string, carried: unknown): GpuRingSample | undefined {
    const item = carried && typeof carried === "object" ? carried as Record<string, unknown> : undefined;
    if (!item || item.source !== "worker_telemetry") return undefined;
    const seq = Number(item.seq);
    const epoch = String(item.epoch || "");
    const collectedAt = Date.parse(String(item.generatedAt || ""));
    if (!Number.isSafeInteger(seq) || seq <= 0 || !epoch || !Number.isFinite(collectedAt)) return undefined;
    const gpus = Array.isArray(item.gpus) ? item.gpus : Array.isArray(item.gpu) ? item.gpu : undefined;
    if (!gpus) return undefined;
    return { seq, epoch, collectedAt, workerId: String(workerId || ""), source: "worker_telemetry", gpus };
}

export class GpuSampleRing {
    private readonly runs = new Map<string, { epoch: string; token: unknown; lastSeq: number; latestAt: number; samples: GpuRingSample[] }>();
    constructor(private readonly capacity = 900) { }
    push(workerId: string, carried: unknown, origin: { token?: unknown } = {}): boolean {
        const sample = gpuRingSampleFromCarried(workerId, carried);
        if (!sample || !sample.workerId) return false;
        let run = this.runs.get(sample.workerId);
        if (!run) { run = { epoch: sample.epoch, token: origin.token, lastSeq: 0, latestAt: 0, samples: [] }; this.runs.set(sample.workerId, run); }
        if (run.epoch !== sample.epoch) {
            // Another agent generation (or another client/root origin) delivered this frame.
            // A different generation is promoted only by its own measured collected time
            // against the newest stored frame, never by comparing epoch strings or the
            // monotonic clock, which resets inside containers and after machine reboots.
            // A late old-epoch frame stays rejected instead of wiping the current
            // history, while a genuine restart (whose real wall time is newer) is
            // accepted even when the monotonic clock restarted from zero.
            if (sample.collectedAt < run.latestAt) return false;
            run.epoch = sample.epoch; run.token = origin.token; run.lastSeq = 0; run.samples = [];
        }
        // Within one generation the Worker's own seq is the dedup and ordering authority;
        // the origin token records request attribution so a replaced client's replayed
        // frames cannot re-enter below the live seq, while a reconnect on the same live
        // agent continues by seq.
        if (sample.seq <= run.lastSeq) return false;
        run.lastSeq = sample.seq;
        if (sample.collectedAt > run.latestAt) run.latestAt = sample.collectedAt;
        run.samples.push(sample);
        if (run.samples.length > this.capacity) run.samples.splice(0, run.samples.length - this.capacity);
        return true;
    }
    // Local window clipping only: returned frames are stored Worker measurements
    // inside [start, end]; nothing between them is synthesized.
    slice(workerId: string, window: { start: number; end: number; maxPoints?: number } = { start: 0, end: Number.MAX_SAFE_INTEGER }): GpuRingSample[] {
        const run = this.runs.get(String(workerId || ""));
        if (!run) return [];
        const inWindow = run.samples.filter(sample => sample.collectedAt >= window.start && sample.collectedAt <= window.end);
        const maxPoints = Number.isSafeInteger(window.maxPoints) && Number(window.maxPoints) > 0 ? Number(window.maxPoints) : inWindow.length;
        if (inWindow.length <= maxPoints) return inWindow.slice();
        const stride = inWindow.length / maxPoints;
        const thinned: GpuRingSample[] = [];
        for (let index = 0; index < maxPoints; index++) thinned.push(inWindow[Math.floor(index * stride)]);
        if (thinned[thinned.length - 1] !== inWindow[inWindow.length - 1]) thinned[thinned.length - 1] = inWindow[inWindow.length - 1];
        return thinned;
    }
    size(workerId: string): number { return this.runs.get(String(workerId || ""))?.samples.length || 0; }
    latest(workerId: string): GpuRingSample | undefined {
        const run = this.runs.get(String(workerId || ""));
        return run && run.samples.length ? run.samples[run.samples.length - 1] : undefined;
    }
}
