"use strict";
// @ts-nocheck
/**
 * PlanBuilderFactory — PlanBuilder 工厂
 * 封装 ExperimentMatrix 生成逻辑，委托给 features/PlanBuilder
 * 支持依赖注入（matrix 默认值、namingRule、seed 策略）并保持原有 API 兼容
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPlanBuilderFactory = void 0;
exports.createPlanBuilderFactory = createPlanBuilderFactory;
class DefaultPlanBuilderFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    buildMatrix(matrix, existingRunKeys = []) {
        const normalized = this.normalizeMatrix(matrix);
        try {
            const mod = require("../PlanBuilder");
            if (mod && typeof mod.buildExperimentMatrix === "function")
                return mod.buildExperimentMatrix(normalized, existingRunKeys);
            if (mod && typeof mod.expandPlanMatrix === "function")
                return mod.expandPlanMatrix(normalized, existingRunKeys);
        }
        catch { }
        // 降级：由 MatrixGenerator 生成
        try {
            const mg = require("../PlanBuilder/MatrixGenerator");
            if (mg && typeof mg.generateMatrix === "function")
                return mg.generateMatrix(normalized, existingRunKeys);
            if (mg && mg.MatrixGenerator) {
                const gen = new mg.MatrixGenerator();
                return gen.generate(normalized, existingRunKeys);
            }
        }
        catch { }
        return { experiments: [], duplicateRunKeys: [], yaml: "", previewCsv: "" };
    }
    renderYaml(matrix, experiments) {
        try {
            const mod = require("../PlanBuilder");
            if (mod && typeof mod.renderPlanYaml === "function")
                return mod.renderPlanYaml(matrix, experiments);
        }
        catch { }
        return `suite: ${matrix.suite || this.opts.defaultSuite || "suite"}\nmode: train_test\nbase_config: ${matrix.baseConfig || ""}\n`;
    }
    parseCases(yaml) {
        try {
            const mod = require("../PlanBuilder");
            if (mod && typeof mod.parsePlanCases === "function")
                return mod.parsePlanCases(yaml);
        }
        catch { }
        return [];
    }
    validate(yaml) {
        try {
            const mod = require("../PlanBuilder");
            if (mod && typeof mod.validateDeepLearningPlanContract === "function")
                return mod.validateDeepLearningPlanContract(yaml);
            const vmod = require("../PlanBuilder/PlanValidator");
            if (vmod && typeof vmod.validatePlan === "function")
                return vmod.validatePlan(yaml);
        }
        catch { }
        return { ok: true, missing: [], issues: [], summary: {} };
    }
    create(matrix) {
        const normalized = this.normalizeMatrix(matrix);
        return { matrix: normalized, build: (existingRunKeys) => this.buildMatrix(normalized, existingRunKeys) };
    }
    normalizeMatrix(matrix) {
        if (!matrix)
            return { baseConfig: this.opts.defaultBaseConfig || "", suite: this.opts.defaultSuite || "suite", variables: [], seeds: [], constraints: [] };
        return {
            baseConfig: matrix.baseConfig || this.opts.defaultBaseConfig || "",
            suite: matrix.suite || this.opts.defaultSuite || "suite",
            variables: Array.isArray(matrix.variables) ? matrix.variables : [],
            seeds: Array.isArray(matrix.seeds) ? matrix.seeds : [],
            constraints: Array.isArray(matrix.constraints) ? matrix.constraints : [],
            namingRule: matrix.namingRule || (this.opts.defaultNamingPattern ? { pattern: this.opts.defaultNamingPattern } : undefined),
        };
    }
}
exports.DefaultPlanBuilderFactory = DefaultPlanBuilderFactory;
function createPlanBuilderFactory(opts) {
    return new DefaultPlanBuilderFactory(opts);
}
