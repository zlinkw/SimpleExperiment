"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GpuHistoryStateCache = exports.GPU_HISTORY_TOTAL_POINT_LIMIT = exports.GPU_HISTORY_OVERVIEW_POINTS_PER_SERIES = exports.GPU_HISTORY_MAX_POINTS_PER_SERIES = exports.GPU_HISTORY_MAX_SERIES = exports.GPU_HISTORY_CACHE_TTL_MS = exports.GPU_HISTORY_CACHE_LIMIT = void 0;
exports.normalizeGpuHistoryQuery = normalizeGpuHistoryQuery;
exports.gpuHistoryQueryKey = gpuHistoryQueryKey;
exports.compactGpuHistoryResponse = compactGpuHistoryResponse;
exports.GPU_HISTORY_CACHE_LIMIT = 8;
exports.GPU_HISTORY_CACHE_TTL_MS = 30_000;
exports.GPU_HISTORY_MAX_SERIES = 160;
exports.GPU_HISTORY_MAX_POINTS_PER_SERIES = 288;
exports.GPU_HISTORY_OVERVIEW_POINTS_PER_SERIES = 96;
exports.GPU_HISTORY_TOTAL_POINT_LIMIT = 8_000;
class GpuHistoryStateCache {
    now;
    entries = new Map();
    pending = new Map();
    view = { status: "idle" };
    epoch = 0;
    requestSequence = 0;
    constructor(now = Date.now) {
        this.now = now;
    }
    snapshot() {
        return this.view;
    }
    reset() {
        this.epoch += 1;
        this.requestSequence += 1;
        this.entries.clear();
        this.pending.clear();
        this.view = { status: "idle" };
    }
    async load(input, fetcher, options = {}) {
        const query = normalizeGpuHistoryQuery(input);
        const key = gpuHistoryQueryKey(query);
        const epoch = this.epoch;
        const sequence = ++this.requestSequence;
        const cached = this.entries.get(key);
        if (!options.force && cached && this.now() - cached.fetchedAt <= exports.GPU_HISTORY_CACHE_TTL_MS) {
            this.touchEntry(key, cached);
            this.view = readyView(cached);
            return this.view;
        }
        const previous = this.view;
        this.view = {
            ...previous,
            status: "loading",
            requestedQuery: query,
            pendingKey: key,
            error: undefined,
        };
        let request = this.pending.get(key);
        if (!request) {
            request = fetcher(query).then(compactGpuHistoryResponse);
            this.pending.set(key, request);
            void request.finally(() => {
                if (this.pending.get(key) === request)
                    this.pending.delete(key);
            }).catch(() => undefined);
        }
        try {
            const data = await request;
            if (epoch !== this.epoch)
                return this.view;
            const entry = { query, data, fetchedAt: this.now() };
            this.touchEntry(key, entry);
            if (sequence === this.requestSequence)
                this.view = readyView(entry);
            return this.view;
        }
        catch (error) {
            if (epoch === this.epoch && sequence === this.requestSequence) {
                this.view = {
                    ...previous,
                    status: previous.data ? "stale" : "error",
                    requestedQuery: query,
                    pendingKey: undefined,
                    error: boundedError(error),
                };
            }
            throw error;
        }
    }
    touchEntry(key, entry) {
        this.entries.delete(key);
        this.entries.set(key, entry);
        while (this.entries.size > exports.GPU_HISTORY_CACHE_LIMIT) {
            const oldest = this.entries.keys().next().value;
            if (typeof oldest !== "string")
                break;
            this.entries.delete(oldest);
        }
    }
}
exports.GpuHistoryStateCache = GpuHistoryStateCache;
function normalizeGpuHistoryQuery(input = {}) {
    const serverId = boundedText(input.serverId, 120);
    const gpuId = boundedText(input.gpuId, 120);
    const detailed = Boolean(serverId || gpuId);
    const defaultMax = detailed ? exports.GPU_HISTORY_MAX_POINTS_PER_SERIES : exports.GPU_HISTORY_OVERVIEW_POINTS_PER_SERIES;
    const requested = finiteInteger(input.maxPoints);
    const maxPoints = Math.max(1, Math.min(defaultMax, requested ?? defaultMax));
    let start = normalizedTime(input.start);
    let end = normalizedTime(input.end);
    if (typeof start === "number" && typeof end === "number" && start > end)
        [start, end] = [end, start];
    return dropUndefined({ serverId: serverId || undefined, gpuId: gpuId || undefined, start, end, maxPoints });
}
function gpuHistoryQueryKey(query) {
    const normalized = normalizeGpuHistoryQuery(query);
    return JSON.stringify([normalized.serverId || "", normalized.gpuId || "", normalized.start ?? "", normalized.end ?? "", normalized.maxPoints]);
}
function compactGpuHistoryResponse(value) {
    const source = record(value);
    const rawSeries = Array.isArray(source.series) ? source.series : [];
    const limitedSeries = rawSeries.slice(0, exports.GPU_HISTORY_MAX_SERIES).map(compactSeries).filter((item) => Boolean(item));
    const initialPointCount = limitedSeries.reduce((sum, item) => sum + item.points.length, 0);
    let series = limitedSeries;
    if (initialPointCount > exports.GPU_HISTORY_TOTAL_POINT_LIMIT && series.length) {
        const perSeries = Math.max(2, Math.floor(exports.GPU_HISTORY_TOTAL_POINT_LIMIT / series.length));
        series = series.map((item) => ({ ...item, points: evenlySample(item.points, perSeries) }));
    }
    const totalPointCount = series.reduce((sum, item) => sum + item.points.length, 0);
    const rawPointTotal = series.reduce((sum, item) => sum + item.rawPointCount, 0);
    return {
        schemaVersion: 1,
        bucketSeconds: boundedNumber(source.bucketSeconds, 1, 86_400, 300),
        retentionHours: boundedNumber(source.retentionHours, 1, 24 * 31, 72),
        updatedAt: boundedText(source.updatedAt, 64),
        series,
        seriesOmittedCount: Math.max(0, rawSeries.length - limitedSeries.length),
        pointOmittedCount: Math.max(0, rawPointTotal - totalPointCount),
        totalPointCount,
    };
}
function compactSeries(value) {
    const item = record(value);
    const serverId = boundedText(item.serverId, 120);
    const gpuId = boundedText(item.gpuId, 120);
    if (!serverId || !gpuId)
        return undefined;
    const rawPoints = Array.isArray(item.points) ? item.points : [];
    const byBucket = new Map();
    for (const raw of rawPoints) {
        const point = compactPoint(raw);
        if (point)
            byBucket.set(point.bucketEpoch, point);
    }
    const points = evenlySample([...byBucket.values()].sort((a, b) => a.bucketEpoch - b.bucketEpoch), exports.GPU_HISTORY_MAX_POINTS_PER_SERIES);
    return {
        serverId,
        gpuId,
        rawPointCount: Math.max(points.length, finiteInteger(item.rawPointCount) ?? rawPoints.length),
        points,
    };
}
function compactPoint(value) {
    const item = record(value);
    const bucketEpoch = finiteNumber(item.bucketEpoch);
    if (bucketEpoch === undefined || bucketEpoch < 0)
        return undefined;
    const timestamp = boundedText(item.timestamp, 64) || new Date(bucketEpoch * 1000).toISOString();
    return {
        timestamp,
        bucketEpoch: Math.trunc(bucketEpoch),
        gpuUtilPercent: nullablePercent(item.gpuUtilPercent),
        memoryUsedMb: nullableNonNegative(item.memoryUsedMb),
        memoryTotalMb: nullableNonNegative(item.memoryTotalMb),
        memoryUtilPercent: nullablePercent(item.memoryUtilPercent),
        gapBefore: typeof item.gapBefore === "boolean" ? item.gapBefore : null,
    };
}
function evenlySample(items, limit) {
    if (items.length <= limit)
        return items;
    if (limit <= 1)
        return [items[items.length - 1]];
    const out = [];
    for (let index = 0; index < limit; index += 1) {
        const sourceIndex = Math.round(index * (items.length - 1) / (limit - 1));
        if (out[out.length - 1] !== items[sourceIndex])
            out.push(items[sourceIndex]);
    }
    return out;
}
function readyView(entry) {
    return {
        status: "ready",
        query: entry.query,
        requestedQuery: entry.query,
        data: entry.data,
        fetchedAt: new Date(entry.fetchedAt).toISOString(),
    };
}
function normalizedTime(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    const text = boundedText(value, 64);
    if (!text)
        return undefined;
    const numeric = Number(text);
    return Number.isFinite(numeric) ? numeric : text;
}
function nullablePercent(value) {
    const number = finiteNumber(value);
    return number === undefined ? null : Math.max(0, Math.min(100, number));
}
function nullableNonNegative(value) {
    const number = finiteNumber(value);
    return number === undefined ? null : Math.max(0, number);
}
function finiteInteger(value) {
    const number = finiteNumber(value);
    return number === undefined ? undefined : Math.trunc(number);
}
function finiteNumber(value) {
    const number = typeof value === "number" ? value : Number(value);
    return Number.isFinite(number) ? number : undefined;
}
function boundedNumber(value, min, max, fallback) {
    const number = finiteNumber(value);
    return number === undefined ? fallback : Math.max(min, Math.min(max, number));
}
function boundedText(value, limit) {
    return typeof value === "string" ? value.trim().slice(0, limit) : "";
}
function boundedError(error) {
    return (error instanceof Error ? error.message : String(error || "GPU history query failed")).slice(0, 480);
}
function record(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function dropUndefined(value) {
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
