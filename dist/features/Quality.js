"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInOutputContracts = exports.standardCaseColumns = exports.standardSummaryColumns = exports.CASE_LEVEL_INDEX_PATH = exports.CASE_LEVEL_RESULT_DIR = exports.CONTRACT_CHECK_REPORT_DIR = exports.OUTPUT_CONTRACT_LOCAL_PATH = exports.OUTPUT_CONTRACT_DIR = void 0;
exports.checkProjectOutputContract = checkProjectOutputContract;
exports.contractCheckToMarkdown = contractCheckToMarkdown;
exports.runQualityGate = runQualityGate;
exports.filterRecordsByQualityGate = filterRecordsByQualityGate;
exports.parseCaseLevelCsv = parseCaseLevelCsv;
exports.runStatisticalAnalysis = runStatisticalAnalysis;
exports.annotatePaperTableWithSignificance = annotatePaperTableWithSignificance;
exports.runErrorAnalysis = runErrorAnalysis;
exports.caseListToCsv = caseListToCsv;
exports.runSubgroupAnalysis = runSubgroupAnalysis;
exports.runDataLeakageCheck = runDataLeakageCheck;
exports.generateOutputContractGuide = generateOutputContractGuide;
exports.generatePythonCsvWriterSnippet = generatePythonCsvWriterSnippet;
exports.generateEnvironmentSnapshotSnippet = generateEnvironmentSnapshotSnippet;
exports.OUTPUT_CONTRACT_DIR = "simple_cluster/contracts/output_contracts";
exports.OUTPUT_CONTRACT_LOCAL_PATH = "simple_cluster/contracts/output_contracts.local.json";
exports.CONTRACT_CHECK_REPORT_DIR = "simple_cluster/contracts/contract_check_reports";
exports.CASE_LEVEL_RESULT_DIR = "simple_cluster/results/case_level";
exports.CASE_LEVEL_INDEX_PATH = "simple_cluster/results/case_level_index.json";
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
        description: "Summary, case-level, curve, checkpoint, env, prediction and log outputs for paper-grade analysis.",
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
        qualityGates: [{
                id: "paper_ready",
                name: "Paper-ready result gate",
                enabled: true,
                checks: [
                    { type: "required_file", fileSpecId: "metrics_summary" },
                    { type: "required_metric", metric: "AUC" },
                    { type: "finite_metric", metric: "AUC" },
                    { type: "metric_range", metric: "AUC", min: 0, max: 1 },
                    { type: "split_recorded" },
                    { type: "seed_recorded" },
                    { type: "env_snapshot_exists" },
                ],
                actionOnFailure: "exclude_from_paper_table",
            }],
        statisticalPlan: {
            schemaVersion: 1,
            id: "paired_seed_test",
            name: "Paired seed statistical plan",
            pairedBy: ["seed", "dataset"],
            tests: [{ id: "auc_paired_t", metric: "AUC", method: "paired_t_test", baselineMethodId: "baseline", compareAllAgainstBaseline: true, alpha: 0.05, correction: "holm", minPairs: 2 }],
            effectSizes: [{ metric: "AUC", method: "mean_diff" }],
            output: { updateLeaderboard: true, updatePaperTable: true, showPValues: true, showSignificanceStars: true, showEffectSize: true },
        },
        caseLevelAnalysis: { requiredKeys: ["case_id", "dataset", "split", "method"], subgroupKeys: ["subgroup", "sex", "age_group", "missing_rate", "noise_level"], imagePathColumns: ["image_path", "visualization_path"] },
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
function runQualityGate(record, gate, contractReport, caseRecords = []) {
    if (!gate.enabled)
        return { experimentId: record.experimentId, gateId: gate.id, status: "skipped", checkedAt: new Date().toISOString(), failedChecks: [] };
    const failedChecks = [];
    for (const check of gate.checks) {
        const fail = gateCheckFailure(record, check, contractReport, caseRecords);
        if (fail)
            failedChecks.push(fail);
    }
    const critical = gate.actionOnFailure !== "warn_only";
    return { experimentId: record.experimentId, gateId: gate.id, status: failedChecks.length ? critical ? "failed" : "warning" : "passed", checkedAt: new Date().toISOString(), failedChecks };
}
function filterRecordsByQualityGate(records, gateResults, policy = "only_gate_passed") {
    if (policy === "include_all")
        return records;
    const map = new Map(gateResults.map((item) => [item.experimentId, item]));
    return records.filter((record) => {
        const gate = map.get(record.experimentId);
        if (!gate)
            return policy !== "only_gate_passed";
        if (policy === "include_warnings")
            return gate.status !== "failed";
        return gate.status === "passed";
    });
}
function parseCaseLevelCsv(text, resultId) {
    const rows = csvRows(text);
    const headers = rows[0] || [];
    const now = new Date().toISOString();
    return rows.slice(1).map((cols, index) => {
        const row = Object.fromEntries(headers.map((h, i) => [h, cols[i] || ""]));
        const metricName = row.metric || "";
        const metrics = {};
        const metricValue = finiteNumber(row.value);
        if (metricName && metricValue !== undefined)
            metrics[metricName] = metricValue;
        for (const key of ["DSC", "ASD", "HD95", "IoU", "loss", "accuracy"]) {
            const value = finiteNumber(row[key]);
            if (value !== undefined)
                metrics[key] = value;
        }
        const probability = finiteNumber(row.probability);
        return {
            schemaVersion: 1,
            caseResultId: `${resultId}:${row.case_id || row.caseId || index}`,
            experimentId: row.experiment_id || row.experimentId || resultId,
            attemptId: row.attempt_id,
            resultId,
            caseId: row.case_id || row.caseId || String(index),
            patientId: row.patient_id || row.patientId || undefined,
            dataset: row.dataset || "",
            split: row.split || "",
            fold: row.fold || undefined,
            seed: row.seed || undefined,
            method: row.method || undefined,
            label: parseOptionalValue(row.label),
            prediction: parseOptionalValue(row.prediction),
            probability,
            metrics,
            errorType: row.error_type || undefined,
            subgroup: parseSubgroup(row),
            paths: { image: row.image_path || undefined, tableRow: row.table_row_id || undefined, prediction: row.pred_path || row.prediction_path || undefined, mask: row.mask_path || undefined, visualization: row.visualization_path || undefined },
            parsedAt: now,
        };
    });
}
function runStatisticalAnalysis(plan, rows, methods, comparisonId = "comparison") {
    const results = [];
    const normalizedMethods = Array.from(new Set(methods.map((method) => String(method || "").trim()).filter(Boolean)));
    validateStatisticalInputs(plan, normalizedMethods);
    for (const test of plan.tests) {
        const baseline = String(test.baselineMethodId || normalizedMethods[0]).trim();
        const targets = test.compareAllAgainstBaseline ? normalizedMethods.filter((method) => method !== baseline) : normalizedMethods.filter((method) => method !== baseline).slice(0, 1);
        for (const method of targets) {
            const paired = pairedMetricValues(rows, baseline, method, test.metric, plan.pairedBy);
            const pairs = paired.pairs;
            const warnings = [];
            if (paired.duplicateKeys.length)
                warnings.push(`Duplicate pairing keys excluded: ${paired.duplicateKeys.join(", ")}`);
            if (paired.missingKeyRows)
                warnings.push(`Rows missing pairing keys excluded: ${paired.missingKeyRows}`);
            if (!["paired_t_test", "wilcoxon_signed_rank", "bootstrap_ci"].includes(test.method))
                warnings.push(`Unsupported statistical method ${test.method}; needs experiment`);
            if (pairs.length < (test.minPairs ?? 2))
                warnings.push(`Not enough paired samples for ${test.method}: ${pairs.length}`);
            const diffs = pairs.map(([a, b]) => b - a);
            const valid = warnings.length === 0;
            const pValue = !valid || test.method === "bootstrap_ci" ? undefined : test.method === "wilcoxon_signed_rank" ? wilcoxonSignedRankP(diffs) : pairedTTestP(diffs);
            const ci = valid && (test.method === "bootstrap_ci" || plan.output.showEffectSize) ? bootstrapCi(diffs) : undefined;
            results.push({ schemaVersion: 1, testId: test.id, comparisonId, metric: test.metric, methodA: baseline, methodB: method, pairedBy: plan.pairedBy, nPairs: pairs.length, statistic: valid ? avg(diffs) : undefined, pValue, significant: pValue !== undefined ? pValue < test.alpha : false, alpha: test.alpha, correction: test.correction, effectSize: valid ? effectSize(plan, test.metric, diffs) : undefined, ci, generatedAt: new Date().toISOString(), warnings });
        }
    }
    return applyCorrection(results);
}
function annotatePaperTableWithSignificance(markdown, stats) {
    const sig = stats.filter((s) => s.significant).map((s) => `${s.methodB}.${s.metric}: p=${(s.adjustedPValue ?? s.pValue ?? 1).toFixed(4)}*`);
    return sig.length ? `${markdown}\n\nSignificance: ${sig.join("; ")}\n` : markdown;
}
function runErrorAnalysis(rows, query) {
    let filtered = rows.filter((row) => (!query.experimentIds?.length || query.experimentIds.includes(row.experimentId))
        && (!query.methodIds?.length || query.methodIds.includes(String(row.method || "")))
        && (!query.dataset?.length || query.dataset.includes(row.dataset))
        && (!query.split?.length || query.split.includes(row.split))
        && (!query.errorType?.length || query.errorType.includes(String(row.errorType || "")))
        && (!query.subgroup || Object.entries(query.subgroup).every(([k, v]) => row.subgroup?.[k] === v)));
    const sortBy = query.sortBy;
    if (sortBy)
        filtered = filtered.sort((a, b) => (Number(a.metrics[sortBy.metric]) - Number(b.metrics[sortBy.metric])) * (sortBy.direction === "asc" ? 1 : -1));
    if (query.limit)
        filtered = filtered.slice(0, query.limit);
    return { query, generatedAt: new Date().toISOString(), cases: filtered, summary: summarizeCases(filtered, query.metric ? [query.metric] : undefined) };
}
function caseListToCsv(rows) {
    const headers = ["caseId", "patientId", "experimentId", "method", "dataset", "split", "errorType", "metrics"];
    return [headers, ...rows.map((r) => [r.caseId, r.patientId || "", r.experimentId, r.method || "", r.dataset, r.split, r.errorType || "", JSON.stringify(r.metrics)])].map((r) => r.map(csvEscape).join(",")).join("\n");
}
function runSubgroupAnalysis(rows, config) {
    const filtered = rows.filter((row) => !config.filter || Object.entries(config.filter).every(([k, v]) => (row.subgroup?.[k] ?? row[k]) === v));
    const groups = new Map();
    for (const row of filtered)
        groups.set(config.groupBy.map((key) => String(row.subgroup?.[key] ?? row[key] ?? "")).join(" | "), [...(groups.get(config.groupBy.map((key) => String(row.subgroup?.[key] ?? row[key] ?? "")).join(" | ")) || []), row]);
    const summary = Array.from(groups.entries()).map(([group, items]) => ({ group, count: items.length, metrics: metricSummary(items, config.metrics), warning: config.minGroupSize && items.length < config.minGroupSize ? "minGroupSize not met" : undefined }));
    return { query: { subgroup: config.filter }, generatedAt: new Date().toISOString(), cases: filtered, summary };
}
function runDataLeakageCheck(rows, expectedCounts) {
    const issues = [];
    if (rows.every((row) => !row.patientId))
        issues.push({ severity: "warning", type: "patient_overlap", message: "patient_id missing; cannot run patient-level leakage check.", suggestion: "Add patient_id to metrics_case.csv." });
    const patientSplits = groupBy(rows.filter((r) => r.patientId), (r) => r.patientId);
    for (const [patient, items] of patientSplits) {
        const splits = Array.from(new Set(items.map((i) => i.split)));
        if (splits.length > 1)
            issues.push({ severity: "critical", type: "patient_overlap", message: `Patient appears in multiple splits: ${patient}`, affectedIds: [patient], suggestion: "Regenerate split by patient_id." });
    }
    const caseSplits = groupBy(rows, (r) => r.caseId);
    for (const [caseId, items] of caseSplits) {
        const splits = Array.from(new Set(items.map((i) => i.split)));
        if (splits.length > 1)
            issues.push({ severity: "critical", type: "case_overlap", message: `Case appears in multiple splits: ${caseId}`, affectedIds: [caseId] });
    }
    for (const [split, expected] of Object.entries(expectedCounts || {})) {
        const actual = rows.filter((row) => row.split === split).length;
        if (actual !== expected)
            issues.push({ severity: "warning", type: "count_mismatch", message: `Split ${split} count mismatch: expected=${expected}, actual=${actual}` });
    }
    return { status: issues.some((i) => i.severity === "critical" && !i.accepted) ? "failed" : issues.length ? "warning" : "ok", issues };
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
function gateCheckFailure(record, check, contractReport, caseRecords = []) {
    if (check.type === "required_file" && contractReport?.files.some((f) => f.specId === check.fileSpecId && f.status !== "found"))
        return fail(check.type, "critical", `Required file missing: ${check.fileSpecId}`);
    if (check.type === "required_metric" && !record.metrics[check.metric])
        return fail(check.type, "critical", `Required metric missing: ${check.metric}`);
    if (check.type === "finite_metric" && !Number.isFinite(Number(record.metrics[check.metric]?.value)))
        return fail(check.type, "critical", `Metric is not finite: ${check.metric}`);
    if (check.type === "metric_range") {
        const n = Number(record.metrics[check.metric]?.value);
        if (!Number.isFinite(n) || (check.min !== undefined && n < check.min) || (check.max !== undefined && n > check.max))
            return fail(check.type, "critical", `Metric out of range: ${check.metric}`);
    }
    if (check.type === "case_count" && check.min !== undefined && caseRecords.length < check.min)
        return fail(check.type, "warning", `Case count too small: ${caseRecords.length}`);
    if (check.type === "no_nan" && Object.values(record.metrics).some((m) => Number.isNaN(Number(m.value))))
        return fail(check.type, "critical", "NaN metric found");
    if (check.type === "no_inf" && Object.values(record.metrics).some((m) => !Number.isFinite(Number(m.value)) && m.value !== null && m.value !== ""))
        return fail(check.type, "critical", "Inf/non-finite metric found");
    if (check.type === "env_snapshot_exists" && contractReport?.files.some((f) => f.specId === "env_snapshot" && f.status !== "found"))
        return fail(check.type, "warning", "env_snapshot.json missing");
    if (check.type === "git_commit_recorded" && !record.provenance.commit)
        return fail(check.type, "warning", "git commit not recorded");
    if (check.type === "split_recorded" && !record.dimensions.split && Object.values(record.metrics).every((m) => !m.split))
        return fail(check.type, "critical", "split missing");
    if (check.type === "seed_recorded" && !record.dimensions.seed && Object.values(record.metrics).every((m) => !m.seed))
        return fail(check.type, "critical", "seed missing");
    if (check.type === "patient_level_split_safe" && runDataLeakageCheck(caseRecords).status === "failed")
        return fail(check.type, "critical", "patient-level split leakage detected");
    return undefined;
}
function fail(checkType, severity, message, suggestion) {
    return { checkType, severity, message, suggestion };
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
function parseValue(value) {
    if (value === undefined || value === "")
        return null;
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    const n = Number(value);
    return Number.isFinite(n) ? n : String(value);
}
function parseOptionalValue(value) {
    const parsed = parseValue(value);
    return parsed === null ? undefined : parsed;
}
function parseSubgroup(row) {
    const out = {};
    for (const key of ["subgroup", "site", "scanner", "sex", "age_group", "class_name", "modality_available", "missing_pattern", "missing_rate", "noise_type", "noise_level", "clinical_feature_group"]) {
        if (row[key] !== undefined && row[key] !== "")
            out[key] = parseValue(row[key]);
    }
    return out;
}
function pairedMetricValues(rows, methodA, methodB, metric, pairedBy) {
    const maps = [methodA, methodB].map(() => new Map());
    const duplicates = new Set();
    let missingKeyRows = 0;
    for (const row of rows) {
        const methodIndex = row.method === methodA ? 0 : row.method === methodB ? 1 : -1;
        const value = finiteNumber(row.metrics[metric]);
        if (methodIndex < 0 || value === undefined)
            continue;
        const parts = pairedBy.map((key) => key === "case_id" ? row.caseId : key === "patient_id" ? row.patientId : row[camel(key)]);
        if (parts.some((part) => part === undefined || part === null || String(part).trim() === "")) {
            missingKeyRows++;
            continue;
        }
        const key = parts.map(String).join("|");
        if (maps[methodIndex].has(key))
            duplicates.add(key);
        else
            maps[methodIndex].set(key, value);
    }
    const pairs = Array.from(maps[0].entries()).filter(([key]) => maps[1].has(key) && !duplicates.has(key)).map(([key, value]) => [value, maps[1].get(key)]);
    return { pairs, duplicateKeys: Array.from(duplicates).sort(), missingKeyRows };
}
function pairedTTestP(diffs) {
    if (diffs.length < 2)
        return 1;
    const sd = std(diffs);
    if (sd === 0)
        return avg(diffs) === 0 ? 1 : 0;
    return Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(avg(diffs) / (sd / Math.sqrt(diffs.length)))))));
}
function wilcoxonSignedRankP(diffs) {
    const nonzero = diffs.filter((d) => d !== 0).map((d) => ({ abs: Math.abs(d), sign: Math.sign(d) })).sort((a, b) => a.abs - b.abs);
    if (nonzero.length < 2)
        return 1;
    const ranks = nonzero.map((d, i) => ({ ...d, rank: i + 1 }));
    const pos = ranks.filter((r) => r.sign > 0).reduce((sum, r) => sum + r.rank, 0);
    const neg = ranks.filter((r) => r.sign < 0).reduce((sum, r) => sum + r.rank, 0);
    const w = Math.min(pos, neg);
    const n = nonzero.length;
    const mean = n * (n + 1) / 4;
    const sd = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
    return Math.max(0, Math.min(1, 2 * normalCdf((w - mean) / sd)));
}
function bootstrapCi(values, level = 0.95) {
    if (!values.length)
        return undefined;
    const means = [];
    for (let i = 0; i < 200; i++)
        means.push(avg(values.map((_, j) => values[(i * 17 + j * 31) % values.length])));
    means.sort((a, b) => a - b);
    const lo = Math.floor((1 - level) / 2 * means.length);
    const hi = Math.ceil((1 - (1 - level) / 2) * means.length) - 1;
    return { level, lower: means[Math.max(0, lo)], upper: means[Math.min(means.length - 1, hi)] };
}
function applyCorrection(results) {
    const byCorrection = groupBy(results.filter((item) => item.pValue !== undefined && Number.isFinite(item.pValue)), (r) => r.correction || "none");
    for (const [correction, items] of byCorrection) {
        if (correction === "bonferroni")
            for (const item of items)
                setAdjusted(item, Math.min(1, (item.pValue ?? 1) * items.length));
        if (correction === "holm") {
            const sorted = [...items].sort((a, b) => (a.pValue ?? 1) - (b.pValue ?? 1));
            let previous = 0;
            sorted.forEach((item, index) => {
                previous = Math.max(previous, Math.min(1, (item.pValue ?? 1) * (sorted.length - index)));
                setAdjusted(item, previous);
            });
        }
        if (correction === "fdr_bh") {
            const sorted = [...items].sort((a, b) => (a.pValue ?? 1) - (b.pValue ?? 1));
            let next = 1;
            for (let index = sorted.length - 1; index >= 0; index--) {
                next = Math.min(next, Math.min(1, (sorted[index].pValue ?? 1) * sorted.length / (index + 1)));
                setAdjusted(sorted[index], next);
            }
        }
    }
    return results;
}
function validateStatisticalInputs(plan, methods) {
    if (!Array.isArray(plan.tests) || !plan.tests.length)
        throw new TypeError("Statistical plan must contain at least one test");
    if (!Array.isArray(plan.pairedBy) || !plan.pairedBy.length)
        throw new TypeError("Statistical plan must contain pairing keys");
    if (new Set(plan.pairedBy).size !== plan.pairedBy.length)
        throw new TypeError("Statistical pairing keys must be unique");
    if (methods.length < 2)
        throw new TypeError("Statistical analysis requires at least two distinct methods");
    for (const test of plan.tests) {
        if (!String(test.id || "").trim() || !String(test.metric || "").trim())
            throw new TypeError("Statistical tests require non-empty id and metric");
        if (!Number.isFinite(test.alpha) || test.alpha <= 0 || test.alpha >= 1)
            throw new RangeError(`Invalid alpha for statistical test ${test.id}`);
        if (test.minPairs !== undefined && (!Number.isInteger(test.minPairs) || test.minPairs < 2))
            throw new RangeError(`Invalid minPairs for statistical test ${test.id}`);
        const baseline = String(test.baselineMethodId || methods[0]).trim();
        if (!methods.includes(baseline))
            throw new TypeError(`Baseline method not found: ${baseline}`);
    }
}
function finiteNumber(value) {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : undefined;
    if (typeof value !== "string" || !value.trim())
        return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}
