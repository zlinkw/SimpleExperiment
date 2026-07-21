"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runScenario = runScenario;
const AgentService_1 = require("../services/AgentService");
const ClusterStore_1 = require("../state/ClusterStore");
const FakeClusterRuntime_1 = require("./FakeClusterRuntime");
async function runScenario(scenario) {
    const store = new ClusterStore_1.ClusterStore();
    const agent = new AgentService_1.AgentService(store);
    const runtime = new FakeClusterRuntime_1.FakeClusterRuntime();
    for (const server of scenario.servers)
        runtime.addServer(server);
    for (const step of scenario.steps) {
        if (step.action === "agentEvent" && step.event)
            agent.handleJsonLine(JSON.stringify(step.event));
        if (step.action === "serverOffline" && step.serverId)
            runtime.addServer(step.serverId, false);
        if (step.action === "serverOnline" && step.serverId)
            runtime.addServer(step.serverId, true);
        if (step.action === "remoteCommand" && step.serverId && step.command)
            await runtime.run(step.serverId, step.command);
    }
    return { store, runtime };
}
