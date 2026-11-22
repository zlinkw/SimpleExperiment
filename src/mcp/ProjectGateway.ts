import { PROJECT_TOOLS, validateToolArguments, type ProjectTool } from "./ToolCatalog";
import { AUTHORIZATION_KEY, assertProjectAuthorization, type AuthorizedWorker, type ProjectAuthorization, type AuthorizationStore } from "./ProjectAuthorization";
import { queryProject } from "./ProjectQueries";
import { mcpInvocation } from "./Invocation";
import { isDeepStrictEqual } from "node:util";

function validateDispatch(args: Record<string, any>): void {
  const nonempty = (value: unknown) => typeof value === "string" && !!value.trim();
  if (args.distribution === "quota_remaining") {
    const ids = args.workflowIds;
    if (ids !== undefined && (!ids.length || ids.some((id: unknown) => !nonempty(id))) || args.workflowId !== undefined && !nonempty(args.workflowId)
      || args.all === true && (args.workflowId !== undefined || ids !== undefined)
      || args.all !== true && args.workflowId === undefined && ids === undefined
      || ["indices", "workerId", "gpuId", "gpuSelection", "stopRunning", "expectedCommands"].some(key => Object.hasOwn(args, key)))
      throw Error("MCP_DISPATCH_SCOPE_INVALID: select explicit PLANs or all remaining jobs without a Worker or GPU");
    return;
  }
  if (!nonempty(args.workflowId) || !nonempty(args.workerId) || !Array.isArray(args.indices) || !args.indices.length
    || args.indices.some((index: number) => !Number.isSafeInteger(index) || index < 0)
    || ["workflowIds", "all"].some(key => Object.hasOwn(args, key))
    || (args.gpuSelection === "automatic" ? args.gpuId !== undefined : !nonempty(args.gpuId)))
    throw Error("MCP_DISPATCH_SELECTION_INVALID: select jobs, a Worker and either a GPU or automatic selection");
  if (args.expectedCommands !== undefined && Object.values(args.expectedCommands).some(value => typeof value !== "string"))
    throw Error("MCP_DISPATCH_EXPECTED_COMMANDS_INVALID");
}

