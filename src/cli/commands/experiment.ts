import * as fs from "fs";
import * as path from "path";
import { callApi, hasApiDiscovery, optionalApi } from "../api";
import { EXPERIMENT_INDEX_REL, RUNS_DIR, fileExists, projectRoot, readJsonFile, readTail, readTextFile, resolveProjectPath } from "../data";
import { matchesRuntime, observeRunningExperiments, RuntimeObservation } from "../runtime";
import { businessError, envError, usageError } from "../errors";
import { block, table, writeJson, writeText } from "../format";
import { CliFlags, requirePositional } from "../parse";
import { retryExperiment } from "../../features/Lifecycle";
import { cloneOrReproducePlan } from "../../features/PlanBuilder";
import { parsePlanSummary } from "../../features/PlanBuilder";
import { runRecordedExperiment } from "../../features/ExperimentRunner";
import { loadResults } from "./result";

export type ExperimentKind = "workflow" | "worker_run";

export type PublicStatus = "pending" | "queued" | "running" | "success" | "failed" | "cancelled" | "unknown";
export type HealthStatus = "healthy" | "warning" | "error" | "stalled" | "unknown";

export interface ExperimentRow {
  id: string;
  type: ExperimentKind;
  name: string;
  status: string;
  created: string;
  updated: string;
  started_at: string;
  finished_at: string;
  plan: string;
  run_id: string;
  worker_id: string;
  host: string;
  tmux: string;
  stage: string;
  progress: RuntimeObservation["progress"];
  gpu: RuntimeObservation["gpu"] | null;
  parent_id: string;
  health_status: HealthStatus;
  health_reason: string;
  missing_progress: boolean;
  status_source: "aggregate" | "scheduler" | "worker" | "log" | "unknown";
  experiment_case: string;
  model: string;
  dataset: string;
  seed: string;
  lifecycle: "running" | "finished" | "failed" | "cancelled" | "";
  source: "experiment_index" | "history" | "runtime_observation";
  raw?: Record<string, unknown>;
}

export interface ExperimentRuntimeSnapshot {
  id: string;
  type: ExperimentKind;
  status: string;
  health_status: HealthStatus;
  worker: string;
  gpu: string;
  stage: string;
  plan: string;
  progress: Record<string, unknown> | null;
  updated_at: string;
}

export interface RuntimeSnapshotContext {
  row: ExperimentRow;
  snapshot_time: string;
  snapshot_id: string;
}

const AGENT_SCHEMA_VERSION = "1";

interface CommandSnapshot {
  snapshot_id: string;
  snapshot_time: string;
  runtime_version: string;
  runtime_source: "experiment_index" | "history" | "runtime_observation";
}

function createCommandSnapshot(runtimeVersion = "", runtimeSource: CommandSnapshot["runtime_source"] = "experiment_index"): CommandSnapshot {
  return { snapshot_id: String(Date.now()), snapshot_time: new Date().toISOString(), runtime_version: runtimeVersion, runtime_source: runtimeSource };
}

function snapshotSource(rows: ExperimentRow[]): CommandSnapshot["runtime_source"] {
  if (rows.some((row) => row.source === "runtime_observation")) return "runtime_observation";
  if (rows.some((row) => row.source === "history")) return "history";
  return "experiment_index";
}
interface ExperimentOverviewSnapshot {
  rows: ExperimentRow[];
  snapshot_time: string;
}

async function createExperimentOverviewSnapshot(): Promise<ExperimentOverviewSnapshot> {
  return { rows: await loadExperiments(), snapshot_time: new Date().toISOString() };
}

function alertDetailsFor(flags: { missing_progress: boolean; stalled: boolean; recent_failure: boolean }): Array<{ type: string; message: string }> {
  return [
    flags.missing_progress ? { type: "missing_progress", message: "experiment has no progress update" } : null,
    flags.stalled ? { type: "stalled", message: "experiment has no progress update" } : null,
    flags.recent_failure ? { type: "recent_failure", message: "experiment failed within the last 24 hours" } : null,
  ].filter((item): item is { type: string; message: string } => item !== null).slice(0, 10)
    .map((item) => ({ ...item, message: item.message.slice(0, 300) }));
}

async function createRuntimeSnapshot(id: string): Promise<RuntimeSnapshotContext> {
  // snapshot_id identifies this one command invocation, not a snapshot shared across commands.
  return {
    row: await resolveExperimentReference(id),
    snapshot_time: new Date().toISOString(),
    snapshot_id: String(Date.now()),
  };
}
export interface LogRecord {
  timestamp: string;
  level: string;
  message: string;
}

const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MISSING_PROGRESS_TIMEOUT_MS = 10 * 60 * 1000;

export async function experimentCommand(action: string, rest: string[], flags: CliFlags): Promise<number> {
  if (action === "list") return experimentList(flags);
  if (action === "summary") return experimentSummary(flags);
  if (action === "active") return experimentActive(flags);
  if (action === "overview") return experimentOverview(flags);
  if (action === "health") return experimentHealth(flags);
  if (action === "tree") return experimentTree(flags);
  if (action === "status") return experimentStatus(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "monitor") return experimentMonitor(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "diagnose") return experimentDiagnose(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "inspect") return experimentInspect(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "config") return experimentConfig(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "results") return experimentResults(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "batch") return experimentBatch(requirePositional(rest, 0, "plan"), flags);
  if (action === "run") return experimentRun(requirePositional(rest, 0, "plan file"), flags);
  if (action === "stop") return experimentStop(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "pause") return experimentPause(requirePositional(rest, 0, "experiment id"), flags);
  if (action === "resume" || action === "retry") return experimentRetry(requirePositional(rest, 0, "experiment id"), flags, action);
  throw usageError(`unknown experiment action: ${action || "(missing)"}`);
}
export async function experimentList(flags: CliFlags): Promise<number> {
  const rows = await loadExperiments();
  const status = String(flags.status || "").trim().toLowerCase();
  const type = String(flags.type || "").trim();
  let filtered = rows;
  if (status) filtered = filtered.filter((row) => row.status.toLowerCase() === status);
  if (type) filtered = filtered.filter((row) => row.type === type);
  if (typeof flags.limit === "number") filtered = filtered.slice(0, flags.limit);
  const view = filtered.map((row) => publicExperiment(row, row.type === "workflow" ? childRuns(row, rows) : []));
  if (flags.json) {
    writeJson(view, flags.compactJson || !flags.full);
    return 0;
  }
  writeText(table(["id", "type", "name", "status", "health_status", "worker_id", "tmux", "stage"], view));
  return 0;
}

export async function experimentSummary(flags: CliFlags): Promise<number> {
  const payload = buildExperimentSummary(await loadExperiments());
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Summary", payload as unknown as Record<string, unknown>));
  return 0;
}

function buildExperimentSummary(rows: ExperimentRow[]): Record<string, unknown> {
  const running = rows.filter((row) => row.status === "running");
  const alerts = buildExperimentAlerts(rows);
  return {
    running_count: running.length,
    failed_count: rows.filter((row) => row.status === "failed").length,
    success_count: rows.filter((row) => row.status === "success").length,
    workflows: rows.filter((row) => row.type === "workflow").length,
    active_workers: Array.from(new Set(running.map((row) => row.worker_id).filter(Boolean))),
    gpu_usage: running.filter((row) => row.gpu?.id).map((row) => ({ id: row.id, worker: row.worker_id, gpu: row.gpu?.id || "" })),
    stalled_experiments: rows.filter((row) => row.health_status === "stalled").map((row) => row.id),
    recent_failures: alerts.failed_recent.slice(0, 5),
  };
}

