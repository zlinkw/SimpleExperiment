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
exports.experimentCommand = experimentCommand;
exports.experimentList = experimentList;
exports.experimentSummary = experimentSummary;
exports.isRecentFailure = isRecentFailure;
exports.isMissingProgress = isMissingProgress;
exports.buildHealthSummary = buildHealthSummary;
exports.loadActiveExperiments = loadActiveExperiments;
exports.experimentActive = experimentActive;
exports.experimentTree = experimentTree;
exports.experimentStatus = experimentStatus;
exports.experimentOverview = experimentOverview;
exports.experimentHealth = experimentHealth;
exports.experimentInspect = experimentInspect;
exports.experimentMonitor = experimentMonitor;
exports.experimentDiagnose = experimentDiagnose;
exports.experimentConfig = experimentConfig;
exports.experimentResults = experimentResults;
exports.experimentBatch = experimentBatch;
exports.experimentRun = experimentRun;
exports.experimentStop = experimentStop;
exports.experimentPause = experimentPause;
exports.experimentRetry = experimentRetry;
exports.loadExperiments = loadExperiments;
exports.applyRuntimeObservations = applyRuntimeObservations;
exports.workerHistoryMatchesRuntime = workerHistoryMatchesRuntime;
exports.applyObservationFields = applyObservationFields;
exports.runtimeRow = runtimeRow;
exports.lifecycleOf = lifecycleOf;
exports.resolveRuntimeObservation = resolveRuntimeObservation;
exports.findLatestTrainingMessage = findLatestTrainingMessage;
exports.extractTrainingMessages = extractTrainingMessages;
exports.isValidTrainingMessage = isValidTrainingMessage;
exports.scoreTrainingMessage = scoreTrainingMessage;
exports.trimMessages = trimMessages;
exports.diagnoseReasons = diagnoseReasons;
exports.parseLogRecords = parseLogRecords;
exports.logRecordsForExperiment = logRecordsForExperiment;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_1 = require("../api");
const data_1 = require("../data");
const runtime_1 = require("../runtime");
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const Lifecycle_1 = require("../../features/Lifecycle");
const PlanBuilder_1 = require("../../features/PlanBuilder");
const PlanBuilder_2 = require("../../features/PlanBuilder");
const ExperimentRunner_1 = require("../../features/ExperimentRunner");
const result_1 = require("./result");
const AGENT_SCHEMA_VERSION = "1";
function createCommandSnapshot(runtimeVersion = "", runtimeSource = "experiment_index") {
    return { snapshot_id: String(Date.now()), snapshot_time: new Date().toISOString(), runtime_version: runtimeVersion, runtime_source: runtimeSource };
}
function snapshotSource(rows) {
    if (rows.some((row) => row.source === "runtime_observation"))
        return "runtime_observation";
    if (rows.some((row) => row.source === "history"))
        return "history";
    return "experiment_index";
}
async function createExperimentOverviewSnapshot() {
    return { rows: await loadExperiments(), snapshot_time: new Date().toISOString() };
}
function alertDetailsFor(flags) {
    return [
        flags.missing_progress ? { type: "missing_progress", message: "experiment has no progress update" } : null,
        flags.stalled ? { type: "stalled", message: "experiment has no progress update" } : null,
        flags.recent_failure ? { type: "recent_failure", message: "experiment failed within the last 24 hours" } : null,
    ].filter((item) => item !== null).slice(0, 10)
        .map((item) => ({ ...item, message: item.message.slice(0, 300) }));
}
async function createRuntimeSnapshot(id) {
    // snapshot_id identifies this one command invocation, not a snapshot shared across commands.
    return {
        row: await resolveExperimentReference(id),
        snapshot_time: new Date().toISOString(),
        snapshot_id: String(Date.now()),
    };
}
const RECENT_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;
const MISSING_PROGRESS_TIMEOUT_MS = 10 * 60 * 1000;
async function experimentCommand(action, rest, flags) {
    if (action === "list")
        return experimentList(flags);
    if (action === "summary")
        return experimentSummary(flags);
    if (action === "active")
        return experimentActive(flags);
    if (action === "overview")
        return experimentOverview(flags);
    if (action === "health")
        return experimentHealth(flags);
    if (action === "tree")
        return experimentTree(flags);
    if (action === "status")
        return experimentStatus((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "monitor")
        return experimentMonitor((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "diagnose")
        return experimentDiagnose((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "inspect")
        return experimentInspect((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "config")
        return experimentConfig((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "results")
        return experimentResults((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "batch")
        return experimentBatch((0, parse_1.requirePositional)(rest, 0, "plan"), flags);
    if (action === "run")
        return experimentRun((0, parse_1.requirePositional)(rest, 0, "plan file"), flags);
    if (action === "stop")
        return experimentStop((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "pause")
        return experimentPause((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags);
    if (action === "resume" || action === "retry")
        return experimentRetry((0, parse_1.requirePositional)(rest, 0, "experiment id"), flags, action);
    throw (0, errors_1.usageError)(`unknown experiment action: ${action || "(missing)"}`);
}
async function experimentList(flags) {
    const rows = await loadExperiments();
    const status = String(flags.status || "").trim().toLowerCase();
    const type = String(flags.type || "").trim();
    let filtered = rows;
    if (status)
        filtered = filtered.filter((row) => row.status.toLowerCase() === status);
    if (type)
        filtered = filtered.filter((row) => row.type === type);
    if (typeof flags.limit === "number")
        filtered = filtered.slice(0, flags.limit);
    const view = filtered.map((row) => publicExperiment(row, row.type === "workflow" ? childRuns(row, rows) : []));
    if (flags.json) {
        (0, format_1.writeJson)(view, flags.compactJson || !flags.full);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["id", "type", "name", "status", "health_status", "worker_id", "tmux", "stage"], view));
    return 0;
}
async function experimentSummary(flags) {
    const payload = buildExperimentSummary(await loadExperiments());
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Summary", payload));
    return 0;
}
function buildExperimentSummary(rows) {
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
function buildExperimentAlerts(rows, failedLimit = 10) {
    return {
        failed_recent: sortByUpdatedDesc(rows.filter((row) => isRecentFailure(row))).slice(0, failedLimit).map(failureRow),
        stalled: rows.filter((row) => row.health_status === "stalled").map(failureRow),
        missing_progress: rows.filter((row) => isMissingProgress(row)).map(failureRow),
    };
}
function isRecentFailure(row, now = Date.now(), windowMs = RECENT_FAILURE_WINDOW_MS) {
    if (row.status !== "failed")
        return false;
    const stamp = Date.parse(row.updated || row.finished_at || "");
    if (!Number.isFinite(stamp))
        return false;
    const age = now - stamp;
    return age >= 0 && age <= windowMs;
}
function isMissingProgress(row, now = Date.now(), timeoutMs = MISSING_PROGRESS_TIMEOUT_MS) {
    if (row.type !== "worker_run" || row.status !== "running" || row.stage !== "run" || row.progress)
        return false;
    const stamp = Date.parse(row.updated || "");
    if (!Number.isFinite(stamp))
        return false;
    return now - stamp > timeoutMs;
}
function alertLevel(status) {
    return status === "healthy" ? "ok" : status;
}
function buildHealthSummary(rows, now = Date.now()) {
    if (rows.some((row) => isRecentFailure(row, now)))
        return { status: "error", reason: "failed_recent" };
    if (rows.some((row) => row.health_status === "stalled"))
        return { status: "warning", reason: "stalled" };
    if (rows.some((row) => isMissingProgress(row, now)))
        return { status: "warning", reason: "missing_progress" };
    return { status: "healthy", reason: "" };
}
function loadActiveExperiments(rows) {
    const running = rows.filter((row) => row.status === "running");
    const workflows = rows.filter((row) => row.type === "workflow" && childRuns(row, rows).some((child) => child.status === "running"));
    return Array.from(new Map([...running, ...workflows].map((row) => [row.id, row])).values());
}
function idObject(id) {
    return id ? { id } : undefined;
}
function buildRuntimeSnapshot(row) {
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
function runtimeSnapshotPayload(context) {
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
function staleSeconds(updatedAt, now = Date.now()) {
    const stamp = Date.parse(updatedAt);
    if (!Number.isFinite(stamp))
        return null;
    return Math.max(0, Math.round((now - stamp) / 1000));
}
function failureRow(row) {
    return keep({ id: row.id, status: row.status, plan: row.plan, worker: row.worker_id, gpu: row.gpu?.id || "", stage: row.stage, health_status: row.health_status, updated_at: row.updated });
}
function sortByUpdatedDesc(rows) {
    const stamp = (row) => row.updated || row.finished_at || row.created;
    return [...rows].sort((left, right) => stamp(right).localeCompare(stamp(left)));
}
async function experimentActive(flags) {
    const rows = loadActiveExperiments(await loadExperiments());
    const body = buildActivePayload(rows, flags.full);
    const snapshot = createCommandSnapshot(toIso(rows.map((row) => row.updated).sort().at(-1) || ""), snapshotSource(rows));
    const payload = flags.json ? { schema_version: AGENT_SCHEMA_VERSION, snapshot, ...body } : body;
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Active", payload));
    return 0;
}
function buildActivePayload(rows, full) {
    const built = {
        active_count: rows.length,
        workflows: rows.filter((row) => row.type === "workflow").map((row) => publicExperiment(row)),
        runs: rows.filter((row) => row.type === "worker_run").map((row) => publicExperiment(row)),
    };
    return full ? built : activeCompactPayload(built);
}
function activeCompactPayload(full) {
    return {
        active_count: full.active_count,
        workflows: full.workflows.map((row) => keep({ id: row.id, status: row.status, plan: row.plan, worker: pickId(row.worker), tmux: row.tmux })),
        runs: full.runs.map((row) => ({ ...keep({ id: row.id, experiment_case: row.experiment_case, stage: row.stage, seed: row.seed }), worker: pickId(row.worker) || null, gpu: pickId(row.gpu) || null, progress: pickProgress(row.progress, String(row.updated || "")) || null, updated_at: toIso(String(row.updated || "")) })),
    };
}
function keep(source) {
    return Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== null && value !== ""));
}
function pickId(value) {
    const id = value && typeof value === "object" ? String(value.id || "") : "";
    return id ? { id } : undefined;
}
function pickProgress(value, updatedAt = "") {
    if (!value || typeof value !== "object")
        return undefined;
    const source = value;
    const numberOrNull = (key) => {
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
function toIso(value) {
    const text = String(value || "").trim();
    if (!text)
        return "";
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : text;
}
async function experimentTree(flags) {
    const rows = await loadExperiments();
    const workflows = rows.filter((row) => row.type === "workflow");
    const roots = workflows.length ? workflows : rows.filter((row) => !row.parent_id);
    const payload = roots.map((row) => treeNode(row, rows));
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)(payload.map((node) => renderTree(node, 0)).join("\n") || "(no experiments)");
    return 0;
}
async function experimentStatus(id, flags) {
    const context = await createRuntimeSnapshot(id);
    const needsLogs = !flags.json || flags.full;
    const recentLogs = needsLogs ? await recentLogsFor(context.row) : "";
    const rows = needsLogs ? await loadExperiments() : [];
    const full = statusPayload(context.row, rows, recentLogs);
    const payload = flags.json && !flags.full ? runtimeSnapshotPayload(context) : full;
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Experiment", full));
    return 0;
}
async function experimentOverview(flags) {
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
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Overview", payload));
    return 0;
}
async function experimentHealth(flags) {
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
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Health", payload));
    return 0;
}
async function experimentInspect(id, flags) {
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
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Inspect", payload));
    return 0;
}
async function experimentMonitor(id, flags) {
    const emit = async () => {
        const context = await createRuntimeSnapshot(id);
        const records = parseLogRecords(await recentLogsFor(context.row));
        const full = { ...monitorPayload(context.row, ""), recentLogs: trimMessages(records.map((item) => item.message), 20, 200) };
        const payload = flags.full ? full : monitorCompactPayload(context, records);
        if (flags.json)
            (0, format_1.writeJson)(payload, false);
        else
            (0, format_1.writeText)((0, format_1.block)("Monitor", payload));
    };
    await emit();
    if (!flags.watch)
        return 0;
    await new Promise((resolve) => {
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
async function experimentDiagnose(id, flags) {
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
    if (flags.json)
        (0, format_1.writeJson)(payload, false);
    else
        (0, format_1.writeText)((0, format_1.block)("Diagnose", payload));
    return 0;
}
async function experimentConfig(id, flags) {
    const loaded = await loadExperimentDetail(id);
    const payload = await configPayload(loaded.match);
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Config", payload));
    return 0;
}
async function experimentResults(id, flags) {
    const loaded = await loadExperimentDetail(id);
    const rows = (await (0, result_1.loadResults)()).filter((row) => resultMatchesExperiment(row, loaded.match));
    const metrics = Object.fromEntries(rows.map((row) => [row.id, row.metrics]));
    const output_paths = Array.from(new Set(rows.flatMap((row) => row.outputFiles))).filter(Boolean);
    const payload = {
        experiment_id: loaded.match.id,
        result_ids: rows.map((row) => row.id),
        metrics,
        output_paths,
        reason: rows.length ? "" : "no results recorded for this experiment",
    };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Results", payload));
    return 0;
}
async function experimentBatch(planArg, flags) {
    const needle = planArg.replace(/\\/g, "/");
    const rows = (await loadExperiments()).filter((row) => planMatches(row.plan, needle) || planMatches(String(row.raw?.planFile || ""), needle));
    const bySeed = {};
    const byStatus = {};
    for (const row of rows) {
        const seed = row.seed || "unknown";
        (bySeed[seed] ||= []).push(row.id);
        (byStatus[row.status] ||= []).push(row.id);
    }
    const payload = { plan: needle, count: rows.length, seeds: bySeed, status: byStatus, experiments: rows.map((row) => publicExperiment(row)) };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Batch", { plan: needle, count: rows.length, seeds: bySeed, status: byStatus }));
    return 0;
}
async function experimentRun(planArg, flags) {
    const planFile = resolvePlanFile(planArg);
    const recordedRunner = ExperimentRunner_1.runRecordedExperiment;
    const checks = flags.check ? await preflightChecks(planFile) : undefined;
    if (flags.dryRun) {
        const route = flags.check ? null : await (0, api_1.optionalApi)("workflow.plan", { planFile, seed: flags.seed, dryRun: true, debugMode: false });
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
        if (flags.json)
            (0, format_1.writeJson)(payload, flags.compactJson);
        else
            (0, format_1.writeText)((0, format_1.block)("Experiment run", payload));
        return 0;
    }
    if (flags.check && !flags.dryRun) {
        const payload = { submitted: false, planFile, checks };
        if (flags.json)
            (0, format_1.writeJson)(payload, flags.compactJson);
        else
            (0, format_1.writeText)((0, format_1.block)("Experiment check", payload));
        return 0;
    }
    if (!(0, api_1.hasApiDiscovery)()) {
        throw (0, errors_1.envError)("experiment run requires SimpleExperiment Local API. Open VS Code, or pass --dry-run.");
    }
    const result = await (0, api_1.callApi)("workflow.run", { planFile, seed: flags.seed, debugMode: false });
    const payload = { submitted: true, runner: recordedRunner.name, submitPath: "workflow.run", result };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Experiment run", asRecord(payload)));
    return 0;
}
async function experimentStop(id, flags) {
    const match = await findExperiment(id);
    if (!(0, api_1.hasApiDiscovery)())
        throw (0, errors_1.envError)("experiment stop requires SimpleExperiment Local API. It does not kill processes directly.");
    const result = await (0, api_1.callApi)("invoke", {
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
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Experiment stop", payload));
    return 0;
}
async function experimentPause(id, flags) {
    const match = await findExperiment(id);
    const payload = { id: match.id, status: "unsupported", message: "experiment pause is not supported by the current scheduler" };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Experiment pause", payload));
    return 0;
}
async function experimentRetry(id, flags, action = "retry") {
    const rows = await loadExperiments();
    const match = rows.find((row) => row.id === id || row.name === id);
    if (!match)
        throw (0, errors_1.businessError)(`experiment not found: ${id}`);
    const from = flags.from || (action === "resume" ? "resume_checkpoint" : "failed_stage");
    const command = "retryExperiment";
    if ((0, api_1.hasApiDiscovery)()) {
        const result = await (0, api_1.callApi)("invoke", {
            command,
            experimentId: match.id,
            runKey: match.id,
            from,
            mode: from === "resume_checkpoint" ? "resume_checkpoint" : "same_worker",
        });
        const payload = { id: match.id, action, from, submitPath: `invoke:${command}`, result };
        if (flags.json)
            (0, format_1.writeJson)(payload, flags.compactJson);
        else
            (0, format_1.writeText)((0, format_1.block)(`Experiment ${action}`, asRecord(payload)));
        return 0;
    }
    const lifecycle = (0, Lifecycle_1.retryExperiment)({
        experimentId: match.id,
        attemptId: "attempt-1",
        state: match.status === "failed" ? "failed" : "stopped",
        events: [],
    }, from === "resume_checkpoint" ? "resume_checkpoint" : "same_worker");
    const reproduced = (0, PlanBuilder_1.cloneOrReproducePlan)({
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
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)(`Experiment ${action}`, payload));
    return 0;
}
function mergeExperimentRow(byId, row) {
    const prev = byId.get(row.id);
    if (!prev) {
        byId.set(row.id, row);
        return;
    }
    const merged = { ...prev };
    const incomingRank = sourceRank(row.source);
    const currentRank = sourceRank(prev.source);
    for (const [key, value] of Object.entries(row)) {
        if (key === "raw" || key === "type" || value === undefined || value === null || value === "")
            continue;
        if (key === "status" && value === "unknown" && prev.status && prev.status !== "unknown")
            continue;
        if (incomingRank < currentRank && merged[key])
            continue;
        merged[key] = value;
    }
    if (incomingRank >= currentRank || !prev.type)
        merged.type = row.type;
    merged.raw = { ...(prev.raw || {}), ...(row.raw || {}) };
    merged.lifecycle = lifecycleOf(merged.status);
    byId.set(row.id, merged);
}
function sourceRank(source) {
    if (source === "runtime_observation")
        return 3;
    if (source === "history")
        return 2;
    return 1;
}
async function loadExperiments() {
    const byId = new Map();
    for (const row of loadLocalExperiments())
        mergeExperimentRow(byId, row);
    const remote = await loadRemoteExperiments();
    const retained = retainedWorkerRuns(remote.rows, remote.unavailableWorkers);
    for (const row of remote.rows)
        if (row.source !== "history")
            mergeExperimentRow(byId, row);
    for (const row of loadWorkerRunHistory())
        mergeExperimentRow(byId, row);
    for (const row of [...remote.rows, ...retained]) {
        if (row.source !== "history")
            continue;
        if (remote.unavailableWorkers.includes(row.worker_id) && byId.get(row.id)?.source === "history")
            continue;
        mergeExperimentRow(byId, row);
    }
    await applyRuntimeObservations(byId);
    const rows = Array.from(byId.values());
    for (const row of rows)
        applyWorkflowAggregate(row, rows);
    for (const row of rows) {
        row.missing_progress = isMissingProgress(row);
    }
    for (const row of rows)
        applyHealth(row);
    return rows.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
}
async function applyRuntimeObservations(byId, observed) {
    observed ??= await (0, runtime_1.observeRunningExperiments)();
    const used = new Set();
    const workerRows = Array.from(byId.values()).filter((row) => row.type === "worker_run");
    const applyMatch = (row, item) => {
        used.add(item);
        applyObservationFields(row, item);
        if (!row.parent_id) {
            const parent = parentWorkflow(item, byId);
            if (parent)
                row.parent_id = parent.id;
        }
    };
    for (const row of workerRows) {
        const match = observed.find((item) => !used.has(item) && (item.run_id === row.id || (row.run_id && item.run_id === row.run_id)));
        if (match)
            applyMatch(row, match);
    }
    const historyRows = workerRows.filter((row) => row.source === "history" && row.status === "running");
    for (const row of historyRows) {
        const candidates = observed.filter((item) => !used.has(item) && workerHistoryMatchesRuntime(row, item));
        if (candidates.length !== 1)
            continue;
        const item = candidates[0];
        if (historyRows.filter((candidate) => workerHistoryMatchesRuntime(candidate, item)).length !== 1)
            continue;
        applyMatch(row, item);
        row.raw = { ...(row.raw || {}), runtimeRunId: item.run_id, workerTaskId: row.id };
    }
    for (const item of observed) {
        if (used.has(item) || byId.has(item.run_id))
            continue;
        const row = runtimeRow(item);
        const parent = parentWorkflow(item, byId);
        if (parent)
            row.parent_id = parent.id;
        byId.set(item.run_id, row);
    }
}
function workerHistoryMatchesRuntime(row, item) {
    if (row.type !== "worker_run" || row.source !== "history" || row.status !== "running")
        return false;
    const workerId = String(row.worker_id || "").trim();
    const runtimeWorkerId = String(item.worker?.id || "").trim();
    if (!workerId || !runtimeWorkerId || workerId !== runtimeWorkerId)
        return false;
    const gpuId = String(row.gpu?.id || "").trim();
    const runtimeGpuId = String(item.gpu?.id || "").trim();
    if (!gpuId || !runtimeGpuId || gpuId !== runtimeGpuId)
        return false;
    for (const [history, runtime] of [
        [row.plan, item.plan],
        [row.experiment_case, item.config?.experiment_case],
        [row.seed, item.config?.seed],
        [row.tmux, item.tmux?.session],
    ]) {
        if (history && runtime && history !== runtime)
            return false;
    }
    const runTimestamp = /^run-(\d{13})$/.exec(String(item.run_id || ""));
    const historyStart = Date.parse(row.created);
    const runtimeStart = runTimestamp ? Number(runTimestamp[1]) : NaN;
    return Number.isFinite(historyStart) && Number.isSafeInteger(runtimeStart) && Math.abs(historyStart - runtimeStart) <= 15_000;
}
function loadLocalExperiments() {
    const index = (0, data_1.readJsonFile)((0, data_1.resolveProjectPath)(data_1.EXPERIMENT_INDEX_REL), []);
    const rows = [];
    if (Array.isArray(index)) {
        for (const item of index) {
            const record = asRecord(item);
            const id = firstString(record, ["global_job_id", "run_id", "runId", "id", "experimentId"]) || firstString(record, ["hub_job_dir"]);
            if (!id)
                continue;
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
function loadWorkerRunHistory() {
    const runsDir = (0, data_1.resolveProjectPath)(data_1.RUNS_DIR);
    if (!(0, data_1.fileExists)(runsDir))
        return [];
    const rows = [];
    for (const name of fs.readdirSync(runsDir)) {
        const full = path.join(runsDir, name);
        try {
            if (!fs.statSync(full).isDirectory())
                continue;
        }
        catch {
            continue;
        }
        if (!(0, data_1.fileExists)(path.join(full, "artifact_manifest.json")) && !(0, data_1.fileExists)(path.join(full, "env_snapshot.json")))
            continue;
        const manifest = (0, data_1.readJsonFile)(path.join(full, "artifact_manifest.json"), {});
        const env = (0, data_1.readJsonFile)(path.join(full, "env_snapshot.json"), {});
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
async function loadRemoteExperiments() {
    const rows = [];
    const tasks = await (0, api_1.optionalApi)("tasks.list");
    const operations = await (0, api_1.optionalApi)("operations.list", { limit: 200 });
    for (const record of collectRecords(tasks, ["experimentTraces", "schedulerStates", "tasks"])) {
        const id = firstString(record, ["runKey", "run_key", "experimentId", "id", "global_job_id"]);
        if (!id)
            continue;
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
        const id = firstString(record, ["operationId", "id"]);
        const action = operationAction(record);
        if (!id || !experimentLaunchAction(action))
            continue;
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
            raw: { ...record, type: action },
        }));
    }
    const schedulerStates = asRecord(tasks).schedulerStates;
    if (Array.isArray(schedulerStates)) {
        for (const item of schedulerStates)
            rows.push(...workerRunsFromSchedulerState(asRecord(item), rows));
    }
    rows.push(...workerRunsFromWorkerTaskSnapshots(asRecord(tasks).workerTasks, rows));
    return { rows, unavailableWorkers: unavailableWorkerIds(asRecord(tasks).workerTasks) };
}
function unavailableWorkerIds(value) {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((entry) => {
        const snapshot = asRecord(entry);
        const tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
        return firstString(snapshot, ["error"]) && tasks.length === 0 ? [firstString(snapshot, ["workerId"])] : [];
    }).filter(Boolean);
}
const WORKER_TASK_CACHE_DIR = ["simple_cluster", "tmp", "worker_task_snapshots"];
function retainedWorkerRuns(rows, unavailableWorkers) {
    const dir = (0, data_1.resolveProjectPath)(path.join(...WORKER_TASK_CACHE_DIR));
    try {
        rememberWorkerRuns(dir, rows);
    }
    catch { /* History cache failure must not break a read-only CLI query. */ }
    if (!(0, data_1.fileExists)(dir))
        return [];
    const current = new Set(rows.map((row) => row.id));
    const retained = [];
    for (const name of fs.readdirSync(dir)) {
        if (!name.endsWith(".json"))
            continue;
        const cached = (0, data_1.readJsonFile)(path.join(dir, name), {});
        for (const item of Array.isArray(cached.rows) ? cached.rows : []) {
            const row = compactWorkerRun(item);
            if (!row?.id || current.has(row.id))
                continue;
            if (row.status === "running" && Date.now() - Date.parse(row.updated) > 180_000)
                row.status = "unknown";
            retained.push({ ...row, raw: { snapshotUnavailable: unavailableWorkers.includes(String(cached.workerId || "")) } });
        }
    }
    return retained;
}
function rememberWorkerRuns(dir, rows) {
    const grouped = new Map();
    for (const row of rows) {
        if (row.type !== "worker_run" || !row.worker_id || row.raw?.snapshotUnavailable)
            continue;
        const bucket = grouped.get(row.worker_id) || [];
        bucket.push(row);
        grouped.set(row.worker_id, bucket);
    }
    if (!grouped.size)
        return;
    fs.mkdirSync(dir, { recursive: true });
    for (const [workerId, cached] of grouped) {
        const safe = workerId.replace(/[^A-Za-z0-9_.-]+/g, "_");
        const full = path.join(dir, `${safe}.json`);
        const tmp = `${full}.${process.pid}.tmp`;
        const previous = (0, data_1.readJsonFile)(full, {});
        const merged = new Map();
        if (previous.workerId === workerId)
            for (const row of Array.isArray(previous.rows) ? previous.rows : []) {
                const compact = compactWorkerRun(row);
                if (compact.id)
                    merged.set(compact.id, compact);
            }
        for (const row of cached)
            merged.set(row.id, compactWorkerRun(row));
        fs.writeFileSync(tmp, JSON.stringify({ schemaVersion: 1, workerId, rows: [...merged.values()].map(persistedWorkerRun) }), "utf8");
        fs.renameSync(tmp, full);
    }
}
function persistedWorkerRun(row) {
    return {
        id: row.id, type: "worker_run", status: row.status, plan: row.plan, worker_id: row.worker_id,
        gpu: row.gpu, stage: row.stage, experiment_case: row.experiment_case, seed: row.seed,
        progress: row.progress, updated: row.updated, created: row.created, finished_at: row.finished_at,
        parent_id: row.parent_id, tmux: row.tmux,
    };
}
function compactWorkerRun(row) {
    const source = row.progress && typeof row.progress === "object" ? row.progress : {};
    const progress = {};
    for (const key of ["epoch", "max_epoch", "batch", "total_batch", "percent", "loss", "lr", "memory"]) {
        const value = source[key];
        if (typeof value === "number" && Number.isFinite(value) || typeof value === "string" && value.length <= 100)
            progress[key] = value;
    }
    return blankRuntime({
        id: String(row.id || ""), name: String(row.id || ""), type: "worker_run", source: "history",
        status: String(row.status || "unknown"), plan: String(row.plan || ""), worker_id: String(row.worker_id || ""),
        gpu: row.gpu?.id ? { id: String(row.gpu.id), memory: "", utilization: "" } : null,
        stage: String(row.stage || ""), experiment_case: String(row.experiment_case || ""), seed: String(row.seed || ""),
        progress: Object.keys(progress).length ? progress : null,
        updated: String(row.updated || ""), created: String(row.created || ""), finished_at: String(row.finished_at || ""),
        parent_id: String(row.parent_id || ""), tmux: String(row.tmux || ""), run_id: String(row.id || ""),
    });
}
function workerRunsFromWorkerTaskSnapshots(value, workflows) {
    if (!Array.isArray(value))
        return [];
    const rows = [];
    const operations = new Map(workflows.filter((row) => row.type === "workflow").map((row) => [row.id, row]));
    for (const entry of value) {
        const snapshot = asRecord(entry);
        const snapshotError = firstString(snapshot, ["error"]);
        if (!Array.isArray(snapshot.tasks))
            continue;
        if (snapshotError && snapshot.tasks.length === 0)
            continue;
        const workerId = firstString(snapshot, ["workerId"]);
        for (const item of snapshot.tasks) {
            const task = asRecord(item);
            const operationId = firstString(task, ["operationId"]);
            const operation = operationId ? operations.get(operationId) : undefined;
            if (operation) {
                supplementWorkflow(operation, task, snapshot);
                continue;
            }
            const id = firstString(task, ["runKey", "commandId", "session"]);
            if (!id)
                continue;
            const plan = firstString(task, ["planFile", "plan"]);
            const rawGpu = task.gpuId ?? task.gpu_id ?? task.gpu;
            const gpuId = typeof rawGpu === "object" ? firstString(asRecord(rawGpu), ["id"]) : String(rawGpu ?? "").trim();
            const started = firstString(task, ["startedAt", "started_at"]);
            const finished = firstString(task, ["finishedAt", "finished_at"]);
            const status = workerTaskStatus(firstString(task, ["status", "state"]));
            rows.push(blankRuntime({
                id,
                type: "worker_run",
                source: "history",
                name: firstString(task, ["experimentCase", "experiment_case", "case"]) || id,
                status,
                status_source: "worker",
                plan,
                run_id: id,
                parent_id: firstString(task, ["workflowId", "workflow_id"]) || uniqueWorkflowParent(task, workerId, workflows),
                worker_id: firstString(task, ["workerId", "worker_id"]) || workerId,
                gpu: gpuId ? { id: gpuId, memory: "", utilization: "" } : null,
                tmux: firstString(task, ["tmuxTarget", "tmuxSession", "window"]),
                stage: firstString(task, ["stage", "phase"]) || (task.debugMode === true ? "debug" : "run"),
                experiment_case: firstString(task, ["experimentCase", "experiment_case", "case"]),
                seed: firstString(task, ["seed"]),
                progress: progressValue(task.progress),
                created: started,
                updated: finished || (snapshotError ? "" : firstString(snapshot, ["generatedAt"])) || started,
                finished_at: finished,
                raw: { ...task, snapshotError },
            }));
        }
    }
    return rows;
}
function supplementWorkflow(row, task, snapshot) {
    row.worker_id ||= firstString(task, ["workerId", "worker_id"]) || firstString(snapshot, ["workerId"]);
    row.plan ||= firstString(task, ["planFile", "plan"]);
    row.tmux ||= firstString(task, ["tmuxTarget", "tmuxSession", "window"]);
    row.raw = { ...(row.raw || {}), workerTask: task };
}
function uniqueWorkflowParent(task, workerId, workflows) {
    const plan = firstString(task, ["planFile", "plan"]);
    const started = Date.parse(firstString(task, ["startedAt", "started_at"]));
    const candidates = workflows.filter((row) => {
        if (row.type !== "workflow" || !plan || row.plan !== plan)
            return false;
        if (workerId && row.worker_id && row.worker_id !== workerId)
            return false;
        if (!Number.isFinite(started) || !row.created)
            return true;
        const created = Date.parse(row.created);
        const finished = Date.parse(row.finished_at || row.updated);
        return Number.isFinite(created) && started >= created - 5_000 && (!Number.isFinite(finished) || started <= finished + 5_000);
    });
    return candidates.length === 1 ? candidates[0].id : "";
}
const EXPERIMENT_LAUNCH_ACTIONS = new Set(["run-plan", "workflow-run", "reproduce-plan"]);
function operationAction(record) {
    return firstString(record, ["type", "action"]).trim().toLowerCase();
}
function experimentLaunchAction(action) {
    return EXPERIMENT_LAUNCH_ACTIONS.has(action);
}
function workerTaskStatus(value) {
    const status = value.trim().toLowerCase();
    if (["running", "pending", "queued", "starting"].includes(status))
        return "running";
    if (["completed", "success", "succeeded", "normal_completed"].includes(status))
        return "success";
    if (["failed", "error"].includes(status))
        return "failed";
    if (["stopped", "cancelled", "interrupted", "manual_interrupted_completed"].includes(status))
        return "cancelled";
    return "unknown";
}
function workerRunsFromSchedulerState(state, workflows) {
    const plan = firstString(state, ["planFile", "plan_file", "plan"]);
    const schedulerSession = firstString(state, ["scheduler_session", "schedulerSession"]);
    const exactParents = workflows.filter((row) => row.type === "workflow" && schedulerSession && row.tmux === schedulerSession);
    const planParents = workflows.filter((row) => row.type === "workflow" && plan && row.plan === plan);
    const parentId = firstString(state, ["workflowId", "workflow_id", "operationId", "operation_id"])
        || (exactParents.length === 1 ? exactParents[0].id : planParents.length === 1 ? planParents[0].id : "");
    const buckets = [
        ["running_experiments", "running"],
        ["testing_experiments", "running"],
        ["completed_experiments", "success"],
        ["failed_experiments", "failed"],
        ["stopped_experiments", "cancelled"],
    ];
    const rows = [];
    for (const [bucket, status] of buckets) {
        const entries = state[bucket];
        if (!Array.isArray(entries))
            continue;
        for (const value of entries) {
            const record = asRecord(value);
            const id = firstString(record, ["session", "runKey", "run_key", "commandId"]);
            if (!id)
                continue;
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
function progressValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    return value;
}
function gpuValue(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const id = String(value.id || "");
    return id ? { id, memory: "", utilization: "" } : null;
}
function blankRuntime(row) {
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
function runtimeFields(item, row) {
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
function applyObservationFields(row, item) {
    Object.assign(row, runtimeFields(item, row));
    row.lifecycle = lifecycleOf(row.status);
    return row;
}
function runtimeRow(item) {
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
function publicExperiment(row, children = []) {
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
function experimentKind(id, row) {
    if (row.type === "workflow" || row.type === "worker_run")
        return row.type;
    if (/^(?:run-\d+|(?:run|tst|dbg)\d+-\d+-\d+)$/.test(id)
        || /^(?:run-\d+|(?:run|tst|dbg)\d+-\d+-\d+)$/.test(String(row.run_id || "")))
        return "worker_run";
    if (row.progress || row.raw?.runtimeLog)
        return "worker_run";
    const source = operationAction(row.raw || {});
    if (experimentLaunchAction(source))
        return "workflow";
    if (/^(?:run|tst|dbg)\d+-/.test(id))
        return "worker_run";
    return "workflow";
}
function parentWorkflow(item, rows) {
    const candidates = Array.from(rows.values()).filter((row) => row.type === "workflow" && row.plan === item.plan);
    return candidates.find((row) => !["completed", "failed", "cancelled"].includes(row.status)) || candidates[0];
}
function childRuns(parent, rows) {
    return rows.filter((row) => row.type === "worker_run" && row.parent_id === parent.id);
}
function aggregateStatus(children) {
    const counts = {};
    for (const child of children)
        counts[child.status] = (counts[child.status] || 0) + 1;
    return { running: counts.running || 0, failed: counts.failed || 0, success: counts.success || 0, ...counts };
}
function applyWorkflowAggregate(row, rows) {
    if (row.type !== "workflow")
        return;
    const children = childRuns(row, rows);
    if (!children.length)
        return;
    if (children.some((child) => child.status === "failed"))
        row.status = "failed";
    else if (children.some((child) => child.status === "running"))
        row.status = "running";
    else if (children.every((child) => child.status === "success"))
        row.status = "success";
    row.status_source = "aggregate";
    const newest = children.map((child) => child.updated).filter(Boolean).sort().at(-1) || "";
    if (newest && newest > row.updated)
        row.updated = newest;
}
function resolvePlanFile(planArg) {
    const abs = path.isAbsolute(planArg) ? planArg : (0, data_1.resolveProjectPath)(planArg);
    if ((0, data_1.fileExists)(abs))
        return path.relative((0, data_1.projectRoot)(), abs).replace(/\\/g, "/") || planArg;
    throw (0, errors_1.businessError)(`plan file not found: ${planArg}`);
}
function collectRecords(value, keys) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value.map(asRecord);
    const record = asRecord(value);
    const out = [];
    for (const key of keys) {
        const item = record[key];
        if (Array.isArray(item))
            out.push(...item.map(asRecord));
        else if (item && typeof item === "object") {
            for (const [id, nested] of Object.entries(item)) {
                out.push({ id, ...asRecord(nested) });
            }
        }
    }
    if (record.operations && typeof record.operations === "object" && !Array.isArray(record.operations)) {
        for (const [id, nested] of Object.entries(record.operations)) {
            out.push({ operationId: id, ...asRecord(nested) });
        }
    }
    return out;
}
function extractLiveLog(live, id) {
    if (!live)
        return "";
    const record = asRecord(live);
    const output = asRecord(record.output);
    const declared = firstString(record, ["runKey", "run_key"]) || firstString(output, ["runKey", "run_key"]);
    if (typeof record.text === "string" && declared === id)
        return record.text;
    const rows = Array.isArray(record.rows) ? record.rows : Array.isArray(record.logs) ? record.logs : [];
    const matches = rows.map(asRecord).filter((row) => liveRowMatches(row, id));
    if (matches.length !== 1)
        return "";
    return firstString(matches[0], ["text", "tail", "output", "log"]);
}
function liveRowMatches(row, id) {
    const key = firstString(row, ["runKey", "run_key", "id", "key"]);
    return key === id;
}
function lifecycleOf(status) {
    if (status === "running")
        return "running";
    if (status === "failed")
        return "failed";
    if (status === "cancelled")
        return "cancelled";
    if (status === "success")
        return "finished";
    return "";
}
function publicStatus(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text)
        return "unknown";
    if (["fail", "failed", "error", "parse_failed"].includes(text))
        return "failed";
    if (["run", "running", "active"].includes(text))
        return "running";
    if (["complete", "completed", "succeeded", "success", "archived"].includes(text))
        return "success";
    if (["queue", "queued", "waiting", "waiting_confirmation"].includes(text))
        return "queued";
    if (["pending", "created", "planned"].includes(text))
        return "pending";
    if (["cancel", "cancelled", "canceled", "stopped"].includes(text))
        return "cancelled";
    if (["pending", "queued", "running", "success", "failed", "cancelled", "unknown"].includes(text))
        return text;
    return "unknown";
}
function normalizeStatus(value) {
    return publicStatus(value);
}
function firstString(record, keys) {
    for (const key of keys) {
        const value = record[key];
        if (value === null || value === undefined)
            continue;
        const text = String(value).trim();
        if (text)
            return text;
    }
    return "";
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
const DIAGNOSIS_PATTERNS = [
    { reason: "cuda out of memory", pattern: /cuda out of memory|out of memory|oom/i },
    { reason: "missing file", pattern: /no such file|file not found|filenotfound|missing file/i },
    { reason: "config error", pattern: /config(?:uration)? error|invalid config|yaml(?:.+)error/i },
    { reason: "nan loss", pattern: /\bnan\b|loss[:=]\s*nan/i },
];
async function resolveExperimentReference(value) {
    const rows = await loadExperiments();
    const wanted = String(value || "").trim();
    const best = pickExperiment(rows, wanted);
    if (best)
        return best;
    const hit = resolveRuntimeObservation(wanted, await (0, runtime_1.observeRunningExperiments)());
    if (hit) {
        const row = runtimeRow(hit);
        applyHealth(row);
        return row;
    }
    throw (0, errors_1.businessError)(`experiment not found: ${wanted}`, JSON.stringify({
        requested: wanted,
        searched_sources: ["current_rows", "runtime_history", "experiment_index", "runtime_observation"],
        candidates: rows.slice(0, 5).map((row) => row.id),
    }));
}
function pickExperiment(rows, wanted) {
    let best;
    let bestRank = 0;
    for (const row of rows) {
        const rank = referenceRank(row, wanted);
        if (rank && (!bestRank || rank < bestRank)) {
            best = row;
            bestRank = rank;
        }
    }
    return best;
}
function resolveRuntimeObservation(value, observed) {
    const wanted = String(value || "").trim();
    if (!wanted)
        return undefined;
    return observed.find((item) => item.run_id === wanted) || observed.find((item) => (0, runtime_1.matchesRuntime)(wanted, item));
}
function referenceRank(row, wanted) {
    if (!wanted)
        return 0;
    if (row.id === wanted)
        return 1;
    if (row.run_id === wanted)
        return 2;
    if (row.name === wanted)
        return 3;
    if (String((row.raw || {}).id || "") === wanted)
        return 4;
    if (row.tmux === wanted)
        return 5;
    return 0;
}
async function findExperiment(id) {
    const rows = await loadExperiments();
    const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
    if (!match)
        throw (0, errors_1.businessError)(`experiment not found: ${id}`);
    return match;
}
async function recentLogsFor(match) {
    const raw = match.raw || {};
    const logPath = firstString(raw, ["hub_console_log", "log_path", "logPath", "stdout"]);
    const live = await (0, api_1.optionalApi)("live.output", { runKey: match.id });
    const liveText = extractLiveLog(live, match.id);
    const fileText = logPath ? (0, data_1.readTail)(path.isAbsolute(logPath) ? logPath : (0, data_1.resolveProjectPath)(logPath), 200) : "";
    return String(raw.runtimeLog || "").trim() ? String(raw.runtimeLog) : String(liveText || fileText || "");
}
async function loadExperimentDetail(id) {
    const rows = await loadExperiments();
    const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
    if (!match)
        throw (0, errors_1.businessError)(`experiment not found: ${id}`);
    return { match, rows, recentLogs: await recentLogsFor(match) };
}
function statusPayload(match, rows, recentLogs) {
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
function monitorPayload(match, recentLogs) {
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
function monitorCompactPayload(context, records) {
    const snapshot = runtimeSnapshotPayload(context);
    return {
        ...snapshot,
        latest_message: findLatestTrainingMessage(records),
    };
}
function lastErrorMessage(records) {
    const error = [...records].reverse().find((row) => row.level === "ERROR" || /error|exception|traceback/i.test(row.message));
    return (error?.message || "").slice(0, 300);
}
function findLatestTrainingMessage(records) {
    const scored = extractTrainingMessages(records).map((message) => ({ message, score: scoreTrainingMessage(message) }));
    const best = scored.reduce((top, item) => top && top.score > item.score ? top : item, undefined);
    return (best && best.score > 0 ? best.message : "").slice(0, 300);
}
function extractTrainingMessages(records) {
    return records
        .map((row) => row.message)
        .filter((message) => !/yaml|config|python\s+-m|encoder|dataset|cut_lr:|gate_l2:/i.test(message))
        .filter((message) => isValidTrainingMessage(message))
        .filter((message) => /loss\s+[0-9]|epoch\s+[0-9]|batch\s+[0-9]/i.test(message));
}
function isValidTrainingMessage(message) {
    const text = String(message || "");
    if (!text.trim())
        return false;
    if (/loss\s+(--|null|nan)/i.test(text))
        return false;
    if (/(^|[^A-Za-z])N\/A([^A-Za-z]|$)/i.test(text))
        return false;
    return true;
}
function scoreTrainingMessage(message) {
    const text = String(message || "");
    let score = 0;
    if (/loss/i.test(text))
        score += 10;
    if (/epoch/i.test(text))
        score += 8;
    if (/batch/i.test(text))
        score += 8;
    if (/auc/i.test(text))
        score += 6;
    if (/accuracy/i.test(text))
        score += 6;
    if (/progress/i.test(text))
        score += 5;
    if (/\blr\b/i.test(text))
        score += 2;
    if (/显存/.test(text))
        score += 1;
    if (/\bdice\b/i.test(text))
        score += 6;
    if (/yaml|config|python\s+-m|encoder|dataset/i.test(text))
        score -= 20;
    return score;
}
function trimMessages(messages, limit, maxLength) {
    return messages.filter(Boolean).slice(-limit).map((message) => message.slice(0, maxLength));
}
function treeNode(row, rows) {
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
function renderTree(node, depth) {
    const line = `${"  ".repeat(depth)}${String(node.type)} ${String(node.id)} ${String(node.stage || "")} ${String(node.status)}`.trim();
    const children = Array.isArray(node.children) ? node.children : [];
    return [line, ...children.map((child) => renderTree(child, depth + 1))].join("\n");
}
function diagnoseReasons(status, evidence) {
    if (status !== "failed")
        return [];
    const found = DIAGNOSIS_PATTERNS.filter((item) => evidence.some((line) => item.pattern.test(line))).map((item) => item.reason);
    return found.length ? found : ["unknown"];
}
function parseLogRecords(text) {
    return String(text || "").replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim()).map((line) => {
        const timestamp = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/)?.[1] || "";
        const level = line.match(/\b(ERROR|WARNING|WARN|INFO|DEBUG|CRITICAL)\b/i)?.[1].toUpperCase().replace("WARN", "WARNING") || "";
        return { timestamp, level, message: line.trim() };
    });
}
async function logRecordsForExperiment(id) {
    const rows = await loadExperiments();
    const match = rows.find((row) => row.id === id || row.name === id || row.run_id === id);
    if (!match)
        return null;
    const loaded = await loadExperimentDetail(match.id);
    return parseLogRecords(loaded.recentLogs);
}
async function configPayload(match) {
    const raw = match.raw || {};
    const configPath = firstString(raw, ["config_path", "configPath", "config", "base_config", "baseConfig"]) || match.plan;
    const absolute = configPath && (0, data_1.fileExists)((0, data_1.resolveProjectPath)(configPath)) ? (0, data_1.resolveProjectPath)(configPath) : "";
    const yaml = absolute ? (0, data_1.readTextFile)(absolute) : "";
    const summary = yaml ? (0, PlanBuilder_2.parsePlanSummary)(yaml) : null;
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
async function preflightChecks(planFile) {
    const absolute = (0, data_1.resolveProjectPath)(planFile);
    const yaml = (0, data_1.fileExists)(absolute) ? (0, data_1.readTextFile)(absolute) : "";
    const summary = yaml ? (0, PlanBuilder_2.parsePlanSummary)(yaml) : null;
    const configPath = summary?.baseConfig || "";
    const configExists = configPath ? (0, data_1.fileExists)(path.isAbsolute(configPath) ? configPath : (0, data_1.resolveProjectPath)(configPath)) : false;
    const dataset = yamlValue(yaml, "dataset") || yamlValue(yaml, "data");
    const output = summary?.outputCandidates?.[0] || "";
    const outputDir = output ? path.dirname(path.isAbsolute(output) ? output : (0, data_1.resolveProjectPath)(output)) : "";
    let outputWritable = "unknown";
    if (outputDir && (0, data_1.fileExists)(outputDir)) {
        try {
            fs.accessSync(outputDir, fs.constants.W_OK);
            outputWritable = "true";
        }
        catch {
            outputWritable = "false";
        }
    }
    const gpu = await (0, api_1.optionalApi)("gpu.list");
    return {
        config: { status: !configPath ? "unknown" : configExists ? "true" : "false", detail: configPath || "config path not present" },
        data: { status: dataset ? ((0, data_1.fileExists)(path.isAbsolute(dataset) ? dataset : (0, data_1.resolveProjectPath)(dataset)) ? "true" : "unknown") : "unknown", detail: dataset || "dataset path not present" },
        gpu: { status: gpu ? "observed" : "unknown", detail: gpu ? "gpu.list responded" : "gpu status unavailable" },
        output: { status: outputWritable, detail: outputDir || "output directory not present" },
    };
}
function resultMatchesExperiment(result, match) {
    const ids = new Set([match.id, match.run_id, match.name].filter(Boolean));
    return ids.has(result.id) || ids.has(result.experimentId) || ids.has(result.runKey);
}
function planMatches(value, needle) {
    const left = value.replace(/\\/g, "/");
    return Boolean(left) && (left === needle || left.endsWith(`/${needle}`) || needle.endsWith(`/${left}`) || path.basename(left) === path.basename(needle));
}
function durationSeconds(started, finished) {
    const start = Date.parse(started);
    const end = Date.parse(finished);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
        return null;
    return Math.round((end - start) / 1000);
}
function yamlValue(yaml, key) {
    const match = String(yaml || "").match(new RegExp(`^\\s*${key}\\s*:\\s*([^#\\n]+)`, "im"));
    return match ? match[1].trim().replace(/^['"]|['"]$/g, "") : "";
}
function applyHealth(row) {
    const raw = row.raw || {};
    const updated = Date.parse(row.updated);
    const stale = row.status === "running" && Number.isFinite(updated) && Date.now() - updated > 30 * 60 * 1000;
    const errorText = row.status === "running" ? "" : firstString(raw, ["error", "sync_error"]);
    if (row.status === "failed" || errorText) {
        row.health_status = "error";
        row.health_reason = errorText || "status_failed";
    }
    else if (stale) {
        row.health_status = "stalled";
        row.health_reason = "not_updated_for_30min";
    }
    else if (row.status === "running") {
        row.health_status = "healthy";
        row.health_reason = "";
    }
    else if (row.status === "unknown") {
        row.health_status = "unknown";
        row.health_reason = "";
    }
    else {
        row.health_status = "healthy";
        row.health_reason = "";
    }
    if (!row.seed)
        row.seed = firstString(raw, ["seed"]);
    if (!row.finished_at)
        row.finished_at = firstString(raw, ["finished_at", "finishedAt"]);
    if (!row.started_at)
        row.started_at = row.created || firstString(raw, ["started_at", "startedAt"]);
}
