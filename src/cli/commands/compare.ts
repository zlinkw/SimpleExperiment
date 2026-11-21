import { usageError } from "../errors";
import { block, writeJson, writeText } from "../format";
import { CliFlags, requirePositional } from "../parse";
import { loadResults, selectResult } from "./result";
import { numericMetrics } from "./metric";
import { builtInResultPresets } from "../../features/Results";

const LOWER_IS_BETTER = /(?:^|_)(loss|error|mse|mae|perplexity)(?:_|$)/i;

export async function compareCommand(rest: string[], flags: CliFlags): Promise<number> {
  const leftId = requirePositional(rest, 0, "first experiment id");
  const rightId = requirePositional(rest, 1, "second experiment id");
  const rows = await loadResults(flags);
  const leftRow = selectResult(rows, leftId), rightRow = selectResult(rows, rightId);
  const left = leftRow ? numericMetrics(leftRow) : {};
  const right = rightRow ? numericMetrics(rightRow) : {};
  const difference: Record<string, { left: number; right: number; delta: number }> = Object.create(null);
  const improvement: string[] = [];
  const regression: string[] = [];
  const reason = !leftRow && !rightRow
    ? "no results recorded for either experiment"
    : !leftRow
      ? `no results recorded for ${leftId}`
      : !rightRow
        ? `no results recorded for ${rightId}`
        : !Object.keys(left).length || !Object.keys(right).length
          ? "no numeric metrics available for comparison"
        : "";
  for (const key of Object.keys(left)) {
    if (!Object.hasOwn(right, key)) continue;
    const delta = Math.round((right[key] - left[key]) * 1e12) / 1e12;
    difference[key] = { left: left[key], right: right[key], delta };
    const directions = [leftRow, rightRow].map(row => {
      const metric = row?.record.metrics?.[key];
      return metric?.higherIsBetter ?? (row?.record.primaryMetric === key ? row.record.higherIsBetter : undefined);
    }).filter((value): value is boolean => typeof value === "boolean");
    if (new Set(directions).size > 1 || delta === 0) continue;
    const preset = builtInResultPresets.flatMap(item => Object.entries(item.metricDirections || {}))
      .find(([name]) => name.toLowerCase() === key.toLowerCase())?.[1];
    const higher = directions[0] ?? (preset ? preset === "higher" : LOWER_IS_BETTER.test(key) ? false : undefined);
    if (higher === undefined) continue;
    const improved = higher ? delta > 0 : delta < 0;
    (improved ? improvement : regression).push(key);
  }
  const payload = { left: leftId, right: rightId, metric_difference: difference, improvement, regression, reason };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Compare", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function compareEntry(rest: string[], flags: CliFlags): Promise<number> {
  if (!rest[0]) throw usageError("missing first experiment id");
  return compareCommand(rest, flags);
}
