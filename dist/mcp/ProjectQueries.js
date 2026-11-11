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
const ExecutionContext_1 = require("../cli/ExecutionContext");
const experiments = __importStar(require("../cli/commands/experiment"));
const result_1 = require("../cli/commands/result");
const metric_1 = require("../cli/commands/metric");
const compare_1 = require("../cli/commands/compare");
const log_1 = require("../cli/commands/log");
const artifact_1 = require("../cli/commands/artifact");
const plan_1 = require("../cli/commands/plan");
const server_1 = require("../cli/commands/server");
const resource_1 = require("../cli/commands/resource");
/** Reuse structured business results before CLI rendering, with an isolated project and API context. */
async function queryProject(root, rpc, name, args) {
    const flags = { json: !(name === "result_paper_table" && ["markdown", "csv", "latex"].includes(args.format)), full: args.full === true,
        ...(args.status ? { status: args.status } : {}), ...(args.type ? { type: args.type } : {}), ...(args.limit !== undefined ? { limit: args.limit } : {}),
        ...(args.format ? { format: args.format } : {}),
        ...(args.metrics ? { metrics: args.metrics.join(",") } : {}), ...(args.primary ? { primary: args.primary } : {}),
        ...(args.preset ? { preset: args.preset } : {}), ...(args.lines !== undefined ? { lines: args.lines } : {}) };
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
        result_list: () => (0, result_1.resultList)(flags), result_show: () => (0, result_1.resultShow)(args.id, flags), result_export: () => (0, result_1.resultExport)(args.id, flags),
        result_parse: () => (0, result_1.resultParse)(flags), result_paper_table: () => (0, result_1.resultPaperTable)(flags),
        metric_list: () => (0, metric_1.metricList)(flags), metric_show: () => (0, metric_1.metricShow)(args.id, flags), metric_leaderboard: () => (0, metric_1.metricLeaderboard)(flags),
        result_compare: () => (0, compare_1.compareCommand)([args.left, args.right], flags),
        experiment_log: () => args.lines === undefined ? (0, log_1.logShow)(args.id, flags) : (0, log_1.logTail)(args.id, flags),
        artifact_list: () => (0, artifact_1.artifactList)(args.id, flags), artifact_inspect: () => (0, artifact_1.artifactInspect)(args.id, flags),
        resource_available: () => (0, resource_1.resourceCommand)("available", [], flags), server_list: () => (0, server_1.serverCommand)("list", [], flags),
        plan_matrix: () => (0, plan_1.planMatrix)(args.planFile, flags), plan_build: () => (0, plan_1.planBuild)(flags),
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
