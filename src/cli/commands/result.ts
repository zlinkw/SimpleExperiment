import * as fs from "fs";
import * as path from "path";
import { callApi } from "../api";
import { createHash } from "node:crypto";
import { RESULT_REGISTRY_LOCAL_REL, RESULT_REGISTRY_REL, readJsonFile, resolveProjectPath } from "../data";
import { isDiagnosticWorkerResult } from "../runtime";
import { businessError, usageError } from "../errors";
import { block, table, writeJson, writeText } from "../format";
import { CliFlags, requirePositional } from "../parse";
import { checkpointRecordsFromManifest } from "../../features/Checkpoint";
import { LATEST_RESULT_FILE } from "../../results/LatestResultExport";
import {
  ExperimentResultRecord,
  buildResultLeaderboard,
  builtInResultPresets,
  exportPaperTable,
  parseResultFile,
} from "../../features/Results";

export async function resultCommand(action: string, rest: string[], flags: CliFlags): Promise<number> {
  if (action === "list") return resultList(flags);
  if (action === "show") return resultShow(requirePositional(rest, 0, "result id"), flags);
  if (action === "export") return resultExport(requirePositional(rest, 0, "result id"), flags);
  if (action === "parse") return resultParse(flags);
  throw usageError(`unknown result action: ${action || "(missing)"}`);
}

