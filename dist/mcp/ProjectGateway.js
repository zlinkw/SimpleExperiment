"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectGateway = void 0;
const ToolCatalog_1 = require("./ToolCatalog");
const ProjectAuthorization_1 = require("./ProjectAuthorization");
const ProjectQueries_1 = require("./ProjectQueries");
const Invocation_1 = require("./Invocation");
class ProjectGateway {
    ports;
    constructor(ports) {
        this.ports = ports;
    }
    async catalog() {
        const methods = this.ports.methods();
        const connection = await this.sftpConnection();
        const sftpMethods = connection.methods;
        return ToolCatalog_1.PROJECT_TOOLS.filter(tool => tool.plugin === "sftp" ? sftpMethods.includes(tool.method)
            : ["mcp.authorization", "mcp.sftpConnection", "mcp.query"].includes(tool.method)
                || tool.method === "mcp.fileReview" && sftpMethods.includes("files.cleanup.status") || Object.hasOwn(methods, tool.method));
    }
    async sftpConnection() {
        if (!this.ports.sftp)
            return { ok: false, methods: [], error: "SimpleSFTP is not connected to this project window" };
        try {
            return { ok: true, methods: await this.ports.sftp.methods() };
        }
        catch (error) {
            return { ok: false, methods: [], error: String(error.message) };
        }
    }
    async authorize(name, argumentsValue) {
        const tool = (await this.catalog()).find(row => row.name === name);
        if (!tool)
            throw Error("MCP_TOOL_UNAVAILABLE: " + name);
        (0, ToolCatalog_1.validateToolArguments)(tool.inputSchema, argumentsValue);
        const args = argumentsValue;
        if (args.location === "worker" && !args.workerId || args.location === "local" && args.workerId)
            throw Error("MCP_FILE_NODE_REQUIRED");
        const grant = this.ports.store.get(ProjectAuthorization_1.AUTHORIZATION_KEY);
        const needsWorkers = tool.permission || tool.additionalPermissions?.length || args.serverIds || args.workerId || args.sourceWorkerId;
        const workers = needsWorkers ? this.ports.workers() : [];
        const ids = args.location === "local" ? [] : args.serverIds || (args.workerId ? [args.workerId] : args.sourceWorkerId
            ? [args.sourceWorkerId, args.destinationWorkerId] : workers.map(row => row.id));
        if (ids.some((id) => !workers.some(row => row.id === id)))
            throw Error("MCP_WORKER_UNKNOWN");
        for (const permission of [tool.permission, ...(tool.additionalPermissions || [])].filter(Boolean))
            (0, ProjectAuthorization_1.assertProjectAuthorization)(grant, this.ports.root(), workers.filter(row => ids.includes(row.id)), permission);
        return tool;
    }
    async call(name, argumentsValue, context) {
        const root = this.ports.root();
        const tool = await this.authorize(name, argumentsValue);
        if (root !== this.ports.root())
            throw Error("MCP_WORKSPACE_CHANGED");
        const args = argumentsValue;
        const grant = this.ports.store.get(ProjectAuthorization_1.AUTHORIZATION_KEY);
        if (tool.method === "mcp.authorization")
            return { workspace: root, authorization: grant || null, userCommand: "simpleExperiment.manageAiAuthorization" };
        if (tool.method === "mcp.sftpConnection")
            return this.sftpConnection();
        if (tool.method === "mcp.fileReview")
            return this.ports.reviewFiles(args);
        if (tool.method === "mcp.query")
            return (0, ProjectQueries_1.queryProject)(root, async (method, params) => this.ports.methods()[method](params, undefined, context), tool.action, args);
        if (tool.requiresUserApproval && !await this.ports.approve?.(tool, args))
            throw Error("MCP_USER_APPROVAL_REQUIRED: " + tool.description);
        // Confirmation factors originate from the host's verified user grant. Destructive
        // cleanup keeps its original stored double-confirmation state and receives no factors.
        const cleanup = tool.method.startsWith("plans.cleanup.") || tool.method.startsWith("files.cleanup.");
        const params = { ...args, ...((tool.permission || tool.requiresUserApproval) && !cleanup ? { confirm: true } : {}),
            ...(tool.method === "project.prepare" ? { startSessions: true } : {}),
            ...(tool.method.startsWith("workflow.") ? { workspace: this.ports.root() } : {}),
            ...(tool.method === "operations.list" ? { filtered: true } : {}),
            ...(tool.method === "invoke" ? { command: tool.action } : {}),
            ...(tool.method === "agents.lifecycle" ? { action: tool.action || "inspect" } : {}) };
        if (tool.plugin === "sftp")
            return this.ports.sftp.call(tool.method, params);
        const scopedWorkers = () => {
            const workers = this.ports.workers();
            const ids = args.location === "local" ? [] : args.serverIds || (args.workerId ? [args.workerId] : workers.map(row => row.id));
            if (ids.some((id) => !workers.some(row => row.id === id)))
                throw Error("MCP_WORKER_UNKNOWN");
            return workers.filter(row => ids.includes(row.id));
        };
        const result = await Invocation_1.mcpInvocation.run({
            permission: permission => {
                if (root !== this.ports.root())
                    throw Error("MCP_WORKSPACE_CHANGED");
                (0, ProjectAuthorization_1.assertProjectAuthorization)(this.ports.store.get(ProjectAuthorization_1.AUTHORIZATION_KEY), root, scopedWorkers(), permission);
            }, workers: scopedWorkers,
        }, () => this.ports.methods()[tool.method](params, undefined, context));
        if (tool.name === "project_state" && args.detail !== "full") {
            const fields = ["workspace", "extensionVersion", "topology", "health", "selection", "projectOnboarding", "workerTelemetryStatus", "actionErrors"];
            return { ...Object.fromEntries(fields.filter(key => Object.hasOwn(result, key)).map(key => [key, result[key]])),
                detail: "summary", fullDetailTool: "project_state", fullDetailArguments: { detail: "full" } };
        }
        return result;
    }
}
exports.ProjectGateway = ProjectGateway;
