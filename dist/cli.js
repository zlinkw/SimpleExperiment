#!/usr/bin/env node
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
exports.main = main;
exports.runRecordedCli = runRecordedCli;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PlanBuilder_1 = require("./features/PlanBuilder");
const Metrics_1 = require("./features/Metrics");
const Results_1 = require("./features/Results");
const ExperimentRunner_1 = require("./features/ExperimentRunner");
function main(argv) {
    const [cmd, sub, ...rest] = argv;
    if (cmd === "run")
        return runRecordedCli([sub, ...rest].filter((item) => item !== undefined));
    if (cmd === "status") {
        console.log(JSON.stringify({ ok: true, cwd: process.cwd(), command: "status" }, null, 2));
        return 0;
    }
    if (cmd === "agent" && sub === "health") {
        console.log(JSON.stringify({ status: "unknown", hint: "Use VS Code command for live Hub Agent status." }, null, 2));
        return 0;
    }
    if (cmd === "self-check") {
        console.log(JSON.stringify({ status: "offline_cli_smoke", checks: [] }, null, 2));
        return 0;
    }
    if (cmd === "experiments" && sub === "list") {
        const file = option(rest, "--file") || path.join(process.cwd(), "zlk_cluster", "experiment_index.json");
        const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
        console.log(JSON.stringify(rows, null, 2));
        return 0;
    }
    if (cmd === "metrics" && sub === "leaderboard") {
        const file = option(rest, "--file");
        if (!file)
            throw new Error("--file required");
        const metrics = (0, Metrics_1.parseMetricsFile)(fs.readFileSync(file, "utf8"), file);
        const board = (0, Metrics_1.buildLeaderboard)(metrics, (row) => row.runKey, option(rest, "--primary") || undefined);
        console.log((0, Metrics_1.leaderboardToMarkdown)(board, Object.keys(metrics[0]?.metrics || {})));
        return 0;
    }
    if (cmd === "results" && sub === "parse") {
        const file = option(rest, "--file");
        if (!file)
            throw new Error("--file required");
        const preset = Results_1.builtInResultPresets.find((item) => item.id === option(rest, "--preset")) || Results_1.builtInResultPresets[0];
        const records = (0, Results_1.parseResultFile)(fs.readFileSync(file, "utf8"), { path: file, type: file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset);
        console.log(JSON.stringify(records, null, 2));
        return 0;
    }
    if (cmd === "results" && sub === "paper-table") {
        const file = option(rest, "--file");
        if (!file)
            throw new Error("--file required");
        const records = finalPaperTableRecords(JSON.parse(fs.readFileSync(file, "utf8")));
        const metrics = (option(rest, "--metrics") || "AUC,accuracy,F1,AUPRC").split(",").filter(Boolean);
        const config = {
            id: "cli",
            name: "CLI",
            filter: { includeWarnings: true },
            groupBy: ["suite", "dataset"],
            metrics: metrics.map((key) => ({ key, higherIsBetter: !["ASD", "HD95", "loss"].includes(key), decimals: 4 })),
            aggregate: "mean_std",
            primarySortMetric: metrics[0],
        };
        const rows = (0, Results_1.buildResultLeaderboard)(records, config, []);
        if (option(rest, "--format") === "csv")
            console.log((0, Results_1.leaderboardToCsv)(rows, config));
        else
            console.log((0, Results_1.exportPaperTable)(rows, config, { id: "cli", title: "Results", leaderboardId: "cli", rowDimension: "suite", metrics, boldBest: true, showMeanStd: true, decimals: {}, metricDisplayNames: {} }, option(rest, "--format") === "latex" ? "latex_booktabs" : "markdown"));
        return 0;
    }
    if (cmd === "plan" && sub === "build") {
        const suite = option(rest, "--suite") || "suite";
        const baseConfig = option(rest, "--base") || "config.yaml";
        const seeds = (option(rest, "--seeds") || "1").split(",");
        const result = (0, PlanBuilder_1.buildExperimentMatrix)({ suite, baseConfig, seeds, variables: [] });
        console.log(result.yaml);
        return 0;
    }
    console.error("Usage: simple-experiment status | agent health | self-check | experiments list --file x | metrics leaderboard --file x | results parse --file x | results paper-table --file registry.json | plan build | run --name x -- command");
    return 2;
}
function runRecordedCli(argv) {
    const result = (0, ExperimentRunner_1.runRecordedExperiment)((0, ExperimentRunner_1.parseZlkRunArgs)(argv));
    console.log(JSON.stringify(result, null, 2));
    return result.exitCode;
}
function option(args, name) {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}
function finalPaperTableRecords(input) {
    if (Array.isArray(input))
        return (0, Results_1.filterByInclusionPolicy)(input, [], Results_1.finalResultInclusionPolicy);
    const record = input && typeof input === "object" ? input : {};
    if (Array.isArray(record.finalResults))
        return (0, Results_1.filterByInclusionPolicy)(record.finalResults, [], Results_1.finalResultInclusionPolicy);
    if (Array.isArray(record.records)) {
        const rows = record.records;
        if (String(record.inclusionPolicy || "").includes("archived") || String(record.path || "").includes("result_registry")) {
            const archivedRows = rows.map((row) => ({ ...row, finalEvidenceState: row.finalEvidenceState || "archived", eligibleForFinalAnalysis: row.eligibleForFinalAnalysis ?? true }));
            return (0, Results_1.filterByInclusionPolicy)(archivedRows, [], Results_1.finalResultInclusionPolicy);
        }
        return (0, Results_1.filterByInclusionPolicy)(rows, [], Results_1.finalResultInclusionPolicy);
    }
    return [];
}
if (require.main === module) {
    try {
        process.exitCode = main(process.argv.slice(2));
    }
    catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
}
