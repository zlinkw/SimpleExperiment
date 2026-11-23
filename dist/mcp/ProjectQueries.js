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
exports.queryProject = queryProject;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const ExecutionContext_1 = require("./query/ExecutionContext");
const experiments = __importStar(require("./query/Experiments"));
const Results_1 = require("./query/Results");
const ResultParse_1 = require("./query/ResultParse");
const Metrics_1 = require("./query/Metrics");
const Compare_1 = require("./query/Compare");
const Logs_1 = require("./query/Logs");
const Artifacts_1 = require("./query/Artifacts");
const Plans_1 = require("./query/Plans");
const Servers_1 = require("./query/Servers");
const Resources_1 = require("./query/Resources");
/** Query structured business results with an isolated project and API context. */
async function queryProject(root, rpc, name, args) {
    const flags = { full: args.full === true,
        ...(args.status ? { status: args.status } : {}), ...(args.type ? { type: args.type } : {}), ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.format ? { format: args.format } : {}),
        ...(args.primary ? { primary: args.primary } : {}),
        ...(args.preset !== undefined ? { preset: args.preset } : {}), ...(args.lines !== undefined ? { lines: args.lines } : {}) };
    if (name === "plan_build")
        Object.assign(flags, { suite: args.suite, base: args.base, seeds: args.seeds.join(",") });
    const projectFile = args.file || (name === "plan_matrix" ? args.planFile : undefined);
    if (projectFile) {
        const file = fs.realpathSync(path.resolve(root, projectFile));
        const relative = path.relative(fs.realpathSync(root), file);
        if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative))
            throw Error("MCP_PROJECT_FILE_REQUIRED");
        flags.file = file;
    }
    const handlers = {
        experiment_list: () => experiments.experimentList(flags), experiment_summary: () => experiments.experimentSummary(flags),
        experiment_active: () => experiments.experimentActive(flags), experiment_tree: () => experiments.experimentTree(flags),
        experiment_status: () => experiments.experimentStatus(args.id, flags), experiment_overview: () => experiments.experimentOverview(flags),
        experiment_health: () => experiments.experimentHealth(flags), experiment_inspect: () => experiments.experimentInspect(args.id, flags),
        experiment_monitor: () => experiments.experimentMonitor(args.id, flags), experiment_diagnose: () => experiments.experimentDiagnose(args.id, flags),
        experiment_config: () => experiments.experimentConfig(args.id, flags), experiment_results: () => experiments.experimentResults(args.id, flags),
        result_list: () => (0, Results_1.resultList)(), result_show: () => (0, Results_1.resultShow)(args.id), result_export: () => (0, Results_1.resultExport)(args.id, flags),
        result_parse: () => (0, ResultParse_1.resultParse)(flags),
        metric_list: () => (0, Metrics_1.metricList)(), metric_show: () => (0, Metrics_1.metricShow)(args.id), metric_leaderboard: () => (0, Metrics_1.metricLeaderboard)(flags),
        result_compare: () => (0, Compare_1.compareResults)(args.left, args.right),
        experiment_log: () => (0, Logs_1.queryLogs)(args.id, args.lines),
        artifact_list: () => (0, Artifacts_1.artifactList)(args.id), artifact_inspect: () => (0, Artifacts_1.artifactInspect)(args.id),
        resource_available: () => (0, Resources_1.resourceAvailable)(), server_list: () => (0, Servers_1.serverList)(),
        plan_matrix: () => (0, Plans_1.planMatrix)(args.planFile), plan_build: () => (0, Plans_1.planBuild)(flags),
    };
    if (!handlers[name])
        throw Error("MCP_QUERY_UNKNOWN: " + name);
    let result, emitted = false;
    await ExecutionContext_1.businessContext.run({ root, rpc, emit: value => { result = value; emitted = true; } }, async () => {
        const code = await handlers[name]();
        if (code !== 0)
            throw Error("MCP_QUERY_FAILED: " + name + " (" + code + ")");
    });
    if (!emitted)
        throw Error("MCP_QUERY_RESULT_MISSING: " + name);
    return typeof result === "string" ? { content: result, format: args.format || "text", source: flags.file || "project_query" } : result;
}