export interface ProjectGatewayPorts {
  root(): string;
  workers(includeDisabled?: boolean): AuthorizedWorker[];
  store: AuthorizationStore;
  methods(): Record<string, (params: Record<string, any>, server?: any, context?: any) => any>;
  sftp?: { methods(): Promise<string[]>; call(method: string, args: Record<string, any>): Promise<unknown> };
  approve?(tool: ProjectTool, args: Record<string, unknown>): Promise<boolean>;
  reviewFiles?(args: Record<string, unknown>): Promise<unknown>;
}
export class ProjectGateway {
  constructor(private readonly ports: ProjectGatewayPorts) {}
  async catalog(): Promise<ProjectTool[]> {
    const methods = this.ports.methods();
    const connection = await this.sftpConnection();
    const sftpMethods = connection.methods;
    return PROJECT_TOOLS.filter(tool => tool.plugin === "sftp" ? sftpMethods.includes(tool.method)
      : ["mcp.authorization", "mcp.sftpConnection", "mcp.query"].includes(tool.method)
        || tool.method === "mcp.fileReview" && sftpMethods.includes("files.cleanup.status") || Object.hasOwn(methods, tool.method));
  }
  private async sftpConnection(): Promise<{ ok: boolean; methods: string[]; error?: string }> {
    if (!this.ports.sftp) return { ok: false, methods: [], error: "SimpleSFTP is not connected to this project window" };
    try { return { ok: true, methods: await this.ports.sftp.methods() }; }
    catch (error) { return { ok: false, methods: [], error: String((error as Error).message) }; }
  }
  async authorize(name: string, argumentsValue: unknown): Promise<ProjectTool> {
    const tool = (await this.catalog()).find(row => row.name === name);
    if (!tool) throw Error("MCP_TOOL_UNAVAILABLE: " + name);
    validateToolArguments(tool.inputSchema, argumentsValue);
    const args = argumentsValue as Record<string, any>;
    if (tool.name === "task_dispatch") validateDispatch(args);
    if (args.location === "worker" && !args.workerId || args.location === "local" && args.workerId) throw Error("MCP_FILE_NODE_REQUIRED");
    const grant = this.ports.store.get<ProjectAuthorization>(AUTHORIZATION_KEY);
    const needsWorkers = tool.permission || tool.additionalPermissions?.length || args.serverIds || args.workerId || args.sourceWorkerId;
    const workers = needsWorkers ? this.ports.workers(tool.name === "worker_configure") : [];
    const ids = args.location === "local" ? [] : args.serverIds || (args.workerId ? [args.workerId] : args.sourceWorkerId
      ? [args.sourceWorkerId, args.destinationWorkerId] : workers.map(row => row.id));
    if (ids.some((id: string) => !workers.some(row => row.id === id))) throw Error("MCP_WORKER_UNKNOWN");
    for (const permission of [tool.permission, ...(tool.additionalPermissions || [])].filter(Boolean))
      assertProjectAuthorization(grant, this.ports.root(), workers.filter(row => ids.includes(row.id)), permission!);
    return tool;
  }
  async call(name: string, argumentsValue: unknown, context?: any): Promise<unknown> {
    const root = this.ports.root();
    const tool = await this.authorize(name, argumentsValue);
    if (root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
    const args = argumentsValue as Record<string, any>;
    const grant = this.ports.store.get<ProjectAuthorization>(AUTHORIZATION_KEY);
    if (tool.method === "mcp.authorization") return { workspace: root, authorization: grant || null, userCommand: "simpleExperiment.manageAiAuthorization" };
    if (tool.method === "mcp.sftpConnection") return this.sftpConnection();
    if (tool.method === "mcp.fileReview") return this.ports.reviewFiles!(args);
    if (tool.method === "mcp.query") return queryProject(root, async (method, params) => {
      const methods = this.ports.methods();
      if (!Object.hasOwn(methods, method)) throw Object.assign(new Error("Method not found: " + method), { apiCode: -32601 });
      return methods[method](params, undefined, context);
    }, tool.action!, args);
    const scopedWorkers = () => {
      const workers = this.ports.workers(tool.name === "worker_configure");
      const ids = args.location === "local" ? [] : args.serverIds || (args.workerId ? [args.workerId] : args.sourceWorkerId
        ? [args.sourceWorkerId, args.destinationWorkerId] : workers.map(row => row.id));
      if (ids.some((id: string) => !workers.some(row => row.id === id))) throw Error("MCP_WORKER_UNKNOWN");
      return workers.filter(row => ids.includes(row.id));
    };
    const selectedWorkers = tool.permission || tool.additionalPermissions?.length ? structuredClone(scopedWorkers()) : [];
    if (tool.requiresUserApproval && !await this.ports.approve?.(tool, args)) throw Error("MCP_USER_APPROVAL_REQUIRED: " + tool.description);
    if (root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
    // Confirmation factors originate from the host's verified user grant. Destructive
    // cleanup keeps its original stored double-confirmation state and receives no factors.
    const cleanup = tool.method.startsWith("plans.cleanup.") || tool.method.startsWith("files.cleanup.");
    const params = { ...args, ...((tool.permission || tool.requiresUserApproval) && !cleanup ? { confirm: true } : {}),
      ...(tool.method === "project.prepare" ? { startSessions: true } : {}),
      ...(tool.method === "plans.cleanup.preview" && args.action === "delete" ? { authorizationMode: "confirmed_paths" } : {}),
      ...(tool.method.startsWith("workflow.") ? { workspace: this.ports.root() } : {}),
      ...(tool.method === "operations.list" ? { filtered: true } : {}),
      ...(tool.method === "invoke" ? { command: tool.action } : {}),
      ...(tool.method === "agents.lifecycle" ? { action: tool.action || "inspect" } : {}) };
    if (tool.name === "task_dispatch" && params.stopRunning !== true) delete params.stopRunning;
    const invocation = {
      permission: permission => {
        if (root !== this.ports.root()) throw Error("MCP_WORKSPACE_CHANGED");
        const workers = scopedWorkers();
        if (!isDeepStrictEqual(selectedWorkers, workers)) throw Error("MCP_WORKER_TARGET_CHANGED");
        assertProjectAuthorization(this.ports.store.get<ProjectAuthorization>(AUTHORIZATION_KEY), root, workers, permission);
      }, workers: scopedWorkers,
    } satisfies NonNullable<ReturnType<typeof mcpInvocation.getStore>>;
    for (const permission of [tool.permission, ...(tool.additionalPermissions || [])].filter(Boolean)) invocation.permission(permission!);
    const result = await mcpInvocation.run(invocation, () => tool.plugin === "sftp"
      ? this.ports.sftp!.call(tool.method, params)
      : this.ports.methods()[tool.method](params, undefined, context));
    if (tool.name === "project_state" && args.detail !== "full") {
      const fields = ["workspace", "extensionVersion", "topology", "health", "selection", "projectOnboarding", "workerTelemetryStatus", "actionErrors"];
      return { ...Object.fromEntries(fields.filter(key => Object.hasOwn(result, key)).map(key => [key, result[key]])),
        detail: "summary", fullDetailTool: "project_state", fullDetailArguments: { detail: "full" } };
    }
    return result;
  }
}
