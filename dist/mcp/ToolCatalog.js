"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_TOOLS = void 0;
exports.validateToolArguments = validateToolArguments;
const text = (description) => ({ type: "string", description });
const texts = (description) => ({ type: "array", items: text(description) });
const boolean = { type: "boolean" };
const integer = { type: "integer" };
const object = { type: "object" };
const plan = { planFile: text("Saved project-relative PLAN YAML path") };
const task = { workerId: text("Configured enabled Worker ID"), commandId: text("Original command ID") };
const operation = { operationId: text("Existing operation ID, returned by the host") };
const fileNode = { location: { type: "string", enum: ["local", "worker"] }, workerId: task.workerId };
const token = { token: text("Original project-owned cleanup token") };
const fileTarget = { type: "object", properties: { relativePath: text("Exact project-relative path"), type: { type: "string", enum: ["file", "directory"] } }, required: ["relativePath", "type"], additionalProperties: false };
function tool(name, method, description, properties = {}, required = [], permission, action, plugin = "experiment") {
    const additionalPermissions = ["workflow.plan", "workflow.run", "plan.validate", "project.bootstrap"].includes(method) ? ["sync", "agents"] : [];
    return { name, method, description, plugin, permission, action, additionalPermissions,
        inputSchema: { type: "object", properties, required, additionalProperties: false } };
}
function approvalTool(name, method, description, properties, required = [], plugin = "sftp") {
    return { ...tool(name, method, description + "; requires an exact-target user approval in VS Code", properties, required, undefined, undefined, plugin), requiresUserApproval: true };
}
exports.PROJECT_TOOLS = [
    tool("project_status", "status", "Current project and running plugin identity"),
    tool("action_catalog", "actions.list", "Inspect actual host actions; catalog flags do not grant permission"),
    tool("project_state", "state", "Panel state. Summary returns project, readiness and current selections; request full for every panel field", { detail: { type: "string", enum: ["summary", "full"] } }),
    tool("project_authorization", "mcp.authorization", "Inspect the user-managed project authorization; this tool cannot change it"),
    tool("project_registry", "projects.registry", "Inspect registered ancestor and branch projects"),
    tool("project_instances", "projects.instances", "Inspect known project windows; each call still uses its bound live instance"),
    tool("project_connect", "invoke", "Start the configured enabled Workers' background tunnels", {}, [], "agents", "startAllConnections"),
    tool("project_prepare", "project.prepare", "Prepare the current project and configured enabled Workers", {}, [], "agents"),
    tool("project_bootstrap", "project.bootstrap", "Recognize the current project using existing project defaults", plan, [], "configuration"),
    tool("project_bootstrap_operation", "project.bootstrap.operation", "Query project bootstrap", operation, ["operationId"]),
    tool("plan_list", "plans.list", "List current and archived PLANs"),
    tool("plan_preflight", "workflow.plan", "Run the complete PLAN preflight, including required synchronization and directory creation", plan, ["planFile"], "experiment"),
    tool("plan_validate", "plan.validate", "Validate one saved PLAN through the normal host workflow", plan, ["planFile"], "experiment"),
    tool("plan_run", "workflow.run", "Submit a saved PLAN. Returns an operation receipt; query tasks to establish actual execution", { ...plan, ...operation }, ["planFile"], "experiment"),
    tool("plan_filter", "plans.filter", "Preview PLAN selection by structured criteria", { query: text("Search text"), status: texts("PLAN status"), ...plan, archived: boolean }),
    tool("task_list", "tasks.list", "Actively query Worker tasks and their native completion evidence"),
    tool("task_stop", "tasks.stop", "Stop exactly one job by its original command ID; preserve other jobs, logs and artifacts", {
        ...task, workflowId: text("Original workflow ID, when present"),
    }, ["workerId", "commandId"], "experiment"),
    tool("plan_stop", "invoke", "Stop the selected PLAN operation and its tasks; use task_stop for one job", {
        workerId: task.workerId, ...plan, ...operation,
        manualStopType: { type: "string", enum: ["manual_stop_bad_code_or_no_effect", "manual_stop_converged"] },
    }, ["workerId", "planFile", "operationId", "manualStopType"], "experiment", "stopExperiment"),
    tool("task_dispatch", "tasks.dispatch", "Dispatch selected queued job indices to a configured Worker and GPU", { workflowId: text("Existing workflow ID"), indices: { type: "array", items: integer }, workerId: task.workerId, gpuId: text("GPU ID") }, ["workflowId", "indices", "workerId", "gpuId"], "experiment"),
    tool("task_preflight", "tasks.preflight", "Read-only preflight of one existing Worker task", { ...task, environmentOnly: boolean, completedOutputVerify: boolean }, ["workerId", "commandId"]),
    tool("task_preflight_status", "tasks.preflight.status", "Observe the original task preflight", { workerId: task.workerId, ...operation }, ["workerId", "operationId"]),
    tool("task_preflight_cancel", "tasks.preflight.cancel", "Cancel an existing read-only preflight", { workerId: task.workerId, ...operation }, ["workerId", "operationId"], "experiment"),
    tool("task_analyze", "tasks.analyze", "Read actual runtime diagnostics for a task", { ...task, outputDir: text("Declared task output directory") }, ["workerId", "commandId"]),
    tool("operation_list", "operations.list", "Observe operation receipts and real completion status", { ...operation, ...plan, status: text("Operation status"), offset: integer, limit: integer }),
    tool("operation_get", "mcp.operation", "Retrieve a long MCP tool request's outcome and complete structured result", operation, ["operationId"]),
    tool("gpu_status", "gpu.list", "Current Worker GPU observations"),
    tool("gpu_history", "gpu.history", "Recorded GPU observations"),
    tool("log_read", "live.output", "Read selected task output; since is the remote service's event cursor", { workerId: task.workerId, runKey: text("Original run key"), since: integer }, ["workerId", "runKey"]),
    tool("tmux_list", "tmux.list", "List actual windows of a configured Worker", { workerId: task.workerId }, ["workerId"]),
    tool("tmux_capture", "tmux.capture", "Read the complete available capture of the exact Worker window", { workerId: task.workerId, window: text("Exact tmux window ID") }, ["workerId", "window"]),
    tool("result_collect", "results.list", "Actively collect verified results and publish the configured summaries", plan, [], "results"),
    tool("server_test", "server.testAll", "Check all configured enabled Worker connections", { refresh: boolean }),
    tool("agent_inspect", "agents.lifecycle", "Inspect assigned Agent services", { serverIds: texts("Configured Worker ID") }, ["serverIds"]),
    ...["ensure", "stop", "restart", "migrate"].map(action => tool("agent_" + action, "agents.lifecycle", `${action} only the configured Workers' assigned Agent windows`, { serverIds: texts("Configured Worker ID"), ...(action === "migrate" ? { migrationDigests: object } : {}) }, ["serverIds"], "agents", action)),
    tool("configuration_list", "config.list", "Inspect plugin configuration"),
    tool("state_keys", "state.list", "Inspect available plugin state keys and their storage scope"),
    tool("state_value", "state.get", "Read one plugin state value", { key: text("Declared state key") }, ["key"]),
    approvalTool("state_set", "state.set", "Change an explicitly declared writable plugin state key", { key: text("Declared writable state key"), value: {} }, ["key", "value"], "experiment"),
    approvalTool("state_reset", "state.reset", "Reset an explicitly declared writable plugin state key", { key: text("Declared writable state key") }, ["key"], "experiment"),
    tool("configuration_get", "config.get", "Read one configuration value", { key: text("Configuration key") }, ["key"]),
    tool("configuration_set", "config.set", "Set a workspace configuration value", { key: text("Configuration key"), value: {}, scope: { type: "string", enum: ["workspace", "workspaceFolder"] } }, ["key", "value", "scope"], "configuration"),
    tool("configuration_reset", "config.reset", "Reset a workspace configuration value", { key: text("Configuration key"), scope: { type: "string", enum: ["workspace", "workspaceFolder"] } }, ["key", "scope"], "configuration"),
    { ...tool("worker_configure", "workers.configure", "Save the selected Worker's globally shared environment and GPU settings; affects every project and requires user approval", {
            workerId: task.workerId, patch: { type: "object", properties: {
                    condaEnvMode: { type: "string", enum: ["inherit", "system", "path"] }, condaEnv: text("Absolute research environment path"),
                    maxConcurrentGpus: {}, gpuJobsPerCard: integer, gpuMinFreeMemoryGb: { type: "number" }, gpuMaxConcurrentCards: integer,
                }, additionalProperties: false },
        }, ["workerId", "patch"], "configuration"), requiresUserApproval: true },
    tool("flow_get", "flow.get", "Inspect the current workflow steps"),
    tool("flow_update", "flow.update", "Update a workflow step", { step: text("Workflow step"), completed: boolean, blocked: boolean, appliedAt: text("Evidence timestamp") }, ["step"], "configuration"),
    tool("panel_diagnostics", "panel.diagnostics", "Inspect current panel health and render evidence"),
    tool("draft_list", "drafts.list", "List existing experiment drafts"),
    tool("draft_validate", "drafts.validate", "Validate a draft", { draftPlanPath: text("Project-relative draft PLAN path") }, ["draftPlanPath"]),
    tool("draft_promotion_preview", "drafts.promotionPreview", "Read historical promotion evidence; promotion itself is retired", { draftPlanPath: text("Project-relative draft PLAN path") }, ["draftPlanPath"]),
    tool("draft_review", "drafts.review", "Record a draft review", { draftPlanPath: text("Project-relative draft PLAN path"), reviewedBy: text("Reviewer") }, ["draftPlanPath"], "configuration"),
    tool("draft_reject", "drafts.reject", "Reject a draft without deleting its files", { draftPlanPath: text("Project-relative draft PLAN path"), reviewedBy: text("Reviewer") }, ["draftPlanPath"], "configuration"),
    tool("draft_cleanup_candidates", "drafts.cleanupCandidates", "Preview draft cleanup candidates"),
    tool("cleanup_list", "plans.cleanup.list", "List existing protected cleanup requests"),
    tool("cleanup_status", "plans.cleanup.status", "Observe an existing cleanup request", operation, ["operationId"]),
    tool("cleanup_preview", "plans.cleanup.preview", "Build a protected path preview for user review", { ...plan, action: { type: "string", enum: ["move", "delete", "isolate"] }, verifiedOnly: boolean }, ["planFile"]),
    tool("cleanup_continue", "plans.cleanup.continue", "Continue collecting the same cleanup preview", { ...operation, verifiedOnly: boolean }, ["operationId"]),
    tool("cleanup_recheck", "plans.cleanup.recheck", "Recheck one node of an existing cleanup preview", { nodeId: text("Exact preview node ID") }, ["nodeId"]),
    tool("cleanup_cancel", "plans.cleanup.cancel", "Cancel an existing cleanup request", operation, ["operationId"], "sync"),
    tool("cleanup_resume", "plans.cleanup.resume", "Continue an existing human-confirmed cleanup request", operation, ["operationId"], "sync"),
    tool("cleanup_restore_preview", "plans.cleanup.restore", "Preview restoration from the original cleanup operation", operation, ["operationId"]),
    tool("cleanup_execute", "plans.cleanup.execute", "Execute the existing cleanup request after the required human path confirmations", operation, ["operationId"], "sync"),
    tool("file_cleanup_preview", "files.cleanup.preview", "Freeze exact file targets for human review; does not delete or confirm", {
        ...fileNode, action: { type: "string", enum: ["move", "delete", "restore", "isolate"] }, targets: { type: "array", items: fileTarget },
    }, ["location", "action", "targets"], undefined, undefined, "sftp"),
    tool("file_cleanup_inspect", "files.cleanup.inspect", "Observe one exact project file target", { ...fileNode, target: fileTarget, presenceOnly: boolean, allowMissing: boolean }, ["location", "target"], undefined, undefined, "sftp"),
    tool("file_cleanup_observe_batch", "files.cleanup.observeBatch", "Actively observe a batch of exact project paths without deleting them", {
        ...fileNode, observationId: text("Identity of this observation round"), rootIdentity: object,
        readConcurrency: { type: "integer" }, targets: { type: "array", items: { ...fileTarget, properties: { ...fileTarget.properties,
                    backendToken: text("Original preview token, if observing a frozen request"), backendIndex: integer,
                    isolationRelativePath: text("Original preview isolation path"), fingerprint: text("Original preview content identity"),
                } } },
    }, ["location", "observationId", "targets"], undefined, undefined, "sftp"),
    tool("file_cleanup_review", "mcp.fileReview", "Open local human path review for a frozen file request; permanent deletion needs both review pages", { ...fileNode, ...token }, ["location", "token"]),
    ...["status", "check", "verify"].map(action => tool("file_cleanup_" + action, "files.cleanup." + action, "Observe the original file cleanup request", {
        ...fileNode, ...token, ...(action !== "status" ? { index: integer } : {}),
    }, ["location", "token", ...(action !== "status" ? ["index"] : [])], undefined, undefined, "sftp")),
    ...["execute", "settle"].map(action => tool("file_cleanup_" + action, "files.cleanup." + action, "Continue the original file cleanup after stored human confirmations; no confirmation factors accepted", {
        ...fileNode, ...token, digest: text("Original frozen preview digest"), index: integer,
    }, ["location", "token", "digest", "index"], "sync", undefined, "sftp")),
    tool("sftp_status", "status", "Inspect the same-window SimpleSFTP service", {}, [], undefined, undefined, "sftp"),
    tool("sftp_connection", "mcp.sftpConnection", "Inspect availability or the actual connection error of the companion SimpleSFTP instance"),
    tool("sftp_servers", "servers.list", "List configured SimpleSFTP server profiles", {}, [], undefined, undefined, "sftp"),
    tool("sftp_target", "target.show", "Inspect the current workspace transfer target", {}, [], undefined, undefined, "sftp"),
    tool("sftp_transfers", "transfers.list", "Observe the current window's transfers", {}, [], undefined, undefined, "sftp"),
    tool("sftp_configuration_list", "config.list", "Inspect companion plugin configuration", {}, [], undefined, undefined, "sftp"),
    tool("sftp_configuration_get", "config.get", "Read one companion plugin configuration", { key: text("Configuration key") }, ["key"], undefined, undefined, "sftp"),
    approvalTool("sftp_configuration_set", "config.set", "Change a global companion plugin setting", { key: text("Configuration key"), value: {} }, ["key", "value"]),
    approvalTool("sftp_configuration_reset", "config.reset", "Reset a global companion plugin setting", { key: text("Configuration key") }, ["key"]),
    approvalTool("sftp_server_activate", "servers.setActive", "Change the global active server profile", { id: text("Configured SimpleSFTP profile ID") }, ["id"]),
    approvalTool("sftp_server_save", "servers.save", "Create or update a server profile", { server: {
            type: "object", properties: { id: text("Profile ID"), label: text("Display name"), host: text("SSH host"), port: integer,
                username: text("SSH account"), remotePath: text("Absolute remote project root"), privateKeyPath: text("Existing local key path") }, additionalProperties: false,
        }, setActive: boolean }, ["server"]),
    approvalTool("sftp_server_delete", "servers.delete", "Remove a server profile record", { id: text("Exact profile ID") }, ["id"]),
    approvalTool("sftp_server_import", "servers.importSshConfig", "Import SSH profiles into the global server directory", {}),
    approvalTool("sftp_target_update", "target.update", "Change this workspace's SFTP target", { patch: {
            type: "object", properties: { host: text("SSH host"), port: integer, username: text("SSH account"), remotePath: text("Absolute remote project root") }, additionalProperties: false,
        } }, ["patch"]),
    approvalTool("sftp_confirmation_reset", "confirmations.reset", "Reset the companion plugin's remembered path prompts", {}),
    tool("sftp_transfer_reconcile", "transfers.reconcile", "Observe the original transfer outcome without supplying retry commands", { ...operation, operationInstanceId: text("Original transfer instance") }, ["operationId"], undefined, undefined, "sftp"),
    tool("sftp_transfer_cancel", "transfers.cancel", "Cancel an exact transfer owned by this project window", { ...operation, operationInstanceId: text("Original transfer instance"), transferId: text("Transfer ID"), reason: text("Reason") }, ["operationId"], "sync", undefined, "sftp"),
    ...[
        ["sftp_tree", "sync.projectTree", "List the selected Worker's project tree"],
        ["sftp_tree_state", "sync.projectTreeState", "Inspect the project tree observation state"],
        ["sftp_inventory", "sync.projectInventory", "Inspect scoped project content identities"],
        ["sftp_file_stats", "sync.projectFileStats", "Inspect selected project file metadata"],
    ].map(([name, method, description]) => tool(name, method, description, {
        workerId: task.workerId, relativePath: text("Project-relative directory"), paths: texts("Project-relative path"),
    }, ["workerId", ...(method === "sync.projectFileStats" ? ["paths"] : [])], undefined, undefined, "sftp")),
    tool("sftp_plan_logs", "sync.planLogPaths", "List log paths belonging to the exact PLAN state", {
        workerId: task.workerId, ...plan, statePath: text("Project-relative Scheduler state path"),
    }, ["workerId", "planFile", "statePath"], undefined, undefined, "sftp"),
    tool("sftp_download_scope", "downloadScope.configure", "Save the current project's download scope", {
        workerId: task.workerId, paths: texts("Project-relative path"), extensions: texts("File extension"), maxFileSizeMB: { type: "number" },
    }, ["workerId"], "sync", undefined, "sftp"),
    tool("sftp_handoff", "handoff.markReady", "Upload this project and mark its handoff ready", { workerId: task.workerId }, ["workerId"], "sync", undefined, "sftp"),
    tool("sftp_from_remote", "sync.fromRemote", "Download this project's saved selected scope from its configured Worker", { workerId: task.workerId }, ["workerId"], "sync", undefined, "sftp"),
    tool("sftp_remote_directories", "remote.listDirs", "List directories inside the selected Worker's configured project root", { workerId: task.workerId, relativePath: text("Project-relative directory, empty for root") }, ["workerId"], undefined, undefined, "sftp"),
    tool("sftp_download_mapped", "sync.downloadMappedPaths", "Read exact mapped metric files into memory without saving raw metrics locally", {
        workerId: task.workerId, entries: { type: "array", items: { type: "object", properties: {
                    remotePath: text("Source path within the configured Worker project"), localRelativePath: text("Project-relative logical destination"),
                    bytes: integer, sha256: text("Expected content identity if supplied by the source manifest"),
                }, required: ["remotePath", "localRelativePath"], additionalProperties: false } },
    }, ["workerId", "entries"], "sync", undefined, "sftp"),
    tool("sftp_upload_files", "upload.files", "Upload exact workspace files to the configured Worker", {
        workerId: task.workerId, files: texts("Project-relative source file"),
    }, ["workerId", "files"], "sync", undefined, "sftp"),
    tool("sftp_upload_workspace", "upload.workspace", "Upload this workspace with its existing configured upload scope", { workerId: task.workerId }, ["workerId"], "sync", undefined, "sftp"),
    tool("sftp_download_paths", "sync.downloadPaths", "Download exact declared paths from the configured Worker to this workspace", {
        workerId: task.workerId, paths: texts("Project-relative path"),
    }, ["workerId", "paths"], "sync", undefined, "sftp"),
    tool("sftp_worker_sync", "sync.serverToServerFpsync", "Sync exact project paths between configured Workers", {
        sourceWorkerId: task.workerId, destinationWorkerId: task.workerId, paths: texts("Project-relative path"),
        compression: { type: "string", enum: ["auto", "gzip", "zstd", "none"] },
    }, ["sourceWorkerId", "destinationWorkerId", "paths"], "sync", undefined, "sftp"),
    tool("sftp_worker_directory", "sync.serverToServer", "Sync one declared project directory between configured Workers without deletion", {
        sourceWorkerId: task.workerId, destinationWorkerId: task.workerId, relativePath: text("Project-relative subdirectory"),
    }, ["sourceWorkerId", "destinationWorkerId", "relativePath"], "sync", undefined, "sftp"),
    tool("sftp_worker_batch", "sync.serverToServerBatch", "Sync an explicit project file batch between configured Workers", {
        sourceWorkerId: task.workerId, destinationWorkerId: task.workerId, relativePaths: texts("Project-relative file"),
    }, ["sourceWorkerId", "destinationWorkerId", "relativePaths"], "sync", undefined, "sftp"),
    ...["list", "summary", "active", "tree", "overview", "health"].map(action => tool("experiment_" + action, "mcp.query", "Structured CLI business view: experiment " + action, { full: boolean, ...(action === "list" ? {
            status: text("Exact experiment status filter"), type: { type: "string", enum: ["workflow", "worker_run"] }, limit: integer,
        } : {}) }, [], undefined, "experiment_" + action)),
    ...["status", "inspect", "monitor", "diagnose", "config", "log"].map(action => tool("experiment_" + action, "mcp.query", "Structured one-shot experiment " + action + "; never starts a background watch", { id: text("Exact experiment or command ID"), full: boolean, ...(action === "log" ? { lines: integer } : {}) }, ["id"], undefined, "experiment_" + action)),
    ...["result_list", "metric_list"].map(name => tool(name, "mcp.query", "Actively collect the project's complete " + name + " view", {}, [], "results", name)),
    ...["result_show", "metric_show", "experiment_results"].map(name => tool(name, "mcp.query", "Actively collect exact result details and source evidence", { id: text("Exact result or experiment ID") }, ["id"], "results", name)),
    tool("result_export", "mcp.query", "Export exact results as structured content; returns content without saving raw metrics locally", {
        id: text("Exact result ID"), format: { type: "string", enum: ["csv", "json"] },
    }, ["id"], "results", "result_export"),
    tool("result_compare", "mcp.query", "Compare two exact result rows using the same CLI comparison logic", { left: text("Left result ID"), right: text("Right result ID") }, ["left", "right"], "results", "result_compare"),
    ...["result_parse", "result_paper_table", "metric_leaderboard"].map(name => tool(name, "mcp.query", "Parse an existing project file through the shared " + name + " implementation", {
        file: text("Existing project-relative input file"), metrics: texts("Metric name"), primary: text("Primary metric"), preset: text("Existing parser preset ID"),
        ...(name === "result_paper_table" ? { format: { type: "string", enum: ["json", "markdown", "csv", "latex"] } } : {}),
    }, ["file"], undefined, name)),
    ...["artifact_list", "artifact_inspect"].map(name => tool(name, "mcp.query", "Inspect artifact metadata through the shared CLI business view", { id: text("Exact experiment or artifact ID") }, ["id"], "results", name)),
    tool("resource_available", "mcp.query", "Inspect current GPU availability and observed task allocations", {}, [], undefined, "resource_available"),
    tool("server_list", "mcp.query", "Inspect configured servers through the shared CLI view", {}, [], undefined, "server_list"),
    tool("plan_matrix", "mcp.query", "Expand a saved project PLAN without submitting it", plan, ["planFile"], undefined, "plan_matrix"),
    tool("plan_build", "mcp.query", "Generate PLAN YAML content from explicit seeds; does not save or run it", { suite: text("Suite"), base: text("Project-relative base config"), seeds: texts("Explicit seed") }, ["suite", "base", "seeds"], undefined, "plan_build"),
];
function validateToolArguments(schema, value, location = "arguments") {
    if (schema.type === "object") {
        if (!value || typeof value !== "object" || Array.isArray(value))
            throw Error(location + " must be an object");
        const row = value;
        for (const key of schema.required || [])
            if (!Object.hasOwn(row, key))
                throw Error(location + "." + key + " is required");
        for (const [key, item] of Object.entries(row)) {
            const property = schema.properties?.[key];
            if (!property && schema.additionalProperties === false)
                throw Error("Unknown " + location + "." + key);
            if (property)
                validateToolArguments(property, item, location + "." + key);
        }
    }
    else if (schema.type === "array") {
        if (!Array.isArray(value))
            throw Error(location + " must be an array");
        if (schema.items)
            for (const item of value)
                validateToolArguments(schema.items, item, location);
    }
    else if (schema.type === "integer") {
        if (!Number.isSafeInteger(value))
            throw Error(location + " must be an integer");
    }
    else if (schema.type && typeof value !== schema.type)
        throw Error(location + " must be " + schema.type);
    if (schema.enum && !schema.enum.includes(value))
        throw Error(location + " has an unsupported value");
}
