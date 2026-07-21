"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrations = exports.CLUSTER_STATE_SCHEMA_VERSION = void 0;
exports.migrateClusterState = migrateClusterState;
exports.CLUSTER_STATE_SCHEMA_VERSION = 2;
exports.migrations = [
    {
        from: 0,
        to: 1,
        name: "base schema",
        migrate: (state) => ({ ...(state || {}), schemaVersion: 1 }),
    },
    {
        from: 1,
        to: 2,
        name: "ssh agent defaults",
        migrate: (state) => ({
            ...state,
            schemaVersion: 2,
            agentEnabled: state?.agentEnabled !== false,
            agentStreamEnabled: state?.agentStreamEnabled !== false,
            allowOneShotForBackground: Boolean(state?.allowOneShotForBackground),
            allowDirectWorkerFallbackWhenAgentStale: Boolean(state?.allowDirectWorkerFallbackWhenAgentStale),
            agentPollSeconds: Number(state?.agentPollSeconds || 3),
            agentSnapshotTtlSeconds: Number(state?.agentSnapshotTtlSeconds || 15),
            agentHeartbeatTimeoutSeconds: Number(state?.agentHeartbeatTimeoutSeconds || 10),
            agentAllowWorkerProbe: state?.agentAllowWorkerProbe !== false,
            runtime: state?.runtime || {},
        }),
    },
];
function migrateClusterState(input) {
    let state = input && typeof input === "object" ? { ...input } : {};
    const from = Number(state.schemaVersion || 0);
    let current = from;
    const applied = [];
    while (current < exports.CLUSTER_STATE_SCHEMA_VERSION) {
        const migration = exports.migrations.find((item) => item.from === current);
        if (!migration)
            throw new Error(`missing migration from ${current}`);
        state = migration.migrate(state);
        current = migration.to;
        applied.push(migration.name);
    }
    if (current > exports.CLUSTER_STATE_SCHEMA_VERSION)
        throw new Error(`unsupported future state schema ${current}`);
    state.schemaVersion = exports.CLUSTER_STATE_SCHEMA_VERSION;
    return { state, migrated: applied.length > 0, from, to: exports.CLUSTER_STATE_SCHEMA_VERSION, applied };
}
