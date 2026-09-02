// @ts-nocheck
/**
 * MatrixGenerator — 从 PlanBuilder.ts 提取矩阵生成逻辑
 * 支持 grid / paired / fixed / derived / conditional 五种模式
 * 复制 expandPlanMatrix 核心实现，保持与原 API 兼容
 */

export interface MatrixVariable {
  key: string; mode: "grid" | "paired" | "fixed" | "derived" | "conditional"; values?: unknown[]; expression?: string; when?: string;
}
export interface PlanMatrix {
  variables: MatrixVariable[];
  constraints?: Array<{ id: string; expression: string; message: string }>;
  namingRule?: { pattern: string; sanitize?: boolean };
}

function sortObject(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)));
}
function sanitizeName(name: string): string {
  return String(name).replace(/[^A-Za-z0-9_.-]/g, "_").replace(/_+/g, "_").slice(0, 120);
}
function experimentName(suite: string, row: Record<string, unknown>): string {
  const parts = Object.entries(sortObject(row)).map(([k, v]) => `${k}_${v}`);
  return `${suite}__${parts.join("__") || "baseline"}`;
}
function renderNamingRule(pattern: string | undefined, suite: string, row: Record<string, unknown>): string {
  if (!pattern) return "";
  let out = pattern.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_, k) => String((row as any)[k] ?? suite ?? ""));
  out = out.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, k) => String((row as any)[k] ?? suite ?? ""));
  return out;
}
function sha256(text: string): string {
  try { const c = require("crypto"); return c.createHash("sha256").update(text).digest("hex"); } catch { let h = 0; for (let i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))>>>0; return h.toString(16).padStart(16,"0"); }
}
function matrixPreviewCsv(experiments: any[]): string {
  const headers = ["experimentIndex","name","runKey","configOverrides"];
  const rows = experiments.map((e) => [e.experimentIndex, e.name, e.runKey, JSON.stringify(e.configOverrides)].map((v) => `"${String(v).replace(/"/g,'""')}"`).join(","));
  return [headers.join(","), ...rows].join("\n");
}
function varToLegacy(v: MatrixVariable): any { return { key: v.key, name: v.key, values: v.values, mode: v.mode, expression: v.expression, when: v.when }; }
function evaluateValueExpression(expr: string, row: Record<string, unknown>): unknown {
  if (!expr) return "";
  try {
    // 仅支持简单表达式：row 变量 + 算术 + 三元，委托原实现
    const mod = require("../PlanBuilder");
    if (mod && typeof mod.evaluateValueExpression === "function") return mod.evaluateValueExpression(expr, row);
  } catch {}
  // 降级：尝试用 Function 轻量求值（受控环境）
  try { const fn = new Function(...Object.keys(row), `return (${expr});`); return fn(...Object.values(row)); } catch { return expr; }
}
function evaluateCondition(when: string, row: Record<string, unknown>): boolean {
  try { const mod = require("../PlanBuilder"); if (mod && typeof mod.evaluateCondition === "function") return Boolean(mod.evaluateCondition(when, row)); } catch {}
  try { const fn = new Function(...Object.keys(row), `return Boolean(${when});`); return Boolean(fn(...Object.values(row))); } catch { return false; }
}
function evaluateConstraint(expr: string, row: Record<string, unknown>): boolean {
  try { const mod = require("../PlanBuilder"); if (mod && typeof mod.evaluateConstraint === "function") return mod.evaluateConstraint(expr, row); } catch {}
  if (!expr) return true;
  try { const fn = new Function(...Object.keys(row), `return Boolean(${expr});`); return Boolean(fn(...Object.values(row))); } catch { return false; }
}
function gridCombinations(variables: any[]): Record<string, unknown>[] {
  let rows: Record<string, unknown>[] = [{}];
  for (const variable of variables) {
    const next: Record<string, unknown>[] = [];
    for (const row of rows) for (const value of variable.values || []) next.push({ ...row, [variable.key || variable.name]: value });
    rows = next.length ? next : rows;
  }
  return rows;
}
function pairedCombinations(variables: any[]): Record<string, unknown>[] {
  if (!variables.length) return [{}];
  const len = Math.max(...variables.map((v) => (v.values || []).length));
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < len; i++) {
    const row: Record<string, unknown> = {};
    for (const v of variables) row[v.key || v.name] = (v.values || [])[i % (v.values || []).length];
    rows.push(row);
  }
  return rows;
}

