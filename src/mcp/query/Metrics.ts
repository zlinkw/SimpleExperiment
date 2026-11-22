import * as fs from "node:fs";
import { buildLeaderboard, parseMetricsFile } from "../../features/Metrics";
import { builtInResultPresets } from "../../features/Results";
import { businessError, emit, usageError } from "./Support";
import { loadResults, ResultRow, selectResult } from "./Results";

export function metricLeaderboard(flags: { file?: string; primary?: string }): number {
  if(!flags.file)throw usageError("metric leaderboard needs a file");
  if(!fs.existsSync(flags.file))throw businessError(`metrics file not found: ${flags.file}`);
  const metrics=parseMetricsFile(fs.readFileSync(flags.file,"utf8"),flags.file);
  if(!metrics.length)throw businessError("metrics file parsed no rows");
  const primary=flags.primary||undefined;
  const directions=metrics.filter(row=>row.primaryMetric===primary&&typeof row.higherIsBetter==="boolean").map(row=>row.higherIsBetter!);
  const presetDirection=primary&&builtInResultPresets.flatMap(item=>Object.entries(item.metricDirections||{})).find(([name])=>name.toLowerCase()===primary.toLowerCase())?.[1];
  const direction=new Set(directions).size>1?undefined:directions[0]??(presetDirection?presetDirection==="higher":undefined);
  const board=buildLeaderboard(metrics,row=>row.runKey,direction===undefined?undefined:primary,direction);
  emit({metrics:Array.from(new Set(metrics.flatMap(row=>Object.keys(row.metrics)))),board});return 0;
}
export async function metricList(): Promise<number> {
  const names=new Set<string>();for(const row of await loadResults())for(const key of Object.keys(numericMetrics(row)))names.add(key);
  emit({metrics:Array.from(names).sort()});return 0;
}
export async function metricShow(id: string): Promise<number> {
  const row=selectResult(await loadResults(),id);if(!row)throw businessError(`result not found: ${id}`);
  emit(numericMetrics(row));return 0;
}
export function numericMetrics(row: Pick<ResultRow,"metrics">): Record<string,number> {
  const out:Record<string,number>=Object.create(null);
  for(const [key,value] of Object.entries(row.metrics||{})){
    if(typeof value==="number"&&Number.isFinite(value))out[key]=value;
    else if(typeof value==="string"&&value.trim()&&Number.isFinite(Number(value)))out[key]=Number(value);
  }
  return out;
}
