"use strict";
/**
 * PlanBuilderFactory — PlanBuilder 工厂
 * 封装 ExperimentMatrix 生成逻辑，委托给 features/PlanBuilder
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultPlanBuilderFactory = void 0;
exports.createPlanBuilderFactory = createPlanBuilderFactory;
function tryRequire(id) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require(id);
    }
    catch {
        return undefined;
    }
}
class DefaultPlanBuilderFactory {
    opts;
    constructor(opts = {}) { this.opts = opts; }
    buildMatrix(matrix, existingRunKeys = []) {
        const normalized = this.normalizeMatrix(matrix);
        const mod = tryRequire("../PlanBuilder");
        if (mod?.buildExperimentMatrix)
            return mod.buildExperimentMatrix(normalized, existingRunKeys);
        if (mod?.expandPlanMatrix)
            return mod.expandPlanMatrix(normalized, existingRunKeys);
        const mg = tryRequire("../PlanBuilder/MatrixGenerator");
        if (mg?.generateMatrix)
            return mg.generateMatrix(normalized, existingRunKeys);
        if (mg?.MatrixGenerator) {
            const gen = new mg.MatrixGenerator();
            return gen.generate(normalized, existingRunKeys);
        }
        return { experiments: [], duplicateRunKeys: [], yaml: "", previewCsv: "" };
    }
    renderYaml(matrix, experiments) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.renderPlanYaml)
            return mod.renderPlanYaml(matrix, experiments);
        const rec = matrix;
        return `suite: ${String(rec["suite"] ?? this.opts.defaultSuite ?? "suite")}\nmode: train_test\nbase_config: ${String(rec["baseConfig"] ?? "")}\n`;
    }
    parseCases(yaml) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.parsePlanCases)
            return mod.parsePlanCases(yaml);
        return [];
    }
    validate(yaml) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.validateDeepLearningPlanContract)
            return mod.validateDeepLearningPlanContract(yaml);
        const vmod = tryRequire("../PlanBuilder/PlanValidator");
        if (vmod?.validatePlan)
            return vmod.validatePlan(yaml);
        return { ok: true, missing: [], issues: [], summary: {} };
    }
    create(matrix) {
        const normalized = this.normalizeMatrix(matrix);
        return { matrix: normalized, build: (existingRunKeys) => this.buildMatrix(normalized, existingRunKeys) };
    }
    normalizeMatrix(matrix) {
        if (!matrix)
            return { baseConfig: this.opts.defaultBaseConfig ?? "", suite: this.opts.defaultSuite ?? "suite", variables: [], seeds: [], constraints: [] };
        return {
            baseConfig: matrix["baseConfig"] ?? this.opts.defaultBaseConfig ?? "",
            suite: matrix["suite"] ?? this.opts.defaultSuite ?? "suite",
            variables: Array.isArray(matrix["variables"]) ? matrix["variables"] : [],
            seeds: Array.isArray(matrix["seeds"]) ? matrix["seeds"] : [],
            constraints: Array.isArray(matrix["constraints"]) ? matrix["constraints"] : [],
            namingRule: matrix["namingRule"] ?? (this.opts.defaultNamingPattern ? { pattern: this.opts.defaultNamingPattern } : undefined),
        };
    }
}
exports.DefaultPlanBuilderFactory = DefaultPlanBuilderFactory;
function createPlanBuilderFactory(opts) {
    return new DefaultPlanBuilderFactory(opts);
}
