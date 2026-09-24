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
exports.resultList = resultList;
exports.resultShow = resultShow;
exports.resultExport = resultExport;
exports.loadResults = loadResults;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_1 = require("../api");
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
    throw (0, errors_1.usageError)(`unknown result action: ${action || "(missing)"}`);
}
async function resultList(flags) {
    const rows = await loadResults();
    const experiment = String(flags.experiment || "").trim();
    const filtered = experiment ? rows.filter((row) => row.experimentId === experiment || row.id === experiment || row.runKey === experiment) : rows;
    const view = filtered.map((row) => ({
        id: row.id,
        experimentId: row.experimentId,
        status: row.status,
        metric: row.primaryMetric,
        value: row.primaryValue,
        updated: row.updated,
    }));
    if (flags.json) {
        (0, format_1.writeJson)(view, flags.compactJson);
        return 0;
    }
    (0, format_1.writeText)((0, format_1.table)(["id", "experimentId", "status", "metric", "value", "updated"], view));
    return 0;
}
async function resultShow(id, flags) {
    const match = (await loadResults()).find((row) => row.id === id || row.experimentId === id || row.runKey === id);
    if (!match)
        throw (0, errors_1.businessError)(`result not found: ${id}`);
    const payload = {
        id: match.id,
        experimentId: match.experimentId,
        status: match.status,
        metrics: match.metrics,
        time: match.updated || match.created || null,
        config: match.config || null,
        seed: match.seed || null,
        checkpoint: match.checkpoint || null,
        outputFiles: match.outputFiles,
    };
    if (flags.json)
        (0, format_1.writeJson)(payload, flags.compactJson);
    else
        (0, format_1.writeText)((0, format_1.block)("Result", payload));
    return 0;
}
async function resultExport(id, flags) {
    const match = (await loadResults()).find((row) => row.id === id || row.experimentId === id || row.runKey === id);
    if (!match)
        throw (0, errors_1.businessError)(`result not found: ${id}`);
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
    const output = format === "json" ? JSON.stringify({ id: match.id, metrics: match.metrics, rows }, null, 2) : body;
    if (flags.out) {
        fs.mkdirSync(path.dirname(path.resolve(flags.out)), { recursive: true });
        fs.writeFileSync(path.resolve(flags.out), output.endsWith("\n") ? output : `${output}\n`, "utf8");
    }
    if (flags.json)
        (0, format_1.writeJson)({ id: match.id, format, path: flags.out || "", content: flags.compactJson ? undefined : output }, flags.compactJson);
    else
        process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
    return 0;
}
async function loadResults() {
    const records = [];
    for (const rel of [data_1.RESULT_REGISTRY_REL, data_1.RESULT_REGISTRY_LOCAL_REL]) {
        const parsed = (0, data_1.readJsonFile)((0, data_1.resolveProjectPath)(rel), null);
        records.push(...extractRecords(parsed));
    }
    records.push(...parseLocalResultFiles());
    records.push(...await (0, runtime_1.readWorkerResultRecords)());
    const remote = await (0, api_1.optionalApi)("results.list", {});
    records.push(...extractRecords(remote));
    const byId = new Map();
    for (const record of records) {
        const metrics = Object.fromEntries(Object.entries(record.metrics || {}).map(([key, value]) => [key, value && typeof value === "object" ? value.value : value]));
        const primaryMetric = record.primaryMetric || Object.keys(metrics)[0] || "";
        const outputFiles = (record.sourceFiles || []).map((item) => item.path).filter(Boolean);
        const checkpoints = (0, Checkpoint_1.checkpointRecordsFromManifest)(record);
        byId.set(record.resultId || record.experimentId, {
            id: record.resultId || record.experimentId,
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
