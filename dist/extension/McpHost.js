"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mcpOperations = mcpOperations;
exports.mcpGateway = mcpGateway;
exports.manageAiAuthorization = manageAiAuthorization;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs/promises"));
const ProjectGateway_1 = require("../mcp/ProjectGateway");
const ProjectOperations_1 = require("../mcp/ProjectOperations");
const SftpCleanupReview_1 = require("./SftpCleanupReview");
const ProjectAuthorization_1 = require("../mcp/ProjectAuthorization");
const Invocation_1 = require("../mcp/Invocation");
const node_util_1 = require("node:util");
function currentWorkers(host, includeDisabled = false) {
    host.refreshSharedConnectionSettings();
    const enabled = host.workerCodeSyncTargets().map((worker) => ({ id: worker.id, host: worker.host,
        port: worker.port, user: worker.user, projectRoot: worker.remotePath }));
    if (!includeDisabled)
        return enabled;
    const disabled = host.setupConfig.workerTunnels.filter((worker) => worker.enabled === false).map((worker) => ({
        ...worker, host: worker.workerHost || worker.hubHost || worker.transferHost || "", port: worker.workerSshPort || worker.hubSshPort || 22,
        user: worker.workerUser || worker.hubUser || "", projectRoot: worker.agentProjectDir || "",
    }));
    return [...enabled, ...disabled];
}
function mcpOperations(host) {
    return host.projectMcpOperations ||= new ProjectOperations_1.ProjectMcpOperations({
        root: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "", gateway: () => mcpGateway(host),
        records: () => host.localOperations, changed: () => { host.markLocalOperationsDirty(); host.postState(); },
    });
}
function mcpGateway(host) {
    const scopedFileCall = async (method, args) => {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
        const worker = args.workerId && currentWorkers(host).find(row => row.id === args.workerId);
        const node = args.location === "local" ? { id: "local", kind: "local", root }
            : worker ? { id: worker.id, kind: "remote", root: worker.projectRoot, host: worker.host, port: worker.port, user: worker.user } : undefined;
        if (!node)
            throw Error("MCP_FILE_NODE_REQUIRED");
        const { location, workerId, ...params } = args;
        if (params.token) {
            const existing = await host.simpleSftpApiCall("files.cleanup.status", { token: params.token, consumerRoot: root });
            if (["id", "kind", "root", "host", "port", "user"].some(key => String(existing.node?.[key] ?? "") !== String(node[key] ?? "")))
                throw Error("MCP_FILE_NODE_CHANGED");
        }
        if (root !== (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""))
            throw Error("MCP_WORKSPACE_CHANGED");
        if (worker && !(0, node_util_1.isDeepStrictEqual)(worker, currentWorkers(host).find(row => row.id === worker.id)))
            throw Error("MCP_WORKER_TARGET_CHANGED");
        if (["files.cleanup.execute", "files.cleanup.settle"].includes(method))
            Invocation_1.mcpInvocation.getStore()?.permission("sync");
        return host.simpleSftpApiCall(method, { ...params, node, consumerRoot: root,
            ...(method === "files.cleanup.preview" && params.action === "delete" ? { authorizationMode: "confirmed_paths" } : {}) });
    };
    return new ProjectGateway_1.ProjectGateway({ root: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
        workers: includeDisabled => currentWorkers(host, includeDisabled), store: host.context.workspaceState, methods: () => host.createLocalApiMethods(),
        reviewFiles: async (args) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
            const preview = await scopedFileCall("files.cleanup.status", args);
            (0, SftpCleanupReview_1.openSftpCleanupReview)(root, preview, (method, params) => scopedFileCall(method, { ...args, ...params }));
            return { requiresUserAction: true, token: preview.token, digest: preview.digest, requiredConfirmations: preview.action === "delete" ? 2 : 1, nextTool: "file_cleanup_status" };
        },
        approve: async (tool, args) => {
            const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const result = await vscode.window.showWarningMessage(tool.description, { modal: true, detail: `${root}\n${JSON.stringify(args, null, 2)}` }, "确认执行");
            if (root !== vscode.workspace.workspaceFolders?.[0]?.uri.fsPath)
                throw Error("MCP_WORKSPACE_CHANGED");
            return result === "确认执行";
        },
        sftp: {
            methods: async () => (await host.readSimpleSftpCapabilities()).methods,
            call: async (method, args) => {
                if (method.startsWith("files.cleanup."))
                    return scopedFileCall(method, args);
                const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
                const { workerId, sourceWorkerId, destinationWorkerId, ...params } = args;
                if (method === "sync.projectInventory" && params.includeHashes === true && !params.paths?.length)
                    throw Error("MCP_HASH_PATHS_REQUIRED: 请指定要核验内容的项目内路径。");
                const target = (id) => {
                    const row = host.workerCodeSyncTargets().find((worker) => worker.id === id);
                    if (!row)
                        throw Error("MCP_WORKER_UNKNOWN: " + id);
                    return host.sftpServerOptions(row);
                };
                const request = { ...params, localPath: root, localBase: root,
                    ...(method === "sync.projectInventory" ? { scopePaths: params.paths, metadataOnly: params.includeHashes !== true } : {}),
                    ...(method === "sync.serverToServerFpsync" ? { relativePaths: params.paths } : {}),
                    ...(method === "sync.serverToServer" ? { directory: true } : {}),
                    ...(method === "sync.downloadMappedPaths" ? { memoryOnly: true, metricsOnly: true } : {}),
                    ...(workerId ? { server: target(workerId), source: target(workerId) } : {}),
                    ...(sourceWorkerId ? { source: target(sourceWorkerId), destination: target(destinationWorkerId) } : {}),
                    ...(params.confirm === true ? { pathConfirmed: true } : {}) };
                if (method === "upload.files") {
                    const canonicalRoot = await fs.realpath(root);
                    request.files = await Promise.all(params.files.map(async (file) => {
                        const localPath = path.resolve(root, file);
                        const relative = path.relative(root, localPath);
                        if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
                            throw Error("MCP_PROJECT_FILE_REQUIRED");
                        const physical = path.relative(canonicalRoot, await fs.realpath(localPath));
                        if (physical === ".." || physical.startsWith(".." + path.sep) || path.isAbsolute(physical))
                            throw Error("MCP_PROJECT_FILE_REQUIRED");
                        return { localPath, remoteName: relative.split(path.sep).join("/") };
                    }));
                }
                if (method === "upload.workspace") {
                    request.manifest = await host.buildDistributedJobCodeManifest(root, false);
                    request.pruneManagedFiles = false;
                    request.transientManifest = true;
                }
                if (method === "remote.listDirs") {
                    const remoteRoot = target(workerId).remotePath;
                    const remotePath = path.posix.resolve(remoteRoot, params.relativePath || ".");
                    if (remotePath !== remoteRoot && !remotePath.startsWith(remoteRoot.replace(/\/$/, "") + "/"))
                        throw Error("MCP_PROJECT_DIRECTORY_REQUIRED");
                    Object.assign(request, { remotePath, server: { ...request.server, remotePath }, confirm: true, pathConfirmed: true });
                }
                if (root !== (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ""))
                    throw Error("MCP_WORKSPACE_CHANGED");
                if (["upload.files", "upload.workspace", "sync.serverToServerFpsync", "sync.serverToServer", "sync.serverToServerBatch"].includes(method))
                    Invocation_1.mcpInvocation.getStore()?.permission("sync");
                if (method === "upload.workspace" && !Object.keys(request.manifest).length)
                    return { ok: true, skipped: true, files: [], message: "当前代码同步范围没有文件。" };
                return host.simpleSftpApiCall(method, request);
            },
        } });
}
/** Only the local human-facing command can save or revoke authorization. */
async function manageAiAuthorization(host) {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root)
        throw Error("请先打开要授权的项目。");
    const choice = await vscode.window.showQuickPick([
        { label: "授权当前项目", value: "grant" }, { label: "撤销当前项目授权", value: "revoke" },
    ], { title: "AI 项目持续授权", placeHolder: root });
    if (!choice)
        return;
    if (root !== vscode.workspace.workspaceFolders?.[0]?.uri.fsPath)
        throw Error("MCP_WORKSPACE_CHANGED");
    if (choice.value === "revoke") {
        await host.context.workspaceState.update(ProjectAuthorization_1.AUTHORIZATION_KEY, undefined);
        void vscode.window.showInformationMessage("已撤销当前项目的 AI 写操作授权。");
        return;
    }
    await host.context.workspaceState.update(ProjectAuthorization_1.AUTHORIZATION_KEY, (0, ProjectAuthorization_1.createProjectAuthorization)(root));
    void vscode.window.showInformationMessage("AI 项目授权已保存，可通过同一命令撤销。永久删除与覆盖清理继续使用路径审核页。");
}
