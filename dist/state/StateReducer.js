"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialClusterStoreState = createInitialClusterStoreState;
exports.clusterReducer = clusterReducer;
const AgentStateReducer_1 = require("../agent/AgentStateReducer");
function createInitialClusterStoreState(projectRoot = "") {
    const profile = { id: "default", name: "Default", projectRoot, servers: [], settings: {} };
    return {
        clusterConfig: {},
        profiles: [profile],
        activeProfileId: profile.id,
        servers: [],
        gpu: {},
        schedulerStates: [],
        experimentTraces: [],
        liveOutputs: {},
        agent: {},
        operations: [],
        diagnostics: {},
        lastKnownGood: { gpu: {}, schedulerStates: [], experimentTraces: [], liveOutputs: {} },
    };
}
function clusterReducer(state, action) {
    switch (action.type) {
        case "profile/loaded":
            return {
                ...state,
                ...(action.state || {}),
                profiles: upsertProfile(state.profiles, action.profile),
                activeProfileId: action.profile.id,
                servers: action.profile.servers,
            };
        case "gpu/snapshotReceived": {
            const gpu = { ...state.gpu, [action.serverId]: action.payload };
            return { ...state, gpu, lastKnownGood: { ...state.lastKnownGood, gpu } };
        }
        case "scheduler/eventsReceived": {
            const schedulerStates = mergeRows(state.schedulerStates, action.payload, action.seq);
            return { ...state, schedulerStates, lastKnownGood: { ...state.lastKnownGood, schedulerStates } };
        }
        case "traces/received": {
            const experimentTraces = mergeRows(state.experimentTraces, action.payload, action.seq);
            return { ...state, experimentTraces, lastKnownGood: { ...state.lastKnownGood, experimentTraces } };
        }
        case "liveOutput/received": {
            const liveOutputs = { ...state.liveOutputs, [action.key]: action.payload };
            return { ...state, liveOutputs, lastKnownGood: { ...state.lastKnownGood, liveOutputs } };
        }
        case "agent/streamStateChanged":
            return { ...state, agent: { ...state.agent, status: action.status, detail: action.detail, lastSeq: action.seq ?? state.agent.lastSeq, lastEventAt: new Date().toISOString() } };
        case "operations/updated":
            return { ...state, operations: action.operations };
        case "diagnostics/updated":
            return { ...state, diagnostics: { ...state.diagnostics, ...action.diagnostics, updatedAt: new Date().toISOString() } };
        default:
            return state;
    }
}
function upsertProfile(profiles, profile) {
    const rest = profiles.filter((item) => item.id !== profile.id);
    return [...rest, profile];
}
function mergeRows(previous, incoming, seq) {
    const map = new Map();
    for (const row of previous || [])
        map.set(rowKey(row), row);
    for (const row of incoming || []) {
        const next = { ...row, seq: row.seq ?? seq };
        map.set(rowKey(next), (0, AgentStateReducer_1.mergeVersionedState)(map.get(rowKey(next)), next));
    }
    return Array.from(map.values());
}
function rowKey(row) {
    return String(row.runKey || row.run_key || row.global_job_id || row.run_id || row.sessionId || row.session_id || row.file || row.key || row.id || JSON.stringify(row));
}
