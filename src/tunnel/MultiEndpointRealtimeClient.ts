import { RequestBudget, RequestBudgetConfig, RequestBudgetSnapshot } from "./RequestBudget";
import { ClusterSnapshot, TunnelAction, TunnelEndpointConfig } from "./TunnelClient";
import { FileListResponse, FileTransferTask } from "./FileTransferTypes";
import { defaultRealtimeRefreshPolicy, RealtimeRefreshPolicy, RealtimeTunnelClient, StreamStatus } from "./RealtimeTunnelClient";
import { compactRealtimeLogs, createRealtimeState, RealtimeState } from "./RealtimeEventReducer";
import { mergeAuthorityRealtimeStates } from "./AuthorityMergePolicy";

export interface NamedTunnelEndpointConfig extends TunnelEndpointConfig {
  id: string;
  role: "hub" | "worker";
  displayName?: string;
}

export interface MultiEndpointDiagnostics {
  streamStatus: StreamStatus | "mixed";
  lastSeq: number;
  lastHeartbeatAt?: string;
  reconnectCount: number;
  lastError?: string;
  endpoints: Array<{
    id: string;
    role: "hub" | "worker";
    displayName?: string;
    localPort: number;
    streamStatus: StreamStatus;
    lastSeq: number;
    lastHeartbeatAt?: string;
    reconnectCount: number;
    lastError?: string;
  }>;
}

export class MultiEndpointRealtimeClient {
  private readonly clients = new Map<string, RealtimeTunnelClient>();
  private readonly budgets = new Map<string, RequestBudget>();
  private mergedState: RealtimeState = createRealtimeState();

  constructor(
    private readonly endpoints: NamedTunnelEndpointConfig[],
    budgetFactory: (endpoint: NamedTunnelEndpointConfig) => RequestBudget,
    private readonly policy: RealtimeRefreshPolicy = defaultRealtimeRefreshPolicy,
    private readonly onState: (state: RealtimeState) => void = () => undefined,
  ) {
    for (const endpoint of endpoints) {
      const budget = budgetFactory(endpoint);
      this.budgets.set(endpoint.id, budget);
      this.clients.set(endpoint.id, new RealtimeTunnelClient(endpoint, budget, policy, (state) => {
        this.mergedState = mergeRealtimeStates(this.endpointStates(endpoint.id, state), this.endpoints);
        this.onState(this.mergedState);
      }));
    }
  }

  async connect(_sinceSeq?: number): Promise<void> {
    await Promise.allSettled([...this.clients.values()].map((client) => client.connect(client.currentState().lastSeq)));
    this.updateMergedState();
  }

  async disconnect(reason = "manual"): Promise<void> {
    await Promise.allSettled([...this.clients.values()].map((client) => client.disconnect(reason)));
    this.updateMergedState();
  }

  async reconnect(reason = "reconnect"): Promise<void> {
    await Promise.allSettled([...this.clients.values()].map((client) => client.reconnect(reason)));
    this.updateMergedState();
  }

  async getSnapshot(): Promise<ClusterSnapshot> {
    const entries = await Promise.allSettled(this.endpoints.map(async (endpoint) => {
      const snapshot = await this.clients.get(endpoint.id)?.getSnapshot();
      return snapshot ? { endpoint, snapshot } : undefined;
    }));
    const snapshots = entries
      .filter((entry): entry is PromiseFulfilledResult<{ endpoint: NamedTunnelEndpointConfig; snapshot: ClusterSnapshot } | undefined> => entry.status === "fulfilled")
      .map((entry) => entry.value)
      .filter((entry): entry is { endpoint: NamedTunnelEndpointConfig; snapshot: ClusterSnapshot } => Boolean(entry));
    const snapshot = mergeClusterSnapshots(snapshots);
    this.updateMergedState(snapshot);
    return snapshot;
  }

