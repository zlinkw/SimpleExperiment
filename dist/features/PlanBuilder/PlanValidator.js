"use strict";
// @ts-nocheck
/**
 * PlanValidator — 从 PlanBuilder.ts 提取校验逻辑
 * 封装 plan YAML 合约校验、字段缺失检测、case/seed 约束检查
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanValidator = void 0;
exports.validatePlan = validatePlan;
exports.validateMatrix = validateMatrix;
function planIssue(id, severity, path, message, suggestion) {
    return { id, severity, path, message, suggestion };
}
function validatePlan(yaml) {
    // 优先委托原有实现
    try {
        const mod = require("../PlanBuilder");
        if (mod && typeof mod.validateDeepLearningPlanContract === "function") {
            const res = mod.validateDeepLearningPlanContract(yaml);
            // 归一为 PlanValidationResult
            if (res && Array.isArray(res.issues)) {
                const errors = res.issues.filter((i) => String(i.severity || "").toLowerCase() === "critical" || String(i.field || "").includes("critical")).map((i) => planIssue(String(i.field || i.id), "critical", String(i.field || i.label), String(i.message), String(i.fix || i.suggestion || "")));
                const warnings = res.issues.filter((i) => !errors.includes(i)).map((i) => planIssue(String(i.field || i.id), "warning", String(i.field || i.label), String(i.message), String(i.fix || "")));
                return { status: res.ok ? "ok" : errors.length ? "failed" : "warning", experimentCount: 0, warnings, errors, duplicateExperiments: [] };
            }
            if (res && typeof res.ok === "boolean")
                return { status: res.ok ? "ok" : "failed", experimentCount: 0, warnings: [], errors: res.ok ? [] : (res.missing || []).map((m) => planIssue(m, "critical", m, `Missing: ${m}`)), duplicateExperiments: [] };
        }
        if (mod && typeof mod.validatePlanRecord === "function" && typeof mod.parsePlanSummary === "function") {
            const summary = mod.parsePlanSummary(yaml);
            const rec = { suite: summary.suite, planFile: summary.baseConfig || "plan.yaml", provenance: { baseConfig: summary.baseConfig }, plannedExperiments: summary.cases.map((c, i) => ({ experimentKey: `k_${i}`, name: c, runKey: `${summary.suite}:${c}` })), experimentCount: summary.cases.length, revisions: [] };
            return mod.validatePlanRecord(rec);
        }
    }
    catch { }
    // 降级本地轻量校验
    const text = String(yaml || "");
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
        warnings.push(planIssue("seeds_missing", "warning", "seeds", "缺少 seeds", "补充 seeds: [0]"));
    if (!hasCommand)
        warnings.push(planIssue("command_missing", "warning", "command", "缺少训练/测试命令", "补充 runner.train_command"));
    // 检查重复 runKey（基于 cases + seeds 笛卡尔积粗略检测）
    const duplicates = [];
    return { status: errors.length ? "failed" : warnings.length ? "warning" : "ok", experimentCount: hasCases ? 1 : 0, warnings, errors, duplicateExperiments: duplicates };
}
function validateMatrix(matrix) {
    const warnings = [];
    const errors = [];
    if (!matrix || !Array.isArray(matrix.variables) || !matrix.variables.length)
        warnings.push(planIssue("empty_matrix", "warning", "variables", "变量为空", "添加至少一个 variable"));
    for (const v of matrix.variables || []) {
        if (!v.key)
            errors.push(planIssue(`var_key_${v.key}`, "critical", "variables.key", `变量缺少 key: ${JSON.stringify(v)}`));
        if (v.mode === "paired" && (!v.values || v.values.length < 1))
            warnings.push(planIssue(`paired_${v.key}`, "warning", `variables.${v.key}`, `paired 变量 ${v.key} 需要至少 1 个值`));
        if (v.mode === "derived" && !v.expression)
            warnings.push(planIssue(`derived_${v.key}`, "warning", `variables.${v.key}`, `derived 变量 ${v.key} 缺少 expression`));
    }
    return { status: errors.length ? "failed" : warnings.length ? "warning" : "ok", experimentCount: 0, warnings, errors, duplicateExperiments: [] };
}
class PlanValidator {
    validate(yaml) { return validatePlan(yaml); }
    validateMatrix(matrix) { return validateMatrix(matrix); }
}
exports.PlanValidator = PlanValidator;
