import { createHash } from "node:crypto";
import { checkpointRecordsFromManifest } from "../../features/Checkpoint";
import { ExperimentResultRecord, buildResultLeaderboard, exportPaperTable } from "../../features/Results";
import { businessError, callApi, emit, usageError } from "./Support";

export interface ResultRow {
  source: "active_query"; current: true; observedAt: string | null;
  id: string; experimentId: string; runKey: string; status: string; created: string; updated: string;
  primaryMetric: string; primaryValue: unknown; metrics: Record<string, unknown>; config: unknown;
  seed: unknown; checkpoint: unknown; outputFiles: string[]; record: ExperimentResultRecord;
}

function records(value: any): ExperimentResultRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  for (const key of ["records", "results", "finalResults"]) if (Array.isArray(value[key])) return value[key];
  return [];
}
function diagnostic(row: Record<string, unknown>): boolean {
  if (!Array.isArray(row.sourceFiles) || !row.sourceFiles.length) return false;
  return row.sourceFiles.every((source: any) => {
    const file = String(source && typeof source === "object" && !Array.isArray(source) ? source.path || "" : "").replace(/\\/g, "/");
    const base = file.split("/").pop()?.toLowerCase() || "";
    return base === "stdout.log" || base === "stderr.log";
  });
}
export async function loadResults(): Promise<ResultRow[]> {
  const remote: any = await callApi("results.list", {});
  if (remote?.source !== "active_query" || remote?.summary?.current !== true)
    throw businessError("RESULT_QUERY_UNVERIFIED：本轮服务器结果未核实；可重新查询。");
  const observedAt = remote.summary.observedAt || null, byId = new Map<string, ResultRow>();
  for (const raw of records(Array.isArray(remote.summary.results) ? remote.summary.results : remote) as any[]) {
    const modern = !!(raw.planFile && raw.workerId && raw.runId);
    const id = modern ? "result-" + createHash("sha256").update(JSON.stringify([raw.planFile,raw.workerId,raw.runId,raw.workflowId||"",raw.revision||"",raw.codeFingerprint||"",
      Object.entries(raw.dimensions||{}).sort(([a],[b])=>a.localeCompare(b)),(raw.sourceFiles||[]).map((file:any)=>file.path).sort()])).digest("hex") : raw.resultId || raw.experimentId;
    if (!id) throw businessError("RESULT_IDENTITY_MISSING：结果缺少可核实的行身份，未合并或导出。");
    const record: ExperimentResultRecord = modern ? {...raw,schemaVersion:1,resultId:id,experimentId:raw.runId,runKey:raw.runId,
      suite:String(raw.dimensions?.dataset||raw.planFile),experimentName:String(raw.dimensions?.method||raw.dimensions?.case||raw.runId),
      status:raw.completionState==="verified"&&raw.aggregationState==="eligible"?"validated":"warning",
      provenance:{planFile:raw.planFile,workerId:raw.workerId},createdAt:raw.createdAt||"",updatedAt:observedAt||"",
      metrics:Object.fromEntries(Object.entries(raw.metrics||{}).map(([key,value])=>[key,typeof value==="object"&&value!==null?value:{value}]))} : raw;
    if (diagnostic(record as unknown as Record<string, unknown>)) continue;
    const metrics=Object.fromEntries(Object.entries(record.metrics||{}).map(([key,value])=>[key,value&&typeof value==="object"?(value as {value?:unknown}).value:value]));
    const primaryMetric=record.primaryMetric||Object.keys(metrics)[0]||"", checkpoints=checkpointRecordsFromManifest(record);
    byId.set(id,{id,source:"active_query",current:true,observedAt,experimentId:record.experimentId,runKey:record.runKey,status:record.status,
      created:record.createdAt,updated:record.updatedAt,primaryMetric,primaryValue:metrics[primaryMetric],metrics,
      config:record.provenance?.configPath||record.dimensions||null,seed:record.dimensions?.seed??null,
      checkpoint:checkpoints[0]?.path||record.provenance?.artifactKey||null,outputFiles:(record.sourceFiles||[]).map(item=>item.path).filter(Boolean),record});
  }
  return Array.from(byId.values());
}
export function selectResult(rows: ResultRow[], id: string): ResultRow | undefined {
  const exact=rows.find(row=>row.id===id);if(exact)return exact;
  const matches=rows.filter(row=>row.experimentId===id||row.runKey===id);
  if(!matches.length)return undefined;
  if(matches.length>1)throw businessError("RESULT_SELECTION_AMBIGUOUS：此运行对应多行结果，请用精确结果 ID 查看或导出。",JSON.stringify({id,candidates:matches.map(row=>({id:row.id,seed:row.seed,dimensions:row.record.dimensions}))}));
  return matches[0];
}
export async function resultList(): Promise<number> {
  const view=(await loadResults()).map(row=>({id:row.id,experimentId:row.experimentId,status:row.status,metric:row.primaryMetric,
    value:row.primaryValue,updated:row.updated,source:row.source,current:row.current,observedAt:row.observedAt}));
  emit(view);return 0;
}
export async function resultShow(id: string): Promise<number> {
  const match=selectResult(await loadResults(),id);if(!match)throw businessError(`result not found: ${id}`);
  emit({id:match.id,experimentId:match.experimentId,status:match.status,metrics:match.metrics,time:match.updated||match.created||null,
    config:match.config||null,seed:match.seed??null,checkpoint:match.checkpoint||null,outputFiles:match.outputFiles,
    source:match.source,current:match.current,observedAt:match.observedAt});return 0;
}
export async function resultExport(id: string, flags: { format?: string }): Promise<number> {
  const match=selectResult(await loadResults(),id);if(!match)throw businessError(`result not found: ${id}`);
  const format=String(flags.format||"json").toLowerCase();if(!["csv","json"].includes(format))throw usageError(`unsupported --format ${flags.format}. Use csv or json.`);
  const metricKeys=Object.keys(match.metrics),config={id:"cli",name:"CLI",filter:{includeWarnings:true},groupBy:["suite"],
    metrics:metricKeys.map(key=>({key,higherIsBetter:true,decimals:4})),aggregate:"raw" as const,primarySortMetric:metricKeys[0]};
  const rows=buildResultLeaderboard([match.record],config,[]),dimensions=match.record.dimensions||{};
  const csvCell=(value:unknown):string=>{const text=value==null?"":String(value);return /[",\r\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text};
  const body=format==="csv"?[["group","count",...metricKeys,"bestResultId",...Object.keys(dimensions).map(key=>`dimension:${key}`)],
    [rows[0]?.groupKey||match.record.suite,rows[0]?.count??1,...Object.values(match.metrics),rows[0]?.bestResultId||"",...Object.values(dimensions)]].map(row=>row.map(csvCell).join(",")).join("\n")
    :exportPaperTable(rows,config,{id:"cli",title:"Results",leaderboardId:"cli",rowDimension:"suite",metrics:metricKeys,boldBest:false,showMeanStd:false,decimals:{},metricDisplayNames:{}},"markdown");
  const evidence={source:match.source,current:match.current,observedAt:match.observedAt};
  const output=format==="json"?JSON.stringify({id:match.id,...evidence,dimensions,metrics:match.metrics,rows},null,2):body;
  emit({id:match.id,...evidence,format,path:"",content:output});return 0;
}
