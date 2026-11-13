import { randomUUID } from "node:crypto";
import { ProjectGateway } from "./ProjectGateway";
import { LONG_TOOLS } from "./ToolResults";
/** Stores receipt metadata in the host's existing operation log; query payloads stay in memory. */
export class ProjectMcpOperations {
  private readonly results = new Map<string, { root: string; result: unknown }>();
  constructor(private readonly ports: {
    root(): string; gateway(): ProjectGateway; records(): Record<string, any>; changed(): void;
  }) {}
  async call(tool: string, args: unknown, context?: any): Promise<unknown> {
    const root = this.ports.root(), gateway = this.ports.gateway();
    if (tool === "operation_get") { await gateway.authorize(tool, args); return this.status((args as any)?.operationId); }
    if (!LONG_TOOLS.has(tool)) return gateway.call(tool, args, context);
    await gateway.authorize(tool, args);
    if (root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
    const records = this.ports.records(), operationId = "mcp-" + randomUUID();
    const record = { operationId, type: "mcp-call", tool, status: "running", startedAt: new Date().toISOString(),
      requestScope: "tool_request", receiptProvesExperimentCompletion: false } as Record<string, any>;
    records[operationId] = record;
    this.ports.changed();
    void Promise.resolve().then(async () => {
      if (root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
      return gateway.call(tool, args, context);
    }).then(result => {
      this.results.set(operationId, { root, result: result ?? null });
      record.status = result && typeof result === "object" && (result as any).ok === false ? "failed" : "succeeded";
      record.resultAvailable = true;
    }, error => {
      record.status = "failed";
      record.error = String(error.message || error);
      record.apiCode = error.apiCode;
      this.results.set(operationId, { root, result: { ok: false, error: record.error, code: error.apiCode, detail: error.apiData } });
    }).finally(() => {
      record.finishedAt = new Date().toISOString();
      if (root !== this.ports.root()) return;
      const current = this.ports.records();
      if (!current[operationId]) return;
      // Host persistence can replace the dictionary and its rows while the request runs.
      current[operationId] = { ...current[operationId], ...record };
      this.ports.changed();
    });
    return { ok: true, operationId, status: "running", requestScope: "tool_request", receiptProvesExperimentCompletion: false,
      nextTool: "operation_get", nextArguments: { operationId } };
  }
  status(operationId: unknown): Record<string, unknown> {
    if (typeof operationId !== "string" || !/^mcp-[a-f0-9-]+$/.test(operationId)) throw Error("MCP_OPERATION_ID_REQUIRED");
    const record = this.ports.records()[operationId];
    if (!record || record.type !== "mcp-call") throw Error("MCP_OPERATION_NOT_FOUND");
    const value = this.results.get(operationId);
    if (value && value.root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
    return { ...record, ...(value ? { result: value.result } : {}), resultAvailable: !!value };
  }
}
