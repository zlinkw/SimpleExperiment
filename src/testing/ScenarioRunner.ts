import { AgentService } from "../services/AgentService";
import { ClusterStore } from "../state/ClusterStore";
import { FakeClusterRuntime } from "./FakeClusterRuntime";

export interface ScenarioStep {
  action: "agentEvent" | "remoteCommand" | "serverOffline" | "serverOnline";
  serverId?: string;
  command?: string;
  event?: unknown;
}

export interface Scenario {
  name: string;
  servers: string[];
  steps: ScenarioStep[];
  expect: Record<string, unknown>;
}

export async function runScenario(scenario: Scenario): Promise<{ store: ClusterStore; runtime: FakeClusterRuntime }> {
  const store = new ClusterStore();
  const agent = new AgentService(store);
  const runtime = new FakeClusterRuntime();
  for (const server of scenario.servers) runtime.addServer(server);
  for (const step of scenario.steps) {
    if (step.action === "agentEvent" && step.event) agent.handleJsonLine(JSON.stringify(step.event));
    if (step.action === "serverOffline" && step.serverId) runtime.addServer(step.serverId, false);
    if (step.action === "serverOnline" && step.serverId) runtime.addServer(step.serverId, true);
    if (step.action === "remoteCommand" && step.serverId && step.command) await runtime.run(step.serverId, step.command);
  }
  return { store, runtime };
}
