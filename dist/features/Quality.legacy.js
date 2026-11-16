"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInOutputContracts = exports.standardCaseColumns = exports.standardSummaryColumns = exports.CONTRACT_CHECK_REPORT_DIR = exports.OUTPUT_CONTRACT_LOCAL_PATH = exports.OUTPUT_CONTRACT_DIR = void 0;
exports.checkProjectOutputContract = checkProjectOutputContract;
exports.contractCheckToMarkdown = contractCheckToMarkdown;
exports.generateOutputContractGuide = generateOutputContractGuide;
exports.generatePythonCsvWriterSnippet = generatePythonCsvWriterSnippet;
exports.generateEnvironmentSnapshotSnippet = generateEnvironmentSnapshotSnippet;
exports.OUTPUT_CONTRACT_DIR = "simple_cluster/contracts/output_contracts";
exports.OUTPUT_CONTRACT_LOCAL_PATH = "simple_cluster/contracts/output_contracts.local.json";
exports.CONTRACT_CHECK_REPORT_DIR = "simple_cluster/contracts/contract_check_reports";
exports.standardSummaryColumns = [
    "experiment_id", "attempt_id", "study_id", "plan_id", "suite", "method", "dataset", "split", "fold", "seed", "metric", "value", "unit", "higher_is_better", "epoch", "step", "timestamp",
].map((name) => ({ name, type: ["value", "epoch"].includes(name) ? "number" : name === "higher_is_better" ? "boolean" : name === "timestamp" ? "datetime" : "string", required: ["experiment_id", "suite", "method", "dataset", "split", "seed", "metric", "value"].includes(name) }));
exports.standardCaseColumns = [
    "experiment_id", "attempt_id", "case_id", "patient_id", "dataset", "split", "fold", "seed", "method", "label", "prediction", "probability", "metric", "value", "error_type", "subgroup", "image_path", "table_row_id", "timestamp",
].map((name) => ({ name, type: ["probability", "value"].includes(name) ? "number" : name === "timestamp" ? "datetime" : "string", required: ["experiment_id", "case_id", "dataset", "split", "method"].includes(name), aliases: name === "case_id" ? ["caseId"] : name === "patient_id" ? ["patientId"] : undefined }));
exports.builtInOutputContracts = [
    {
        schemaVersion: 1,
        id: "simple_standard_ai_output",
        name: "SimpleExperiment standard AI experiment output",
        description: "Summary, case-level, curve, checkpoint, environment, prediction and log output formats.",
        requiredFiles: [
            { id: "metrics_summary", pathPattern: "metrics_summary.csv", type: "summary_csv", required: true, minRows: 1 },
            { id: "config_snapshot", pathPattern: "config_snapshot.yaml", type: "config_snapshot", required: true },
            { id: "env_snapshot", pathPattern: "env_snapshot.json", type: "env_snapshot", required: true },
        ],
        optionalFiles: [
            { id: "metrics_case", pathPattern: "metrics_case.csv", type: "case_csv", required: false, minRows: 1 },
            { id: "training_curve", pathPattern: "training_curve.csv", type: "curve_csv", required: false },
            { id: "checkpoint_manifest", pathPattern: "checkpoint_manifest.json", type: "checkpoint_manifest", required: false },
            { id: "prediction_index", pathPattern: "prediction_index.csv", type: "prediction_index", required: false },
            { id: "train_log", pathPattern: "logs/train.log", type: "log", required: false },
        ],
        requiredColumns: { metrics_summary: exports.standardSummaryColumns.filter((c) => c.required), metrics_case: exports.standardCaseColumns.filter((c) => c.required) },
        recommendedColumns: { metrics_summary: exports.standardSummaryColumns, metrics_case: exports.standardCaseColumns },
        examples: { files: [{ path: "metrics_summary.csv", contentPreview: "experiment_id,attempt_id,study_id,plan_id,suite,method,dataset,split,fold,seed,metric,value,unit,higher_is_better,epoch,step,timestamp" }, { path: "metrics_case.csv", contentPreview: "experiment_id,attempt_id,case_id,patient_id,dataset,split,fold,seed,method,label,prediction,probability,metric,value,error_type,subgroup,image_path,table_row_id,timestamp" }] },
    },
];
function checkProjectOutputContract(files, contract, context = {}) {
    const fileResults = [];
    const columnResults = [];
    const suggestions = [];
    const specs = [...contract.requiredFiles, ...contract.optionalFiles];
    for (const spec of specs) {
        const matches = Object.keys(files).filter((path) => globMatch(path, spec.pathPattern));
        const status = matches.length === 0 ? spec.required ? "missing" : "missing" : matches.length > 1 ? "ambiguous" : "found";
        fileResults.push({ specId: spec.id, pathPattern: spec.pathPattern, status, matchedPaths: matches, message: status === "missing" && spec.required ? `Missing required file: ${spec.pathPattern}` : undefined });
        if (status === "missing" && spec.required)
            suggestions.push({ id: `missing_${spec.id}`, severity: "critical", title: `Create ${spec.pathPattern}`, message: `Required output file '${spec.pathPattern}' is missing.`, example: outputExampleFor(spec.type) });
        const columns = [...(contract.requiredColumns?.[spec.id] || []), ...(contract.recommendedColumns?.[spec.id] || []).filter((col) => !(contract.requiredColumns?.[spec.id] || []).some((req) => req.name === col.name))];
        if (matches[0] && (spec.type.endsWith("csv") || spec.type === "prediction_index")) {
            const headers = csvHeaders(files[matches[0]]);
            for (const column of columns) {
                const actual = findColumn(headers, column);
                const missing = !actual;
                const typeMismatch = actual && column.required && !columnTypeLooksValid(files[matches[0]], actual, column.type);
                columnResults.push({ fileSpecId: spec.id, column: column.name, status: missing ? "missing" : actual !== column.name ? "alias_used" : typeMismatch ? "type_mismatch" : "found", actualColumn: actual, message: missing && column.required ? `Missing required column: ${column.name}` : undefined });
                if (missing && column.required)
                    suggestions.push({ id: `missing_col_${spec.id}_${column.name}`, severity: "critical", title: `Add column ${column.name}`, message: `${spec.pathPattern} must include '${column.name}'.`, example: csvWriterSnippet([column.name]) });
            }
        }
    }
    const failed = fileResults.some((f) => f.status === "missing" && specs.find((s) => s.id === f.specId)?.required) || columnResults.some((c) => c.status === "missing" && (contract.requiredColumns?.[c.fileSpecId] || []).some((col) => col.name === c.column));
    const warning = !failed && (fileResults.some((f) => f.status === "ambiguous") || columnResults.some((c) => c.status === "alias_used" || c.status === "type_mismatch"));
    return { schemaVersion: 1, contractId: contract.id, experimentId: context.experimentId, planId: context.planId, status: failed ? "failed" : warning ? "warning" : "ok", checkedAt: new Date().toISOString(), files: fileResults, columns: columnResults, suggestions };
}
function contractCheckToMarkdown(report) {
    return [`# Output Contract Check`, `contract=${report.contractId}`, `status=${report.status}`, "", "## Files", ...report.files.map((f) => `- [${f.status}] ${f.specId}: ${f.pathPattern}${f.message ? ` - ${f.message}` : ""}`), "", "## Columns", ...report.columns.map((c) => `- [${c.status}] ${c.fileSpecId}.${c.column}${c.actualColumn && c.actualColumn !== c.column ? ` via ${c.actualColumn}` : ""}`), "", "## Suggestions", ...report.suggestions.map((s) => `- [${s.severity}] ${s.title}: ${s.message}`)].join("\n");
}
function generateOutputContractGuide(contract) {
    return [`# ${contract.name}`, contract.description || "", "## Required Files", ...contract.requiredFiles.map((f) => `- ${f.pathPattern}: ${f.description || f.type}`), "", "## Optional Files", ...contract.optionalFiles.map((f) => `- ${f.pathPattern}: ${f.description || f.type}`), "", "## Required Columns", ...Object.entries(contract.requiredColumns || {}).flatMap(([file, cols]) => [`### ${file}`, ...cols.map((c) => `- ${c.name} (${c.type})`)]), "", "## Python metrics_summary writer", "```python", generatePythonCsvWriterSnippet("write_metrics_summary", exports.standardSummaryColumns.map((c) => c.name)), "```", "", "## Python metrics_case writer", "```python", generatePythonCsvWriterSnippet("write_metrics_case", exports.standardCaseColumns.map((c) => c.name)), "```"].join("\n");
}
function generatePythonCsvWriterSnippet(functionName, columns) {
    return [
        "import csv",
        "from datetime import datetime",
        "",
        `def ${functionName}(path, rows):`,
        `    fieldnames = ${JSON.stringify(columns)}`,
        "    with open(path, \"w\", newline=\"\", encoding=\"utf-8\") as f:",
        "        writer = csv.DictWriter(f, fieldnames=fieldnames)",
        "        writer.writeheader()",
        "        writer.writerows(rows)",
    ].join("\n");
}
function generateEnvironmentSnapshotSnippet() {
    return [
        "import json, os, sys, subprocess, torch",
        "def write_env_snapshot(path, command, seed):",
        "    data = {",
        "        'schemaVersion': 1,",
        "        'git_commit': subprocess.getoutput('git rev-parse HEAD'),",
        "        'git_dirty': bool(subprocess.getoutput('git status --porcelain')),",
        "        'python': sys.version.split()[0],",
        "        'torch': torch.__version__,",
        "        'cuda': torch.version.cuda,",
        "        'gpu_name': torch.cuda.get_device_name(0) if torch.cuda.is_available() else '',",
        "        'command': command,",
        "        'seed': seed,",
        "    }",
        "    json.dump(data, open(path, 'w', encoding='utf-8'), indent=2)",
    ].join("\n");
}
function outputExampleFor(type) {
    if (type === "summary_csv")
        return exports.standardSummaryColumns.map((c) => c.name).join(",");
    if (type === "case_csv")
        return exports.standardCaseColumns.map((c) => c.name).join(",");
    if (type === "env_snapshot")
        return '{"schemaVersion":1,"git_commit":"...","python":"3.10","torch":"2.3.0"}';
    return "";
}
function csvHeaders(text) {
    return csvRows(text)[0] || [];
}
function findColumn(headers, spec) {
    return headers.find((h) => h === spec.name) || headers.find((h) => (spec.aliases || []).includes(h));
}
function columnTypeLooksValid(text, column, type) {
    const rows = csvRows(text);
    const headers = rows[0] || [];
    const index = headers.indexOf(column);
    const sample = rows.slice(1).map((row) => row[index]).find((v) => v !== undefined && v !== "");
    if (!sample)
        return true;
    if (type === "number")
        return Number.isFinite(Number(sample));
    if (type === "boolean")
        return ["true", "false", "0", "1"].includes(sample.toLowerCase());
    if (type === "datetime")
        return !Number.isNaN(Date.parse(sample));
    return true;
}
function csvRows(text) {
    return text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
}
function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let quote = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && line[i + 1] === '"') {
            cur += '"';
            i++;
        }
        else if (ch === '"')
            quote = !quote;
        else if (ch === "," && !quote) {
            out.push(cur.trim());
            cur = "";
        }
        else
            cur += ch;
    }
    out.push(cur.trim());
    return out;
}
function csvWriterSnippet(columns) {
    return generatePythonCsvWriterSnippet("write_csv", columns);
}
function globMatch(filePath, pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`(^|/)${escaped}$`).test(filePath.replace(/\\/g, "/"));
}
