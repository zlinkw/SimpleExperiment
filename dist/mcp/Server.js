"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMcpServer = startMcpServer;
exports.createProjectMcpServer = createProjectMcpServer;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const LocalApiClient_1 = require("../cli/LocalApiClient");
async function startMcpServer(argv = process.argv.slice(2)) {
    const flags = {};
    for (let index = 0; index < argv.length; index += 2) {
        const key = argv[index], value = argv[index + 1];
        if (!["--workspace", "--instance"].includes(key) || flags[key] || !value || value.startsWith("--"))
            throw Error("Usage: simpleex-mcp --workspace ABSOLUTE_PROJECT_PATH [--instance PID:STARTED_AT]");
        flags[key] = value;
    }
    const workspace = flags["--workspace"];
    if (!workspace)
        throw Error("MCP_WORKSPACE_REQUIRED: pass --workspace ABSOLUTE_PROJECT_PATH");
    const pin = flags["--instance"] || process.env.SIMPLE_CLI_INSTANCE_ID;
    const explicitDiscoveryPath = process.env.SIMPLE_EXPERIMENT_API_FILE;
    const discoveryPath = explicitDiscoveryPath
        || (await (0, LocalApiClient_1.resolveInstanceByWorkspace)("experiment", workspace, pin)).discoveryPath;
    const instance = await (0, LocalApiClient_1.preflightPluginAt)("experiment", discoveryPath, workspace);
    (0, LocalApiClient_1.assertInstancePin)(pin, instance);
    // Workspace connections follow a normal host reload; explicit instance/file pins remain fixed.
    // Resolution happens before the business request, never as a retry of a submitted write.
    const rpc = (method, params = {}) => (0, LocalApiClient_1.callPluginRpc)("experiment", method, params, pin, { workspace, ...(explicitDiscoveryPath ? { discoveryPath: explicitDiscoveryPath } : {}), expectedVersion: String(instance.capabilities.version) });
    await createProjectMcpServer(String(instance.capabilities.version), rpc).connect(new stdio_js_1.StdioServerTransport());
}
function createProjectMcpServer(version, rpc) {
    const catalog = async () => await rpc("mcp.catalog");
    const server = new index_js_1.Server({ name: "simple-experiment", version }, { capabilities: { tools: {} } });
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({ tools: (await catalog()).map(tool => ({
            name: tool.name, description: tool.description, inputSchema: tool.inputSchema,
            outputSchema: { type: "object", properties: { ok: { type: "boolean" }, operationId: { type: "string" }, status: { description: "Native host status; an MCP request receipt does not prove experiment completion" },
                    error: { type: "string" }, result: {}, nextTool: { type: "string" } }, additionalProperties: true },
            annotations: { readOnlyHint: !tool.permission && !tool.requiresUserApproval,
                destructiveHint: ["cleanup_execute", "file_cleanup_execute"].includes(tool.name) || !!tool.requiresUserApproval, openWorldHint: false },
        })) }));
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        try {
            const result = await rpc("mcp.call", { tool: request.params.name, arguments: request.params.arguments || {} });
            const payload = result && typeof result === "object" && !Array.isArray(result) ? result : { result };
            return { structuredContent: payload, content: [{ type: "text", text: JSON.stringify(payload) }],
                isError: payload.ok === false };
        }
        catch (error) {
            const payload = { ok: false, error: String(error.message || error), code: error.apiCode, detail: error.apiData };
            return { isError: true, structuredContent: payload, content: [{ type: "text", text: JSON.stringify(payload) }] };
        }
    });
    return server;
}
if (require.main === module)
    void startMcpServer().catch(error => { process.stderr.write(String(error.message || error) + "\n"); process.exitCode = 1; });
