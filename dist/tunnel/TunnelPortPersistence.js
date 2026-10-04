"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TunnelPortPersistence = exports.tunnelPortAssignmentsKey = void 0;
exports.mergePersistedAssignments = mergePersistedAssignments;
exports.tunnelPortAssignmentsKey = "simpleExperiment.tunnel.portAssignments";
class TunnelPortPersistence {
    store;
    key;
    constructor(store, key = exports.tunnelPortAssignmentsKey) {
        this.store = store;
        this.key = key;
    }
    load() {
        const value = this.store.get(this.key);
        return Array.isArray(value) ? value.filter(isAssignment) : [];
    }
    async save(assignments) {
        await this.store.update(this.key, assignments.filter(isAssignment));
    }
}
exports.TunnelPortPersistence = TunnelPortPersistence;
function mergePersistedAssignments(current, persisted) {
    const map = new Map(persisted.map((assignment) => [assignment.endpointId, assignment]));
    for (const assignment of current) {
        map.set(assignment.endpointId, { ...(map.get(assignment.endpointId) || {}), ...assignment });
    }
    return [...map.values()];
}
function isAssignment(value) {
    const item = value;
    return Boolean(item &&
        item.endpointId &&
        (item.role === "hub_control" || item.role === "worker_telemetry") &&
        typeof item.localForwardHost === "string" && Boolean(item.localForwardHost.trim()) &&
        Number.isInteger(item.localForwardPort) &&
        typeof item.remoteBindHost === "string" && Boolean(item.remoteBindHost.trim()) &&
        Number.isInteger(item.remoteServicePort));
}
