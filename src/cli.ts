#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import { buildExperimentMatrix } from "./features/PlanBuilder";
import { buildLeaderboard, leaderboardToMarkdown, parseMetricsFile } from "./features/Metrics";

function main(argv: string[]): number {
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
    if (!file) throw new Error("--file required");
    const metrics = parseMetricsFile(fs.readFileSync(file, "utf8"), file);
    const board = buildLeaderboard(metrics, (row) => row.runKey, option(rest, "--primary") || undefined);
    console.log(leaderboardToMarkdown(board, Object.keys(metrics[0]?.metrics || {})));
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
  console.error("Usage: cli status | agent health | self-check | experiments list --file x | metrics leaderboard --file x | plan build");
  return 2;
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
