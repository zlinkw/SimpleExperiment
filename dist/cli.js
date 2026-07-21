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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PlanBuilder_1 = require("./features/PlanBuilder");
const Metrics_1 = require("./features/Metrics");
function main(argv) {
    const [cmd, sub, ...rest] = argv;
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
    if (cmd === "plan" && sub === "build") {
        const suite = option(rest, "--suite") || "suite";
        const baseConfig = option(rest, "--base") || "config.yaml";
        const seeds = (option(rest, "--seeds") || "1").split(",");
        const result = (0, PlanBuilder_1.buildExperimentMatrix)({ suite, baseConfig, seeds, variables: [] });
        console.log(result.yaml);
        return 0;
    }
    console.error("Usage: cli status | agent health | self-check | experiments list --file x | metrics leaderboard --file x | plan build");
    return 2;
}
function option(args, name) {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
}
try {
    process.exitCode = main(process.argv.slice(2));
}
catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
}
