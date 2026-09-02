"use strict";
/**
 * MatrixGenerator — 从 PlanBuilder.ts 提取矩阵生成逻辑
 * 支持 grid / paired / fixed / derived / conditional 五种模式
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatrixGenerator = void 0;
exports.generateMatrix = generateMatrix;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function sortObject(obj) {
    return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}
function sanitizeName(name) {
    return String(name).replace(/[^A-Za-z0-9_.-]/g, "_").replace(/_+/g, "_").slice(0, 120);
}
function experimentName(suite, row) {
    const parts = Object.entries(sortObject(row)).map(([k, v]) => `${k}_${v}`);
    return `${suite}__${parts.join("__") || "baseline"}`;
}
function renderNamingRule(pattern, suite, row) {
    if (!pattern)
        return "";
    let out = pattern.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, k) => String(row[k] ?? suite ?? ""));
    out = out.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, k) => String(row[k] ?? suite ?? ""));
    return out;
}
function sha256(text) {
    const c = tryRequire("crypto");
    if (c)
        return c.createHash("sha256").update(text).digest("hex");
    let h = 0;
    for (let i = 0; i < text.length; i++)
        h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(16, "0");
}
function matrixPreviewCsv(experiments) {
    const headers = ["experimentIndex", "name", "runKey", "configOverrides"];
    const rows = experiments.map((e) => [e["experimentIndex"], e["name"], e["runKey"], JSON.stringify(e["configOverrides"])].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
}
function varToLegacy(v) { return { key: v.key, name: v.key, values: v.values, mode: v.mode, expression: v.expression, when: v.when }; }
function evaluateValueExpression(expr, row) {
    if (!expr)
        return "";
    const mod = tryRequire("../PlanBuilder");
    if (mod?.evaluateValueExpression)
        return mod.evaluateValueExpression(expr, row);
    try {
        const fn = new Function(...Object.keys(row), `return (${expr});`);
        return fn(...Object.values(row));
    }
    catch {
        return expr;
    }
}
function evaluateCondition(when, row) {
    const mod = tryRequire("../PlanBuilder");
    if (mod?.evaluateCondition)
        return Boolean(mod.evaluateCondition(when, row));
    try {
        const fn = new Function(...Object.keys(row), `return Boolean(${when});`);
        return Boolean(fn(...Object.values(row)));
    }
    catch {
        return false;
    }
}
function evaluateConstraint(expr, row) {
    const mod = tryRequire("../PlanBuilder");
    if (mod?.evaluateConstraint)
        return Boolean(mod.evaluateConstraint(expr, row));
    if (!expr)
        return true;
    try {
        const fn = new Function(...Object.keys(row), `return Boolean(${expr});`);
        return Boolean(fn(...Object.values(row)));
    }
    catch {
        return false;
    }
}
function gridCombinations(variables) {
    let rows = [{}];
    for (const variable of variables) {
        const next = [];
        for (const row of rows)
            for (const value of (variable["values"] ?? []))
                next.push({ ...row, [String(variable["key"] ?? variable["name"])]: value });
        rows = next.length ? next : rows;
    }
    return rows;
}
function pairedCombinations(variables) {
    if (!variables.length)
        return [{}];
    const len = Math.max(...variables.map((v) => (v["values"] ?? []).length));
    const rows = [];
    for (let i = 0; i < len; i++) {
        const row = {};
        for (const v of variables)
            row[String(v["key"] ?? v["name"])] = (v["values"] ?? [])[i % ((v["values"] ?? []).length)];
        rows.push(row);
    }
    return rows;
}
function generateMatrix(matrix, existingRunKeys = [], suite = "suite") {
    const mod = tryRequire("../PlanBuilder");
    if (mod?.expandPlanMatrix)
        return mod.expandPlanMatrix(matrix, existingRunKeys, suite);
    const errors = [];
    const existingRunKeySet = existingRunKeys instanceof Set ? existingRunKeys : new Set(existingRunKeys);
    const generatedRunKeys = new Set();
    const paired = matrix.variables.filter((item) => item.mode === "paired");
    const fixed = matrix.variables.filter((item) => item.mode === "fixed");
    const grid = matrix.variables.filter((item) => item.mode === "grid");
    const derived = matrix.variables.filter((item) => item.mode === "derived");
    const conditional = matrix.variables.filter((item) => item.mode === "conditional");
    const pairedRows = paired.length ? pairedCombinations(paired.map(varToLegacy)) : [{}];
    const gridRows = gridCombinations(grid.map(varToLegacy));
    const fixedRow = Object.fromEntries(fixed.map((item) => [item.key, item.values?.[0] ?? ""]));
    const experiments = [];
    const duplicateRunKeys = [];
    let filteredCount = 0;
    let index = 0;
    for (const pairedRow of pairedRows) {
        for (const gridRow of gridRows) {
            let row = { ...fixedRow, ...gridRow, ...pairedRow };
            for (const item of derived)
                row[item.key] = evaluateValueExpression(item.expression ?? "", row);
            for (const item of conditional)
                if (!item.when || evaluateCondition(item.when, row))
                    row[item.key] = item.expression ? evaluateValueExpression(item.expression, row) : item.values?.[0];
            let failed;
            try {
                failed = (matrix.constraints ?? []).find((c) => !evaluateConstraint(c.expression, row));
            }
            catch (e) {
                errors.push(e instanceof Error ? e.message : String(e));
                failed = { id: "expression_error" };
            }
            if (failed) {
                filteredCount++;
                continue;
            }
            const name = renderNamingRule(matrix.namingRule?.pattern, suite, row) || experimentName(suite, row);
            const safeName = matrix.namingRule?.sanitize === false ? name : sanitizeName(name);
            const runKey = `${suite}:${safeName}`;
            const experimentKey = sha256(`${suite}:${JSON.stringify(sortObject(row))}`).slice(0, 16);
            if (existingRunKeySet.has(runKey) || generatedRunKeys.has(runKey))
                duplicateRunKeys.push(runKey);
            generatedRunKeys.add(runKey);
            experiments.push({ experimentIndex: index++, name: safeName, runKey, experimentKey, configOverrides: row, commandPreview: Object.entries(row).map(([k, v]) => `${k}=${String(v)}`).join(" ") });
        }
    }
    return { experiments, duplicateRunKeys: Array.from(new Set(duplicateRunKeys)), filteredCount, errors, yaml: "", previewCsv: matrixPreviewCsv(experiments) };
}
class MatrixGenerator {
    generate(matrix, existingRunKeys = [], suite = "suite") { return generateMatrix(matrix, existingRunKeys, suite); }
    gridCombinations(variables) { return gridCombinations(variables); }
    pairedCombinations(variables) { return pairedCombinations(variables); }
}
exports.MatrixGenerator = MatrixGenerator;