function buildExperimentAlerts(rows: ExperimentRow[], failedLimit = 10): { failed_recent: Array<Record<string, unknown>>; stalled: Array<Record<string, unknown>>; missing_progress: Array<Record<string, unknown>> } {
  return {
    failed_recent: sortByUpdatedDesc(rows.filter((row) => isRecentFailure(row))).slice(0, failedLimit).map(failureRow),
    stalled: rows.filter((row) => row.health_status === "stalled").map(failureRow),
    missing_progress: rows.filter((row) => isMissingProgress(row)).map(failureRow),
  };
}

export function isRecentFailure(row: Pick<ExperimentRow, "status" | "updated" | "finished_at">, now = Date.now(), windowMs = RECENT_FAILURE_WINDOW_MS): boolean {
  if (row.status !== "failed") return false;
  const stamp = Date.parse(row.updated || row.finished_at || "");
  if (!Number.isFinite(stamp)) return false;
  const age = now - stamp;
  return age >= 0 && age <= windowMs;
}

export function isMissingProgress(row: Pick<ExperimentRow, "type" | "status" | "stage" | "progress" | "updated">, now = Date.now(), timeoutMs = MISSING_PROGRESS_TIMEOUT_MS): boolean {
  if (row.type !== "worker_run" || row.status !== "running" || row.stage !== "run" || row.progress) return false;
  const stamp = Date.parse(row.updated || "");
  if (!Number.isFinite(stamp)) return false;
  return now - stamp > timeoutMs;
}

function alertLevel(status: HealthPayload["status"]): "ok" | "warning" | "error" {
  return status === "healthy" ? "ok" : status;
}

export interface HealthPayload {
  status: "healthy" | "warning" | "error";
  reason: string;
}

export function buildHealthSummary(rows: ExperimentRow[], now = Date.now()): HealthPayload {
  if (rows.some((row) => isRecentFailure(row, now))) return { status: "error", reason: "failed_recent" };
  if (rows.some((row) => row.health_status === "stalled")) return { status: "warning", reason: "stalled" };
  if (rows.some((row) => isMissingProgress(row, now))) return { status: "warning", reason: "missing_progress" };
  return { status: "healthy", reason: "" };
}

export function loadActiveExperiments(rows: ExperimentRow[]): ExperimentRow[] {
  const running = rows.filter((row) => row.status === "running");
  const workflows = rows.filter((row) => row.type === "workflow" && childRuns(row, rows).some((child) => child.status === "running"));
  return Array.from(new Map([...running, ...workflows].map((row) => [row.id, row])).values());
}

function idObject(id: string): { id: string } | undefined {
  return id ? { id } : undefined;
}

function buildRuntimeSnapshot(row: ExperimentRow): ExperimentRuntimeSnapshot {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    health_status: row.health_status,
    worker: row.worker_id,
    gpu: row.gpu?.id || "",
    stage: row.stage,
    plan: row.plan,
    progress: pickProgress(row.progress, row.updated) || null,
    updated_at: toIso(row.updated),
  };
}

function runtimeSnapshotPayload(context: RuntimeSnapshotContext): Record<string, unknown> {
  const snapshot = buildRuntimeSnapshot(context.row);
  return {
    snapshot_id: context.snapshot_id,
    snapshot_time: context.snapshot_time,
    id: snapshot.id,
    type: snapshot.type,
    status: snapshot.status,
    health_status: snapshot.health_status,
    plan: snapshot.plan,
    worker: idObject(snapshot.worker) || null,
    gpu: idObject(snapshot.gpu) || null,
    stage: snapshot.stage,
    progress: snapshot.progress,
    updated_at: snapshot.updated_at || "",
    runtime_version: snapshot.updated_at || "",
  };
}

function staleSeconds(updatedAt: string, now = Date.now()): number | null {
  const stamp = Date.parse(updatedAt);
  if (!Number.isFinite(stamp)) return null;
  return Math.max(0, Math.round((now - stamp) / 1000));
}

function failureRow(row: ExperimentRow): Record<string, unknown> {
  return keep({ id: row.id, status: row.status, plan: row.plan, worker: row.worker_id, gpu: row.gpu?.id || "", stage: row.stage, health_status: row.health_status, updated_at: row.updated });
}

function sortByUpdatedDesc(rows: ExperimentRow[]): ExperimentRow[] {
  const stamp = (row: ExperimentRow) => row.updated || row.finished_at || row.created;
  return [...rows].sort((left, right) => stamp(right).localeCompare(stamp(left)));
}

export async function experimentActive(flags: CliFlags): Promise<number> {
  const rows = loadActiveExperiments(await loadExperiments());
  const body = buildActivePayload(rows, flags.full);
  const snapshot = createCommandSnapshot(toIso(rows.map((row) => row.updated).sort().at(-1) || ""), snapshotSource(rows));
  const payload = flags.json ? { schema_version: AGENT_SCHEMA_VERSION, snapshot, ...body } : body;
  if (flags.json) writeJson(payload, false);
  else writeText(block("Active", payload as unknown as Record<string, unknown>));
  return 0;
}

function buildActivePayload(rows: ExperimentRow[], full: boolean): Record<string, unknown> {
  const built = {
    active_count: rows.length,
    workflows: rows.filter((row) => row.type === "workflow").map((row) => publicExperiment(row)),
    runs: rows.filter((row) => row.type === "worker_run").map((row) => publicExperiment(row)),
  };
  return full ? built : activeCompactPayload(built);
}

function activeCompactPayload(full: { active_count: number; workflows: Array<Record<string, unknown>>; runs: Array<Record<string, unknown>> }): Record<string, unknown> {
  return {
    active_count: full.active_count,
    workflows: full.workflows.map((row) => keep({ id: row.id, status: row.status, plan: row.plan, worker: pickId(row.worker), tmux: row.tmux })),
    runs: full.runs.map((row) => ({ ...keep({ id: row.id, experiment_case: row.experiment_case, stage: row.stage, seed: row.seed }), worker: pickId(row.worker) || null, gpu: pickId(row.gpu) || null, progress: pickProgress(row.progress, String(row.updated || "")) || null, updated_at: toIso(String(row.updated || "")) })),
  };
}

function keep(source: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function pickId(value: unknown): { id: string } | undefined {
  const id = value && typeof value === "object" ? String((value as { id?: unknown }).id || "") : "";
  return id ? { id } : undefined;
}

function pickProgress(value: unknown, updatedAt = ""): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const numberOrNull = (key: string) => {
    const parsed = Number(source[key]);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    epoch: numberOrNull("epoch"),
    max_epoch: numberOrNull("max_epoch"),
    percent: numberOrNull("percent"),
    loss: numberOrNull("loss"),
    updated_at: toIso(updatedAt),
  };
}

function toIso(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : text;
}

export async function experimentTree(flags: CliFlags): Promise<number> {
  const rows = await loadExperiments();
  const workflows = rows.filter((row) => row.type === "workflow");
  const roots = workflows.length ? workflows : rows.filter((row) => !row.parent_id);
  const payload = roots.map((row) => treeNode(row, rows));
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(payload.map((node) => renderTree(node, 0)).join("\n") || "(no experiments)");
  return 0;
}

