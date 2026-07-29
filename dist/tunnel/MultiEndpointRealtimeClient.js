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
    getGpuHistory(query = {}) {
        return this.hubClient().getGpuHistory(query);
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
        return this.hubClient().getDiagnostics();
    }
    async getAuditTail() {
        return this.hubClient().getAuditTail();
    }
    async getOperation(operationId) {
        return this.hubClient().getOperation(operationId);
    }
    async getWorkerOperation(workerId, operationId) {
        const client = this.clients.get(workerId);
        const endpoint = this.endpointById.get(workerId);
        if (!client || endpoint?.role !== "worker") {
            throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
        }
        return client.getOperation(operationId);
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
        return this.hubClient().postAction(action, body);
    }
    async postWorkerAction(workerId, action, body) {
        if (!(0, WorkerTelemetryApi_1.isWorkerTelemetryAction)(action) && !isWorkerLocalSchedulerRequest(action, body) && !isWorkerOwnedResultRequest(action, body)) {
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
    hubClient() {
        const hub = this.clients.get("hub");
        if (!hub)
            throw new Error("Hub realtime endpoint not configured for current topology.");
        return hub;
    }
}
exports.MultiEndpointRealtimeClient = MultiEndpointRealtimeClient;
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
        && Boolean(String(options.schedulerOwnerWorkerId || "").trim());
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
