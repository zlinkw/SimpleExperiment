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
exports.resultCommand = resultCommand;
exports.resultParse = resultParse;
exports.resultPaperTable = resultPaperTable;
exports.resultList = resultList;
exports.resultShow = resultShow;
exports.resultExport = resultExport;
exports.loadResults = loadResults;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_1 = require("../api");
const node_crypto_1 = require("node:crypto");
const data_1 = require("../data");
const runtime_1 = require("../runtime");
const errors_1 = require("../errors");
const format_1 = require("../format");
const parse_1 = require("../parse");
const Checkpoint_1 = require("../../features/Checkpoint");
const Results_1 = require("../../features/Results");
async function resultCommand(action, rest, flags) {
    if (action === "list")
        return resultList(flags);
    if (action === "show")
        return resultShow((0, parse_1.requirePositional)(rest, 0, "result id"), flags);
    if (action === "export")
        return resultExport((0, parse_1.requirePositional)(rest, 0, "result id"), flags);
    if (action === "parse")
        return resultParse(flags);
    if (action === "paper-table")
        return resultPaperTable(flags);
    throw (0, errors_1.usageError)(`unknown result action: ${action || "(missing)"}`);
}
/** First-class local result parsing (replaces the revoked `simpleex results parse`). */
function resultParse(flags) {
    if (!flags.file)
        throw (0, errors_1.usageError)("result parse needs --file <result file>");
    if (!fs.existsSync(flags.file))
        throw (0, errors_1.businessError)(`result file not found: ${flags.file}`);
    const preset = Results_1.builtInResultPresets.find((item) => item.id === flags.preset) || Results_1.builtInResultPresets[0];
    const records = (0, Results_1.parseResultFile)(fs.readFileSync(flags.file, "utf8"), { path: flags.file, type: flags.file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset);
    (0, format_1.writeJson)(records, flags.compactJson);
    return 0;
}
function finalPaperTableRecords(input) {
    if (Array.isArray(input))
        return (0, Results_1.filterByInclusionPolicy)(input, [], Results_1.finalResultInclusionPolicy);
    const record = input && typeof input === "object" ? input : {};
    if (Array.isArray(record.finalResults))
        return (0, Results_1.filterByInclusionPolicy)(record.finalResults, [], Results_1.finalResultInclusionPolicy);
    if (Array.isArray(record.records)) {
        const rows = record.records;
        if (String(record.inclusionPolicy || "").includes("archived") || String(record.path || "").includes("result_registry")) {
            const archivedRows = rows.map((row) => ({ ...row, finalEvidenceState: row.finalEvidenceState || "archived", eligibleForFinalAnalysis: row.eligibleForFinalAnalysis ?? true }));
            return (0, Results_1.filterByInclusionPolicy)(archivedRows, [], Results_1.finalResultInclusionPolicy);
        }
        return (0, Results_1.filterByInclusionPolicy)(rows, [], Results_1.finalResultInclusionPolicy);
    }
    return [];
}
/** First-class local paper table (replaces the revoked `simpleex results paper-table`). */
function resultPaperTable(flags) {
    if (!flags.file)
        throw (0, errors_1.usageError)("result paper-table needs --file <registry.json>");
    if (!fs.existsSync(flags.file))
        throw (0, errors_1.businessError)(`registry file not found: ${flags.file}`);
    const records = finalPaperTableRecords(JSON.parse(fs.readFileSync(flags.file, "utf8")));
    const metrics = (flags.metrics || "AUC,accuracy,F1,AUPRC").split(",").filter(Boolean);
    const config = {
        id: "cli",
        name: "CLI",
        filter: { includeWarnings: true },
        groupBy: ["suite", "dataset"],
        metrics: metrics.map((key) => ({ key, higherIsBetter: !["ASD", "HD95", "loss"].includes(key), decimals: 4 })),
        aggregate: "mean_std",
        primarySortMetric: metrics[0],
    };
    const rows = (0, Results_1.buildResultLeaderboard)(records, config, []);
    if (flags.json) {
        if (flags.format === "csv" || flags.format === "latex")
            throw (0, errors_1.usageError)("result paper-table --json cannot be combined with --format csv|latex; drop --format for JSON rows");
        (0, format_1.writeJson)({ config: { metrics, groupBy: config.groupBy, aggregate: config.aggregate }, rows }, flags.compactJson);
        return 0;
    }
    if (flags.format === "csv")
        (0, format_1.writeText)((0, Results_1.leaderboardToCsv)(rows, config));
    else
        (0, format_1.writeText)((0, Results_1.exportPaperTable)(rows, config, { id: "cli", title: "Results", leaderboardId: "cli", rowDimension: "suite", metrics, boldBest: true, showMeanStd: true, decimals: {}, metricDisplayNames: {} }, flags.format === "latex" ? "latex_booktabs" : "markdown"));
    return 0;
}
async function resultList(flags) {
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
        (0, format_1.writeJson)(view, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["id", "experimentId", "status", "metric", "value", "updated", "source", "current"], view));
    return 0;
}
async function resultShow(id, flags) {
    const match = selectResult(await loadResults(flags), id);
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
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Result", payload));
    return 0;
}
async function resultExport(id, flags) {
    const match = selectResult(await loadResults(flags), id);
    const format = String(flags.format || "json").toLowerCase();
    if (!["csv", "json"].includes(format))
        throw (0, errors_1.usageError)(`unsupported --format ${flags.format}. Use csv or json.`);
    const records = [match.record];
    const metricKeys = Object.keys(match.metrics);
    const config = {
        id: "cli",
        name: "CLI",
        filter: { includeWarnings: true },
        groupBy: ["suite"],
        metrics: metricKeys.map((key) => ({ key, higherIsBetter: true, decimals: 4 })),
        aggregate: "raw",
        primarySortMetric: metricKeys[0],
    };
    const rows = (0, Results_1.buildResultLeaderboard)(records, config, []);
    const body = format === "csv"
        ? (0, Results_1.leaderboardToCsv)(rows, config)
        : (0, Results_1.exportPaperTable)(rows, config, {
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
    const output = format === "json" ? JSON.stringify({ id: match.id, ...evidence, metrics: match.metrics, rows }, null, 2) : body;
    if (flags.out) {
        fs.mkdirSync(path.dirname(path.resolve(flags.out)), { recursive: true });
        fs.writeFileSync(path.resolve(flags.out), output.endsWith("\n") ? output : `${output}\n`, "utf8");
    }
    if (flags.json)
        (0, format_1.writeJson)({ id: match.id, ...evidence, format, path: flags.out || "", content: flags.compactJson ? undefined : output }, flags.compactJson);
    else
        process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    return 0;
}
function selectResult(rows, id) {
    const exact = rows.find(row => row.id === id);
    if (exact)
        return exact;
    const matches = rows.filter(row => row.experimentId === id || row.runKey === id);
    if (!matches.length)
        throw (0, errors_1.businessError)(`result not found: ${id}`);
    if (matches.length > 1)
        throw (0, errors_1.businessError)("RESULT_SELECTION_AMBIGUOUS：此运行对应多行结果，请用精确结果 ID 查看或导出。", JSON.stringify({ id, candidates: matches.map(row => ({ id: row.id, seed: row.seed, dimensions: row.record.dimensions })) }));
    return matches[0];
}
async function loadResults(flags = {}) {
    const records = [];
    let observedAt = null;
    if (flags.history) {
        process.stderr.write("历史结果：仅查看本机旧记录，未核实服务器当前状态；不能作为本轮查询结果。\n");
        for (const rel of [data_1.RESULT_REGISTRY_REL, data_1.RESULT_REGISTRY_LOCAL_REL])
            records.push(...extractRecords((0, data_1.readJsonFile)((0, data_1.resolveProjectPath)(rel), null)));
        records.push(...parseLocalResultFiles());
    }
    else {
        const remote = await (0, api_1.callApi)("results.list", {});
        if (remote?.source !== "active_query" || remote?.summary?.current !== true)
            throw (0, errors_1.businessError)("RESULT_QUERY_UNVERIFIED：本轮服务器结果未核实；可重新查询，或用 --history 明确查看本机历史记录。");
        // The public API limits the preview to 200 rows; summary.results is the complete query.
        records.push(...extractRecords(Array.isArray(remote.summary.results) ? remote.summary.results : remote));
        observedAt = remote.summary.observedAt || null;
    }
    const byId = new Map();
    for (const raw of records) {
        const modern = !!(raw.planFile && raw.workerId && raw.runId);
        // Include the run and complete dimension tuple: different seeds/endpoints and reruns cannot collide.
        const id = modern ? "result-" + (0, node_crypto_1.createHash)("sha256").update(JSON.stringify([raw.planFile, raw.workerId, raw.runId, raw.workflowId || "", raw.revision || "", raw.codeFingerprint || "",
            Object.entries(raw.dimensions || {}).sort(([a], [b]) => a.localeCompare(b)), (raw.sourceFiles || []).map((file) => file.path).sort()])).digest("hex")
            : raw.resultId || raw.experimentId;
        if (!id)
            throw (0, errors_1.businessError)("RESULT_IDENTITY_MISSING：结果缺少可核实的行身份，未合并或导出。");
        const record = modern ? { ...raw, schemaVersion: 1, resultId: id, experimentId: raw.runId, runKey: raw.runId,
            suite: String(raw.dimensions?.dataset || raw.planFile), experimentName: String(raw.dimensions?.method || raw.dimensions?.case || raw.runId),
            status: raw.completionState === "verified" && raw.aggregationState === "eligible" ? "validated" : "warning",
            provenance: { planFile: raw.planFile, workerId: raw.workerId }, createdAt: raw.createdAt || "", updatedAt: observedAt || "",
            metrics: Object.fromEntries(Object.entries(raw.metrics || {}).map(([key, value]) => [key, typeof value === "object" && value !== null ? value : { value }])) } : raw;
        if ((0, runtime_1.isDiagnosticWorkerResult)(record))
            continue;
        const metrics = Object.fromEntries(Object.entries(record.metrics || {}).map(([key, value]) => [key, value && typeof value === "object" ? value.value : value]));
        const primaryMetric = record.primaryMetric || Object.keys(metrics)[0] || "";
        const outputFiles = (record.sourceFiles || []).map((item) => item.path).filter(Boolean);
        const checkpoints = (0, Checkpoint_1.checkpointRecordsFromManifest)(record);
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
function extractRecords(value) {
    if (!value)
        return [];
    if (Array.isArray(value))
        return value;
    const record = value;
    if (Array.isArray(record.records))
        return record.records;
    if (Array.isArray(record.results))
        return record.results;
    if (Array.isArray(record.finalResults))
        return record.finalResults;
    return [];
}
function parseLocalResultFiles() {
    const files = [
        (0, data_1.resolveProjectPath)("experiments", "results"),
        (0, data_1.resolveProjectPath)("simple_cluster", "results"),
    ].flatMap((dir) => {
        try {
            return fs.readdirSync(dir).filter((name) => /\.(csv|json)$/i.test(name) && !/result_registry/i.test(name)).map((name) => path.join(dir, name));
        }
        catch {
            return [];
        }
    });
    const preset = Results_1.builtInResultPresets[0];
    const out = [];
    for (const file of files) {
        try {
            const text = fs.readFileSync(file, "utf8");
            out.push(...(0, Results_1.parseResultFile)(text, { path: file, type: file.endsWith(".json") ? "json" : "csv", endpoint: "local" }, preset));
        }
        catch {
            /* skip unreadable result files */
        }
    }
    return out;
}
