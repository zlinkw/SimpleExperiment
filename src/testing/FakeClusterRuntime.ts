import { AgentEvent } from "../agent/AgentEvent";

export interface FakeScenarioState {
  servers: Record<string, { online: boolean }>;
  actions: Array<{ action: string; opId: string; accepted: boolean }>;
  events: AgentEvent[];
  audit: unknown[];
}

export class FakeClusterRuntime {
  state: FakeScenarioState = { servers: {}, actions: [], events: [], audit: [] };

  addServer(id: string, online = true): this {
    this.state.servers[id] = { online };
    return this;
  }

  acceptAction(action: string, opId: string): { schemaVersion: 1; action: string; opId: string; accepted: true; operationId: string } {
    this.state.actions.push({ action, opId, accepted: true });
    return { schemaVersion: 1, action, opId, accepted: true, operationId: `${action}-${opId}` };
  }
}

