#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { buildExperimentMatrix } from "./features/PlanBuilder";
import { buildLeaderboard, leaderboardToMarkdown, parseMetricsFile } from "./features/Metrics";
import {
  buildResultLeaderboard,
  builtInResultPresets,
  ExperimentResultRecord,
  exportPaperTable,
  filterByInclusionPolicy,
  finalResultInclusionPolicy,
  leaderboardToCsv,
  parseResultFile,
} from "./features/Results";
import { parseZlkRunArgs, runRecordedExperiment } from "./features/ExperimentRunner";

export function main(argv: string[]): number {
  const [cmd, sub, ...rest] = argv;
  if (cmd === "run") return runRecordedCli([sub, ...rest].filter((item): item is string => item !== undefined));
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
    if (!file) throw new Error("--file required");
    const metrics = parseMetricsFile(fs.readFileSync(file, "utf8"), file);
    const board = buildLeaderboard(metrics, (row) => row.runKey, option(rest, "--primary") || undefined);
    console.log(leaderboardToMarkdown(board, Object.keys(metrics[0]?.metrics || {})));
    return 0;
  }
  if (cmd === "results" && sub === "parse") {
    const file = option(rest, "--file");
    if (!file) throw new Error("--file required");
    const preset = builtInResultPresets.find((item) => item.id === option(rest, "--preset")) || builtInResultPresets[0];
    const records = parseResultFile(fs.readFileSync(file, "utf8"), { path: file, type: file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset);
    console.log(JSON.stringify(records, null, 2));
    return 0;
  }
  if (cmd === "results" && sub === "paper-table") {
    const file = option(rest, "--file");
    if (!file) throw new Error("--file required");
    const records = finalPaperTableRecords(JSON.parse(fs.readFileSync(file, "utf8")));
    const metrics = (option(rest, "--metrics") || "AUC,accuracy,F1,AUPRC").split(",").filter(Boolean);
    const config = {
      id: "cli",
      name: "CLI",
      filter: { includeWarnings: true },
      groupBy: ["suite", "dataset"],
      metrics: metrics.map((key) => ({ key, higherIsBetter: !["ASD", "HD95", "loss"].includes(key), decimals: 4 })),
      aggregate: "mean_std" as const,
      primarySortMetric: metrics[0],
    };
    const rows = buildResultLeaderboard(records, config, []);
    if (option(rest, "--format") === "csv") console.log(leaderboardToCsv(rows, config));
    else console.log(exportPaperTable(rows, config, { id: "cli", title: "Results", leaderboardId: "cli", rowDimension: "suite", metrics, boldBest: true, showMeanStd: true, decimals: {}, metricDisplayNames: {} }, option(rest, "--format") === "latex" ? "latex_booktabs" : "markdown"));
    return 0;
  }
  if (cmd === "plan" && sub === "build") {
    const suite = option(rest, "--suite") || "suite";
    const baseConfig = option(rest, "--base") || "config.yaml";
    const seeds = (option(rest, "--seeds") || "1").split(",");
    const result = buildExperimentMatrix({ suite, baseConfig, seeds, variables: [] });
    console.log(result.yaml);
    return 0;
  }
  console.error("Usage: simple-experiment status | agent health | self-check | experiments list --file x | metrics leaderboard --file x | results parse --file x | results paper-table --file registry.json | plan build | run --name x -- command");
  return 2;
}

export function runRecordedCli(argv: string[]): number {
  const result = runRecordedExperiment(parseZlkRunArgs(argv));
  console.log(JSON.stringify(result, null, 2));
  return result.exitCode;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function finalPaperTableRecords(input: unknown): ExperimentResultRecord[] {
  if (Array.isArray(input)) return filterByInclusionPolicy(input as ExperimentResultRecord[], [], finalResultInclusionPolicy);
  const record = input && typeof input === "object" ? input as Record<string, unknown> : {};
  if (Array.isArray(record.finalResults)) return filterByInclusionPolicy(record.finalResults as ExperimentResultRecord[], [], finalResultInclusionPolicy);
  if (Array.isArray(record.records)) {
    const rows = record.records as ExperimentResultRecord[];
    if (String(record.inclusionPolicy || "").includes("archived") || String(record.path || "").includes("result_registry")) {
      const archivedRows = rows.map((row) => ({ ...row, finalEvidenceState: row.finalEvidenceState || "archived", eligibleForFinalAnalysis: row.eligibleForFinalAnalysis ?? true }));
      return filterByInclusionPolicy(archivedRows, [], finalResultInclusionPolicy);
    }
    return filterByInclusionPolicy(rows, [], finalResultInclusionPolicy);
  }
  return [];
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
