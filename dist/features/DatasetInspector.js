"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DATASET_LEAKAGE_REPORT_CSV_PATH = exports.DATASET_PROFILE_MARKDOWN_PATH = exports.DATASET_PROFILE_JSON_PATH = void 0;
exports.inspectDatasetCsvFiles = inspectDatasetCsvFiles;
exports.datasetProfileMarkdown = datasetProfileMarkdown;
exports.datasetLeakageCsv = datasetLeakageCsv;
const Quality_1 = require("./Quality");
exports.DATASET_PROFILE_JSON_PATH = "zlk_cluster/datasets/profile.json";
exports.DATASET_PROFILE_MARKDOWN_PATH = "zlk_cluster/datasets/profile.md";
exports.DATASET_LEAKAGE_REPORT_CSV_PATH = "zlk_cluster/datasets/leakage_report.csv";
function inspectDatasetCsvFiles(files, options = {}, now = new Date()) {
    const existing = new Set((options.existingFiles || []).map(normalizePath));
    const required = options.requiredColumns || [];
    const allRows = [];
    const fileReports = [];
    const missingFields = [];
    const missingFileRefs = [];
    const classDistribution = {};
    const splitDistribution = {};
    const splitClassDistribution = {};
    let checkedFileRefs = 0;
    for (const file of files) {
        const rows = csvDictRows(file.text);
        const columns = Object.keys(rows[0] || {});
        const missingColumns = required.filter((column) => !findColumn(columns, column));
        fileReports.push({ path: file.path, rows: rows.length, columns, missingColumns });
        missingColumns.forEach((column) => missingFields.push({ file: file.path, column, rows: rows.length }));
        for (const row of rows) {
            const tagged = { ...row, __file: file.path };
            allRows.push(tagged);
            const classValue = pickColumn(row, columns, options.classColumn || "class", ["label", "class_name", "target", "category"]) || "unknown";
            const splitValue = pickColumn(row, columns, options.splitColumn || "split", ["phase", "subset"]) || inferSplitFromPath(file.path);
            increment(classDistribution, classValue);
            increment(splitDistribution, splitValue);
            splitClassDistribution[splitValue] ||= {};
            increment(splitClassDistribution[splitValue], classValue);
            const filePath = pickColumn(row, columns, options.filePathColumn || "file", ["path", "image_path", "filepath", "filename"]);
            if (filePath) {
                checkedFileRefs += 1;
                if (existing.size && !existing.has(normalizePath(filePath)))
                    missingFileRefs.push(filePath);
            }
            for (const column of required) {
                const actual = findColumn(columns, column);
                if (actual && !String(row[actual] || "").trim())
                    missingFields.push({ file: file.path, column, rows: 1 });
            }
        }
    }
    const cases = allRows.map((row, index) => {
        const columns = Object.keys(row);
        const split = pickColumn(row, columns, options.splitColumn || "split", ["phase", "subset"]) || inferSplitFromPath(row.__file);
        const caseId = pickColumn(row, columns, options.caseIdColumn || "case_id", ["caseId", "id", "sample_id", "image_id"]) || `${row.__file}:${index}`;
        const patientId = pickColumn(row, columns, options.patientIdColumn || "patient_id", ["patientId", "subject_id", "pid"]) || undefined;
        const label = pickColumn(row, columns, options.classColumn || "class", ["label", "class_name", "target", "category"]);
        return {
            schemaVersion: 1,
            caseResultId: `dataset:${caseId}:${index}`,
            experimentId: "dataset_inspector",
            resultId: "dataset_profile",
            caseId,
            patientId,
            dataset: pickColumn(row, columns, "dataset", ["dataset_id", "source"]) || "dataset",
            split,
            method: "dataset",
            label,
            metrics: {},
            parsedAt: now.toISOString(),
        };
    });
    const leakage = (0, Quality_1.runDataLeakageCheck)(cases);
    const profile = {
        schemaVersion: 1,
        generatedAt: now.toISOString(),
        files: fileReports,
        totalRows: allRows.length,
        classDistribution,
        splitDistribution,
        splitClassDistribution,
        missingFields,
        fileExistence: { checked: checkedFileRefs, missing: unique(missingFileRefs) },
        leakage,
        outputFiles: { profileJson: exports.DATASET_PROFILE_JSON_PATH, profileMarkdown: exports.DATASET_PROFILE_MARKDOWN_PATH, leakageReportCsv: exports.DATASET_LEAKAGE_REPORT_CSV_PATH },
    };
    return { profile, markdown: datasetProfileMarkdown(profile), leakageCsv: datasetLeakageCsv(profile) };
}
function datasetProfileMarkdown(profile) {
    return [
        "# Dataset Inspector",
        "",
        `生成时间：${profile.generatedAt}`,
        `样本数：${profile.totalRows}`,
        `泄漏状态：${profile.leakage.status}`,
        "",
        "## Split 分布",
        ...Object.entries(profile.splitDistribution).map(([key, value]) => `- ${key}: ${value}`),
        "",
        "## Class 分布",
        ...Object.entries(profile.classDistribution).map(([key, value]) => `- ${key}: ${value}`),
        "",
        "## 缺失字段",
        ...(profile.missingFields.length ? profile.missingFields.slice(0, 80).map((item) => `- ${item.file}: ${item.column} (${item.rows})`) : ["- 无"]),
        "",
        "## 文件存在性",
        `检查引用：${profile.fileExistence.checked}，缺失：${profile.fileExistence.missing.length}`,
        ...profile.fileExistence.missing.slice(0, 80).map((item) => `- ${item}`),
    ].join("\n");
}
function datasetLeakageCsv(profile) {
    const rows = [["severity", "type", "message", "affectedIds"]];
    for (const issue of profile.leakage.issues)
        rows.push([issue.severity, issue.type, issue.message, (issue.affectedIds || []).join(";")]);
    return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}
function csvDictRows(text) {
    const rows = text.trim().split(/\r?\n/).filter(Boolean).map(parseCsvLine);
    const headers = rows[0] || [];
    return rows.slice(1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] || ""])));
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
function findColumn(columns, requested) {
    const lower = requested.toLowerCase();
    return columns.find((column) => column === requested) || columns.find((column) => column.toLowerCase() === lower);
}
function pickColumn(row, columns, primary, aliases) {
    const found = [primary, ...aliases].map((column) => findColumn(columns, column)).find(Boolean);
    return found ? String(row[found] || "").trim() : "";
}
function inferSplitFromPath(path) {
    const text = path.toLowerCase();
    if (text.includes("train"))
        return "train";
    if (text.includes("val") || text.includes("valid"))
        return "val";
    if (text.includes("test"))
        return "test";
    return "unknown";
}
function increment(target, key) {
    target[key] = (target[key] || 0) + 1;
}
function normalizePath(value) {
    return String(value || "").replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase();
}
function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
}
function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
