import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { ProjectGateway } from "../mcp/ProjectGateway";
import { ProjectMcpOperations } from "../mcp/ProjectOperations";
import { openSftpCleanupReview } from "./SftpCleanupReview";
import { AUTHORIZATION_KEY, PERMISSIONS, createProjectAuthorization, type AuthorizedWorker } from "../mcp/ProjectAuthorization";

function currentWorkers(host: any): AuthorizedWorker[] {
  host.refreshSharedConnectionSettings();
  return host.workerCodeSyncTargets().map((worker: any) => ({ id: worker.id, host: worker.host,
    port: worker.port, user: worker.user, projectRoot: worker.remotePath }));
}
export function mcpOperations(host: any): ProjectMcpOperations {
  return host.projectMcpOperations ||= new ProjectMcpOperations({
    root: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "", gateway: () => mcpGateway(host),
    records: () => host.localOperations, changed: () => { host.markLocalOperationsDirty(); host.postState(); },
  });
}
export function mcpGateway(host: any): ProjectGateway {
  const scopedFileCall = async (method: string, args: Record<string, any>) => {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
    const worker = args.workerId && currentWorkers(host).find(row => row.id === args.workerId);
    const node = args.location === "local" ? { id: "local", kind: "local", root }
      : worker ? { id: worker.id, kind: "remote", root: worker.projectRoot, host: worker.host, port: worker.port, user: worker.user } : undefined;
    if (!node) throw Error("MCP_FILE_NODE_REQUIRED");
    const { location, workerId, ...params } = args;
    if (params.token) {
      const existing = await host.simpleSftpApiCall("files.cleanup.status", { token: params.token, consumerRoot: root });
      if (["id", "kind", "root", "host", "port", "user"].some(key => String(existing.node?.[key] ?? "") !== String((node as any)[key] ?? "")))
        throw Error("MCP_FILE_NODE_CHANGED");
    }
    return host.simpleSftpApiCall(method, { ...params, node, consumerRoot: root,
      ...(method === "files.cleanup.preview" && params.action === "delete" ? { authorizationMode: "confirmed_paths" } : {}) });
  };
  return new ProjectGateway({ root: () => vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "",
    workers: () => currentWorkers(host), store: host.context.workspaceState, methods: () => host.createLocalApiMethods(),
    reviewFiles: async args => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
      const preview = await scopedFileCall("files.cleanup.status", args);
      openSftpCleanupReview(root, preview, (method, params) => scopedFileCall(method, { ...args, ...params }));
      return { requiresUserAction: true, token: preview.token, digest: preview.digest, requiredConfirmations: preview.action === "delete" ? 2 : 1, nextTool: "file_cleanup_status" };
    },
    approve: async (tool, args) => {
      const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      const result = await vscode.window.showWarningMessage(tool.description, { modal: true, detail: `${root}\n${JSON.stringify(args, null, 2)}` }, "确认执行");
      if (root !== vscode.workspace.workspaceFolders?.[0]?.uri.fsPath) throw Error("MCP_WORKSPACE_CHANGED");
      return result === "确认执行";
    },
    sftp: {
      methods: async () => (await host.readSimpleSftpCapabilities()).methods,
      call: async (method, args) => {
        if (method.startsWith("files.cleanup.")) return scopedFileCall(method, args);
        const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "";
        const { workerId, sourceWorkerId, destinationWorkerId, ...params } = args;
        if (method === "sync.projectInventory" && params.includeHashes === true && !params.paths?.length)
          throw Error("MCP_HASH_PATHS_REQUIRED: 请指定要核验内容的项目内路径。");
        const target = (id: string) => {
          const row = host.workerCodeSyncTargets().find((worker: any) => worker.id === id);
          if (!row) throw Error("MCP_WORKER_UNKNOWN: " + id);
          return host.sftpServerOptions(row);
        };
        const request: Record<string, any> = { ...params, localPath: root, localBase: root,
          ...(method === "sync.projectInventory" ? { scopePaths: params.paths, metadataOnly: params.includeHashes !== true } : {}),
          ...(method === "sync.serverToServerFpsync" ? { relativePaths: params.paths } : {}),
          ...(method === "sync.serverToServer" ? { directory: true } : {}),
          ...(method === "sync.downloadMappedPaths" ? { memoryOnly: true, metricsOnly: true } : {}),
          ...(workerId ? { server: target(workerId), source: target(workerId) } : {}),
          ...(sourceWorkerId ? { source: target(sourceWorkerId), destination: target(destinationWorkerId) } : {}),
          ...(params.confirm === true ? { pathConfirmed: true } : {}) };
        if (method === "upload.files") {
          const canonicalRoot = await fs.realpath(root);
          request.files = await Promise.all(params.files.map(async (file: string) => {
            const localPath = path.resolve(root, file);
            const relative = path.relative(root, localPath);
            if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw Error("MCP_PROJECT_FILE_REQUIRED");
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
          if (!Object.keys(request.manifest).length) return { ok: true, skipped: true, files: [], message: "当前代码同步范围没有文件。" };
        }
        if (method === "remote.listDirs") {
          const remoteRoot = target(workerId).remotePath;
          const remotePath = path.posix.resolve(remoteRoot, params.relativePath || ".");
          if (remotePath !== remoteRoot && !remotePath.startsWith(remoteRoot.replace(/\/$/, "") + "/")) throw Error("MCP_PROJECT_DIRECTORY_REQUIRED");
          Object.assign(request, { remotePath, server: { ...request.server, remotePath }, confirm: true, pathConfirmed: true });
        }
        if (root !== (vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || "")) throw Error("MCP_WORKSPACE_CHANGED");
        return host.simpleSftpApiCall(method, request);
      },
    } });
}
/** Only the local human-facing command can save or revoke authorization. */
export async function manageAiAuthorization(host: any): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) throw Error("请先打开要授权的项目。");
  const choice = await vscode.window.showQuickPick([
    { label: "授权当前项目", value: "grant" }, { label: "撤销当前项目授权", value: "revoke" },
  ], { title: "AI 项目持续授权", placeHolder: root });
  if (!choice) return;
  if (choice.value === "revoke") {
    await host.context.workspaceState.update(AUTHORIZATION_KEY, undefined);
    void vscode.window.showInformationMessage("已撤销当前项目的 AI 写操作授权。");
    return;
  }
  const workers = await vscode.window.showQuickPick(currentWorkers(host).map(worker => ({ label: worker.id,
    description: `${worker.user}@${worker.host}:${worker.port} ${worker.projectRoot}`, worker })),
  { title: "选择 AI 可操作的 Worker", canPickMany: true, ignoreFocusOut: true });
  if (!workers?.length) return;
  const names = { experiment: "启动、派发和停止实验", sync: "文件同步", agents: "Agent 部署、升级和重启", configuration: "项目配置与草稿", results: "结果收集与汇总" };
  const permissions = await vscode.window.showQuickPick(PERMISSIONS.map(permission => ({ label: names[permission], permission, picked: true })),
    { title: "选择 AI 可自主执行的项目操作", canPickMany: true, ignoreFocusOut: true });
  if (!permissions?.length) return;
  if (root !== vscode.workspace.workspaceFolders?.[0]?.uri.fsPath) throw Error("MCP_WORKSPACE_CHANGED");
  await host.context.workspaceState.update(AUTHORIZATION_KEY,
    createProjectAuthorization(root, workers.map(row => row.worker), permissions.map(row => row.permission)));
  void vscode.window.showInformationMessage("AI 项目授权已保存，可通过同一命令撤销。永久删除与覆盖清理继续使用路径审核页。");
}