function setAdjusted(item, value) {
    item.adjustedPValue = value;
    item.significant = value < item.alpha;
}
function effectSize(plan, metric, diffs) {
    const spec = plan.effectSizes?.find((item) => item.metric === metric);
    if (!spec || !diffs.length)
        return undefined;
    if (spec.method === "cohens_d")
        return { method: spec.method, value: std(diffs) === 0 ? 0 : avg(diffs) / std(diffs) };
    return { method: spec.method, value: avg(diffs) };
}
function summarizeCases(rows, metricFilter) {
    return [{ group: "all", count: rows.length, metrics: metricSummary(rows, metricFilter || Array.from(new Set(rows.flatMap((r) => Object.keys(r.metrics))))) }];
}
function metricSummary(rows, metrics) {
    const out = {};
    for (const metric of metrics) {
        const values = rows.map((row) => Number(row.metrics[metric])).filter(Number.isFinite);
        if (values.length)
            out[metric] = { mean: avg(values), std: std(values), min: Math.min(...values), max: Math.max(...values) };
    }
    return out;
}
function groupBy(rows, key) {
    const map = new Map();
    for (const row of rows)
        map.set(key(row), [...(map.get(key(row)) || []), row]);
    return map;
}
function avg(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
}
function std(values) {
    if (values.length < 2)
        return 0;
    const mean = avg(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1));
}
function normalCdf(x) {
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const d = 0.3989423 * Math.exp(-x * x / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return x > 0 ? 1 - p : p;
}
function camel(key) {
    return key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function csvWriterSnippet(columns) {
    return generatePythonCsvWriterSnippet("write_csv", columns);
}
function globMatch(filePath, pattern) {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`(^|/)${escaped}$`).test(filePath.replace(/\\/g, "/"));
}
function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
