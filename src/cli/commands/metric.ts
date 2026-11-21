import { businessError, usageError } from "../errors";
import { writeJson, writeText } from "../format";
import { CliFlags, requirePositional } from "../parse";
import { loadResults, ResultRow, selectResult } from "./result";
import { buildLeaderboard, leaderboardToMarkdown, parseMetricsFile } from "../../features/Metrics";
import { builtInResultPresets } from "../../features/Results";

export async function metricCommand(action: string, rest: string[], flags: CliFlags): Promise<number> {
  if (action === "list") return metricList(flags);
  if (action === "show") return metricShow(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "leaderboard") return metricLeaderboard(flags);
  throw usageError(`unknown metric action: ${action || "(missing)"}`);
}

/** First-class local metrics leaderboard (replaces the revoked `simpleex metrics leaderboard`). */
export function metricLeaderboard(flags: CliFlags): number {
  if (!flags.file) throw usageError("metric leaderboard needs --file <metrics file>");
  const fs = require("node:fs") as typeof import("node:fs");
  if (!fs.existsSync(flags.file)) throw businessError(`metrics file not found: ${flags.file}`);
  const metrics = parseMetricsFile(fs.readFileSync(flags.file, "utf8"), flags.file);
  if (!metrics.length) throw businessError("metrics file parsed no rows");
  const primary = flags.primary || undefined;
  const directions = metrics.filter(row => row.primaryMetric === primary && typeof row.higherIsBetter === "boolean").map(row => row.higherIsBetter!);
  const presetDirection = primary && builtInResultPresets.flatMap(item => Object.entries(item.metricDirections || {}))
    .find(([name]) => name.toLowerCase() === primary.toLowerCase())?.[1];
  const direction = new Set(directions).size > 1 ? undefined : directions[0] ?? (presetDirection ? presetDirection === "higher" : undefined);
  const board = buildLeaderboard(metrics, (row) => row.runKey, direction === undefined ? undefined : primary, direction);
  const metricNames = Array.from(new Set(metrics.flatMap((row) => Object.keys(row.metrics))));
  if (flags.json) writeJson({ metrics: metricNames, board }, flags.compactJson);
  else writeText(leaderboardToMarkdown(board, metricNames));
  return 0;
}

export async function metricList(flags: CliFlags): Promise<number> {
  const names = new Set<string>();
  for (const row of await loadResults(flags)) {
    for (const key of Object.keys(numericMetrics(row))) names.add(key);
  }
  const payload = { metrics: Array.from(names).sort() };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(payload.metrics.join("\n") || "(no metrics)");
  return 0;
}

export async function metricShow(id: string, flags: CliFlags): Promise<number> {
  const row = selectResult(await loadResults(flags), id);
  if (!row) throw businessError(`result not found: ${id}`);
  const metrics = numericMetrics(row);
  if (flags.json) writeJson(metrics, flags.compactJson);
  else writeText(Object.entries(metrics).map(([key, value]) => `${key}: ${String(value)}`).join("\n") || "(no metrics)");
  return 0;
}

export function numericMetrics(row: Pick<ResultRow, "metrics">): Record<string, number> {
  const out: Record<string, number> = Object.create(null);
  for (const [key, value] of Object.entries(row.metrics || {})) {
    const numeric = metricNumber(value);
    if (numeric !== null) out[key] = numeric;
  }
  return out;
}

export function metricNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}
