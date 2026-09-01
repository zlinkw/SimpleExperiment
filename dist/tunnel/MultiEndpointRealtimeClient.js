"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiEndpointRealtimeClient = void 0;
exports.createBudget = createBudget;
exports.mergeRealtimeStates = mergeRealtimeStates;
exports.mergeClusterSnapshots = mergeClusterSnapshots;
exports.mergeWorkerResultsSummaries = mergeWorkerResultsSummaries;
const RequestBudget_1 = require("./RequestBudget");
const RealtimeTunnelClient_1 = require("./RealtimeTunnelClient");
const RealtimeEventReducer_1 = require("./RealtimeEventReducer");
const AuthorityMergePolicy_1 = require("./AuthorityMergePolicy");
const WorkerTelemetryApi_1 = require("./WorkerTelemetryApi");
class MultiEndpointRealtimeClient {
    policy;
    onState;
    endpoints;
    endpointById;
    clients = new Map();
    budgets = new Map();
    mergedState = (0, RealtimeEventReducer_1.createRealtimeState)();
    protectedLogKeys = [];
    diagnosticsEndpointSources = [];
    diagnosticsCache;
    constructor(endpoints, budgetFactory, policy = RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.policy = policy;
        this.onState = onState;
        this.endpoints = endpoints.map((endpoint) => ({ ...endpoint }));
        this.endpointById = new Map(this.endpoints.map((endpoint) => [endpoint.id, endpoint]));
        for (const endpoint of this.endpoints) {
            const budget = budgetFactory(endpoint);
            this.budgets.set(endpoint.id, budget);
            this.clients.set(endpoint.id, new RealtimeTunnelClient_1.RealtimeTunnelClient(endpoint, budget, policy, (state) => {
                this.mergedState = mergeRealtimeStates(this.endpointStates(endpoint.id, state), this.endpoints, this.protectedLogKeys, this.endpointById);
                this.onState(this.mergedState);
            }));
        }
    }
    async connect(_sinceSeq) {
        await Promise.allSettled([...this.clients.values()].map((client) => client.connect(client.currentState().lastSeq)));
        this.updateMergedState();
    }
    async disconnect(reason = "manual") {
        await Promise.allSettled([...this.clients.values()].map((client) => client.disconnect(reason)));
        this.updateMergedState();
    }
    async reconnect(reason = "reconnect") {
        await Promise.allSettled([...this.clients.values()].map((client) => client.reconnect(reason)));
        this.updateMergedState();
    }
    async getSnapshot() {
        const entries = await Promise.allSettled(this.endpoints.map(async (endpoint) => {
            const snapshot = await this.clients.get(endpoint.id)?.getSnapshot();
            return snapshot ? { endpoint, snapshot } : undefined;
        }));
        const snapshots = entries
            .filter((entry) => entry.status === "fulfilled")
            .map((entry) => entry.value)
            .filter((entry) => Boolean(entry));
        const snapshot = mergeClusterSnapshots(snapshots);
        this.updateMergedState(snapshot);
        return snapshot;
    }
    async getGpu() {
        const entries = await Promise.allSettled(this.endpoints.map(async (endpoint) => {
            const value = await this.clients.get(endpoint.id)?.getGpu();
            return { endpoint, value };
        }));
        const fulfilled = entries.filter((entry) => entry.status === "fulfilled");
        if (!fulfilled.length) {
            const rejected = entries.find((entry) => entry.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned GPU state.");
        }
        const gpu = fulfilled.reduce((out, entry) => Object.assign(out, apiGpu(entry.value.value, entry.value.endpoint)), {});
        this.mergedState = { ...this.mergedState, gpu, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), gpu } };
        this.onState(this.mergedState);
        return gpu;
    }
    async getGpuHistory(query = {}) {
        const serverId = String(query.serverId || "").trim();
        if (serverId) {
            const target = this.endpointForGpuHistory(serverId);
            if (target) {
                const client = this.clients.get(target.id);
                if (client) {
                    try {
                        return await client.getGpuHistory(query);
                    }
                    catch (error) {
                        if (target.id !== "hub") {
                            const hub = this.clients.get("hub");
                            if (hub) {
                                try {
                                    return await hub.getGpuHistory(query);
                                }
                                catch { }
                            }
                        }
                        throw error;
                    }
                }
            }
            // target 为空时：尝试在 enabled workers 中模糊匹配首个 worker 直连，不再直接 hubClient() 抛 Hub not configured
            const lowerKey = serverId.toLowerCase();
            const enabled = this.endpoints;
            const fuzzyFallback = enabled.find((ep) => {
                if (ep.id === "hub")
                    return false;
                const anyEp = ep;
                const candidates = [
                    ep.id,
                    String(anyEp.workerId || anyEp.worker_id || ""),
                    String(ep.displayName || ""),
                    String(anyEp.sshConfigAlias || ""),
                ].map((s) => String(s || "").trim().toLowerCase()).filter(Boolean);
                return candidates.some((c) => c === lowerKey || c.includes(lowerKey) || lowerKey.includes(c));
            }) || enabled.find((ep) => ep.id !== "hub");
            if (fuzzyFallback) {
                const client = this.clients.get(fuzzyFallback.id);
                if (client) {
                    try {
                        return await client.getGpuHistory(query);
                    }
                    catch (error) {
                        throw error;
                    }
                }
            }
            throw new Error("Worker GPU历史未就绪，请检查隧道");
        }
        return this.getAggregatedGpuHistory(query);
    }
    endpointForGpuHistory(serverId) {
        const key = String(serverId || "").trim();
        if (!key)
            return undefined;
        const lowerKey = key.toLowerCase();
        // case-insensitive 与 workerId 归一：toLowerCase 比较，支持 displayName/sshConfigAlias 匹配
        const byId = this.endpointById.get(key) || this.endpointById.get(lowerKey) || [...this.endpointById.entries()].find(([k]) => String(k).toLowerCase() === lowerKey)?.[1];
        if (byId)
            return byId;
        for (const ep of this.endpoints) {
            const anyEp = ep;
            const workerId = String(anyEp.workerId || anyEp.worker_id || "").trim().toLowerCase();
            if (workerId && workerId === lowerKey)
                return ep;
            const displayName = String(ep.displayName || "").trim().toLowerCase();
            if (displayName && displayName === lowerKey)
                return ep;
            const alias = String(anyEp.sshConfigAlias || "").trim().toLowerCase();
            if (alias && alias === lowerKey)
                return ep;
            const idLower = String(ep.id || "").toLowerCase();
            if (idLower.includes(lowerKey) || lowerKey.includes(idLower))
                return ep;
            if (displayName && (displayName.includes(lowerKey) || lowerKey.includes(displayName)))
                return ep;
            if (alias && (alias.includes(lowerKey) || lowerKey.includes(alias)))
                return ep;
            if (workerId && (workerId.includes(lowerKey) || lowerKey.includes(workerId)))
                return ep;
        }
        return undefined;
    }
    async getAggregatedGpuHistory(query) {
        const enabled = this.endpoints;
        if (!enabled.length)
            throw new Error("No realtime endpoint configured for GPU history.");
        const results = await Promise.allSettled(enabled.map((ep) => this.clients.get(ep.id).getGpuHistory(query)));
        const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
        if (!fulfilled.length) {
            const rejected = results.find((r) => r.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned GPU history.");
        }
        if (fulfilled.length === 1)
            return fulfilled[0];
        return mergeGpuHistoryResponses(fulfilled, query);
    }
    async getScheduler() {
        const entries = await Promise.allSettled([...this.clients.values()].map((client) => client.getScheduler()));
        const fulfilled = entries.filter((entry) => entry.status === "fulfilled");
        if (!fulfilled.length) {
            const rejected = entries.find((entry) => entry.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned scheduler state.");
        }
        const schedulerStates = fulfilled.flatMap((entry) => apiRows(entry.value, "schedulerStates"));
        this.mergedState = { ...this.mergedState, schedulerStates, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), schedulerStates } };
        this.onState(this.mergedState);
        return schedulerStates;
    }
    async getTraces() {
        const entries = await Promise.allSettled([...this.clients.values()].map((client) => client.getTraces()));
        const fulfilled = entries.filter((entry) => entry.status === "fulfilled");
        if (!fulfilled.length) {
            const rejected = entries.find((entry) => entry.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned traces.");
        }
        const experimentTraces = fulfilled.flatMap((entry) => apiRows(entry.value, "experimentTraces"));
        this.mergedState = { ...this.mergedState, experimentTraces, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), experimentTraces } };
        this.onState(this.mergedState);
        return experimentTraces;
    }
    async getResultsSummary(planFile = "") {
        const hub = this.clients.get("hub");
        if (hub)
            return hub.getResultsSummary();
        const workerEndpoints = this.endpoints.filter((endpoint) => endpoint.role === "worker");
        const entries = await Promise.allSettled(workerEndpoints.map(async (endpoint) => ({
            workerId: endpoint.id,
            summary: await this.clients.get(endpoint.id)?.getResultsSummary(),
        })));
        const fulfilled = entries
            .filter((entry) => entry.status === "fulfilled")
            .map((entry) => entry.value);
        if (!fulfilled.length) {
            const rejected = entries.find((entry) => entry.status === "rejected");
            throw rejected?.reason || new Error("No Worker endpoint returned a results summary.");
        }
        const merged = mergeWorkerResultsSummaries(fulfilled, planFile, workerEndpoints.map((endpoint) => endpoint.id));
        if (!Array.isArray(merged.availableWorkerIds) || !merged.availableWorkerIds.length) {
            throw new Error("No Worker endpoint returned a valid results summary for the selected Plan.");
        }
        return merged;
    }
    async getDiagnostics() {
        return this.getAggregatedDiagnostics();
    }
    async getAggregatedDiagnostics() {
        const targets = this.aggregationTargets();
        if (!targets.length)
            throw new Error("No realtime endpoint configured for diagnostics.");
        const results = await Promise.allSettled(targets.map((ep) => this.clients.get(ep.id).getDiagnostics()));
        const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
        if (!fulfilled.length) {
            const rejected = results.find((r) => r.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned diagnostics.");
        }
        if (fulfilled.length === 1)
            return fulfilled[0];
        return this.mergeGenericResponses(fulfilled);
    }
    async getAuditTail() {
        return this.getAggregatedAuditTail();
    }
    async getAggregatedAuditTail() {
        const targets = this.aggregationTargets();
        if (!targets.length)
            throw new Error("No realtime endpoint configured for audit tail.");
        const results = await Promise.allSettled(targets.map((ep) => this.clients.get(ep.id).getAuditTail()));
        const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
        if (!fulfilled.length) {
            const rejected = results.find((r) => r.status === "rejected");
            throw rejected?.reason || new Error("No realtime endpoint returned audit tail.");
        }
        if (fulfilled.length === 1)
            return fulfilled[0];
        return this.mergeGenericResponses(fulfilled);
    }
    async getOperation(operationId) {
        return this.getAggregatedOperation(operationId);
    }
    async getAggregatedOperation(operationId) {
        const id = String(operationId || "").trim();
        if (!id)
            throw new Error("operationId is required.");
        const targets = this.aggregationTargets();
        if (!targets.length)
            throw new Error("No realtime endpoint configured for operation.");
        const results = await Promise.allSettled(targets.map((ep) => this.clients.get(ep.id).getOperation(id)));
        const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
        if (fulfilled.length)
            return fulfilled[0];
        const rejected = results.find((r) => r.status === "rejected");
        throw rejected?.reason || new Error("No realtime endpoint returned operation.");
    }
    async getWorkerOperation(workerId, operationId) {
        const client = this.clients.get(workerId);
        const endpoint = this.endpointById.get(workerId);
        if (!client || endpoint?.role !== "worker") {
            throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
        }
        return client.getOperation(operationId);
    }
    async getRunEvidence(workerId, params) {
        const client = workerId ? this.clients.get(workerId) : this.hubClient();
        const endpoint = workerId ? this.endpointById.get(workerId) : undefined;
        if (!client || (workerId && endpoint?.role !== "worker"))
            throw new Error(`Agent endpoint not configured: ${workerId || "hub"}`);
        return client.getRunEvidence?.(params) ?? Promise.reject(new Error("Agent runtime does not expose run evidence."));
    }
    async getLiveOutput(runKey, since = 0, workerId) {
        const client = workerId ? this.clients.get(workerId) : this.hubClient();
        const endpoint = workerId ? this.endpointById.get(workerId) : undefined;
        if (!client || (workerId && endpoint?.role !== "worker")) {
            throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
        }
        const result = await client.getLiveOutput(runKey, since);
        const record = result && typeof result === "object" ? result : {};
        const text = String(record.text || record.output || record.tail || "");
        const offset = Number(record.offset || 0);
        this.mergedState = {
            ...this.mergedState,
            logs: {
                ...(0, RealtimeEventReducer_1.compactRealtimeLogs)({
                    ...this.mergedState.logs,
                    [runKey]: { text, offset, seq: this.mergedState.lastSeq },
                }, undefined, undefined, this.protectedLogKeys),
            },
        };
        this.onState(this.mergedState);
        return result;
    }
    async postAction(action, body) {
        return this.getAggregatedPostAction(action, body);
    }
    async getAggregatedPostAction(action, body) {
        const isCacheClear = String(action || "").trim().toLowerCase().replace(/[-_]/g, "") === "clearcache";
        const isWorkerAction = isCacheClear || (0, WorkerTelemetryApi_1.isWorkerTelemetryAction)(action) || isWorkerLocalSchedulerRequest(action, body) || isWorkerOwnedResultRequest(action, body);
        if (isWorkerAction) {
            // worker 型 action（含 clearCache/clear-cache 视为 worker 本地操作）聚合到 workers（失败单端忽略），单 worker 时走 worker 端点
            const workers = this.endpoints.filter((ep) => ep.role === "worker");
            const targets = isCacheClear
                ? (this.endpoints.filter((ep) => ep.role === "worker").length ? this.endpoints.filter((ep) => ep.role === "worker") : this.aggregationTargets())
                : (workers.length ? workers : this.aggregationTargets());
            // clearCache 需要广播到所有可用端点（hub+workers）或仅 workers（hub 未配置时）；其他 worker action 保持原聚合
            if (isCacheClear) {
                const cacheTargets = this.endpoints.length ? this.endpoints : this.aggregationTargets();
                // 若存在 hub 且 workers 为空，仍走 hub；否则优先 workers，hub 未配置时仅 workers 不抛 Hub not configured
                const effectiveTargets = cacheTargets.filter((ep) => ep.role === "worker").length ? cacheTargets.filter((ep) => ep.role === "worker") : cacheTargets;
                // 当为单 worker 拓扑（无 hub）时直接扇出到 workers
                const hasHub = this.clients.has("hub");
                const fanout = hasHub ? cacheTargets : effectiveTargets;
                const results = await Promise.allSettled(fanout.map((ep) => this.clients.get(ep.id).postAction(action, body)));
                const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
                if (fulfilled.length) {
                    // 合并 deletedCount 以反映多端清除总量
                    const merged = fulfilled[0];
                    if (fulfilled.length > 1 && merged && typeof merged === "object") {
                        const total = fulfilled.reduce((sum, v) => sum + Number(v?.deletedCount ?? 0), 0);
                        merged.deletedCount = total;
                        merged._aggregatedSources = fulfilled.length;
                    }
                    return merged;
                }
                const rejected = results.find((r) => r.status === "rejected");
                throw rejected?.reason || new Error("No endpoint accepted clearCache.");
            }
            const results = await Promise.allSettled(targets.map((ep) => this.clients.get(ep.id).postAction(action, body)));
            const fulfilled = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
            if (fulfilled.length)
                return fulfilled[0];
            const rejected = results.find((r) => r.status === "rejected");
            throw rejected?.reason || new Error("No worker endpoint accepted action.");
        }
        // hub 型 action 保持 hub 单点（避免 workers 收到不支持的 Hub 控制 API），兼容既有测试
        // 若 hub 未配置但为 clearCache 已在上方处理，此处仍抛 Hub not configured 以便上层回退
        return this.hubClient().postAction(action, body);
    }
    async postWorkerAction(workerId, action, body) {
        const isCacheClearWorker = String(action || "").trim().toLowerCase().replace(/[-_]/g, "") === "clearcache";
        if (!isCacheClearWorker && !(0, WorkerTelemetryApi_1.isWorkerTelemetryAction)(action) && !isWorkerLocalSchedulerRequest(action, body) && !isWorkerOwnedResultRequest(action, body)) {
            throw new Error(`Worker Agent action not allowed: ${action}`);
        }
        const client = this.clients.get(workerId);
        const endpoint = this.endpointById.get(workerId);
        if (!client || endpoint?.role !== "worker") {
            throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
        }
        return client.postAction(action, body);
    }
    async postAvailabilityBatch(body) {
        // postAvailabilityBatch 保持 hub 聚合（workers 先直连 HUB 再聚合），失败单端忽略；此处简化为 hub 直调以兼容既有 worker 隔离测试
        // 若需多端聚合，可改为 fanout 到 workers + hub 并合并
        return this.hubClient().postAvailabilityBatch(body);
    }
    async listRemoteFiles(remotePath) {
        return this.hubClient().listRemoteFiles(remotePath);
    }
    async downloadFile(remotePath, localPath, options = {}) {
        const task = await this.hubClient().downloadFile(remotePath, localPath, options);
        this.updateMergedState();
        return task;
    }
    async uploadFile(localPath, remotePath) {
        const task = await this.hubClient().uploadFile(localPath, remotePath);
        this.updateMergedState();
        return task;
    }
    diagnostics() {
        const sources = this.endpoints.map((endpoint) => this.clients.get(endpoint.id)?.diagnostics());
        if (this.diagnosticsCache
            && sources.length === this.diagnosticsEndpointSources.length
            && sources.every((source, index) => source === this.diagnosticsEndpointSources[index])) {
            return this.diagnosticsCache;
        }
        const endpoints = this.endpoints.map((endpoint, index) => {
            const item = sources[index];
            return {
                id: endpoint.id,
                role: endpoint.role,
                displayName: endpoint.displayName,
                localPort: endpoint.localPort,
                streamStatus: item?.streamStatus || "disconnected",
                lastSeq: item?.lastSeq || 0,
                lastHeartbeatAt: item?.lastHeartbeatAt,
                reconnectCount: item?.reconnectCount || 0,
                lastError: item?.lastError,
            };
        });
        const statuses = new Set(endpoints.map((endpoint) => endpoint.streamStatus));
        const diagnostics = {
            streamStatus: statuses.size === 1 ? endpoints[0]?.streamStatus || "disconnected" : "mixed",
            lastSeq: Math.max(0, ...endpoints.map((endpoint) => endpoint.lastSeq)),
            lastHeartbeatAt: latest(endpoints.map((endpoint) => endpoint.lastHeartbeatAt)),
            reconnectCount: endpoints.reduce((sum, endpoint) => sum + endpoint.reconnectCount, 0),
            lastError: endpoints.find((endpoint) => endpoint.lastError)?.lastError,
            endpoints,
        };
        this.diagnosticsEndpointSources = sources;
        this.diagnosticsCache = diagnostics;
        return diagnostics;
    }
    currentState() {
        return this.mergedState;
    }
    setHidden(hidden) {
        for (const client of this.clients.values())
            client.setHidden(hidden);
    }
    setProtectedLogKeys(keys) {
        this.protectedLogKeys = [...new Set((Array.isArray(keys) ? keys : []).map((key) => String(key || "").trim()).filter(Boolean))];
        for (const client of this.clients.values())
            client.setProtectedLogKeys(this.protectedLogKeys);
        this.updateMergedState();
    }
    budgetSnapshots() {
        return Object.fromEntries([...this.budgets.entries()].map(([id, budget]) => [id, budget.snapshot()]));
    }
    endpointStates(changedEndpointId, changedState) {
        return this.endpoints.map((endpoint) => ({
            endpoint,
            state: changedEndpointId === endpoint.id && changedState ? changedState : this.clients.get(endpoint.id)?.currentState() || (0, RealtimeEventReducer_1.createRealtimeState)(),
        }));
    }
    updateMergedState(snapshot) {
        this.mergedState = snapshot ? (0, RealtimeEventReducer_1.createRealtimeState)(snapshot) : mergeRealtimeStates(this.endpointStates(), this.endpoints, this.protectedLogKeys, this.endpointById);
        this.onState(this.mergedState);
    }
    aggregationTargets() {
        const hubAllowed = this.clients.has("hub");
        // 若 topology hubAllowed 则 workers->HUB 聚合（workers先直连HUB再聚合），否则直接聚合 workers；复用 getAggregatedGpuHistory 的 fanout+merge 模式
        if (hubAllowed)
            return this.endpoints;
        const workers = this.endpoints.filter((ep) => ep.role === "worker");
        return workers.length ? workers : this.endpoints;
    }
    mergeGenericResponses(values) {
        if (!values.length)
            return undefined;
        if (values.length === 1)
            return values[0];
        // array concat
        if (values.every((v) => Array.isArray(v)))
            return values.flat();
        const out = {};
        for (const v of values) {
            if (v && typeof v === "object" && !Array.isArray(v)) {
                for (const [k, val] of Object.entries(v)) {
                    if (Array.isArray(val) && Array.isArray(out[k]))
                        out[k].push(...val);
                    else if (val && typeof val === "object" && out[k] && typeof out[k] === "object" && !Array.isArray(val) && !Array.isArray(out[k]))
                        out[k] = { ...out[k], ...val };
                    else if (out[k] === undefined)
                        out[k] = val;
                    else if (k === "entries" && Array.isArray(val))
                        out[k] = [...(Array.isArray(out[k]) ? out[k] : []), ...val];
                }
            }
        }
        // Include aggregated hint without breaking consumers
        if (!out._aggregatedSources)
            out._aggregatedSources = values.length;
        return out;
    }
    hubClient() {
        const hub = this.clients.get("hub");
        if (!hub)
            throw new Error("Hub realtime endpoint not configured for current topology.");
        return hub;
    }
}
exports.MultiEndpointRealtimeClient = MultiEndpointRealtimeClient;
function mergeGpuHistoryResponses(responses, query) {
    if (!responses.length)
        throw new Error("No GPU history responses to merge.");
    const bucketSeconds = Math.min(...responses.map((r) => Number(r.bucketSeconds) || 60).filter((v) => Number.isFinite(v) && v > 0)) || responses[0].bucketSeconds || 60;
    const retentionHours = Math.max(...responses.map((r) => Number(r.retentionHours) || 0)) || responses[0].retentionHours || 72;
    const maxPointsPerSeries = Math.max(...responses.map((r) => Number(r.maxPointsPerSeries) || 0)) || responses[0].maxPointsPerSeries || 4320;
    const updatedAt = responses.map((r) => String(r.updatedAt || "")).filter(Boolean).sort().pop() || new Date().toISOString();
    const limit = Number(query.maxPoints) > 0 ? Number(query.maxPoints) : maxPointsPerSeries;
    const grouped = new Map();
    const meta = new Map();
    for (const resp of responses) {
        for (const series of (resp.series || [])) {
            if (!series || !series.serverId || !series.gpuId)
                continue;
            const key = `${String(series.serverId).trim()}::${String(series.gpuId).trim()}`;
            if (!grouped.has(key))
                grouped.set(key, new Map());
            const bucketMap = grouped.get(key);
            if (!meta.has(key))
                meta.set(key, { serverId: String(series.serverId).trim(), gpuId: String(series.gpuId).trim(), rawPointCount: 0 });
            const entry = meta.get(key);
            entry.rawPointCount += Number(series.rawPointCount || (series.points || []).length);
            for (const point of (series.points || [])) {
                const bucket = Number(point.bucketEpoch);
                if (!Number.isFinite(bucket))
                    continue;
                const existing = bucketMap.get(bucket);
                if (!existing)
                    bucketMap.set(bucket, point);
                else {
                    // de-duplicate: keep point with higher util if both present, otherwise last wins
                    const curUtil = Number(existing.gpuUtilPercent);
                    const nextUtil = Number(point.gpuUtilPercent);
                    if (Number.isFinite(nextUtil) && Number.isFinite(curUtil) ? nextUtil > curUtil : true)
                        bucketMap.set(bucket, point);
                }
            }
        }
    }
    const series = [];
    for (const [key, bucketMap] of grouped.entries()) {
        const info = meta.get(key);
        let points = Array.from(bucketMap.values()).sort((a, b) => Number(a.bucketEpoch) - Number(b.bucketEpoch));
        if (points.length > limit)
            points = points.slice(-limit);
        series.push({ serverId: info.serverId, gpuId: info.gpuId, points, rawPointCount: info.rawPointCount });
    }
    series.sort((a, b) => String(a.serverId).localeCompare(String(b.serverId)) || String(a.gpuId).localeCompare(String(b.gpuId)));
    return { schemaVersion: 1, bucketSeconds, retentionHours, maxPointsPerSeries, updatedAt, series };
}
function isWorkerOwnedResultRequest(action, body) {
    if (!WorkerTelemetryApi_1.workerResultActionNames.includes(action))
        return false;
    const request = body && typeof body === "object" ? body : {};
    const options = request.options && typeof request.options === "object" ? request.options : {};
    return ["single_worker", "worker_pool"].includes(String(options.topologyMode || request.topologyMode || ""))
        && Boolean(String(options.resultOwnerWorkerId || options.schedulerOwnerWorkerId || request.resultOwnerWorkerId || request.schedulerOwnerWorkerId || "").trim())
        && options.automaticBackup === false;
}
function isWorkerLocalSchedulerRequest(action, body) {
    if (!WorkerTelemetryApi_1.workerLocalSchedulerActionNames.includes(action))
        return false;
    const request = body && typeof body === "object" ? body : {};
    const options = request.options && typeof request.options === "object" ? request.options : {};
    return ["single_worker", "worker_pool"].includes(String(options.topologyMode || ""))
        && options.localWorkerScheduler === true
        && Boolean(String(options.schedulerOwnerWorkerId || request.schedulerOwnerWorkerId || "").trim());
}
function createBudget(config) {
    return new RequestBudget_1.RequestBudget(config);
}
function mergeRealtimeStates(entries, endpoints = entries.map((entry) => entry.endpoint), protectedLogKeys = [], endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]))) {
    return (0, AuthorityMergePolicy_1.mergeAuthorityRealtimeStates)(entries.map(({ endpoint, state }) => ({
        endpoint: endpointById.get(endpoint.id) || endpoint,
        state,
    })), { protectedLogKeys });
}
function mergeClusterSnapshots(entries) {
    const generatedAt = latest(entries.map((entry) => entry.snapshot.generatedAt));
    const gpu = entries.reduce((out, entry) => Object.assign(out, snapshotGpu(entry.snapshot, entry.endpoint)), {});
    const schedulerStates = mergeRows([], entries.flatMap((entry) => entry.snapshot.schedulerStates || []));
    const experimentTraces = mergeRows([], entries.flatMap((entry) => entry.snapshot.experimentTraces || []));
    const diagnostics = Object.fromEntries(entries.map((entry) => [entry.endpoint.id, entry.snapshot.diagnostics || {}]));
    return {
        generatedAt,
        gpu,
        schedulerStates,
        experimentTraces,
        diagnostics,
    };
}
function snapshotGpu(snapshot, endpoint) {
    const raw = snapshot.gpu;
    if (Array.isArray(raw))
        return { [endpoint.id]: raw };
    if (raw && typeof raw === "object")
        return remapGpu(raw, endpoint);
    return {};
}
function apiGpu(value, endpoint) {
    if (Array.isArray(value))
        return { [endpoint.id]: value };
    if (!value || typeof value !== "object")
        return {};
    const item = value;
    if (Array.isArray(item.gpu))
        return { [endpoint.id]: item.gpu };
    if (item.gpu && typeof item.gpu === "object")
        return remapGpu(item.gpu, endpoint);
    if (Array.isArray(item.gpus))
        return { [endpoint.id]: item.gpus };
    if (Array.isArray(item.rows))
        return { [endpoint.id]: item.rows };
    return {};
}
function apiRows(value, key) {
    if (Array.isArray(value))
        return value;
    if (!value || typeof value !== "object")
        return [];
    const item = value;
    const primary = item[key];
    if (Array.isArray(primary))
        return primary;
    if (key === "schedulerStates" && Array.isArray(item.scheduler))
        return item.scheduler;
    if (key === "schedulerStates" && Array.isArray(item.scheduler_states))
        return item.scheduler_states;
    if (key === "experimentTraces" && Array.isArray(item.traces))
        return item.traces;
    if (key === "experimentTraces" && Array.isArray(item.experiment_traces))
        return item.experiment_traces;
    if (Array.isArray(item.rows))
        return item.rows;
    return [];
}
function remapGpu(gpu, endpoint) {
    const out = {};
    for (const [key, value] of Object.entries(gpu || {})) {
        const nextKey = endpoint.role === "worker" && key === "hub" ? endpoint.id : key;
        out[nextKey || endpoint.id] = Array.isArray(value) ? value : [];
    }
    return out;
}
function mergeRows(previous, incoming) {
    const map = new Map();
    for (const item of previous || [])
        map.set(rowKey(item), item);
    for (const item of incoming || [])
        map.set(rowKey(item), { ...(map.get(rowKey(item)) || {}), ...item });
    return [...map.values()];
}
function rowKey(row) {
    const item = row;
    return String(item.runKey || item.run_key || item.experimentId || item.experiment_id || item.id || item.key || JSON.stringify(row));
}
function latest(values) {
    return values.filter(Boolean).sort().at(-1);
}
function mergeWorkerResultsSummaries(entries, requestedPlanFile = "", expectedWorkerIds = []) {
    const requestedPlan = normalizePlanPath(requestedPlanFile);
    const accepted = entries.flatMap(({ workerId, summary }) => {
        const item = summary && typeof summary === "object" && !Array.isArray(summary) ? summary : undefined;
        if (!item)
            return [];
        const summaryPlan = normalizePlanPath(item.planFile || item.plan_file);
        if (requestedPlan && summaryPlan && summaryPlan !== requestedPlan)
            return [];
        return [{ workerId: String(workerId || "").trim(), summary: item }];
    }).filter((entry) => entry.workerId);
    const results = accepted.flatMap(({ workerId, summary }) => {
        const rows = Array.isArray(summary.results)
            ? summary.results
            : [...(Array.isArray(summary.finalResults) ? summary.finalResults : []), ...(Array.isArray(summary.pendingReviewRecords) ? summary.pendingReviewRecords : [])];
        return rows.map((row) => stampWorkerResultOwnership(row, workerId));
    });
    const finalResults = results.filter((row) => String(row.finalEvidenceState || row.final_evidence_state || "").toLowerCase() === "archived");
    const pendingReviewRecords = results.filter((row) => String(row.finalEvidenceState || row.final_evidence_state || "").toLowerCase() !== "archived");
    const revisions = [...new Set(accepted.map(({ summary }) => String(summary.planRevision || summary.plan_revision || "").trim()).filter(Boolean))];
    const workerIds = [...new Set(accepted.map((entry) => entry.workerId))].sort((a, b) => a.localeCompare(b));
    const expectedWorkers = [...new Set((expectedWorkerIds.length ? expectedWorkerIds : entries.map((entry) => entry.workerId))
            .map((workerId) => String(workerId || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const unavailableWorkerIds = expectedWorkers.filter((workerId) => !workerIds.includes(workerId));
    const incompleteAggregate = unavailableWorkerIds.length > 0;
    const workerSetRevisions = [...new Set(accepted.map(({ summary }) => String(summary.workerSetRevision || "").trim()).filter(Boolean))];
    return {
        schemaVersion: 1,
        generatedAt: latest(accepted.map(({ summary }) => String(summary.generatedAt || summary.generated_at || "") || undefined)),
        planFile: requestedPlan || normalizePlanPath(accepted[0]?.summary.planFile || accepted[0]?.summary.plan_file),
        ...(revisions.length === 1 ? { planRevision: revisions[0] } : {}),
        ...(workerSetRevisions.length === 1 ? { workerSetRevision: workerSetRevisions[0] } : {}),
        topologyMode: expectedWorkers.length > 1 ? "worker_pool" : "single_worker",
        workerIds,
        expectedWorkerIds: expectedWorkers,
        availableWorkerIds: workerIds,
        unavailableWorkerIds,
        incompleteAggregate,
        aggregateCoverage: `${workerIds.length}/${expectedWorkers.length}`,
        resultCount: results.length,
        parsedResults: results.length,
        previewResultCount: results.length,
        finalResultCount: finalResults.length,
        effectiveArchivedResultCount: finalResults.length,
        pendingReviewCount: pendingReviewRecords.length,
        results,
        finalResults,
        final_results: finalResults,
        pendingReviewRecords,
        pending_review_records: pendingReviewRecords,
        sources: accepted.flatMap(({ workerId, summary }) => (Array.isArray(summary.sources) ? summary.sources : []).map((source) => ({ workerId, path: String(source || "") }))),
        workerSummaries: accepted.map(({ workerId, summary }) => ({
            workerId,
            summaryPath: String(summary.summaryPath || ""),
            resultCount: Number(summary.resultCount || 0),
            finalResultCount: Number(summary.finalResultCount || summary.effectiveArchivedResultCount || 0),
            generatedAt: String(summary.generatedAt || summary.generated_at || ""),
        })),
        inclusionPolicy: "archived_only",
        analysisSource: "worker_archived_final_results",
        displayAggregateOnly: true,
        authoritative: false,
        mixedPlanRevision: revisions.length > 1,
        message: incompleteAggregate
            ? `仅合并 ${workerIds.length}/${expectedWorkers.length} 个 Worker 的结果摘要；缺少 ${unavailableWorkerIds.join("、")}，当前数字不是全局结果。`
            : `${workerIds.length} 个 Worker 的结果摘要已只读合并；远端状态和归档仍由各 Worker 独立保存。`,
    };
}
function stampWorkerResultOwnership(value, workerId) {
    const row = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const provenance = row.provenance && typeof row.provenance === "object" && !Array.isArray(row.provenance) ? row.provenance : {};
    const identity = String(row.resultId || row.result_id || row.runKey || row.run_key || row.experimentId || row.experiment_id || row.sourceFile || row.source || "result");
    return {
        ...row,
        workerId,
        resultOwnerWorkerId: workerId,
        resultOwnershipKey: `${workerId}:${identity}`,
        provenance: { ...provenance, workerId, resultOwnerWorkerId: workerId },
    };
}
function normalizePlanPath(value) {
    return String(value || "").trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