/** First-class local result parsing (replaces the revoked `simpleex results parse`). */
export function resultParse(flags: CliFlags): number {
  if (!flags.file) throw usageError("result parse needs --file <result file>");
  if (!fs.existsSync(flags.file)) throw businessError(`result file not found: ${flags.file}`);
  const preset = flags.preset === undefined ? builtInResultPresets[0] : builtInResultPresets.find((item) => item.id === flags.preset);
  if (!preset) throw usageError(`unknown result preset: ${flags.preset}`);
  const records = parseResultFile(fs.readFileSync(flags.file, "utf8"), { path: flags.file, type: flags.file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset);
  writeJson(records, flags.compactJson);
  return 0;
}

export async function resultList(flags: CliFlags): Promise<number> {
  const rows = await loadResults(flags);
  const experiment = String(flags.experiment || "").trim();
  const filtered = experiment ? rows.filter((row) => row.experimentId === experiment || row.id === experiment || row.runKey === experiment) : rows;
  const view = filtered.map((row) => ({
    id: row.id,
    experimentId: row.experimentId,
    status: row.status,
    metric: row.primaryMetric,
    value: row.primaryValue,
    updated: row.updated,
    source: row.source,
    current: row.current,
    observedAt: row.observedAt,
  }));
  if (flags.json) {
    writeJson(view, flags.compactJson);
    return 0;
  }
  writeText(table(["id", "experimentId", "status", "metric", "value", "updated", "source", "current"], view));
  return 0;
}

export async function resultShow(id: string, flags: CliFlags): Promise<number> {
  const match = selectResult(await loadResults(flags), id);
  if (!match) throw businessError(`result not found: ${id}`);
  const payload = {
    id: match.id,
    experimentId: match.experimentId,
    status: match.status,
    metrics: match.metrics,
    time: match.updated || match.created || null,
    config: match.config || null,
    seed: match.seed ?? null,
    checkpoint: match.checkpoint || null,
    outputFiles: match.outputFiles,
    source: match.source, current: match.current, observedAt: match.observedAt,
  };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Result", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function resultExport(id: string, flags: CliFlags): Promise<number> {
  const match = selectResult(await loadResults(flags), id);
  if (!match) throw businessError(`result not found: ${id}`);
  const format = String(flags.format || "json").toLowerCase();
  if (!["csv", "json"].includes(format)) throw usageError(`unsupported --format ${flags.format}. Use csv or json.`);
  const records = [match.record];
  const metricKeys = Object.keys(match.metrics);
  const config = {
    id: "cli",
    name: "CLI",
    filter: { includeWarnings: true },
    groupBy: ["suite"],
    metrics: metricKeys.map((key) => ({ key, higherIsBetter: true, decimals: 4 })),
    aggregate: "raw" as const,
    primarySortMetric: metricKeys[0],
  };
  const rows = buildResultLeaderboard(records, config, []);
  const dimensions = match.record.dimensions || {};
  const csvCell = (value: unknown): string => {
    const text = value == null ? "" : String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const body = format === "csv"
    ? [["group", "count", ...metricKeys, "bestResultId", ...Object.keys(dimensions).map(key => `dimension:${key}`)],
      [rows[0]?.groupKey || match.record.suite, rows[0]?.count ?? 1, ...Object.values(match.metrics), rows[0]?.bestResultId || "", ...Object.values(dimensions)]]
      .map(row => row.map(csvCell).join(",")).join("\n")
    : exportPaperTable(rows, config, {
      id: "cli",
      title: "Results",
      leaderboardId: "cli",
      rowDimension: "suite",
      metrics: metricKeys,
      boldBest: false,
      showMeanStd: false,
      decimals: {},
      metricDisplayNames: {},
    }, "markdown");
  const evidence = { source: match.source, current: match.current, observedAt: match.observedAt };
  const output = format === "json" ? JSON.stringify({ id: match.id, ...evidence, dimensions, metrics: match.metrics, rows }, null, 2) : body;
  if (flags.out) {
    fs.mkdirSync(path.dirname(path.resolve(flags.out)), { recursive: true });
    fs.writeFileSync(path.resolve(flags.out), output.endsWith("\n") ? output : `${output}\n`, "utf8");
  }
  if (flags.json) writeJson({ id: match.id, ...evidence, format, path: flags.out || "", content: flags.compactJson ? undefined : output }, flags.compactJson);
  else process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
  return 0;
}

export function selectResult(rows: ResultRow[], id: string): ResultRow | undefined {
  const exact = rows.find(row => row.id === id);
  if (exact) return exact;
  const matches = rows.filter(row => row.experimentId === id || row.runKey === id);
  if (!matches.length) return undefined;
  if (matches.length > 1) throw businessError("RESULT_SELECTION_AMBIGUOUS：此运行对应多行结果，请用精确结果 ID 查看或导出。", JSON.stringify({ id, candidates: matches.map(row => ({ id: row.id, seed: row.seed, dimensions: row.record.dimensions })) }));
  return matches[0];
}

export interface ResultRow {
  source: "active_query" | "history";
  current: boolean;
  observedAt: string | null;
  id: string;
  experimentId: string;
  runKey: string;
  status: string;
  created: string;
  updated: string;
  primaryMetric: string;
  primaryValue: unknown;
  metrics: Record<string, unknown>;
  config: unknown;
  seed: unknown;
  checkpoint: unknown;
  outputFiles: string[];
  record: ExperimentResultRecord;
}

export async function loadResults(flags: { history?: boolean } = {}): Promise<ResultRow[]> {
  const records: any[] = [];
  let observedAt: string | null = null;
  if(flags.history){
    process.stderr.write("历史结果：仅查看本机旧记录，未核实服务器当前状态；不能作为本轮查询结果。\n");
    for (const rel of [RESULT_REGISTRY_REL, RESULT_REGISTRY_LOCAL_REL])
      records.push(...extractRecords(readJsonFile<unknown>(resolveProjectPath(rel), null)));
    records.push(...parseLocalResultFiles());
  }else{
    const remote:any=await callApi("results.list", {});
    if(remote?.source!=="active_query"||remote?.summary?.current!==true)
      throw businessError("RESULT_QUERY_UNVERIFIED：本轮服务器结果未核实；可重新查询，或用 --history 明确查看本机历史记录。");
    // The public API limits the preview to 200 rows; summary.results is the complete query.
    records.push(...extractRecords(Array.isArray(remote.summary.results)?remote.summary.results:remote));
    observedAt=remote.summary.observedAt||null;
  }
  const byId = new Map<string, ResultRow>();
  for (const raw of records) {
    const modern=!!(raw.planFile&&raw.workerId&&raw.runId);
    // Include the run and complete dimension tuple: different seeds/endpoints and reruns cannot collide.
    const id=modern?"result-"+createHash("sha256").update(JSON.stringify([raw.planFile,raw.workerId,raw.runId,raw.workflowId||"",raw.revision||"",raw.codeFingerprint||"",
      Object.entries(raw.dimensions||{}).sort(([a],[b])=>a.localeCompare(b)),(raw.sourceFiles||[]).map((file:any)=>file.path).sort()])).digest("hex")
      :raw.resultId||raw.experimentId;
    if(!id)throw businessError("RESULT_IDENTITY_MISSING：结果缺少可核实的行身份，未合并或导出。");
    const record:ExperimentResultRecord=modern?{...raw,schemaVersion:1,resultId:id,experimentId:raw.runId,runKey:raw.runId,
      suite:String(raw.dimensions?.dataset||raw.planFile),experimentName:String(raw.dimensions?.method||raw.dimensions?.case||raw.runId),
      status:raw.completionState==="verified"&&raw.aggregationState==="eligible"?"validated":"warning",
      provenance:{planFile:raw.planFile,workerId:raw.workerId},createdAt:raw.createdAt||"",updatedAt:observedAt||"",
      metrics:Object.fromEntries(Object.entries(raw.metrics||{}).map(([key,value])=>[key,typeof value==="object"&&value!==null?value:{value}]))}:raw;
    if (isDiagnosticWorkerResult(record as unknown as Record<string, unknown>)) continue;
    const metrics = Object.fromEntries(Object.entries(record.metrics || {}).map(([key, value]) => [key, value && typeof value === "object" ? (value as { value?: unknown }).value : value]));
    const primaryMetric = record.primaryMetric || Object.keys(metrics)[0] || "";
    const outputFiles = (record.sourceFiles || []).map((item) => item.path).filter(Boolean);
    const checkpoints = checkpointRecordsFromManifest(record);
    byId.set(id, {
      id,
      source: flags.history ? "history" : "active_query", current: !flags.history, observedAt,
      experimentId: record.experimentId,
      runKey: record.runKey,
      status: record.status,
      created: record.createdAt,
      updated: record.updatedAt,
      primaryMetric,
      primaryValue: metrics[primaryMetric],
      metrics,
      config: record.provenance?.configPath || record.dimensions || null,
      seed: record.dimensions?.seed ?? null,
      checkpoint: checkpoints[0]?.path || record.provenance?.artifactKey || null,
      outputFiles,
      record,
    });
  }
  return Array.from(byId.values());
}

function extractRecords(value: unknown): ExperimentResultRecord[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as ExperimentResultRecord[];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.records)) return record.records as ExperimentResultRecord[];
  if (Array.isArray(record.results)) return record.results as ExperimentResultRecord[];
  if (Array.isArray(record.finalResults)) return record.finalResults as ExperimentResultRecord[];
  return [];
}

function parseLocalResultFiles(): ExperimentResultRecord[] {
  const files = [
    resolveProjectPath("experiments", "results"),
    resolveProjectPath("simple_cluster", "results"),
  ].flatMap((dir) => {
    try {
      return fs.readdirSync(dir).filter((name) => /\.(csv|json)$/i.test(name) && !/result_registry/i.test(name) && name.toLowerCase() !== LATEST_RESULT_FILE).map((name) => path.join(dir, name));
    } catch {
      return [] as string[];
    }
  });
  const preset = builtInResultPresets[0];
  const out: ExperimentResultRecord[] = [];
  for (const file of files) {
    try {
      const text = fs.readFileSync(file, "utf8");
      out.push(...parseResultFile(text, { path: file, type: file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset));
    } catch {
      /* skip unreadable result files */
    }
  }
  return out;
}
