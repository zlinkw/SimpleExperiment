"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FakeClusterRuntime = void 0;
class FakeClusterRuntime {
    state = { servers: {}, actions: [], events: [], audit: [] };
    addServer(id, online = true) {
        this.state.servers[id] = { online };
        return this;
    }
    acceptAction(action, opId) {
        this.state.actions.push({ action, opId, accepted: true });
        return { schemaVersion: 1, action, opId, accepted: true, operationId: `${action}-${opId}` };
    }
    async run(serverId, command) {
        const accepted = this.state.servers[serverId]?.online === true;
        this.state.actions.push({ action: "remoteCommand", opId: command, accepted });
        return { serverId, command, accepted };
    }
}
exports.FakeClusterRuntime = FakeClusterRuntime;
