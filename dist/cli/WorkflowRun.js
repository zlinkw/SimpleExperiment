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
exports.assertProjectPlan = assertProjectPlan;
exports.requestWorkflowRun = requestWorkflowRun;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const api_1 = require("./api");
const errors_1 = require("./errors");
const WorkflowWorkspaceBinding_1 = require("../features/WorkflowWorkspaceBinding");
function record(value) { if (!value || typeof value !== "object" || Array.isArray(value))
    throw (0, errors_1.businessError)("Invalid workflow API response"); return value; }
function assertProjectPlan(root, file) {
    const canonical = fs.realpathSync.native(root), target = fs.realpathSync.native(path.resolve(root, file)), relative = path.relative(canonical, target);
    if (!relative || path.isAbsolute(relative) || relative === ".." || relative.startsWith(".." + path.sep) || !fs.statSync(target).isFile())
        throw (0, errors_1.businessError)("Plan must be a file inside the current project");
    return canonical;
}
async function requestWorkflowRun(root, planFile, flags) {
    (0, WorkflowWorkspaceBinding_1.assertPlanSeedContract)(flags);
    const canonical = assertProjectPlan(root, planFile), binding = (0, WorkflowWorkspaceBinding_1.bindWorkflowWorkspace)(canonical, canonical);
    const verify = async () => {
        const state = record(await (0, api_1.callApi)("status"));
        try {
            (0, WorkflowWorkspaceBinding_1.bindWorkflowWorkspace)(state.workspace, binding.root);
            (0, WorkflowWorkspaceBinding_1.assertWorkflowWorkspace)(binding, state.workspace);
        }
        catch {
            throw (0, errors_1.envError)("CLI project differs from the current VS Code API workspace; open the intended project");
        }
    };
    await verify();
    const params = { planFile, workspace: canonical, debugMode: false }, route = record(await (0, api_1.callApi)("workflow.plan", params));
    const normalize = (v) => process.platform === "win32" ? v.replace(/\\/g, "/").toLowerCase() : v;
    if (route.ok === true && route.ready === true && (typeof route.plan?.planFile !== "string" || normalize(route.plan.planFile) !== normalize(planFile)))
        throw (0, errors_1.businessError)("Workflow selected a different Plan; no run requested");
    const base = { planFile, dryRun: flags.dryRun, submitted: false, requested: false, runner: "SimpleExperiment Local API", submitPath: "workflow.run", workflow: route, validation: "live_api", ready: route.ok === true && route.ready === true };
    if (!base.ready)
        return { code: 3, payload: { ...base, status: "blocked", blocker: route.blocker, nextAction: route.nextAction } };
    if (flags.dryRun || flags.check)
        return { code: 0, payload: { ...base, status: "preflight_ready" } };
    await verify();
    const result = record(await (0, api_1.callApi)("workflow.run", params)), requested = result.ok === true && result.started === true && typeof result.operationId === "string" && Boolean(result.operationId);
    return { code: requested ? 0 : 3, payload: { ...base, requested, result, operationId: result.operationId, status: result.status || "blocked", confirmation: result.confirmation || "none", nextAction: result.nextAction || "operations.list" } };
}
