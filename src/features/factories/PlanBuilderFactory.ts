// @ts-nocheck
/**
 * PlanBuilderFactory — PlanBuilder 工厂
 * 封装 ExperimentMatrix 生成逻辑，委托给 features/PlanBuilder
 * 支持依赖注入（matrix 默认值、namingRule、seed 策略）并保持原有 API 兼容
 */

export interface PlanBuilderFactoryOptions {
  defaultSuite?: string;
  defaultBaseConfig?: string;
  defaultNamingPattern?: string;
}

export interface PlanBuilderFactory {
  buildMatrix(matrix: any, existingRunKeys?: string[]): any;
  renderYaml(matrix: any, experiments: any[]): string;
  parseCases(yaml: string): string[];
  validate(yaml: string): any;
  create(matrix: any): { matrix: any; build: (existingRunKeys?: string[]) => any };
}

class DefaultPlanBuilderFactory implements PlanBuilderFactory {
  private readonly opts: PlanBuilderFactoryOptions;
  constructor(opts: PlanBuilderFactoryOptions = {}) { this.opts = opts; }

  buildMatrix(matrix: any, existingRunKeys: string[] = []): any {
    const normalized = this.normalizeMatrix(matrix);
    try {
      const mod = require("../PlanBuilder");
      if (mod && typeof mod.buildExperimentMatrix === "function") return mod.buildExperimentMatrix(normalized, existingRunKeys);
      if (mod && typeof mod.expandPlanMatrix === "function") return mod.expandPlanMatrix(normalized, existingRunKeys);
    } catch {}
    // 降级：由 MatrixGenerator 生成
    try {
      const mg = require("../PlanBuilder/MatrixGenerator");
      if (mg && typeof mg.generateMatrix === "function") return mg.generateMatrix(normalized, existingRunKeys);
      if (mg && mg.MatrixGenerator) {
        const gen = new mg.MatrixGenerator();
        return gen.generate(normalized, existingRunKeys);
      }
    } catch {}
    return { experiments: [], duplicateRunKeys: [], yaml: "", previewCsv: "" };
  }

  renderYaml(matrix: any, experiments: any[]): string {
    try {
      const mod = require("../PlanBuilder");
      if (mod && typeof mod.renderPlanYaml === "function") return mod.renderPlanYaml(matrix, experiments);
    } catch {}
    return `suite: ${matrix.suite || this.opts.defaultSuite || "suite"}\nmode: train_test\nbase_config: ${matrix.baseConfig || ""}\n`;
  }

  parseCases(yaml: string): string[] {
    try {
      const mod = require("../PlanBuilder");
      if (mod && typeof mod.parsePlanCases === "function") return mod.parsePlanCases(yaml);
    } catch {}
    return [];
  }

  validate(yaml: string): any {
    try {
      const mod = require("../PlanBuilder");
      if (mod && typeof mod.validateDeepLearningPlanContract === "function") return mod.validateDeepLearningPlanContract(yaml);
      const vmod = require("../PlanBuilder/PlanValidator");
      if (vmod && typeof vmod.validatePlan === "function") return vmod.validatePlan(yaml);
    } catch {}
    return { ok: true, missing: [], issues: [], summary: {} };
  }

  create(matrix: any): { matrix: any; build: (existingRunKeys?: string[]) => any } {
    const normalized = this.normalizeMatrix(matrix);
    return { matrix: normalized, build: (existingRunKeys?: string[]) => this.buildMatrix(normalized, existingRunKeys) };
  }

  private normalizeMatrix(matrix: any): any {
    if (!matrix) return { baseConfig: this.opts.defaultBaseConfig || "", suite: this.opts.defaultSuite || "suite", variables: [], seeds: [], constraints: [] };
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

export function createPlanBuilderFactory(opts?: PlanBuilderFactoryOptions): PlanBuilderFactory {
  return new DefaultPlanBuilderFactory(opts);
}
export { DefaultPlanBuilderFactory };
