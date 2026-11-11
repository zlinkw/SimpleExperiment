import * as fs from "node:fs";
import * as path from "node:path";
import { businessContext } from "../cli/ExecutionContext";
import * as experiments from "../cli/commands/experiment";
import { resultList, resultShow, resultExport, resultParse, resultPaperTable } from "../cli/commands/result";
import { metricList, metricShow, metricLeaderboard } from "../cli/commands/metric";
import { compareCommand } from "../cli/commands/compare";
import { logShow, logTail } from "../cli/commands/log";
import { artifactList, artifactInspect } from "../cli/commands/artifact";
import { planBuild, planMatrix } from "../cli/commands/plan";
import { serverCommand } from "../cli/commands/server";
import { resourceCommand } from "../cli/commands/resource";

/** Reuse structured business results before CLI rendering, with an isolated project and API context. */
export async function queryProject(root: string, rpc: (method: string, params: Record<string, unknown>) => Promise<unknown>,
  name: string, args: Record<string, any>): Promise<unknown> {
  const flags: any = { json: !(name === "result_paper_table" && ["markdown", "csv", "latex"].includes(args.format)), full: args.full === true,
    ...(args.status ? { status: args.status } : {}), ...(args.type ? { type: args.type } : {}), ...(args.limit !== undefined ? { limit: args.limit } : {}),
    ...(args.format ? { format: args.format } : {}),
    ...(args.metrics ? { metrics: args.metrics.join(",") } : {}), ...(args.primary ? { primary: args.primary } : {}),
    ...(args.preset ? { preset: args.preset } : {}), ...(args.lines !== undefined ? { lines: args.lines } : {}) };
  if (name === "plan_build") Object.assign(flags, { suite: args.suite, base: args.base, seeds: args.seeds.join(",") });
  const projectFile = args.file || (name === "plan_matrix" ? args.planFile : undefined);
  if (projectFile) {
    const file = fs.realpathSync(path.resolve(root, projectFile));
    const relative = path.relative(fs.realpathSync(root), file);
    if (!relative || relative === ".." || relative.startsWith(".." + path.sep) || path.isAbsolute(relative)) throw Error("MCP_PROJECT_FILE_REQUIRED");
    flags.file = file;
  }
  const handlers: Record<string, () => Promise<number> | number> = {
    experiment_list: () => experiments.experimentList(flags), experiment_summary: () => experiments.experimentSummary(flags),
    experiment_active: () => experiments.experimentActive(flags), experiment_tree: () => experiments.experimentTree(flags),
    experiment_status: () => experiments.experimentStatus(args.id, flags), experiment_overview: () => experiments.experimentOverview(flags),
    experiment_health: () => experiments.experimentHealth(flags), experiment_inspect: () => experiments.experimentInspect(args.id, flags),
    experiment_monitor: () => experiments.experimentMonitor(args.id, flags), experiment_diagnose: () => experiments.experimentDiagnose(args.id, flags),
    experiment_config: () => experiments.experimentConfig(args.id, flags), experiment_results: () => experiments.experimentResults(args.id, flags),
    result_list: () => resultList(flags), result_show: () => resultShow(args.id, flags), result_export: () => resultExport(args.id, flags),
    result_parse: () => resultParse(flags), result_paper_table: () => resultPaperTable(flags),
    metric_list: () => metricList(flags), metric_show: () => metricShow(args.id, flags), metric_leaderboard: () => metricLeaderboard(flags),
    result_compare: () => compareCommand([args.left, args.right], flags),
    experiment_log: () => args.lines === undefined ? logShow(args.id, flags) : logTail(args.id, flags),
    artifact_list: () => artifactList(args.id, flags), artifact_inspect: () => artifactInspect(args.id, flags),
    resource_available: () => resourceCommand("available", [], flags), server_list: () => serverCommand("list", [], flags),
    plan_matrix: () => planMatrix(args.planFile, flags), plan_build: () => planBuild(flags),
  };
  if (!handlers[name]) throw Error("MCP_QUERY_UNKNOWN: " + name);
  let result: unknown, emitted = false;
  await businessContext.run({ root, rpc, emit: value => { result = value; emitted = true; } }, async () => {
    const code = await handlers[name]();
    if (code !== 0) throw Error("MCP_QUERY_FAILED: " + name + " (" + code + ")");
  });
  if (!emitted) throw Error("MCP_QUERY_RESULT_MISSING: " + name);
  return typeof result === "string" ? { content: result, format: args.format || "text", source: flags.file || "project_query" } : result;
}
