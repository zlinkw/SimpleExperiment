"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectUiState = selectUiState;
exports.selectOperationLoading = selectOperationLoading;
exports.selectLastKnownGood = selectLastKnownGood;
function selectUiState(state) {
    return {
        profileId: state.activeProfileId,
        servers: state.servers,
        gpu: state.gpu,
        schedulerStates: state.schedulerStates,
        experimentTraces: state.experimentTraces,
        liveOutputs: state.liveOutputs,
        agent: state.agent,
        operations: state.operations,
        diagnostics: state.diagnostics,
    };
}
function selectOperationLoading(state, targetKey) {
    return state.operations.some((op) => ["queued", "running"].includes(op.status) && (op.targetKeys.includes(targetKey) || op.id === targetKey));
}
function selectLastKnownGood(state) {
    return state.lastKnownGood;
}