  async getGpu(): Promise<Record<string, unknown[]>> {
    const entries = await Promise.allSettled(this.endpoints.map(async (endpoint) => {
      const value = await this.clients.get(endpoint.id)?.getGpu();
      return { endpoint, value };
    }));
    const fulfilled = entries.filter((entry): entry is PromiseFulfilledResult<{ endpoint: NamedTunnelEndpointConfig; value: unknown }> => entry.status === "fulfilled");
    if (!fulfilled.length) {
      const rejected = entries.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
      throw rejected?.reason || new Error("No realtime endpoint returned GPU state.");
    }
    const gpu = fulfilled.reduce<Record<string, unknown[]>>((out, entry) => ({ ...out, ...apiGpu(entry.value.value, entry.value.endpoint) }), {});
    this.mergedState = { ...this.mergedState, gpu, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), gpu } };
    this.onState(this.mergedState);
    return gpu;
  }

  async getScheduler(): Promise<unknown[]> {
    const entries = await Promise.allSettled([...this.clients.values()].map((client) => client.getScheduler()));
    const fulfilled = entries.filter((entry): entry is PromiseFulfilledResult<unknown> => entry.status === "fulfilled");
    if (!fulfilled.length) {
      const rejected = entries.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
      throw rejected?.reason || new Error("No realtime endpoint returned scheduler state.");
    }
    const schedulerStates = fulfilled.flatMap((entry) => apiRows(entry.value, "schedulerStates"));
    this.mergedState = { ...this.mergedState, schedulerStates, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), schedulerStates } };
    this.onState(this.mergedState);
    return schedulerStates;
  }

  async getTraces(): Promise<unknown[]> {
    const entries = await Promise.allSettled([...this.clients.values()].map((client) => client.getTraces()));
    const fulfilled = entries.filter((entry): entry is PromiseFulfilledResult<unknown> => entry.status === "fulfilled");
    if (!fulfilled.length) {
      const rejected = entries.find((entry): entry is PromiseRejectedResult => entry.status === "rejected");
      throw rejected?.reason || new Error("No realtime endpoint returned traces.");
    }
    const experimentTraces = fulfilled.flatMap((entry) => apiRows(entry.value, "experimentTraces"));
    this.mergedState = { ...this.mergedState, experimentTraces, lastKnownGood: { ...(this.mergedState.lastKnownGood || {}), experimentTraces } };
    this.onState(this.mergedState);
    return experimentTraces;
  }

  async getResultsSummary(): Promise<unknown> {
    return this.hubClient().getResultsSummary();
  }

  async getDiagnostics(): Promise<unknown> {
    return this.hubClient().getDiagnostics();
  }

  async getAuditTail(): Promise<unknown> {
    return this.hubClient().getAuditTail();
  }

  async getOperation(operationId: string): Promise<unknown> {
    return this.hubClient().getOperation(operationId);
  }

  async getWorkerOperation(workerId: string, operationId: string): Promise<unknown> {
    const client = this.clients.get(workerId);
    const endpoint = this.endpoints.find((item) => item.id === workerId);
    if (!client || endpoint?.role !== "worker") {
      throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
    }
    return client.getOperation(operationId);
  }

  async getLiveOutput(runKey: string, since = 0, workerId?: string): Promise<unknown> {
    const client = workerId ? this.clients.get(workerId) : this.hubClient();
    const endpoint = workerId ? this.endpoints.find((item) => item.id === workerId) : undefined;
    if (!client || (workerId && endpoint?.role !== "worker")) {
      throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
    }
    const result = await client.getLiveOutput(runKey, since);
    const record = result && typeof result === "object" ? result as Record<string, unknown> : {};
    const text = String(record.text || record.output || record.tail || "");
    const offset = Number(record.offset || 0);
    this.mergedState = {
      ...this.mergedState,
      logs: {
        ...compactRealtimeLogs({
          ...this.mergedState.logs,
          [runKey]: { text, offset, seq: this.mergedState.lastSeq },
        }),
      },
    };
    this.onState(this.mergedState);
    return result;
  }

  async postAction<T>(action: TunnelAction, body: unknown): Promise<T> {
    return this.hubClient().postAction<T>(action, body);
  }

  async postWorkerAction<T>(workerId: string, action: TunnelAction, body: unknown): Promise<T> {
    const client = this.clients.get(workerId);
    const endpoint = this.endpoints.find((item) => item.id === workerId);
    if (!client || endpoint?.role !== "worker") {
      throw new Error(`Worker Agent endpoint not configured: ${workerId}`);
    }
    return client.postAction<T>(action, body);
  }

  async postAvailabilityBatch<T>(body: unknown): Promise<T> {
    return this.hubClient().postAvailabilityBatch<T>(body);
  }

  async listRemoteFiles(remotePath: string): Promise<FileListResponse> {
    return this.hubClient().listRemoteFiles(remotePath);
  }

  async downloadFile(remotePath: string, localPath: string): Promise<FileTransferTask> {
    const task = await this.hubClient().downloadFile(remotePath, localPath);
    this.updateMergedState();
    return task;
  }

  async uploadFile(localPath: string, remotePath: string): Promise<FileTransferTask> {
    const task = await this.hubClient().uploadFile(localPath, remotePath);
    this.updateMergedState();
    return task;
  }

  diagnostics(): MultiEndpointDiagnostics {
    const endpoints = this.endpoints.map((endpoint) => {
      const item = this.clients.get(endpoint.id)?.diagnostics();
      return {
        id: endpoint.id,
        role: endpoint.role,
        displayName: endpoint.displayName,
        localPort: endpoint.localPort,
        streamStatus: item?.streamStatus || "disconnected",
        lastSeq: item?.lastSeq || 0,
        lastHeartbeatAt: item?.lastHeartbeatAt,
        reconnectCount: item?.reconnectCount || 0,
        lastError: item?.lastError,
      };
    });
    const statuses = new Set(endpoints.map((endpoint) => endpoint.streamStatus));
    return {
      streamStatus: statuses.size === 1 ? endpoints[0]?.streamStatus || "disconnected" : "mixed",
      lastSeq: Math.max(0, ...endpoints.map((endpoint) => endpoint.lastSeq)),
      lastHeartbeatAt: latest(endpoints.map((endpoint) => endpoint.lastHeartbeatAt)),
      reconnectCount: endpoints.reduce((sum, endpoint) => sum + endpoint.reconnectCount, 0),
      lastError: endpoints.find((endpoint) => endpoint.lastError)?.lastError,
      endpoints,
    };
  }

  currentState(): RealtimeState {
    return this.mergedState;
  }

  setHidden(hidden: boolean): void {
    for (const client of this.clients.values()) client.setHidden(hidden);
  }

  budgetSnapshots(): Record<string, RequestBudgetSnapshot> {
    return Object.fromEntries([...this.budgets.entries()].map(([id, budget]) => [id, budget.snapshot()]));
  }

  private endpointStates(changedEndpointId?: string, changedState?: RealtimeState): Array<{ endpoint: NamedTunnelEndpointConfig; state: RealtimeState }> {
    return this.endpoints.map((endpoint) => ({
      endpoint,
      state: changedEndpointId === endpoint.id && changedState ? changedState : this.clients.get(endpoint.id)?.currentState() || createRealtimeState(),
    }));
  }

  private updateMergedState(snapshot?: ClusterSnapshot): void {
    this.mergedState = snapshot ? createRealtimeState(snapshot) : mergeRealtimeStates(this.endpointStates(), this.endpoints);
    this.onState(this.mergedState);
  }

  private hubClient(): RealtimeTunnelClient {
    const hub = this.clients.get("hub") || this.clients.values().next().value;
    if (!hub) throw new Error("No realtime endpoint configured.");
    return hub;
  }
}

