import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { callPluginRpc, resolveInstanceByWorkspace, preflightPluginAt, assertInstancePin } from "../cli/LocalApiClient";
import type { ProjectTool } from "./ToolCatalog";

export async function startMcpServer(argv = process.argv.slice(2)): Promise<void> {
  const flags: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index], value = argv[index + 1];
    if (!["--workspace", "--instance"].includes(key) || flags[key] || !value || value.startsWith("--"))
      throw Error("Usage: simpleex-mcp --workspace ABSOLUTE_PROJECT_PATH [--instance PID:STARTED_AT]");
    flags[key] = value;
  }
  const workspace = flags["--workspace"];
  if (!workspace) throw Error("MCP_WORKSPACE_REQUIRED: pass --workspace ABSOLUTE_PROJECT_PATH");
  const pin = flags["--instance"] || process.env.SIMPLE_CLI_INSTANCE_ID;
  const explicitDiscoveryPath = process.env.SIMPLE_EXPERIMENT_API_FILE;
  const discoveryPath = explicitDiscoveryPath
    || (await resolveInstanceByWorkspace("experiment", workspace, pin)).discoveryPath;
  const instance = await preflightPluginAt("experiment", discoveryPath, workspace);
  assertInstancePin(pin, instance);
  // Workspace connections follow a normal host reload; explicit instance/file pins remain fixed.
  // Resolution happens before the business request, never as a retry of a submitted write.
  const rpc = (method: string, params: Record<string, unknown> = {}) => callPluginRpc("experiment", method, params, pin,
    { workspace, ...(explicitDiscoveryPath ? { discoveryPath: explicitDiscoveryPath } : {}), expectedVersion: String(instance.capabilities.version) });
  await createProjectMcpServer(String(instance.capabilities.version), rpc).connect(new StdioServerTransport());
}

export function createProjectMcpServer(version: string, rpc: (method: string, params?: Record<string, unknown>) => Promise<unknown>): Server {
  const catalog = async () => await rpc("mcp.catalog") as ProjectTool[];
  const server = new Server({ name: "simple-experiment", version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: (await catalog()).map(tool => ({
    name: tool.name, description: tool.description, inputSchema: tool.inputSchema as any,
    outputSchema: tool.outputSchema as any,
    annotations: { readOnlyHint: !tool.permission && !tool.requiresUserApproval,
      destructiveHint: ["cleanup_execute", "file_cleanup_execute"].includes(tool.name) || !!tool.requiresUserApproval, openWorldHint: false },
  })) }));
  server.setRequestHandler(CallToolRequestSchema, async request => {
    try {
      const result = await rpc("mcp.call", { tool: request.params.name, arguments: request.params.arguments || {} });
      const payload = result && typeof result === "object" && !Array.isArray(result) ? result : { result };
      return { structuredContent: payload as Record<string, unknown>, content: [{ type: "text", text: JSON.stringify(payload) }],
        isError: (payload as any).ok === false };
    } catch (error: any) {
      const payload = { ok: false, error: String(error.message || error), code: error.apiCode, detail: error.apiData };
      return { isError: true, structuredContent: payload, content: [{ type: "text", text: JSON.stringify(payload) }] };
    }
  });
  return server;
}
if (require.main === module) void startMcpServer().catch(error => { process.stderr.write(String(error.message || error) + "\n"); process.exitCode = 1; });
