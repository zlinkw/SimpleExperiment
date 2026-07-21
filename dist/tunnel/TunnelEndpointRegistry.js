"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTunnelEndpointRegistry = buildTunnelEndpointRegistry;
exports.endpointAssignmentsFromConfig = endpointAssignmentsFromConfig;
exports.releaseEndpointAssignment = releaseEndpointAssignment;
const TunnelPortConflict_1 = require("./TunnelPortConflict");
function buildTunnelEndpointRegistry(config, probes = {}) {
    const assignments = new Map((config.ports?.assignments || []).map((assignment) => [assignment.endpointId, assignment]));
    const hubAssignment = assignments.get("hub");
    const hub = {
        id: "hub",
        role: "hub_control",
        displayName: config.sshConfigAlias || config.hubHost || "Hub",
        ssh: {
            host: config.hubHost,
            user: config.hubUser,
            port: config.hubSshPort,
            sshConfigAlias: config.sshConfigAlias,
            privateKeyPath: config.privateKeyPath,
        },
        tunnel: {
            localHost: "127.0.0.1",
            localPort: hubAssignment?.localForwardPort || config.localForwardPort || TunnelPortConflict_1.defaultTunnelPorts.hubLocalPort,
            remoteHost: "127.0.0.1",
            remotePort: hubAssignment?.remoteServicePort || config.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultHubAgentPort,
        },
        api: {
            mode: "hub_control",
            expectedCapabilities: [
                "endpoints.actions",
                "endpoints.fileList",
                "endpoints.fileDownload",
                "endpoints.fileUploadChunk",
                "endpoints.scheduler",
                "endpoints.traces",
                "endpoints.resultsSummary",
            ],
        },
        enabled: true,
        lastProbe: probes.hub,
    };
    const workers = config.workerTunnels.map((worker) => workerEndpoint(worker, assignments.get(worker.id), probes[worker.id]));
    return {
        endpoints: [hub, ...workers],
        hub,
        workers,
    };
}
function endpointAssignmentsFromConfig(config) {
    const assignedAt = new Date(0).toISOString();
    const fallback = [
        {
            endpointId: "hub",
            role: "hub_control",
            displayName: config.sshConfigAlias || config.hubHost || "Hub",
            remoteHostLabel: config.hubHost || config.sshConfigAlias || "hub",
            sshConfigAlias: config.sshConfigAlias,
            localForwardHost: "127.0.0.1",
            localForwardPort: config.localForwardPort || TunnelPortConflict_1.defaultTunnelPorts.hubLocalPort,
            remoteBindHost: "127.0.0.1",
            remoteServicePort: config.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultHubAgentPort,
            assignedAt,
            source: "imported",
        },
        ...config.workerTunnels.map((worker) => ({
            endpointId: worker.id,
            role: "worker_telemetry",
            displayName: worker.displayName,
            remoteHostLabel: worker.workerHost || worker.hubHost || worker.sshConfigAlias || worker.id,
            sshConfigAlias: worker.sshConfigAlias,
            localForwardHost: "127.0.0.1",
            localForwardPort: worker.localForwardPort,
            remoteBindHost: "127.0.0.1",
            remoteServicePort: worker.remoteTelemetryPort || worker.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultWorkerTelemetryPort,
            assignedAt,
            source: "imported",
        })),
    ];
    if (!config.ports?.assignments?.length)
        return fallback;
    const validIds = new Set(["hub", ...config.workerTunnels.map((worker) => worker.id)]);
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
            localHost: "127.0.0.1",
            localPort: assignment?.localForwardPort || worker.localForwardPort,
            remoteHost: "127.0.0.1",
            remotePort: assignment?.remoteServicePort || worker.remoteTelemetryPort || worker.remoteAgentPort || TunnelPortConflict_1.defaultTunnelPorts.defaultWorkerTelemetryPort,
        },
        api: {
            mode: "worker_telemetry",
            expectedCapabilities: [
                "endpoints.health",
                "endpoints.gpu",
                "endpoints.workerTasks",
                "endpoints.websocketEvents",
                "endpoints.sseEvents",
                "endpoints.liveOutput",
                "endpoints.diagnostics",
            ],
        },
        enabled: worker.enabled !== false,
        lastProbe: probe,
    };
}
