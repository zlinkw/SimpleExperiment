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
exports.RECOVERED_PLAN_DIR = void 0;
exports.inferExperimentConfigFromRun = inferExperimentConfigFromRun;
exports.inferPlanFromRunDirectory = inferPlanFromRunDirectory;
exports.renderRecoveredPlanYaml = renderRecoveredPlanYaml;
exports.compareRecoveredConfigToPlan = compareRecoveredConfigToPlan;
exports.recoveredPlanOutputFiles = recoveredPlanOutputFiles;
exports.renderRecoveredPlanReport = renderRecoveredPlanReport;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
const PlanBuilder_1 = require("./PlanBuilder");
exports.RECOVERED_PLAN_DIR = "simple_cluster/plans/recovered";
function inferExperimentConfigFromRun(files, context = {}) {
    const runId = context.runId || inferRunId(context.runDir, files);
    const evidenceFiles = Object.keys(files).sort();
    const artifact = readJson(files, "artifact_manifest.json");
    const env = readJson(files, "env_snapshot.json");
    const configText = firstText(files, ["config_snapshot.yaml", "config_snapshot.yml", "config_snapshot.json"]);
    const command = firstText(files, ["command.txt"]) || scalarFromJson(env, "command") || scalarFromJson(artifact, "command") || findCommandInLogs(files);
    const stdout = firstText(files, ["stdout.log", "stderr.log", "train.log", "test.log"]);
    const resultCsv = firstExistingPath(files, ["metrics_summary.csv", "results.csv", "metrics.csv"]) || scalarFromJson(artifact, "result_csv");
    const resultRecord = context.resultRecord || {};
    const seed = field("seed", [scalarFromJson(env, "seed"), scalarFromConfig(configText, ["seed", "random_seed"]), scalarFromRecord(resultRecord, ["dimensions.seed", "seed"]), regex(command, /(?:--seed|seed=)\s*=?\s*([A-Za-z0-9_.-]+)/)]);
    const baseConfig = field("base_config", [scalarFromJson(env, "config"), scalarFromJson(artifact, "config"), regex(command, /(?:--config|--cfg)\s+([^\s]+)/), scalarFromConfig(configText, ["base_config", "config"])]);
    const outputDir = field("output_dir", [regex(command, /(?:--output-dir|--output_dir|--out|--work-dir|--work_dir)\s+([^\s]+)/), scalarFromJson(artifact, "output_dir"), dirname(resultCsv)]);
    const suite = field("suite", [scalarFromRecord(resultRecord, ["suite", "dimensions.suite"]), scalarFromConfig(configText, ["suite"]), inferFromRunId(runId, "suite")], "manual");
    const caseName = field("case", [scalarFromRecord(resultRecord, ["dimensions.case", "experimentName", "runKey"]), scalarFromConfig(configText, ["case", "name", "id"]), inferCase(runId)]);
    const method = field("method", [scalarFromRecord(resultRecord, ["dimensions.method", "method"]), scalarFromConfig(configText, ["method", "model.name", "model"]), inferFromRunId(runId, "method")], caseName.value || "unknown");
    const dataset = field("dataset", [scalarFromRecord(resultRecord, ["dimensions.dataset"]), scalarFromConfig(configText, ["dataset", "data.dataset", "dataset.name"]), inferFromRunId(runId, "dataset")], "unknown");
    const split = field("split", [scalarFromRecord(resultRecord, ["dimensions.split"]), scalarFromConfig(configText, ["split", "data.split"]), regex(stdout, /\b(train|val|valid|validation|test|external)\b/i)], "test");
    const fold = field("fold", [scalarFromRecord(resultRecord, ["dimensions.fold"]), scalarFromConfig(configText, ["fold"]), regex(command, /(?:--fold|fold=)\s*=?\s*([A-Za-z0-9_.-]+)/)]);
    const trainCommand = commandField(command, /train/i);
    const testCommand = commandField(command, /(?:test|eval|evaluate)/i);
    const gitCommit = scalarFromJson(env, "git_commit") || scalarFromJson(env, "gitCommit") || scalarFromJson(artifact, "gitCommit") || "";
    const codeFingerprint = scalarFromJson(env, "code_fingerprint") || scalarFromJson(env, "codeFingerprint") || scalarFromJson(artifact, "codeFingerprint") || "";
    const workerId = scalarFromJson(env, "worker_id") || scalarFromJson(env, "workerId") || scalarFromJson(artifact, "workerId") || scalarFromRecord(resultRecord, ["provenance.workerId"]);
    const gpuIds = splitList(scalarFromJson(env, "gpu_ids") || scalarFromJson(env, "gpuIds") || scalarFromRecord(resultRecord, ["provenance.gpuIds"]));
    const fields = { runId: observed(runId, "run_dir"), suite, case: caseName, method, dataset, split, fold, seed, baseConfig, outputDir, trainCommand, testCommand, resultCsv: field("result_csv", [resultCsv]) };
    const warnings = recoveryWarnings(fields, { gitCommit, codeFingerprint, configText });
    return {
        schemaVersion: 1,
        runId,
        runDir: context.runDir,
        fields,
        plan: {
            suite: String(suite.value || "manual"),
            caseName: String(caseName.value || "baseline"),
            method: String(method.value || "unknown"),
            dataset: String(dataset.value || "unknown"),
            split: String(split.value || "test"),
            fold: String(fold.value || ""),
            seed: String(seed.value || ""),
            baseConfig: String(baseConfig.value || "configs/base.yaml"),
            outputDir: String(outputDir.value || `work_dirs/recovered/${runId}`),
            trainCommand: String(trainCommand.value || command || "python train.py --config {config} --seed {seed} --output-dir {output_dir}"),
            testCommand: String(testCommand.value || ""),
            resultFiles: [String(resultCsv || "metrics_summary.csv")].filter(Boolean),
        },
        worker: { workerId, gpuIds },
        provenance: { gitCommit, codeFingerprint, command },
        warnings,
        evidenceFiles,
        generatedAt: new Date().toISOString(),
    };
}
function inferPlanFromRunDirectory(runDir, context = {}) {
    const files = {};
    for (const name of ["artifact_manifest.json", "config_snapshot.yaml", "config_snapshot.yml", "config_snapshot.json", "env_snapshot.json", "command.txt", "stdout.log", "stderr.log", "train.log", "test.log", "metrics_summary.csv", "results.csv", "metrics.csv"]) {
        const target = path.join(runDir, name);
        if (fs.existsSync(target) && fs.statSync(target).isFile())
            files[name] = fs.readFileSync(target, "utf8");
    }
    return inferExperimentConfigFromRun(files, { runDir, runId: path.basename(runDir), resultRecord: context.resultRecord });
}
function renderRecoveredPlanYaml(recovered) {
    const p = recovered.plan;
    const lines = [
        `suite: ${yamlScalar(p.suite)}`,
        "mode: train_test",
        `base_config: ${yamlScalar(p.baseConfig)}`,
        "paper:",
        `  result_csv: ${yamlScalar(p.resultFiles[0] || "metrics_summary.csv")}`,
        "runner:",
        `  train_command: ${yamlScalar(p.trainCommand)}`,
    ];
    if (p.testCommand)
        lines.push(`  test_command: ${yamlScalar(p.testCommand)}`);
    lines.push("naming:", `  sweep_dir: ${yamlScalar(dirname(p.outputDir) || "work_dirs/recovered")}`, `  job_name: ${yamlScalar(path.basename(p.outputDir) || "{case}_seed{seed}")}`, "seeds:", `  - ${yamlScalar(p.seed || "needs_user_input")}`, "cases:", `  - case: ${yamlScalar(p.caseName || "baseline")}`, `    method: ${yamlScalar(p.method || "unknown")}`, `    dataset: ${yamlScalar(p.dataset || "unknown")}`, `    split: ${yamlScalar(p.split || "test")}`, `    outputDir: ${yamlScalar(p.outputDir)}`);
    if (p.resultFiles.length)
        lines.push("    expectedResults:", ...p.resultFiles.map((file) => `      - ${yamlScalar(file)}`));
    lines.push("    overrides:", `      recovered_from_run: ${yamlScalar(recovered.runId)}`);
    if (p.fold)
        lines.push(`      fold: ${yamlScalar(p.fold)}`);
    return `${lines.join("\n")}\n`;
}
function compareRecoveredConfigToPlan(recovered, planText) {
    const plan = (0, PlanBuilder_1.parsePlanSummary)(planText);
    const checks = [
        ["suite", recovered.plan.suite, plan.suite],
        ["baseConfig", recovered.plan.baseConfig, plan.baseConfig],
        ["seed", recovered.plan.seed, plan.seeds[0]],
        ["case", recovered.plan.caseName, plan.cases[0]],
        ["trainCommand", recovered.plan.trainCommand, plan.trainCommand],
        ["testCommand", recovered.plan.testCommand, plan.testCommand],
    ];
    const differences = checks.filter(([, a, b]) => normalize(a) && normalize(b) && normalize(a) !== normalize(b)).map(([fieldName, recoveredValue, planValue]) => ({
        field: fieldName,
        recovered: recoveredValue,
        plan: planValue,
        severity: fieldName === "suite" || fieldName === "baseConfig" ? "warning" : "info",
        suggestion: "复现实验前请确认该字段以 recovered plan 还是原始 plan 为准。",
    }));
    const missing = Object.entries(recovered.fields).filter(([, value]) => value.status !== "observed" && value.status !== "inferred").map(([key]) => key);
    return { status: differences.some((item) => item.severity === "critical") || missing.includes("seed") || missing.includes("baseConfig") ? "failed" : differences.length || missing.length ? "warning" : "ok", differences, missing };
}
function recoveredPlanOutputFiles(recovered) {
    const base = `${exports.RECOVERED_PLAN_DIR}/${safeFileName(recovered.runId)}`;
    return {
        yamlPath: `${base}.yaml`,
        jsonPath: `${base}.json`,
        reportPath: `${base}.report.md`,
        yaml: renderRecoveredPlanYaml(recovered),
        json: JSON.stringify(recovered, null, 2),
        report: renderRecoveredPlanReport(recovered),
    };
}
function renderRecoveredPlanReport(recovered) {
    const rows = Object.entries(recovered.fields).map(([key, value]) => `| ${key} | ${value.status} | ${String(value.value ?? "")} | ${value.source || ""} | ${value.message || ""} |`);
    return [`# 实验配置反推报告`, "", `run_id: ${recovered.runId}`, `generated_at: ${recovered.generatedAt}`, "", "## 字段置信度", "", "| 字段 | 状态 | 值 | 来源 | 建议 |", "| --- | --- | --- | --- | --- |", ...rows, "", "## 中文建议", "", ...recovered.warnings.map((item) => `- ${item}`), "", "## 生成文件", "", `- ${exports.RECOVERED_PLAN_DIR}/${safeFileName(recovered.runId)}.yaml`, `- ${exports.RECOVERED_PLAN_DIR}/${safeFileName(recovered.runId)}.json`].join("\n");
}
function field(name, candidates, fallback = "") {
    const value = candidates.find((item) => String(item || "").trim());
    if (value)
        return { value: String(value), status: name === "split" && /train|val|valid|validation|test|external/i.test(String(value)) && !candidates[0] ? "low_confidence" : "observed", source: "run evidence" };
    if (fallback)
        return { value: fallback, status: "inferred", source: "default", message: `${name} 未显式记录，已使用默认建议。` };
    return { status: "needs_user_input", message: missingSuggestion(name) };
}
function observed(value, source) {
    return { value, status: "observed", source };
}
function commandField(command, preferred) {
    if (!command)
        return { status: "needs_user_input", message: "缺少命令记录，建议查看 command.txt 或 stdout.log。" };
    return { value: command, status: preferred.test(command) ? "observed" : "low_confidence", source: "command.txt", message: preferred.test(command) ? undefined : "命令无法明确区分 train/test，请人工确认。" };
}
function recoveryWarnings(fields, extra) {
    const warnings = Object.entries(fields).filter(([, value]) => ["missing", "low_confidence", "needs_user_input"].includes(value.status)).map(([key, value]) => value.message || missingSuggestion(key));
    if (!fields.seed.value)
        warnings.push("缺少 seed，建议从 log 或 config_snapshot.yaml 补齐。");
    if (!extra.configText)
        warnings.push("缺少 config_snapshot.yaml，建议使用生成的 recovered plan 后人工补齐关键配置。");
    if (!extra.gitCommit && !extra.codeFingerprint)
        warnings.push("缺少 git commit 或代码 fingerprint，复现需谨慎。");
    return Array.from(new Set(warnings));
}
function missingSuggestion(name) {
    const map = {
        seed: "缺少 seed，建议从 log 或 config_snapshot.yaml 补齐。",
        baseConfig: "缺少 config 路径，建议从 command.txt、artifact_manifest.json 或 config_snapshot.yaml 补齐。",
        trainCommand: "缺少训练命令，建议从 command.txt 或 stdout.log 补齐。",
    };
    return map[name] || `${name} 缺少明确证据，需要人工确认。`;
}
function readJson(files, name) {
    try {
        return JSON.parse(files[name] || "{}");
    }
    catch {
        return {};
    }
}
function firstText(files, names) {
    return names.map((name) => files[name]).find((text) => String(text || "").trim()) || "";
}
function firstExistingPath(files, names) {
    return names.find((name) => files[name]) || "";
}
function scalarFromJson(value, key) {
    const raw = key.split(".").reduce((cur, part) => cur && typeof cur === "object" ? cur[part] : undefined, value);
    if (Array.isArray(raw))
        return raw.join(",");
    return raw === undefined || raw === null || typeof raw === "object" ? "" : String(raw);
}
function scalarFromRecord(value, keys) {
    for (const key of keys) {
        const got = scalarFromJson(value, key);
        if (got)
            return got;
    }
    return "";
}
function scalarFromConfig(text, keys) {
    if (!text)
        return "";
    for (const key of keys) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(^|\\n)\\s*${escaped}\\s*:\\s*["']?([^"'\\n#]+)`, "i");
        const match = text.match(re);
        if (match?.[2])
            return match[2].trim();
        const leaf = key.split(".").pop() || key;
        const leafMatch = text.match(new RegExp(`(^|\\n)\\s*${leaf.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*["']?([^"'\\n#]+)`, "i"));
        if (leafMatch?.[2])
            return leafMatch[2].trim();
    }
    return "";
}
function regex(text, pattern) {
    return text.match(pattern)?.[1]?.trim() || "";
}
function findCommandInLogs(files) {
    const text = firstText(files, ["stdout.log", "stderr.log", "train.log", "test.log"]);
    return regex(text, /(?:command|cmd|运行命令)\s*[:=]\s*(.+)$/im);
}
function inferRunId(runDir, files) {
    return runDir ? path.basename(runDir) : (0, crypto_1.createHash)("sha1").update(JSON.stringify(Object.keys(files).sort())).digest("hex").slice(0, 12);
}
function inferCase(runId) {
    return runId.replace(/_?seed\d+.*/i, "").replace(/^\d+[_-]/, "") || "baseline";
}
function inferFromRunId(runId, key) {
    return regex(runId, new RegExp(`${key}[-_:]([A-Za-z0-9_.-]+)`, "i"));
}
function dirname(value) {
    return value && value.includes("/") ? value.replace(/\/[^/]+$/, "") : "";
}
function splitList(value) {
    return value ? value.split(/[,\s;]+/).filter(Boolean) : [];
}
function yamlScalar(value) {
    return JSON.stringify(String(value ?? ""));
}
function safeFileName(value) {
    return String(value || "run").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120) || "run";
}
function normalize(value) {
    return String(value ?? "").trim().replace(/\\/g, "/").toLowerCase();
}