export function generateMatrix(matrix: PlanMatrix, existingRunKeys: Iterable<string> | string[] = [], suite = "suite"): any {
  // 优先委托原 expandPlanMatrix，保持行为一致
  try {
    const mod = require("../PlanBuilder");
    if (mod && typeof mod.expandPlanMatrix === "function") return mod.expandPlanMatrix(matrix, existingRunKeys, suite);
  } catch {}
  const errors: string[] = [];
  const existingRunKeySet = existingRunKeys instanceof Set ? existingRunKeys : new Set(existingRunKeys as string[]);
  const generatedRunKeys = new Set<string>();
  const paired = matrix.variables.filter((item) => item.mode === "paired");
  const fixed = matrix.variables.filter((item) => item.mode === "fixed");
  const grid = matrix.variables.filter((item) => item.mode === "grid");
  const derived = matrix.variables.filter((item) => item.mode === "derived");
  const conditional = matrix.variables.filter((item) => item.mode === "conditional");
  const pairedRows = paired.length ? pairedCombinations(paired.map(varToLegacy)) : [{}];
  const gridRows = gridCombinations(grid.map(varToLegacy));
  const fixedRow = Object.fromEntries(fixed.map((item) => [item.key, item.values?.[0] ?? ""]));
  const experiments: any[] = [];
  const duplicateRunKeys: string[] = [];
  let filteredCount = 0;
  let index = 0;
  for (const pairedRow of pairedRows) {
    for (const gridRow of gridRows) {
      let row: Record<string, unknown> = { ...fixedRow, ...gridRow, ...pairedRow };
      for (const item of derived) row[item.key] = evaluateValueExpression(item.expression || "", row);
      for (const item of conditional) if (!item.when || evaluateCondition(item.when, row)) row[item.key] = item.expression ? evaluateValueExpression(item.expression, row) : item.values?.[0];
      let failed: any;
      try { failed = (matrix.constraints || []).find((c) => !evaluateConstraint(c.expression, row)); } catch (e) { errors.push(e instanceof Error ? e.message : String(e)); failed = { id: "expression_error" }; }
      if (failed) { filteredCount++; continue; }
      const name = renderNamingRule(matrix.namingRule?.pattern, suite, row) || experimentName(suite, row);
      const safeName = matrix.namingRule?.sanitize === false ? name : sanitizeName(name);
      const runKey = `${suite}:${safeName}`;
      const experimentKey = sha256(`${suite}:${JSON.stringify(sortObject(row))}`).slice(0, 16);
      if (existingRunKeySet.has(runKey) || generatedRunKeys.has(runKey)) duplicateRunKeys.push(runKey);
      generatedRunKeys.add(runKey);
      experiments.push({ experimentIndex: index++, name: safeName, runKey, experimentKey, configOverrides: row, commandPreview: Object.entries(row).map(([k, v]) => `${k}=${v}`).join(" ") });
    }
  }
  return { experiments, duplicateRunKeys: Array.from(new Set(duplicateRunKeys)), filteredCount, errors, yaml: "", previewCsv: matrixPreviewCsv(experiments) };
}

export class MatrixGenerator {
  generate(matrix: PlanMatrix, existingRunKeys: Iterable<string> | string[] = [], suite = "suite"): any { return generateMatrix(matrix, existingRunKeys, suite); }
  gridCombinations(variables: any[]): Record<string, unknown>[] { return gridCombinations(variables); }
  pairedCombinations(variables: any[]): Record<string, unknown>[] { return pairedCombinations(variables); }
}
