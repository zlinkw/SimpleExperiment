"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTunnelEndpointRegistry = buildTunnelEndpointRegistry;
exports.endpointAssignmentsFromConfig = endpointAssignmentsFromConfig;
exports.releaseEndpointAssignment = releaseEndpointAssignment;
const TunnelPortConflict_1 = require("./TunnelPortConflict");
function buildTunnelEndpointRegistry(config, probes = {}) {
    const assignments = new Map((config.ports?.assignments || []).map((assignment) => [assignment.endpointId, assignment]));
    const workers = config.workerTunnels.map((worker) => workerEndpoint(worker, assignments.get(worker.id), probes[worker.id]));
    return {
        endpoints: workers,
        workers,
    };
}
function endpointAssignmentsFromConfig(config) {
    const assignedAt = new Date(0).toISOString();
    const fallback = [
        ...config.workerTunnels.map((worker) => ({
            endpointId: worker.id,
            role: "worker_telemetry",
            displayName: worker.displayName,
            remoteHostLabel: worker.workerHost || worker.hubHost || worker.sshConfigAlias || worker.id,
            sshConfigAlias: worker.sshConfigAlias,
            localForwardHost: worker.localForwardHost,
            localForwardPort: worker.localForwardPort,
            remoteBindHost: worker.remoteAgentHost,
            remoteServicePort: worker.remoteTelemetryPort || worker.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultWorkerTelemetryPort,
            assignedAt,
            source: "imported",
        })),
    ];
    if (!config.ports?.assignments?.length)
        return fallback;
    const validIds = new Set(config.workerTunnels.map((worker) => worker.id));
    const byId = new Map(config.ports.assignments.filter((assignment) => validIds.has(assignment.endpointId)).map((assignment) => [assignment.endpointId, assignment]));
    return fallback.map((assignment) => {
        const existing = byId.get(assignment.endpointId);
        return existing ? { ...existing, ...assignment, assignedAt: existing.assignedAt, source: existing.source } : assignment;
    });
}
function releaseEndpointAssignment(assignments, endpointId) {
    return assignments.filter((assignment) => assignment.endpointId !== endpointId);
}
function workerEndpoint(worker, assignment, probe) {
    return {
        id: worker.id,
        role: "worker_telemetry",
        displayName: worker.displayName || worker.sshConfigAlias || worker.workerHost || worker.hubHost || worker.id,
        ssh: {
            host: worker.workerHost || worker.hubHost,
            user: worker.workerUser || worker.hubUser,
            port: worker.workerSshPort || worker.hubSshPort,
            sshConfigAlias: worker.sshConfigAlias,
            privateKeyPath: worker.privateKeyPath,
        },
        tunnel: {
            localHost: assignment?.localForwardHost || worker.localForwardHost,
            localPort: assignment?.localForwardPort || worker.localForwardPort,
            remoteHost: assignment?.remoteBindHost || worker.remoteAgentHost,
            remotePort: assignment?.remoteServicePort || worker.remoteTelemetryPort || worker.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultWorkerTelemetryPort,
        },
        api: {
            mode: "worker_telemetry",
            expectedCapabilities: [
                "endpoints.health",
                "endpoints.gpu",
                "endpoints.workerTasks",
                "endpoints.sseEvents",
                "endpoints.liveOutput",
                "endpoints.diagnostics",
            ],
        },
        enabled: worker.enabled !== false,
        lastProbe: probe,
    };
}
