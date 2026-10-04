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
        throw new Error("PlanBuilder 矩阵实现不可用，拒绝返回空构建结果。");
    }
    renderYaml(matrix, experiments) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.renderPlanYaml)
            return mod.renderPlanYaml(matrix, experiments);
        throw new Error("PlanBuilder YAML 渲染实现不可用。");
    }
    parseCases(yaml) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.parsePlanCases)
            return mod.parsePlanCases(yaml);
        throw new Error("PlanBuilder case 解析实现不可用。");
    }
    validate(yaml) {
        const mod = tryRequire("../PlanBuilder");
        if (mod?.validateDeepLearningPlanContract)
            return mod.validateDeepLearningPlanContract(yaml);
        const vmod = tryRequire("../PlanBuilder/PlanValidator");
        if (vmod?.validatePlan)
            return vmod.validatePlan(yaml);
        throw new Error("Plan 校验实现不可用，拒绝把未校验 Plan 标记为通过。");
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