export async function experimentStatus(id: string, flags: CliFlags): Promise<number> {
  const context = await createRuntimeSnapshot(id);
  const needsLogs = !flags.json || flags.full;
  const recentLogs = needsLogs ? await recentLogsFor(context.row) : "";
  const rows = needsLogs ? await loadExperiments() : [];
  const full = statusPayload(context.row, rows, recentLogs);
  const payload = flags.json && !flags.full ? runtimeSnapshotPayload(context) : full;
  if (flags.json) writeJson(payload, false);
  else writeText(block("Experiment", full as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentOverview(flags: CliFlags): Promise<number> {
  const context = await createExperimentOverviewSnapshot();
  const rows = context.rows;
  const body = {
    summary: buildExperimentSummary(rows),
    active: buildActivePayload(loadActiveExperiments(rows), false),
    alerts: buildExperimentAlerts(rows, flags.full ? 10 : 3),
    health: buildHealthSummary(rows),
  };
  const snapshot = { ...createCommandSnapshot(toIso(rows.map((row) => row.updated).sort().at(-1) || ""), snapshotSource(rows)), snapshot_time: context.snapshot_time };
  const payload = flags.json ? { schema_version: AGENT_SCHEMA_VERSION, snapshot, ...body } : body;
  if (flags.json) writeJson(payload, false);
  else writeText(block("Overview", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentHealth(flags: CliFlags): Promise<number> {
  const rows = await loadExperiments();
  const alerts = buildExperimentAlerts(rows, 5);
  const alertFlags = {
    missing_progress: alerts.missing_progress.length > 0,
    stalled: alerts.stalled.length > 0,
    recent_failure: alerts.failed_recent.length > 0,
  };
  const command = createCommandSnapshot(toIso(rows.map((row) => row.updated).sort().at(-1) || ""), snapshotSource(rows));
  const judged = buildHealthSummary(rows);
  const body = {
    health: { ...judged, alert_level: alertLevel(judged.status) },
    alerts: { ...alertFlags, alert_details: alertDetailsFor(alertFlags) },
  };
  const payload = flags.json
    ? { schema_version: AGENT_SCHEMA_VERSION, snapshot: command, ...body }
    : body;
  if (flags.json) writeJson(payload, false);
  else writeText(block("Health", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentInspect(id: string, flags: CliFlags): Promise<number> {
  const context = await createRuntimeSnapshot(id);
  const row = context.row;
  const records = parseLogRecords(await recentLogsFor(row));
  const reason = diagnoseReasons(row.status, records.map((item) => item.message));
  const snapshot = runtimeSnapshotPayload(context);
  const alerts = buildExperimentAlerts([row]);
  const alertFlags = {
    missing_progress: alerts.missing_progress.length > 0,
    stalled: alerts.stalled.length > 0,
    recent_failure: alerts.failed_recent.length > 0,
  };
  const payload = {
    schema_version: AGENT_SCHEMA_VERSION,
    snapshot: { snapshot_id: snapshot.snapshot_id, snapshot_time: snapshot.snapshot_time, runtime_version: snapshot.runtime_version, runtime_source: row.source || "experiment_index" },
    summary: { id: snapshot.id, type: snapshot.type, status: snapshot.status, health_status: snapshot.health_status, experiment_case: row.experiment_case, seed: row.seed },
    status: {
      id: snapshot.id,
      type: snapshot.type,
      status: snapshot.status,
      health_status: snapshot.health_status,
      plan: snapshot.plan,
      worker: snapshot.worker,
      gpu: snapshot.gpu,
      stage: snapshot.stage,
      updated_at: snapshot.updated_at,
    },
    progress: snapshot.progress,
    health: buildHealthSummary([row]),
    diagnosis: {
      reason,
      suggestions: reason.filter((item) => item !== "unknown"),
      latest_message: findLatestTrainingMessage(records),
      stale_seconds: staleSeconds(String(snapshot.updated_at || "")),
      ...(row.status === "failed" ? { failure_context: { last_error: lastErrorMessage(records), stage: snapshot.stage, worker: snapshot.worker } } : {}),
      ...(flags.full ? { evidence: trimMessages(records.map((item) => item.message), 20, 200) } : {}),
    },
    alerts: { ...alertFlags, alert_details: alertDetailsFor(alertFlags) },
  };
  if (flags.json) writeJson(payload, false);
  else writeText(block("Inspect", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentMonitor(id: string, flags: CliFlags): Promise<number> {
  const emit = async () => {
    const context = await createRuntimeSnapshot(id);
    const records = parseLogRecords(await recentLogsFor(context.row));
    const full = { ...monitorPayload(context.row, ""), recentLogs: trimMessages(records.map((item) => item.message), 20, 200) };
    const payload = flags.full ? full : monitorCompactPayload(context, records);
    if (flags.json) writeJson(payload, false);
    else writeText(block("Monitor", payload as unknown as Record<string, unknown>));
  };
  await emit();
  if (!flags.watch) return 0;
  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      void emit().catch((error) => {
        clearInterval(timer);
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        resolve();
      });
    }, 5000);
    const stop = () => {
      clearInterval(timer);
      resolve();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  return 0;
}
export async function experimentDiagnose(id: string, flags: CliFlags): Promise<number> {
  const context = await createRuntimeSnapshot(id);
  const row = context.row;
  const records = parseLogRecords(await recentLogsFor(row));
  const evidence = trimMessages(records.map((item) => item.message), 20, 200);
  const reason = diagnoseReasons(row.status, records.map((item) => item.message));
  const snapshot = runtimeSnapshotPayload(context);
  const base = {
    ...snapshot,
    reason,
    last_stage: snapshot.stage,
    suggestions: reason.filter((item) => item !== "unknown"),
  };
  const payload = flags.full ? { ...base, evidence } : base;
  if (flags.json) writeJson(payload, false);
  else writeText(block("Diagnose", payload as unknown as Record<string, unknown>));
  return 0;
}
export async function experimentConfig(id: string, flags: CliFlags): Promise<number> {
  const loaded = await loadExperimentDetail(id);
  const payload = await configPayload(loaded.match);
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Config", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentResults(id: string, flags: CliFlags): Promise<number> {
  const loaded = await loadExperimentDetail(id);
  const rows = (await loadResults()).filter((row) => resultMatchesExperiment(row, loaded.match));
  const metrics = Object.fromEntries(rows.map((row) => [row.id, row.metrics]));
  const output_paths = Array.from(new Set(rows.flatMap((row) => row.outputFiles))).filter(Boolean);
  const payload = {
    experiment_id: loaded.match.id,
    result_ids: rows.map((row) => row.id),
    metrics,
    output_paths,
    reason: rows.length ? "" : "no results recorded for this experiment",
  };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Results", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentBatch(planArg: string, flags: CliFlags): Promise<number> {
  const needle = planArg.replace(/\\/g, "/");
  const rows = (await loadExperiments()).filter((row) => planMatches(row.plan, needle) || planMatches(String(row.raw?.planFile || ""), needle));
  const bySeed: Record<string, string[]> = {};
  const byStatus: Record<string, string[]> = {};
  for (const row of rows) {
    const seed = row.seed || "unknown";
    (bySeed[seed] ||= []).push(row.id);
    (byStatus[row.status] ||= []).push(row.id);
  }
  const payload = { plan: needle, count: rows.length, seeds: bySeed, status: byStatus, experiments: rows.map((row) => publicExperiment(row)) };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Batch", { plan: needle, count: rows.length, seeds: bySeed, status: byStatus }));
  return 0;
}

export async function experimentRun(planArg: string, flags: CliFlags): Promise<number> {
  const planFile = resolvePlanFile(planArg);
  const recordedRunner = runRecordedExperiment;
  const checks = flags.check ? await preflightChecks(planFile) : undefined;
  if (flags.dryRun) {
    const route = flags.check ? null : await optionalApi("workflow.plan", { planFile, seed: flags.seed, dryRun: true, debugMode: false });
    const payload = {
      dryRun: true,
      planFile,
      seed: flags.seed || "",
      submitted: false,
      runner: recordedRunner.name,
      submitPath: "workflow.run",
      wouldExecute: `workflow.run ${planFile}${flags.seed ? ` --seed ${flags.seed}` : ""}`,
      workflow: route,
      checks,
    };
    if (flags.json) writeJson(payload, flags.compactJson);
    else writeText(block("Experiment run", payload as unknown as Record<string, unknown>));
    return 0;
  }
  if (flags.check && !flags.dryRun) {
    const payload = { submitted: false, planFile, checks };
    if (flags.json) writeJson(payload, flags.compactJson);
    else writeText(block("Experiment check", payload as unknown as Record<string, unknown>));
    return 0;
  }
  if (!hasApiDiscovery()) {
    throw envError("experiment run requires SimpleExperiment Local API. Open VS Code, or pass --dry-run.");
  }
  const result = await callApi("workflow.run", { planFile, seed: flags.seed, debugMode: false });
  const payload = { submitted: true, runner: recordedRunner.name, submitPath: "workflow.run", result };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Experiment run", asRecord(payload)));
  return 0;
}

export async function experimentStop(id: string, flags: CliFlags): Promise<number> {
  const match = await findExperiment(id);
  if (!hasApiDiscovery()) throw envError("experiment stop requires SimpleExperiment Local API. It does not kill processes directly.");
  const result = await callApi("invoke", {
    command: "stopExperiment",
    action: "stop-scheduler-operation",
    experimentId: match.id,
    runKey: match.run_id || match.id,
    operationId: match.type === "workflow" ? match.id : "",
    planFile: match.plan,
    workerId: match.worker_id,
    tmuxSession: match.tmux,
  });
  const payload = { id: match.id, submitted: true, submitPath: "invoke:stopExperiment", action: "stop-scheduler-operation", killedDirectly: false, result };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Experiment stop", payload as unknown as Record<string, unknown>));
  return 0;
}

export async function experimentPause(id: string, flags: CliFlags): Promise<number> {
  const match = await findExperiment(id);
  const payload = { id: match.id, status: "unsupported", message: "experiment pause is not supported by the current scheduler" };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block("Experiment pause", payload));
  return 0;
}

export async function experimentRetry(id: string, flags: CliFlags, action = "retry"): Promise<number> {
  const rows = await loadExperiments();
  const match = rows.find((row) => row.id === id || row.name === id);
  if (!match) throw businessError(`experiment not found: ${id}`);
  const from = flags.from || (action === "resume" ? "resume_checkpoint" : "failed_stage");
  const command = "retryExperiment";
  if (hasApiDiscovery()) {
    const result = await callApi("invoke", {
      command,
      experimentId: match.id,
      runKey: match.id,
      from,
      mode: from === "resume_checkpoint" ? "resume_checkpoint" : "same_worker",
    });
    const payload = { id: match.id, action, from, submitPath: `invoke:${command}`, result };
    if (flags.json) writeJson(payload, flags.compactJson);
    else writeText(block(`Experiment ${action}`, asRecord(payload)));
    return 0;
  }
  const lifecycle = retryExperiment({
    experimentId: match.id,
    attemptId: "attempt-1",
    state: match.status === "failed" ? "failed" : "stopped",
    events: [],
  }, from === "resume_checkpoint" ? "resume_checkpoint" : "same_worker");
  const reproduced = cloneOrReproducePlan({
    schemaVersion: 1,
    planId: match.id,
    planName: match.name,
    suite: String(match.raw?.suite || "suite"),
    status: "failed",
    source: { type: "cloned" },
    planFile: String(match.raw?.planFile || match.raw?.plan || ""),
    variables: {},
    dimensions: {},
    experimentCount: 1,
    plannedExperiments: [{ experimentKey: match.id, name: match.name, runKey: match.id, status: "failed" }],
    createdAt: match.created,
    updatedAt: match.updated,
    provenance: {},
  }, { mode: "retry_failed", overrides: { from }, skipCompleted: true });
  const payload = { id: match.id, action, from, submitPath: "features/Lifecycle.retryExperiment", lifecycle, reproducedPlanId: reproduced.planId, submitted: false };
  if (flags.json) writeJson(payload, flags.compactJson);
  else writeText(block(`Experiment ${action}`, payload as unknown as Record<string, unknown>));
  return 0;
}

function mergeExperimentRow(byId: Map<string, ExperimentRow>, row: ExperimentRow): void {
  const prev = byId.get(row.id);
  if (!prev) { byId.set(row.id, row); return; }
  const merged: ExperimentRow = { ...prev };
  for (const [key, value] of Object.entries(row)) {
    if (key === "raw" || value === undefined || value === null || value === "") continue;
    if (key === "status" && value === "unknown" && prev.status && prev.status !== "unknown") continue;
    (merged as unknown as Record<string, unknown>)[key] = value;
  }
  merged.raw = { ...(prev.raw || {}), ...(row.raw || {}) };
  merged.lifecycle = lifecycleOf(merged.status);
  byId.set(row.id, merged);
}

export async function loadExperiments(): Promise<ExperimentRow[]> {
  const byId = new Map<string, ExperimentRow>();
  for (const row of loadLocalExperiments()) mergeExperimentRow(byId, row);
  const remote = await loadRemoteExperiments();
  for (const row of remote) if (row.source !== "history") mergeExperimentRow(byId, row);
  for (const row of loadWorkerRunHistory()) mergeExperimentRow(byId, row);
  for (const row of remote) if (row.source === "history") mergeExperimentRow(byId, row);
  await applyRuntimeObservations(byId);
  const rows = Array.from(byId.values());
  for (const row of rows) applyWorkflowAggregate(row, rows);
  for (const row of rows) {
    row.missing_progress = isMissingProgress(row);
  }
  for (const row of rows) applyHealth(row);
  return rows.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}

export async function applyRuntimeObservations(byId: Map<string, ExperimentRow>, observed?: RuntimeObservation[]): Promise<void> {
  observed ??= await observeRunningExperiments();
  const used = new Set<RuntimeObservation>();
  for (const row of byId.values()) {
    if (row.type !== "worker_run") continue;
    const match = observed.find((item) => item.run_id === row.id || (row.run_id && item.run_id === row.run_id));
    if (!match || used.has(match)) continue;
    used.add(match);
    applyObservationFields(row, match);
  }
  for (const item of observed) {
    if (used.has(item) || byId.has(item.run_id)) continue;
    const row = runtimeRow(item);
    const parent = parentWorkflow(item, byId);
    if (parent) row.parent_id = parent.id;
    byId.set(item.run_id, row);
  }
}
function loadLocalExperiments(): ExperimentRow[] {
  const index = readJsonFile<unknown>(resolveProjectPath(EXPERIMENT_INDEX_REL), []);
  const rows: ExperimentRow[] = [];
  if (Array.isArray(index)) {
    for (const item of index) {
      const record = asRecord(item);
      const id = firstString(record, ["global_job_id", "run_id", "runId", "id", "experimentId"]) || firstString(record, ["hub_job_dir"]);
      if (!id) continue;
      rows.push(blankRuntime({
        id,
        name: firstString(record, ["case", "name", "suite"]) || id,
        status: normalizeStatus(firstString(record, ["status", "state"])),
        created: firstString(record, ["started_at", "createdAt", "created"]) || "",
        updated: firstString(record, ["finished_at", "synced_at", "updatedAt", "updated"]) || "",
        plan: firstString(record, ["plan", "planFile", "plan_file"]),
        seed: firstString(record, ["seed"]),
        experiment_case: firstString(record, ["experiment_case", "case"]),
        stage: firstString(record, ["stage", "stageId", "phase"]),
        progress: progressValue(record.progress),
        worker_id: firstString(record, ["worker_id", "workerId"]),
        gpu: gpuValue(record.gpu),
        run_id: firstString(record, ["run_id", "runId"]),
        tmux: firstString(record, ["tmuxSession", "tmux"]),
        finished_at: firstString(record, ["finished_at", "finishedAt"]),
        parent_id: firstString(record, ["parent_id", "parentId", "workflowId", "workflow_id"]),
        raw: record,
      }));
    }
  }
  return rows;
}

function loadWorkerRunHistory(): ExperimentRow[] {
  const runsDir = resolveProjectPath(RUNS_DIR);
  if (!fileExists(runsDir)) return [];
  const rows: ExperimentRow[] = [];
  for (const name of fs.readdirSync(runsDir)) {
    const full = path.join(runsDir, name);
    try {
      if (!fs.statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    const manifest = readJsonFile<Record<string, unknown>>(path.join(full, "artifact_manifest.json"), {});
    const env = readJsonFile<Record<string, unknown>>(path.join(full, "env_snapshot.json"), {});
    const record = { ...env, ...manifest };
    const exitText = manifest.exitCode === undefined || manifest.exitCode === null ? "" : String(manifest.exitCode).trim();
    rows.push(blankRuntime({
      id: name,
      name: firstString(record, ["name"]) || name,
      status: exitText === "" ? "unknown" : (Number(exitText) === 0 ? "completed" : "failed"),
      run_id: name,
      source: "history",
      plan: firstString(record, ["plan", "planFile", "plan_file"]),
      worker_id: firstString(record, ["worker_id", "workerId"]),
      gpu: gpuValue(record.gpu),
      stage: firstString(record, ["stage", "stageId", "phase"]),
      experiment_case: firstString(record, ["experiment_case", "case"]),
      seed: firstString(record, ["seed"]),
      progress: progressValue(record.progress),
      created: firstString(env, ["startedAt"]),
      updated: firstString(env, ["finishedAt"]) || firstString(manifest, ["generatedAt"]),
      finished_at: firstString(env, ["finishedAt"]),
      tmux: firstString(record, ["tmuxSession", "tmux"]),
      raw: { ...record, hub_job_dir: full, outputDir: full, stdout: path.join(full, "stdout.log") },
    }));
  }
  return rows;
}

async function loadRemoteExperiments(): Promise<ExperimentRow[]> {
  const rows: ExperimentRow[] = [];
  const tasks = await optionalApi("tasks.list");
  const operations = await optionalApi("operations.list", { limit: 200 });
  for (const record of collectRecords(tasks, ["experimentTraces", "schedulerStates", "tasks"])) {
    const id = firstString(record, ["runKey", "run_key", "experimentId", "id", "global_job_id"]);
    if (!id) continue;
    rows.push(blankRuntime({
      id,
      name: firstString(record, ["name", "case", "experimentName"]) || id,
      status: normalizeStatus(firstString(record, ["status", "state"])),
      created: firstString(record, ["startedAt", "createdAt", "started_at"]) || "",
      updated: firstString(record, ["updatedAt", "finishedAt", "finished_at"]) || "",
      plan: firstString(record, ["plan", "planFile", "plan_file"]),
      parent_id: firstString(record, ["parent_id", "parentId", "workflowId", "workflow_id"]),
      raw: record,
    }));
  }
  for (const record of collectRecords(operations, ["records"])) {
    const id = firstString(record, ["operationId", "runKey", "planFile", "id"]);
    if (!id) continue;
    rows.push(blankRuntime({
      id,
      name: firstString(record, ["planFile", "planId", "type"]) || id,
      status: normalizeStatus(firstString(record, ["status", "state"])),
      created: firstString(record, ["startedAt"]) || "",
      updated: firstString(record, ["finishedAt", "updatedAt"]) || "",
      plan: firstString(record, ["planFile", "plan"]),
      worker_id: firstString(record, ["workerId", "worker_id", "schedulerOwnerWorkerId"]),
      tmux: firstString(record, ["tmuxSession", "tmux"]),
      parent_id: firstString(record, ["parent_id", "parentId", "workflowId", "workflow_id"]),
      raw: record,
    }));
  }
  const schedulerStates = asRecord(tasks).schedulerStates;
  if (Array.isArray(schedulerStates)) {
    for (const item of schedulerStates) rows.push(...workerRunsFromSchedulerState(asRecord(item), rows));
  }
  return rows;
}

function workerRunsFromSchedulerState(state: Record<string, unknown>, workflows: ExperimentRow[]): ExperimentRow[] {
  const plan = firstString(state, ["planFile", "plan_file", "plan"]);
  const schedulerSession = firstString(state, ["scheduler_session", "schedulerSession"]);
  const exactParents = workflows.filter((row) => row.type === "workflow" && schedulerSession && row.tmux === schedulerSession);
  const planParents = workflows.filter((row) => row.type === "workflow" && plan && row.plan === plan);
  const parentId = firstString(state, ["workflowId", "workflow_id", "operationId", "operation_id"])
    || (exactParents.length === 1 ? exactParents[0].id : planParents.length === 1 ? planParents[0].id : "");
  const buckets: Array<[string, string]> = [
    ["running_experiments", "running"],
    ["testing_experiments", "running"],
    ["completed_experiments", "success"],
    ["failed_experiments", "failed"],
    ["stopped_experiments", "cancelled"],
  ];
  const rows: ExperimentRow[] = [];
  for (const [bucket, status] of buckets) {
    const entries = state[bucket];
    if (!Array.isArray(entries)) continue;
    for (const value of entries) {
      const record = asRecord(value);
      const id = firstString(record, ["session", "runKey", "run_key", "commandId"]);
      if (!id) continue;
      const gpuId = firstString(record, ["gpu_id", "gpuId"]);
      const stopped = Boolean(record.manualInterrupted || record.manualStopType || record.stop_reason);
      const rowStatus = stopped ? "cancelled" : status;
      rows.push(blankRuntime({
        id,
        type: "worker_run",
        source: "history",
        name: firstString(record, ["experiment_case", "case"]) || id,
        status: rowStatus,
        status_source: "scheduler",
        plan: firstString(record, ["planFile", "plan_file", "plan"]) || plan,
        run_id: id,
        parent_id: firstString(record, ["parent_id", "workflowId", "workflow_id"]) || parentId,
        worker_id: firstString(record, ["worker_id", "workerId"]),
        gpu: gpuId ? { id: gpuId, memory: "", utilization: "" } : null,
        tmux: firstString(record, ["tmuxTarget", "tmuxSession", "window"]),
        stage: firstString(record, ["stage", "phase"]) || (bucket === "testing_experiments" ? "test" : "run"),
        experiment_case: firstString(record, ["experiment_case", "case"]),
        seed: firstString(record, ["seed"]),
        progress: progressValue(record.progress),
        created: firstString(record, ["started_at", "startedAt"]),
        updated: firstString(record, ["finished_at", "finishedAt", "updated_at", "updatedAt"])
          || firstString(state, ["updated_at", "generatedAt"]),
        finished_at: firstString(record, ["finished_at", "finishedAt"]),
        raw: record,
      }));
    }
  }
  return rows;
}

function progressValue(value: unknown): RuntimeObservation["progress"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as RuntimeObservation["progress"];
}

function gpuValue(value: unknown): RuntimeObservation["gpu"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = String((value as { id?: unknown }).id || "");
  return id ? { id, memory: "", utilization: "" } : null;
}

function blankRuntime(row: Partial<ExperimentRow> & Pick<ExperimentRow, "id" | "name" | "status">): ExperimentRow {
  const created = row.created || "";
  return {
    type: experimentKind(row.id, row),
    plan: "",
    run_id: "",
    worker_id: "",
    host: "",
    tmux: "",
    stage: "",
    progress: null,
    gpu: null,
    parent_id: "",
    created,
    updated: "",
    started_at: created,
    finished_at: "",
    health_status: "unknown",
    health_reason: "",
    status_source: "unknown",
    missing_progress: false,
    experiment_case: "",
    model: "",
    dataset: "",
    seed: "",
    source: "experiment_index",
    ...row,
    status: publicStatus(row.status),
    lifecycle: lifecycleOf(publicStatus(row.status)),
  };
}

function runtimeFields(item: RuntimeObservation, row: ExperimentRow): Partial<ExperimentRow> {
  return {
    status: "running",
    status_source: "worker",
    source: "runtime_observation",
    name: item.plan || row.name,
    plan: item.plan || row.plan,
    run_id: item.run_id,
    worker_id: item.worker.id,
    host: item.worker.host,
    tmux: item.tmux.window,
    stage: item.stage,
    progress: item.progress,
    gpu: item.gpu,
    experiment_case: item.config.experiment_case || row.experiment_case,
    seed: item.config.seed || row.seed,
    model: item.config.model || row.model,
    dataset: item.config.dataset || row.dataset,
    updated: item.updated_at,
    raw: { ...(row.raw || {}), runtimeLog: item.log, tmux: item.tmux, worker: item.worker, config_path: item.config.path || row.raw?.config_path || "" },
  };
}

export function applyObservationFields(row: ExperimentRow, item: RuntimeObservation): ExperimentRow {
  Object.assign(row, runtimeFields(item, row));
  row.lifecycle = lifecycleOf(row.status);
  return row;
}

export function runtimeRow(item: RuntimeObservation): ExperimentRow {
  const base = blankRuntime({ id: item.run_id, name: item.plan || item.run_id, status: "running", type: "worker_run" });
  const fields = runtimeFields(item, base);
  return blankRuntime({
    ...base,
    ...fields,
    id: item.run_id,
    type: "worker_run",
    name: String(fields.name || item.run_id),
    status: "running",
  });
}

function publicExperiment(row: ExperimentRow, children: ExperimentRow[] = []): Record<string, unknown> {
  const started = row.started_at || row.created || "";
  const finished = row.finished_at || (["success", "failed", "cancelled"].includes(row.status) ? row.updated : "");
  const linked = children.length ? children : [];
  return {
    id: row.id,
    type: row.type,
    parent_id: row.parent_id,
    children: linked.map((child) => publicExperiment(child)),
    children_count: row.type === "workflow" ? linked.length : undefined,
    name: row.name,
    plan: row.plan,
    created_at: row.created,
    started_at: started,
    finished_at: finished,
    duration: durationSeconds(started, finished),
    status: row.status,
    status_source: row.status_source || "unknown",
    aggregate_status: row.type === "workflow" ? aggregateStatus(linked) : undefined,
    health_status: row.health_status,
    health_reason: row.health_reason,
    run_id: row.run_id,
    worker: { id: row.worker_id, host: row.host },
    worker_id: row.worker_id,
    host: row.host,
    tmux: row.tmux,
    stage: row.stage,
    experiment_case: row.experiment_case,
    seed: row.seed,
    model: row.model,
    dataset: row.dataset,
    progress: row.progress,
    gpu: row.gpu,
    created: row.created,
    updated: row.updated,
  };
}
function experimentKind(id: string, row: Partial<ExperimentRow>): ExperimentKind {
  if (/^run-\d+$/.test(id) || /^run-\d+$/.test(String(row.run_id || ""))) return "worker_run";
  if (row.progress || row.raw?.runtimeLog) return "worker_run";
  const source = String(row.raw?.type || row.raw?.action || "");
  if (source === "run-plan" || source.endsWith("-plan") || source.includes("scheduler")) return "workflow";
  return "workflow";
}

function parentWorkflow(item: RuntimeObservation, rows: Map<string, ExperimentRow>): ExperimentRow | undefined {
  const candidates = Array.from(rows.values()).filter((row) => row.type === "workflow" && row.plan === item.plan);
  return candidates.find((row) => !["completed", "failed", "cancelled"].includes(row.status)) || candidates[0];
}

function childRuns(parent: ExperimentRow, rows: ExperimentRow[]): ExperimentRow[] {
  return rows.filter((row) => row.type === "worker_run" && row.parent_id === parent.id);
}

function aggregateStatus(children: ExperimentRow[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const child of children) counts[child.status] = (counts[child.status] || 0) + 1;
  return { running: counts.running || 0, failed: counts.failed || 0, success: counts.success || 0, ...counts };
}

function applyWorkflowAggregate(row: ExperimentRow, rows: ExperimentRow[]): void {
  if (row.type !== "workflow") return;
  const children = childRuns(row, rows);
  if (!children.length) return;
  if (children.some((child) => child.status === "failed")) row.status = "failed";
  else if (children.some((child) => child.status === "running")) row.status = "running";
  else if (children.every((child) => child.status === "success")) row.status = "success";
  row.status_source = "aggregate";
  const newest = children.map((child) => child.updated).filter(Boolean).sort().at(-1) || "";
  if (newest && newest > row.updated) row.updated = newest;
}

function resolvePlanFile(planArg: string): string {
  const abs = path.isAbsolute(planArg) ? planArg : resolveProjectPath(planArg);
  if (fileExists(abs)) return path.relative(projectRoot(), abs).replace(/\\/g, "/") || planArg;
  throw businessError(`plan file not found: ${planArg}`);
}

function collectRecords(value: unknown, keys: string[]): Array<Record<string, unknown>> {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(asRecord);
  const record = asRecord(value);
  const out: Array<Record<string, unknown>> = [];
  for (const key of keys) {
    const item = record[key];
    if (Array.isArray(item)) out.push(...item.map(asRecord));
    else if (item && typeof item === "object") {
      for (const [id, nested] of Object.entries(item as Record<string, unknown>)) {
        out.push({ id, ...asRecord(nested) });
      }
    }
  }
  if (record.operations && typeof record.operations === "object" && !Array.isArray(record.operations)) {
    for (const [id, nested] of Object.entries(record.operations as Record<string, unknown>)) {
      out.push({ operationId: id, ...asRecord(nested) });
    }
  }
  return out;
}

function extractLiveLog(live: unknown, id: string): string {
  if (!live) return "";
  const record = asRecord(live);
  if (typeof record.text === "string") return record.text;
  const rows = Array.isArray(record.rows) ? record.rows : Array.isArray(record.logs) ? record.logs : [];
  const match = rows.map(asRecord).find((row) => firstString(row, ["runKey", "id"]) === id) || asRecord(rows[0]);
  return firstString(match, ["text", "tail", "output", "log"]) || JSON.stringify(live);
}

export function lifecycleOf(status: string): ExperimentRow["lifecycle"] {
  if (status === "running") return "running";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  if (status === "success") return "finished";
  return "";
}

function publicStatus(value: string): PublicStatus {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return "unknown";
  if (["fail", "failed", "error", "parse_failed"].includes(text)) return "failed";
  if (["run", "running", "active"].includes(text)) return "running";
  if (["complete", "completed", "succeeded", "success", "archived"].includes(text)) return "success";
  if (["queue", "queued", "waiting", "waiting_confirmation"].includes(text)) return "queued";
  if (["pending", "created", "planned"].includes(text)) return "pending";
  if (["cancel", "cancelled", "canceled", "stopped"].includes(text)) return "cancelled";
  if (["pending", "queued", "running", "success", "failed", "cancelled", "unknown"].includes(text)) return text as PublicStatus;
  return "unknown";
}

function normalizeStatus(value: string): string {
  return publicStatus(value);
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}


const DIAGNOSIS_PATTERNS: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "cuda out of memory", pattern: /cuda out of memory|out of memory|oom/i },
  { reason: "missing file", pattern: /no such file|file not found|filenotfound|missing file/i },
  { reason: "config error", pattern: /config(?:uration)? error|invalid config|yaml(?:.+)error/i },
  { reason: "nan loss", pattern: /\bnan\b|loss[:=]\s*nan/i },
];

async function resolveExperimentReference(value: string): Promise<ExperimentRow> {
  const rows = await loadExperiments();
  const wanted = String(value || "").trim();
  const best = pickExperiment(rows, wanted);
  if (best) return best;
  const hit = resolveRuntimeObservation(wanted, await observeRunningExperiments());
  if (hit) { const row = runtimeRow(hit); applyHealth(row); return row; }
  throw businessError(`experiment not found: ${wanted}`, JSON.stringify({
    requested: wanted,
    searched_sources: ["current_rows", "runtime_history", "experiment_index", "runtime_observation"],
    candidates: rows.slice(0, 5).map((row) => row.id),
  }));
}

function pickExperiment(rows: ExperimentRow[], wanted: string): ExperimentRow | undefined {
  let best: ExperimentRow | undefined;
  let bestRank = 0;
  for (const row of rows) {
    const rank = referenceRank(row, wanted);
    if (rank && (!bestRank || rank < bestRank)) { best = row; bestRank = rank; }
  }
  return best;
}

export function resolveRuntimeObservation(value: string, observed: RuntimeObservation[]): RuntimeObservation | undefined {
  const wanted = String(value || "").trim();
  if (!wanted) return undefined;
  return observed.find((item) => item.run_id === wanted) || observed.find((item) => matchesRuntime(wanted, item));
}

function referenceRank(row: ExperimentRow, wanted: string): number {
  if (!wanted) return 0;
  if (row.id === wanted) return 1;
  if (row.run_id === wanted) return 2;
  if (row.name === wanted) return 3;
  if (String((row.raw || {}).id || "") === wanted) return 4;
  if (row.tmux === wanted) return 5;
  return 0;
}

async function findExperiment(id: string): Promise<ExperimentRow> {
  const rows = await loadExperiments();
  const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
  if (!match) throw businessError(`experiment not found: ${id}`);
  return match;
}

async function recentLogsFor(match: ExperimentRow): Promise<string> {
  const raw = match.raw || {};
  const logPath = firstString(raw, ["hub_console_log", "log_path", "logPath", "stdout"]);
  const live = await optionalApi("live.output", { runKey: match.id });
  const liveText = extractLiveLog(live, match.id);
  const fileText = logPath ? readTail(path.isAbsolute(logPath) ? logPath : resolveProjectPath(logPath), 200) : "";
  return String(raw.runtimeLog || "").trim() ? String(raw.runtimeLog) : String(liveText || fileText || "");
}

async function loadExperimentDetail(id: string): Promise<{ match: ExperimentRow; rows: ExperimentRow[]; recentLogs: string }> {
  const rows = await loadExperiments();
  const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
  if (!match) throw businessError(`experiment not found: ${id}`);
  return { match, rows, recentLogs: await recentLogsFor(match) };
}

function statusPayload(match: ExperimentRow, rows: ExperimentRow[], recentLogs: string): Record<string, unknown> {
  const raw = match.raw || {};
  const outputDir = firstString(raw, ["hub_job_dir", "outputDir", "output_dir", "runDir", "native_job_dir", "worker_job_dir"]);
  const children = match.type === "workflow" ? childRuns(match, rows) : [];
  return {
    ...publicExperiment(match, children),
    worker: { id: match.worker_id, host: match.host },
    stage: match.stage || firstString(raw, ["stage", "stageId", "phase", "completion_type"]) || match.status,
    node: match.worker_id || firstString(raw, ["worker_host", "worker_id", "workerId", "server", "node"]) || "",
    recentLogs,
    error: firstString(raw, ["error", "sync_error", "message"]) || "",
    outputDir: outputDir || "",
    updated_at: match.updated,
  };
}

function monitorPayload(match: ExperimentRow, recentLogs: string): Record<string, unknown> {
  const progress = match.progress;
  return {
    id: match.id,
    status: match.status,
    stage: match.stage,
    epoch: progress?.epoch ?? null,
    batch: progress?.batch ?? null,
    loss: progress?.loss ?? null,
    gpu: match.gpu,
    recentLogs,
    updated_at: match.updated,
  };
}

function monitorCompactPayload(context: RuntimeSnapshotContext, records: LogRecord[]): Record<string, unknown> {
  const snapshot = runtimeSnapshotPayload(context);
  return {
    ...snapshot,
    latest_message: findLatestTrainingMessage(records),
  };
}

function lastErrorMessage(records: LogRecord[]): string {
  const error = [...records].reverse().find((row) => row.level === "ERROR" || /error|exception|traceback/i.test(row.message));
  return (error?.message || "").slice(0, 300);
}

export function findLatestTrainingMessage(records: LogRecord[]): string {
  const scored = extractTrainingMessages(records).map((message) => ({ message, score: scoreTrainingMessage(message) }));
  const best = scored.reduce<{ message: string; score: number } | undefined>((top, item) => top && top.score > item.score ? top : item, undefined);
  return (best && best.score > 0 ? best.message : "").slice(0, 300);
}

export function extractTrainingMessages(records: LogRecord[]): string[] {
  return records
    .map((row) => row.message)
    .filter((message) => !/yaml|config|python\s+-m|encoder|dataset|cut_lr:|gate_l2:/i.test(message))
    .filter((message) => isValidTrainingMessage(message))
    .filter((message) => /loss\s+[0-9]|epoch\s+[0-9]|batch\s+[0-9]/i.test(message));
}

export function isValidTrainingMessage(message: string): boolean {
  const text = String(message || "");
  if (!text.trim()) return false;
  if (/loss\s+(--|null|nan)/i.test(text)) return false;
  if (/(^|[^A-Za-z])N\/A([^A-Za-z]|$)/i.test(text)) return false;
  return true;
}

export function scoreTrainingMessage(message: string): number {
  const text = String(message || "");
  let score = 0;
  if (/loss/i.test(text)) score += 10;
  if (/epoch/i.test(text)) score += 8;
  if (/batch/i.test(text)) score += 8;
  if (/auc/i.test(text)) score += 6;
  if (/accuracy/i.test(text)) score += 6;
  if (/progress/i.test(text)) score += 5;
  if (/\blr\b/i.test(text)) score += 2;
  if (/显存/.test(text)) score += 1;
  if (/\bdice\b/i.test(text)) score += 6;
  if (/yaml|config|python\s+-m|encoder|dataset/i.test(text)) score -= 20;
  return score;
}

export function trimMessages(messages: string[], limit: number, maxLength: number): string[] {
  return messages.filter(Boolean).slice(-limit).map((message) => message.slice(0, maxLength));
}

function treeNode(row: ExperimentRow, rows: ExperimentRow[]): Record<string, unknown> {
  const children = row.type === "workflow" ? childRuns(row, rows) : rows.filter((item) => item.parent_id === row.id && item.id !== row.id);
  return {
    id: row.id,
    type: row.type,
    stage: row.stage,
    status: row.status,
    status_source: row.status_source || "unknown",
    children_count: row.type === "workflow" ? children.length : undefined,
    aggregate_status: row.type === "workflow" ? aggregateStatus(children) : undefined,
    children: children.map((child) => treeNode(child, [])),
  };
}

function renderTree(node: Record<string, unknown>, depth: number): string {
  const line = `${"  ".repeat(depth)}${String(node.type)} ${String(node.id)} ${String(node.stage || "")} ${String(node.status)}`.trim();
  const children = Array.isArray(node.children) ? node.children as Array<Record<string, unknown>> : [];
  return [line, ...children.map((child) => renderTree(child, depth + 1))].join("\n");
}

export function diagnoseReasons(status: string, evidence: string[]): string[] {
  if (status !== "failed") return [];
  const found = DIAGNOSIS_PATTERNS.filter((item) => evidence.some((line) => item.pattern.test(line))).map((item) => item.reason);
  return found.length ? found : ["unknown"];
}

export function parseLogRecords(text: string): LogRecord[] {
  return String(text || "").replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim()).map((line) => {
    const timestamp = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/)?.[1] || "";
    const level = line.match(/\b(ERROR|WARNING|WARN|INFO|DEBUG|CRITICAL)\b/i)?.[1].toUpperCase().replace("WARN", "WARNING") || "";
    return { timestamp, level, message: line.trim() };
  });
}

export async function logRecordsForExperiment(id: string): Promise<LogRecord[] | null> {
  const rows = await loadExperiments();
  const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
  if (!match) return null;
  const loaded = await loadExperimentDetail(match.id);
  return parseLogRecords(loaded.recentLogs);
}

async function configPayload(match: ExperimentRow): Promise<Record<string, unknown>> {
  const raw = match.raw || {};
  const configPath = firstString(raw, ["config_path", "configPath", "config", "base_config", "baseConfig"]) || match.plan;
  const absolute = configPath && fileExists(resolveProjectPath(configPath)) ? resolveProjectPath(configPath) : "";
  const yaml = absolute ? readTextFile(absolute) : "";
  const summary = yaml ? parsePlanSummary(yaml) : null;
  return {
    id: match.id,
    config_path: configPath,
    yaml,
    experiment_case: match.experiment_case || firstString(raw, ["case", "experiment_case"]) || yamlValue(yaml, "case"),
    seed: match.seed || firstString(raw, ["seed"]) || summary?.seeds?.[0] || "",
    dataset: match.dataset || firstString(raw, ["dataset", "data"]) || yamlValue(yaml, "dataset"),
    model: match.model || firstString(raw, ["model"]) || yamlValue(yaml, "model"),
    optimizer: firstString(raw, ["optimizer"]) || yamlValue(yaml, "optimizer"),
    batch_size: firstString(raw, ["batch_size", "batchSize"]) || yamlValue(yaml, "batch_size"),
    epoch: firstString(raw, ["epoch", "epochs", "max_epoch"]) || yamlValue(yaml, "epoch") || yamlValue(yaml, "epochs"),
  };
}

async function preflightChecks(planFile: string): Promise<Record<string, { status: string; detail: string }>> {
  const absolute = resolveProjectPath(planFile);
  const yaml = fileExists(absolute) ? readTextFile(absolute) : "";
  const summary = yaml ? parsePlanSummary(yaml) : null;
  const configPath = summary?.baseConfig || "";
  const configExists = configPath ? fileExists(path.isAbsolute(configPath) ? configPath : resolveProjectPath(configPath)) : false;
  const dataset = yamlValue(yaml, "dataset") || yamlValue(yaml, "data");
  const output = summary?.outputCandidates?.[0] || "";
  const outputDir = output ? path.dirname(path.isAbsolute(output) ? output : resolveProjectPath(output)) : "";
  let outputWritable = "unknown";
  if (outputDir && fileExists(outputDir)) {
    try {
      fs.accessSync(outputDir, fs.constants.W_OK);
      outputWritable = "true";
    } catch {
      outputWritable = "false";
    }
  }
  const gpu = await optionalApi("gpu.list");
  return {
    config: { status: !configPath ? "unknown" : configExists ? "true" : "false", detail: configPath || "config path not present" },
    data: { status: dataset ? (fileExists(path.isAbsolute(dataset) ? dataset : resolveProjectPath(dataset)) ? "true" : "unknown") : "unknown", detail: dataset || "dataset path not present" },
    gpu: { status: gpu ? "observed" : "unknown", detail: gpu ? "gpu.list responded" : "gpu status unavailable" },
    output: { status: outputWritable, detail: outputDir || "output directory not present" },
  };
}

function resultMatchesExperiment(result: { id: string; experimentId: string; runKey: string }, match: ExperimentRow): boolean {
  const ids = new Set([match.id, match.run_id, match.name].filter(Boolean));
  return ids.has(result.id) || ids.has(result.experimentId) || ids.has(result.runKey);
}

function planMatches(value: string, needle: string): boolean {
  const left = value.replace(/\\/g, "/");
  return Boolean(left) && (left === needle || left.endsWith(`/${needle}`) || needle.endsWith(`/${left}`) || path.basename(left) === path.basename(needle));
}

function durationSeconds(started: string, finished: string): number | null {
  const start = Date.parse(started);
  const end = Date.parse(finished);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

function yamlValue(yaml: string, key: string): string {
  const match = String(yaml || "").match(new RegExp(`^\\s*${key}\\s*:\\s*([^#\\n]+)`, "im"));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}

function applyHealth(row: ExperimentRow): void {
  const raw = row.raw || {};
  const updated = Date.parse(row.updated);
  const stale = row.status === "running" && Number.isFinite(updated) && Date.now() - updated > 30 * 60 * 1000;
  const errorText = row.status === "running" ? "" : firstString(raw, ["error", "sync_error"]);
  if (row.status === "failed" || errorText) {
    row.health_status = "error";
    row.health_reason = errorText || "status_failed";
  } else if (stale) {
    row.health_status = "stalled";
    row.health_reason = "not_updated_for_30min";
  } else if (row.status === "running") {
    row.health_status = "healthy";
    row.health_reason = "";
  } else if (row.status === "unknown") {
    row.health_status = "unknown";
    row.health_reason = "";
  } else {
    row.health_status = "healthy";
    row.health_reason = "";
  }
  if (!row.seed) row.seed = firstString(raw, ["seed"]);
  if (!row.finished_at) row.finished_at = firstString(raw, ["finished_at", "finishedAt"]);
  if (!row.started_at) row.started_at = row.created || firstString(raw, ["started_at", "startedAt"]);
}
