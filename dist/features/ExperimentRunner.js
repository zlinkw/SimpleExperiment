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
exports.parseZlkRunArgs = parseZlkRunArgs;
exports.runRecordedExperiment = runRecordedExperiment;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const crypto_1 = require("crypto");
const Results_1 = require("./Results");
function parseZlkRunArgs(argv) {
    const sep = argv.indexOf("--");
    const head = sep >= 0 ? argv.slice(0, sep) : argv;
    const command = sep >= 0 ? argv.slice(sep + 1) : [];
    const opt = (name, fallback = "") => {
        const index = head.indexOf(name);
        return index >= 0 ? head[index + 1] || fallback : fallback;
    };
    if (!command.length)
        throw new Error("zlk-run 缺少 -- 后的真实命令。");
    return {
        name: opt("--name", "manual"),
        seed: opt("--seed"),
        config: opt("--config"),
        suite: opt("--suite", "manual"),
        method: opt("--method", opt("--name", "manual")),
        dataset: opt("--dataset", "unknown"),
        split: opt("--split", "test"),
        cwd: opt("--cwd", process.cwd()),
        command,
    };
}
function runRecordedExperiment(options) {
    const cwd = path.resolve(options.cwd || process.cwd());
    const runId = buildRunId(options);
    const runDir = path.join(cwd, "experiments", "runs", runId);
    fs.mkdirSync(runDir, { recursive: true });
    const commandLine = shellLine(options.command);
    fs.writeFileSync(path.join(runDir, "command.txt"), commandLine + "\n", "utf8");
    const startedAt = new Date().toISOString();
    const result = (0, child_process_1.spawnSync)(options.command[0], options.command.slice(1), { cwd, encoding: "utf8", shell: false });
    fs.writeFileSync(path.join(runDir, "stdout.log"), result.stdout || "", "utf8");
    fs.writeFileSync(path.join(runDir, "stderr.log"), result.stderr || "", "utf8");
    fs.writeFileSync(path.join(runDir, "env_snapshot.json"), JSON.stringify(envSnapshot(options, commandLine, startedAt), null, 2), "utf8");
    fs.writeFileSync(path.join(runDir, "config_snapshot.yaml"), configSnapshot(cwd, options), "utf8");
    const metricsRows = writeMetricsSummary(runDir, options, result.stdout || "", result.stderr || "");
    const manifest = buildArtifactManifest(runDir, options, result.status ?? 1, metricsRows);
    fs.writeFileSync(path.join(runDir, "artifact_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
    return { runId, runDir, exitCode: result.status ?? 1, files: manifest.files.map((item) => item.path), metricsRows };
}
function buildRunId(options) {
    const seed = options.seed ? `_seed${safeToken(options.seed)}` : "";
    const digest = (0, crypto_1.createHash)("sha1").update(JSON.stringify({ name: options.name, seed: options.seed, config: options.config, command: options.command, at: Date.now() })).digest("hex").slice(0, 8);
    return `${safeToken(options.name || "manual")}${seed}_${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}_${digest}`;
}
function writeMetricsSummary(runDir, options, stdout, stderr) {
    const parsed = (0, Results_1.previewTextMetricParse)([stdout, stderr].join("\n"), "stdout.log");
    if (!parsed.records)
        return 0;
    const headers = ["experiment_id", "attempt_id", "suite", "method", "dataset", "split", "fold", "seed", "metric", "value", "unit", "higher_is_better", "epoch", "step", "timestamp"];
    const rows = parsed.samples.map((sample) => ({
        experiment_id: path.basename(runDir),
        attempt_id: "manual-1",
        suite: options.suite || "manual",
        method: options.method || options.name,
        dataset: options.dataset || "unknown",
        split: options.split || "test",
        fold: "",
        seed: options.seed || "",
        metric: sample.metric,
        value: String(sample.value),
        unit: "",
        higher_is_better: String(sample.higherIsBetter),
        epoch: "",
        step: "final",
        timestamp: new Date().toISOString(),
    }));
    fs.writeFileSync(path.join(runDir, "metrics_summary.csv"), [headers.join(","), ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(","))].join("\n") + "\n", "utf8");
    return rows.length;
}
function envSnapshot(options, commandLine, startedAt) {
    return {
        schemaVersion: 1,
        startedAt,
        finishedAt: new Date().toISOString(),
        platform: process.platform,
        arch: process.arch,
        node: process.version,
        hostname: os.hostname(),
        cwd: path.resolve(options.cwd || process.cwd()),
        command: commandLine,
        seed: options.seed || "",
        config: options.config || "",
        git_commit: commandOutput("git", ["rev-parse", "HEAD"], options.cwd),
        git_dirty: Boolean(commandOutput("git", ["status", "--porcelain"], options.cwd)),
    };
}
function configSnapshot(cwd, options) {
    if (options.config) {
        const target = path.resolve(cwd, options.config);
        if (fs.existsSync(target) && fs.statSync(target).isFile())
            return fs.readFileSync(target, "utf8");
    }
    return [`name: ${JSON.stringify(options.name)}`, `seed: ${JSON.stringify(options.seed || "")}`, `config: ${JSON.stringify(options.config || "")}`].join("\n") + "\n";
}
function buildArtifactManifest(runDir, options, exitCode, metricsRows) {
    const files = fs.readdirSync(runDir).filter((name) => fs.statSync(path.join(runDir, name)).isFile()).map((name) => {
        const full = path.join(runDir, name);
        return { path: name, size: fs.statSync(full).size, sha256: (0, crypto_1.createHash)("sha256").update(fs.readFileSync(full)).digest("hex") };
    });
    return { schemaVersion: 1, runId: path.basename(runDir), name: options.name, seed: options.seed || "", config: options.config || "", exitCode, metricsRows, files, generatedAt: new Date().toISOString() };
}
function commandOutput(cmd, args, cwd = process.cwd()) {
    const result = (0, child_process_1.spawnSync)(cmd, args, { cwd, encoding: "utf8" });
    return result.status === 0 ? String(result.stdout || "").trim() : "";
}
function safeToken(value) {
    return String(value || "run").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "run";
}
function shellLine(command) {
    return command.map((item) => /[\s"']/.test(item) ? JSON.stringify(item) : item).join(" ");
}
function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
