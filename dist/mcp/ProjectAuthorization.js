"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PERMISSIONS = exports.AUTHORIZATION_KEY = void 0;
exports.createProjectAuthorization = createProjectAuthorization;
exports.assertProjectAuthorization = assertProjectAuthorization;
const WorkflowWorkspaceBinding_1 = require("../features/WorkflowWorkspaceBinding");
exports.AUTHORIZATION_KEY = "simpleExperiment.mcp.authorization.v1";
exports.PERMISSIONS = ["experiment", "sync", "agents", "configuration", "results"];
function createProjectAuthorization(root, workers, permissions) {
    if (!workers.length || workers.some(worker => !worker.id || !worker.host || !worker.projectRoot))
        throw Error("MCP_AUTHORIZATION_TARGET_REQUIRED");
    return { workspace: (0, WorkflowWorkspaceBinding_1.probeWorkspace)(root), workers: structuredClone(workers), permissions: [...permissions], grantedAt: new Date().toISOString() };
}
function assertProjectAuthorization(grant, root, workers, permission) {
    const current = (0, WorkflowWorkspaceBinding_1.probeWorkspace)(root);
    if (!grant || JSON.stringify(grant.workspace) !== JSON.stringify(current) || !grant.permissions.includes(permission))
        throw Error("MCP_AUTHORIZATION_REQUIRED: " + permission + "；在当前项目窗口执行“SimpleExperiment：管理 AI 项目授权”。");
    for (const worker of workers) {
        const approved = grant.workers.find(row => row.id === worker.id);
        if (!approved || JSON.stringify(approved) !== JSON.stringify(worker))
            throw Error("MCP_WORKER_NOT_AUTHORIZED: " + worker.id);
    }
}