export function createBudget(config: RequestBudgetConfig): RequestBudget {
  return new RequestBudget(config);
}

export function mergeRealtimeStates(
  entries: Array<{ endpoint: NamedTunnelEndpointConfig; state: RealtimeState }>,
  endpoints: NamedTunnelEndpointConfig[] = entries.map((entry) => entry.endpoint),
): RealtimeState {
  const endpointById = new Map(endpoints.map((endpoint) => [endpoint.id, endpoint]));
  return mergeAuthorityRealtimeStates(entries.map(({ endpoint, state }) => ({
    endpoint: endpointById.get(endpoint.id) || endpoint,
    state,
  })));
}

export function mergeClusterSnapshots(entries: Array<{ endpoint: NamedTunnelEndpointConfig; snapshot: ClusterSnapshot }>): ClusterSnapshot {
  const generatedAt = latest(entries.map((entry) => entry.snapshot.generatedAt));
  const gpu = entries.reduce<Record<string, unknown[]>>((out, entry) => ({ ...out, ...snapshotGpu(entry.snapshot, entry.endpoint) }), {});
  const schedulerStates = mergeRows([], entries.flatMap((entry) => entry.snapshot.schedulerStates || []));
  const experimentTraces = mergeRows([], entries.flatMap((entry) => entry.snapshot.experimentTraces || []));
  const diagnostics = Object.fromEntries(entries.map((entry) => [entry.endpoint.id, entry.snapshot.diagnostics || {}]));
  return {
    generatedAt,
    gpu,
    schedulerStates,
    experimentTraces,
    diagnostics,
  };
}

