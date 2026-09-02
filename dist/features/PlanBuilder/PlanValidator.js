"use strict";
/**
 * PlanValidator — 从 PlanBuilder.ts 提取校验逻辑
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanValidator = void 0;
exports.validatePlan = validatePlan;
exports.validateMatrix = validateMatrix;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
function planIssue(id, severity, path, message, suggestion) {
    return { id, severity, path, message, suggestion };
}
function validatePlan(yaml) {
    const mod = tryRequire("../PlanBuilder");
    if (mod?.validateDeepLearningPlanContract) {
        try {
            const res = mod.validateDeepLearningPlanContract(yaml);
            if (res && Array.isArray(res.issues)) {
                const issues = res.issues;
                const isCritical = (i) => String(i["severity"] ?? "").toLowerCase() === "critical" || String(i["field"] ?? "").includes("critical");
                const errors = issues.filter(isCritical).map((i) => planIssue(String(i["field"] ?? i["id"] ?? ""), "critical", String(i["field"] ?? i["label"] ?? ""), String(i["message"] ?? ""), String(i["fix"] ?? i["suggestion"] ?? "")));
                const warnings = issues.filter((i) => !isCritical(i)).map((i) => planIssue(String(i["field"] ?? i["id"] ?? ""), "warning", String(i["field"] ?? i["label"] ?? ""), String(i["message"] ?? ""), String(i["fix"] ?? "")));
                return { status: res.ok ? "ok" : errors.length ? "failed" : "warning", experimentCount: 0, warnings, errors, duplicateExperiments: [] };
            }
            if (res && typeof res.ok === "boolean")
                return { status: res.ok ? "ok" : "failed", experimentCount: 0, warnings: [], errors: res.ok ? [] : (res.missing ?? []).map((m) => planIssue(m, "critical", m, `Missing: ${m}`)), duplicateExperiments: [] };
        }
        catch { /* fallback */ }
    }
    if (mod?.validatePlanRecord && mod?.parsePlanSummary) {
        try {
            const summary = mod.parsePlanSummary(yaml);
            const rec = { suite: summary.suite, planFile: summary.baseConfig ?? "plan.yaml", provenance: { baseConfig: summary.baseConfig }, plannedExperiments: summary.cases.map((c, i) => ({ experimentKey: `k_${i}`, name: c, runKey: `${summary.suite}:${c}` })), experimentCount: summary.cases.length, revisions: [] };
            return mod.validatePlanRecord(rec);
        }
        catch { /* fallback */ }
    }
    const text = String(yaml ?? "");
    const hasSuite = /^\s*suite\s*:/m.test(text);
    const hasBase = /^\s*(base_config|config)\s*:/m.test(text);
    const hasCases = /^\s*(cases|experiments)\s*:/m.test(text) || /^\s*case\s*:/m.test(text);
    const hasSeeds = /^\s*seeds\s*:/m.test(text);
    const hasCommand = /(train_command|test_command|command)\s*:/m.test(text);
    const warnings = [];
    const errors = [];
    if (!hasSuite)
        errors.push(planIssue("suite_missing", "critical", "suite", "缺少 suite 字段", "补充 suite: <name>"));
    if (!hasBase)
        warnings.push(planIssue("base_config_missing", "warning", "base_config", "缺少 base_config", "补充 base_config 或 config"));
    if (!hasCases)
        warnings.push(planIssue("cases_missing", "warning", "cases", "缺少 cases/experiments", "补充 cases 列表"));
    if (!hasSeeds)
        warnings.push(planIssue("seeds_missing", "warning", "seeds", "缺少 seeds: [0]"));
    if (!hasCommand)
        warnings.push(planIssue("command_missing", "warning", "command", "缺少训练/测试命令", "补充 runner.train_command"));
    return { status: errors.length ? "failed" : warnings.length ? "warning" : "ok", experimentCount: hasCases ? 1 : 0, warnings, errors, duplicateExperiments: [] };
}
function validateMatrix(matrix) {
    const warnings = [];
    const errors = [];
    const variables = matrix?.["variables"] ?? [];
    if (!matrix || !Array.isArray(variables) || !variables.length)
        warnings.push(planIssue("empty_matrix", "warning", "variables", "变量为空", "添加至少一个 variable"));
    for (const v of variables) {
        if (!v["key"])
            errors.push(planIssue(`var_key_${String(v["key"])}`, "critical", "variables.key", `变量缺少 key: ${JSON.stringify(v)}`));
        if (v["mode"] === "paired" && (!v["values"] || v["values"].length < 1))
            warnings.push(planIssue(`paired_${String(v["key"])}`, "warning", `variables.${String(v["key"])}`, `paired 变量 ${String(v["key"])} 需要至少 1 个值`));
        if (v["mode"] === "derived" && !v["expression"])
            warnings.push(planIssue(`derived_${String(v["key"])}`, "warning", `variables.${String(v["key"])}`, `derived 变量 ${String(v["key"])} 缺少 expression`));
    }
    return { status: errors.length ? "failed" : warnings.length ? "warning" : "ok", experimentCount: 0, warnings, errors, duplicateExperiments: [] };
}
class PlanValidator {
    validate(yaml) { return validatePlan(yaml); }
    validateMatrix(matrix) { return validateMatrix(matrix); }
}
exports.PlanValidator = PlanValidator;
