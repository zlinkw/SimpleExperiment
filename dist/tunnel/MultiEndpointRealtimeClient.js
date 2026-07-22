"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiEndpointRealtimeClient = void 0;
exports.createBudget = createBudget;
exports.mergeRealtimeStates = mergeRealtimeStates;
exports.mergeClusterSnapshots = mergeClusterSnapshots;
const RequestBudget_1 = require("./RequestBudget");
const RealtimeTunnelClient_1 = require("./RealtimeTunnelClient");
const RealtimeEventReducer_1 = require("./RealtimeEventReducer");
const AuthorityMergePolicy_1 = require("./AuthorityMergePolicy");
const WorkerTelemetryApi_1 = require("./WorkerTelemetryApi");
class MultiEndpointRealtimeClient {
    endpoints;
    policy;
    onState;
    clients = new Map();
    budgets = new Map();
    mergedState = (0, RealtimeEventReducer_1.createRealtimeState)();
    constructor(endpoints, budgetFactory, policy = RealtimeTunnelClient_1.defaultRealtimeRefreshPolicy, onState = () => undefined) {
        this.endpoints = endpoints;
        this.policy = policy;
        this.onState = onState;
        for (const endpoint of endpoints) {
            const budget = budgetFactory(endpoint);
            this.budgets.set(endpoint.id, budget);
            this.clients.set(endpoint.id, new RealtimeTunnelClient_1.RealtimeTunnelClient(endpoint, budget, policy, (state) => {
                this.mergedState = mergeRealtimeStates(this.endpointStates(endpoint.id, state), this.endpoints);
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
        const gpu = fulfilled.reduce((out, entry) => ({ ...out, ...apiGpu(entry.value.value, entry.value.endpoint) }), {});
        this.mergedState = { ...this.mergedState, gpu, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), gpu } };
        this.onState(this.mergedState);
        return gpu;
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
    async getResultsSummary() {
        return this.hubClient().getResultsSummary();
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
        const endpoint = this.endpoints.find((item) => item.id === workerId);
        if (!client || endpoint?.role !== "worker") {
            throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
        }
        return client.getOperation(operationId);
    }
    async getLiveOutput(runKey, since = 0, workerId) {
        const client = workerId ? this.clients.get(workerId) : this.hubClient();
        const endpoint = workerId ? this.endpoints.find((item) => item.id === workerId) : undefined;
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
                }),
            },
        };
        this.onState(this.mergedState);
        return result;
    }
    async postAction(action, body) {
        return this.hubClient().postAction(action, body);
    }
    async postWorkerAction(workerId, action, body) {
        if (!(0, WorkerTelemetryApi_1.isWorkerTelemetryAction)(action)) {
            throw new Error(`Worker Agent action not allowed: ${action}`);
        }
        const client = this.clients.get(workerId);
        const endpoint = this.endpoints.find((item) => item.id === workerId);
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
        const endpoints = this.endpoints.map((endpoint) => {
            const item = this.clients.get(endpoint.id)?.diagnostics();
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
        return {
            streamStatus: statuses.size === 1 ? endpoints[0]?.streamStatus || "disconnected" : "mixed",
            lastSeq: Math.max(0, ...endpoints.map((endpoint) => endpoint.lastSeq)),
            lastHeartbeatAt: latest(endpoints.map((endpoint) => endpoint.lastHeartbeatAt)),
            reconnectCount: endpoints.reduce((sum, endpoint) => sum + endpoint.reconnectCount, 0),
            lastError: endpoints.find((endpoint) => endpoint.lastError)?.lastError,
            endpoints,
        };
    }
    currentState() {
        return this.mergedState;
    }
    setHidden(hidden) {
        for (const client of this.clients.values())
            client.setHidden(hidden);
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
        this.mergedState = snapshot ? (0, RealtimeEventReducer_1.createRealtimeState)(snapshot) : mergeRealtimeStates(this.endpointStates(), this.endpoints);
        this.onState(this.mergedState);
    }
    hubClient() {
        const hub = this.clients.get("hub") || this.clients.values().next().value;
        if (!hub)
            throw new Error("No realtime endpoint configured.");
        return hub;
    }
}
exports.MultiEndpointRealtimeClient = MultiEndpointRealtimeClient;
function createBudget(config) {
    return new RequestBudget_1.RequestBudget(config);
}
function mergeRealtimeStates(entries, endpoints = entries.map((entry) => entry.endpoint)) {
    const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));
    return (0, AuthorityMergePolicy_1.mergeAuthorityRealtimeStates)(entries.map(({ endpoint, state }) => ({
        endpoint: endpointById.get(endpoint.id) || endpoint,
        state,
    })));
}
function mergeClusterSnapshots(entries) {
    const generatedAt = latest(entries.map((entry) => entry.snapshot.generatedAt));
    const gpu = entries.reduce((out, entry) => ({ ...out, ...snapshotGpu(entry.snapshot, entry.endpoint) }), {});
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