function snapshotGpu(snapshot: ClusterSnapshot, endpoint: NamedTunnelEndpointConfig): Record<string, unknown[]> {
  const raw = snapshot.gpu as unknown;
  if (Array.isArray(raw)) return { [endpoint.id]: raw };
  if (raw && typeof raw === "object") return remapGpu(raw as Record<string, unknown[]>, endpoint);
  return {};
}

function apiGpu(value: unknown, endpoint: NamedTunnelEndpointConfig): Record<string, unknown[]> {
  if (Array.isArray(value)) return { [endpoint.id]: value };
  if (!value || typeof value !== "object") return {};
  const item = value as Record<string, unknown>;
  if (Array.isArray(item.gpu)) return { [endpoint.id]: item.gpu };
  if (item.gpu && typeof item.gpu === "object") return remapGpu(item.gpu as Record<string, unknown[]>, endpoint);
  if (Array.isArray(item.gpus)) return { [endpoint.id]: item.gpus };
  if (Array.isArray(item.rows)) return { [endpoint.id]: item.rows };
  return {};
}

function apiRows(value: unknown, key: "schedulerStates" | "experimentTraces"): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const item = value as Record<string, unknown>;
  const primary = item[key];
  if (Array.isArray(primary)) return primary;
  if (key === "schedulerStates" && Array.isArray(item.scheduler)) return item.scheduler;
  if (key === "schedulerStates" && Array.isArray(item.scheduler_states)) return item.scheduler_states;
  if (key === "experimentTraces" && Array.isArray(item.traces)) return item.traces;
  if (key === "experimentTraces" && Array.isArray(item.experiment_traces)) return item.experiment_traces;
  if (Array.isArray(item.rows)) return item.rows;
  return [];
}

function remapGpu(gpu: Record<string, unknown[]>, endpoint: NamedTunnelEndpointConfig): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  for (const [key, value] of Object.entries(gpu || {})) {
    const nextKey = endpoint.role === "worker" && key === "hub" ? endpoint.id : key;
    out[nextKey || endpoint.id] = Array.isArray(value) ? value : [];
  }
  return out;
}

function mergeRows(previous: unknown[], incoming: unknown[]): unknown[] {
  const map = new Map<string, unknown>();
  for (const item of previous || []) map.set(rowKey(item), item);
  for (const item of incoming || []) map.set(rowKey(item), { ...(map.get(rowKey(item)) as object || {}), ...(item as object) });
  return [...map.values()];
}

function rowKey(row: unknown): string {
  const item = row as Record<string, unknown>;
  return String(item.runKey || item.run_key || item.experimentId || item.experiment_id || item.id || item.key || JSON.stringify(row));
}

function latest(values: Array<string | undefined>): string | undefined {
  return values.filter(Boolean).sort().at(-1);
}
